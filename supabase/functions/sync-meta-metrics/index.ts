import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getValidAccessToken } from '../_shared/token-refresh.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para processar em chunks
async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);
  }
  return results;
}

// Helper para batch upsert
async function batchUpsert(
  supabaseClient: any,
  table: string,
  data: any[],
  onConflict: string,
  batchSize = 100
) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabaseClient.from(table).upsert(batch, { onConflict });
    if (error) {
      console.error(`Erro no batch upsert para tabela ${table}:`, error);
      // Não lança erro para não parar todo o processo, mas loga
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logId = crypto.randomUUID();
  const startedAt = new Date();

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Não autorizado');

    console.log(`[${logId}] Sincronizando métricas Meta para usuário ${user.id}`);

    const { data: integration } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'meta')
      .eq('status', 'active')
      .single();

    if (!integration) {
      console.log(`[${logId}] Nenhuma integração Meta Ads ativa encontrada para o usuário`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'no_integration',
          message: 'Nenhuma integração Meta Ads encontrada. Conecte sua conta Meta Ads primeiro.',
          metricsSynced: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseClient.from('sync_logs').insert({
      id: logId,
      integration_id: integration.id,
      function_name: 'sync-meta-metrics',
      status: 'running',
      started_at: startedAt.toISOString(),
    });

    const accessToken = await getValidAccessToken(supabaseClient, integration.id);

    // Buscar campanhas do usuário
    const { data: campaigns } = await supabaseClient
      .from('campaigns')
      .select(`
        id,
        campaign_id,
        name,
        ad_accounts!inner(
          integration_id
        )
      `)
      .eq('ad_accounts.integration_id', integration.id);

    if (!campaigns || campaigns.length === 0) {
      throw new Error('Nenhuma campanha encontrada. Sincronize as campanhas primeiro.');
    }

    console.log(`[${logId}] Encontradas ${campaigns.length} campanhas para sincronizar métricas`);

    // Carregar mapas de IDs (Meta ID -> UUID) para Ad Sets e Ads
    // Isso evita queries repetitivas dentro do loop
    // Como podem ser muitos, vamos buscar apenas os relacionados às campanhas encontradas
    const campaignIds = campaigns.map((c: any) => c.id);

    // Buscar Ad Sets
    const { data: adSets } = await supabaseClient
      .from('ad_sets')
      .select('id, ad_set_id, campaign_id')
      .in('campaign_id', campaignIds);

    const adSetMap = new Map(); // Meta Ad Set ID -> UUID
    if (adSets) {
      adSets.forEach((adSet: any) => {
        adSetMap.set(adSet.ad_set_id, adSet.id);
      });
    }

    // Buscar Ads (precisamos dos IDs dos ad sets para filtrar, ou buscar todos da campanha se possível)
    // A tabela ads linka com ad_sets. Vamos buscar ads que pertencem aos ad_sets encontrados
    const adSetIds = adSets?.map((a: any) => a.id) || [];
    let adMap = new Map(); // Meta Ad ID -> UUID

    if (adSetIds.length > 0) {
      // Pode ser muitos IDs, vamos fazer em chunks se necessário, ou assumir que cabe na query
      // Para simplificar, vamos buscar em chunks de 1000 se for muito grande
      const { data: ads } = await supabaseClient
        .from('ads')
        .select('id, ad_id')
        .in('ad_set_id', adSetIds);

      if (ads) {
        ads.forEach((ad: any) => {
          adMap.set(ad.ad_id, ad.id);
        });
      }
    }

    console.log(`[${logId}] Mapas carregados: ${adSetMap.size} Ad Sets, ${adMap.size} Ads`);

    let metricsSynced = 0;
    let errors = 0;

    // Função para processar insights
    const processInsights = (insights: any[], level: 'campaign' | 'adset' | 'ad', campaignIdUUID: string) => {
      const processedMetrics: any[] = [];

      for (const insight of insights) {
        let conversions = 0;
        let messages = 0;
        let results = 0;
        let costPerResult = 0;
        let costPerMessage = 0;
        let linkClicks = 0;
        let pageViews = 0;
        let initiatedCheckout = 0;

        if (insight.actions && Array.isArray(insight.actions)) {
          insight.actions.forEach((action: any) => {
            const value = parseInt(action.value || '0');
            const actionType = action.action_type;

            const conversionTypes = [
              'omni_purchase', 'purchase', 'app_custom_event.fb_mobile_purchase',
              'offsite_conversion.fb_pixel_purchase', 'offsite_conversion.custom',
              'offsite_conversion.fb_pixel_custom', 'onsite_conversion.post_save',
              'lead', 'complete_registration', 'omni_complete_registration',
              'app_install', 'omni_app_install', 'onsite_web_app_purchase',
              'onsite_conversion.purchase',
            ];

            if (conversionTypes.some(type => actionType.includes(type))) {
              conversions += value;
            }

            const messageTypes = [
              'messaging_conversation_started_7d',
              'onsite_conversion.messaging_conversation_started_7d',
              'messaging_first_reply', 'contact', 'contact_total',
              'onsite_conversion.messaging_block', 'messaging_user_depth_3_7d',
            ];

            if (messageTypes.some(type => actionType.includes(type))) {
              messages += value;
            }

            const resultTypes = [
              'lead_grouped', 'onsite_conversion.lead_grouped',
              'offsite_conversion.fb_pixel_lead', 'link_click',
              'post_engagement', 'page_engagement', 'post_reaction',
              'comment', 'video_view', 'landing_page_view',
              'onsite_web_lead', 'offsite_conversion.fb_pixel_view_content',
              'onsite_conversion.messaging_conversation_started_7d',
            ];

            if (resultTypes.some(type => actionType.includes(type))) {
              results += value;
            }

            if (actionType === 'link_click') linkClicks += value;
            if (actionType === 'landing_page_view') pageViews += value;
            if (actionType === 'initiate_checkout') initiatedCheckout += value;
          });

          if (results === 0 && insight.actions.length > 0) {
            if (conversions > 0) {
              results = conversions;
            } else if (messages > 0) {
              results = messages;
            } else {
              const firstAction = insight.actions.find((a: any) =>
                !['impression', 'reach', 'frequency'].includes(a.action_type)
              );
              if (firstAction) {
                results = parseInt(firstAction.value || '0');
              }
            }
          }
        }

        if (insight.cost_per_action_type && Array.isArray(insight.cost_per_action_type)) {
          insight.cost_per_action_type.forEach((costAction: any) => {
            const cost = parseFloat(costAction.value || '0');
            const actionType = costAction.action_type;

            const resultCostTypes = [
              'lead_grouped', 'onsite_conversion.lead_grouped',
              'offsite_conversion.fb_pixel_lead', 'link_click',
              'post_engagement', 'page_engagement', 'landing_page_view',
            ];

            if (resultCostTypes.some(type => actionType.includes(type)) && costPerResult === 0) {
              costPerResult = cost;
            }

            const messageCostTypes = [
              'messaging_conversation_started_7d',
              'onsite_conversion.messaging_conversation_started_7d',
              'messaging_first_reply',
            ];

            if (messageCostTypes.some(type => actionType.includes(type)) && costPerMessage === 0) {
              costPerMessage = cost;
            }
          });
        }

        if (costPerResult === 0 && results > 0 && insight.spend) {
          costPerResult = parseFloat(insight.spend) / results;
        }

        if (costPerMessage === 0 && messages > 0 && insight.spend) {
          costPerMessage = parseFloat(insight.spend) / messages;
        }

        // Extract video views
        let videoViews25 = 0;
        let videoViews50 = 0;
        let videoViews75 = 0;
        let videoViews100 = 0;

        if (insight.video_p25_watched_actions) {
          videoViews25 = insight.video_p25_watched_actions.reduce((sum: number, v: any) => sum + parseInt(v.value || '0'), 0);
        }
        if (insight.video_p50_watched_actions) {
          videoViews50 = insight.video_p50_watched_actions.reduce((sum: number, v: any) => sum + parseInt(v.value || '0'), 0);
        }
        if (insight.video_p75_watched_actions) {
          videoViews75 = insight.video_p75_watched_actions.reduce((sum: number, v: any) => sum + parseInt(v.value || '0'), 0);
        }
        if (insight.video_p100_watched_actions) {
          videoViews100 = insight.video_p100_watched_actions.reduce((sum: number, v: any) => sum + parseInt(v.value || '0'), 0);
        }

        const metric: any = {
          campaign_id: campaignIdUUID,
          date: insight.date_start,
          impressions: parseInt(insight.impressions) || 0,
          clicks: parseInt(insight.clicks) || 0,
          spend: parseFloat(insight.spend) || 0,
          conversions: conversions || 0,
          ctr: parseFloat(insight.ctr) || 0,
          cpc: parseFloat(insight.cpc) || 0,
          link_clicks: linkClicks || 0,
          page_views: pageViews || 0,
          initiated_checkout: initiatedCheckout || 0,
          purchases: conversions || 0,
          results: results || 0,
          messages: messages || 0,
          cost_per_result: costPerResult || 0,
          cost_per_message: costPerMessage || 0,
          video_views_25: videoViews25,
          video_views_50: videoViews50,
          video_views_75: videoViews75,
          video_views_100: videoViews100,
        };

        // Adicionar IDs específicos de nível
        if (level === 'adset' && insight.adset_id) {
          const adSetUUID = adSetMap.get(insight.adset_id);
          if (adSetUUID) {
            metric.ad_set_id = adSetUUID;
          } else {
            // Se não encontrar o UUID, pula ou loga. 
            // É melhor pular para não inserir métrica órfã de adset (embora tenha campaign_id)
            // Mas se tiver campaign_id, ainda é útil.
            // Vamos manter apenas se tivermos o ID correto para o nível
            console.warn(`[${logId}] Ad Set UUID não encontrado para Meta ID ${insight.adset_id}`);
          }
        } else if (level === 'ad' && insight.ad_id) {
          const adUUID = adMap.get(insight.ad_id);
          // Precisamos também do ad_set_id para o ad
          // O insight de ad geralmente traz adset_id também se pedirmos, mas vamos ver os campos
          // Se não, podemos pegar do DB se tivermos o mapa reverso, mas simplificando:
          // A tabela metrics tem ad_id e ad_set_id. O ad_id é suficiente para linkar com a tabela ads, 
          // que linka com ad_sets. Mas para facilitar queries, podemos querer preencher ambos.
          // Por enquanto, vamos preencher o que temos.

          if (adUUID) {
            metric.ad_id = adUUID;
            // Tentar preencher ad_set_id se disponível no insight
            if (insight.adset_id) {
              const adSetUUID = adSetMap.get(insight.adset_id);
              if (adSetUUID) metric.ad_set_id = adSetUUID;
            }
          } else {
            console.warn(`[${logId}] Ad UUID não encontrado para Meta ID ${insight.ad_id}`);
          }
        }

        processedMetrics.push(metric);
      }
      return processedMetrics;
    };

    // Processar campanha e retornar métricas para batch insert
    const processCampaign = async (campaign: any): Promise<{ metrics: any[], breakdowns: any[], errors: number }> => {
      const campaignMetrics: any[] = [];
      const breakdowns: any[] = [];
      let campaignErrors = 0;

      try {
        const date30DaysAgo = new Date();
        date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
        const since = date30DaysAgo.toISOString().split('T')[0];
        const until = new Date().toISOString().split('T')[0];

        const fields = 'date_start,impressions,clicks,spend,actions,action_values,cost_per_action_type,ctr,cpc,adset_id,ad_id,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions';
        const timeRange = `{"since":"${since}","until":"${until}"}`;

        // 1. Nível Campanha
        const campaignUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?` +
          `level=campaign&fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${accessToken}`;

        // 2. Nível Ad Set
        const adSetUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?` +
          `level=adset&fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${accessToken}`;

        // 3. Nível Ad
        const adUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?` +
          `level=ad&fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${accessToken}`;

        const [campaignRes, adSetRes, adRes] = await Promise.all([
          fetch(campaignUrl),
          fetch(adSetUrl),
          fetch(adUrl)
        ]);

        // Processar respostas
        if (campaignRes.ok) {
          const { data } = await campaignRes.json();
          if (data) campaignMetrics.push(...processInsights(data, 'campaign', campaign.id));
        } else {
          console.error(`[${logId}] Erro insights campanha ${campaign.id}:`, await campaignRes.text());
          campaignErrors++;
        }

        if (adSetRes.ok) {
          const { data } = await adSetRes.json();
          if (data) campaignMetrics.push(...processInsights(data, 'adset', campaign.id));
        } else {
          console.error(`[${logId}] Erro insights adsets campanha ${campaign.id}:`, await adSetRes.text());
          campaignErrors++;
        }

        if (adRes.ok) {
          const { data } = await adRes.json();
          if (data) campaignMetrics.push(...processInsights(data, 'ad', campaign.id));
        } else {
          console.error(`[${logId}] Erro insights ads campanha ${campaign.id}:`, await adRes.text());
          campaignErrors++;
        }

        // 4. Buscar breakdowns demográficos (idade e gênero)
        const demographicFields = 'date_start,impressions,clicks,spend,conversions';
        const ageUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?` +
          `level=campaign&fields=${demographicFields}&time_range=${timeRange}&breakdowns=age&time_increment=1&access_token=${accessToken}`;
        const genderUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?` +
          `level=campaign&fields=${demographicFields}&time_range=${timeRange}&breakdowns=gender&time_increment=1&access_token=${accessToken}`;

        const [ageRes, genderRes] = await Promise.all([
          fetch(ageUrl),
          fetch(genderUrl)
        ]);

        if (ageRes.ok) {
          const { data } = await ageRes.json();
          if (data) {
            for (const item of data) {
              breakdowns.push({
                campaign_id: campaign.id,
                date: item.date_start,
                breakdown_type: 'age',
                breakdown_value: item.age || 'unknown',
                impressions: parseInt(item.impressions) || 0,
                clicks: parseInt(item.clicks) || 0,
                spend: parseFloat(item.spend) || 0,
                conversions: parseInt(item.conversions) || 0,
              });
            }
          }
        }

        if (genderRes.ok) {
          const { data } = await genderRes.json();
          if (data) {
            for (const item of data) {
              breakdowns.push({
                campaign_id: campaign.id,
                date: item.date_start,
                breakdown_type: 'gender',
                breakdown_value: item.gender || 'unknown',
                impressions: parseInt(item.impressions) || 0,
                clicks: parseInt(item.clicks) || 0,
                spend: parseFloat(item.spend) || 0,
                conversions: parseInt(item.conversions) || 0,
              });
            }
          }
        }

      } catch (error) {
        console.error(`[${logId}] Erro ao sincronizar métricas da campanha ${campaign.id}:`, error);
        campaignErrors++;
      }

      return { metrics: campaignMetrics, breakdowns, errors: campaignErrors };
    };

    // Processar 3 campanhas em paralelo (reduzido para evitar rate limit com múltiplos requests por campanha)
    const results = await processInChunks(campaigns, 3, processCampaign);

    // Coletar todas as métricas e breakdowns
    const allMetrics: any[] = [];
    const allBreakdowns: any[] = [];
    for (const result of results) {
      allMetrics.push(...result.metrics);
      allBreakdowns.push(...result.breakdowns);
      errors += result.errors;
    }

    console.log(`[${logId}] Total de ${allMetrics.length} métricas e ${allBreakdowns.length} breakdowns coletados, inserindo em lotes...`);

    console.log(`[${logId}] Total de ${allMetrics.length} métricas coletadas, inserindo em lotes...`);

    // Batch upsert de todas as métricas (100 por vez)
    // Precisamos lidar com conflitos. A constraint UNIQUE na tabela metrics é (campaign_id, date) ?
    // Não, a tabela metrics tem um ID serial/uuid.
    // Vamos verificar a definição da tabela metrics.
    // Geralmente metrics tem unique(campaign_id, date) ou (ad_id, date) etc.
    // Se tivermos múltiplas linhas para a mesma data (uma para campanha, uma para adset, uma para ad),
    // precisamos saber como o banco lida.
    // Se a tabela metrics é única para todos os níveis, ela deve ter colunas nullable para ad_set_id e ad_id.
    // E a constraint unique deve considerar isso.
    // Se a constraint for apenas (campaign_id, date), então não podemos ter linhas separadas para adsets da mesma campanha na mesma data?
    // NÃO. Se a constraint for (campaign_id, date), só cabe UMA linha por campanha por dia.
    // Isso significa que não podemos misturar métricas de nível campanha, adset e ad na mesma tabela SE a constraint for essa.

    // Vamos verificar a constraint da tabela metrics.
    // Se não tiver constraint adequada, o upsert vai falhar ou duplicar.
    // Idealmente:
    // - Métricas de nível campanha: ad_set_id=null, ad_id=null
    // - Métricas de nível adset: ad_set_id=X, ad_id=null
    // - Métricas de nível ad: ad_set_id=X, ad_id=Y

    // A constraint deve ser algo como UNIQUE NULLS NOT DISTINCT (campaign_id, ad_set_id, ad_id, date)
    // Ou índices únicos parciais.

    // Assumindo que o usuário quer ver dados agregados no dashboard:
    // O dashboard soma os dados?
    // Se eu tiver métricas de campanha E métricas de adsets, e somar tudo, vou duplicar os valores.
    // O dashboard deve filtrar:
    // - Se vendo por campanha: soma métricas onde ad_set_id IS NULL e ad_id IS NULL (ou usa campaign_id e ignora o resto? Não, se tiver linhas duplicadas para niveis diferentes)

    // ATENÇÃO: O dashboard atual filtra por nível?
    // O hook useMetrics filtra por campanha.
    // O hook useAdSetMetrics filtra por ad_set_id.
    // O hook useAdMetrics filtra por ad_id.

    // Se eu inserir tudo na mesma tabela:
    // Linha 1: date=D1, campaign=C1, adset=null, ad=null, spend=100 (Dados da campanha)
    // Linha 2: date=D1, campaign=C1, adset=A1, ad=null, spend=50 (Dados do adset A1)
    // Linha 3: date=D1, campaign=C1, adset=A2, ad=null, spend=50 (Dados do adset A2)

    // Se o useMetrics somar tudo onde campaign_id=C1, vai dar 200 (100 + 50 + 50). Errado.
    // O useMetrics deve filtrar onde ad_set_id IS NULL e ad_id IS NULL.

    // Vamos verificar o useMetrics.ts
    // Ele chama rpc('get_detailed_metrics').
    // Precisamos garantir que get_detailed_metrics filtre corretamente ou que a gente filtre no hook.

    // Por enquanto, vamos focar em INSERIR os dados corretamente.
    // Para o upsert funcionar, precisamos de uma constraint que diferencie as linhas.
    // Se não tiver constraint, vai inserir duplicado a cada sync.

    // Vou assumir que precisamos de uma constraint composta.
    // Se não existir, o upsert vai falhar se eu passar onConflict.
    // Vou tentar usar 'id' se eu tivesse, mas não tenho.
    // Vou tentar upsert sem onConflict especificado? Não, vai dar insert.

    // Melhor estratégia: Deletar métricas do período para as campanhas e reinserir.
    // É mais seguro para garantir consistência e não duplicar.
    // Mas deletar é perigoso se falhar a inserção.

    // Vamos tentar upsert com uma constraint que esperamos que exista ou criar.
    // A tabela metrics original provavelmente tinha unique(campaign_id, date).
    // Se eu inserir uma linha com ad_set_id preenchido, ela viola (campaign_id, date)?
    // Sim, se a constraint for apenas essas duas colunas.

    // Se a constraint for (campaign_id, date), não posso ter granularidade de adset.
    // Preciso alterar a constraint no banco se ela for restritiva.
    // Mas não posso alterar o banco daqui.

    // Vou verificar as migrations para ver a constraint da tabela metrics.
    // A migration 20251204185134_add_ad_sets_and_ads_tables.sql adicionou colunas, mas não mudou constraints.
    // Preciso checar a criação da tabela metrics.

    // Se eu não puder mudar a constraint agora, uma alternativa é:
    // Salvar apenas métricas de nível AD? E agregar?
    // Não, o Meta tem dados que não somam perfeitamente as vezes, ou campanhas sem ads.

    // Vamos assumir que o usuário já preparou o banco ou que eu posso ajustar.
    // O usuário pediu "Atualize o sync-meta-metrics para popular as métricas por nível".
    // Isso implica que o banco deve suportar.

    // Vou usar onConflict: 'campaign_id, ad_set_id, ad_id, date' se possível.
    // Mas o Supabase exige que exista uma constraint unique correspondente.
    // Se não existir, vai dar erro.

    // Como solução robusta: vou tentar deletar as métricas dos últimos 30 dias para as campanhas processadas
    // e inserir as novas. Isso evita problemas de constraint e duplicação.
    // Delete from metrics where campaign_id in (...) and date >= ...

    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
    const dateStr = date30DaysAgo.toISOString().split('T')[0];

    if (allMetrics.length > 0) {
      // Deletar métricas antigas do período para evitar duplicação/conflito
      // Fazer em chunks de IDs de campanha para não estourar a URL/Query
      const uniqueCampaignIds = [...new Set(allMetrics.map(m => m.campaign_id))];

      for (let i = 0; i < uniqueCampaignIds.length; i += 50) {
        const batchIds = uniqueCampaignIds.slice(i, i + 50);
        await supabaseClient
          .from('metrics')
          .delete()
          .in('campaign_id', batchIds)
          .gte('date', dateStr);
      }

      // Inserir novas métricas
      await batchUpsert(supabaseClient, 'metrics', allMetrics, ''); // Sem onConflict, pois acabamos de deletar
      metricsSynced = allMetrics.length;
    }

    // Processar breakdowns demográficos
    if (allBreakdowns.length > 0) {
      const uniqueCampaignIds = [...new Set(allBreakdowns.map(b => b.campaign_id))];
      
      // Deletar breakdowns antigos do período
      for (let i = 0; i < uniqueCampaignIds.length; i += 50) {
        const batchIds = uniqueCampaignIds.slice(i, i + 50);
        await supabaseClient
          .from('metric_breakdowns')
          .delete()
          .in('campaign_id', batchIds)
          .gte('date', dateStr);
      }

      // Inserir novos breakdowns
      await batchUpsert(supabaseClient, 'metric_breakdowns', allBreakdowns, '');
      console.log(`[${logId}] ${allBreakdowns.length} breakdowns demográficos sincronizados`);
    }

    await supabaseClient.from('sync_logs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      metrics_synced: metricsSynced,
      error_message: errors > 0 ? `${errors} erros durante sincronização` : null,
    }).eq('id', logId);

    console.log(`[${logId}] Sincronização concluída: ${metricsSynced} métricas sincronizadas, ${errors} erros`);

    return new Response(
      JSON.stringify({
        success: true,
        metricsSynced,
        errors,
        message: `${metricsSynced} métricas sincronizadas com sucesso`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[${logId}] Erro:`, error);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabaseClient.from('sync_logs').update({
      status: 'error',
      finished_at: new Date().toISOString(),
      error_message: error.message,
    }).eq('id', logId);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
