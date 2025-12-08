import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getValidAccessToken } from '../_shared/token-refresh.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Limite de campanhas por execução para evitar timeout
const MAX_CAMPAIGNS_PER_SYNC = 50;

// Helper para processar em chunks com delay entre chunks
async function processInChunks<T, R>(
  items: T[],
  chunkSize: number,
  processor: (item: T) => Promise<R>,
  delayMs = 100
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processor));
    results.push(...chunkResults);
    
    // Delay entre chunks para evitar rate limiting
    if (i + chunkSize < items.length && delayMs > 0) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

// Helper para batch upsert
async function batchUpsert(
  supabaseClient: any,
  table: string,
  data: any[],
  batchSize = 100
) {
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error } = await supabaseClient.from(table).insert(batch);
    if (error) {
      console.error(`Erro no batch insert para tabela ${table}:`, error);
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

    // Buscar campanhas ATIVAS do usuário (apenas sync_enabled = true, limite de MAX_CAMPAIGNS_PER_SYNC)
    const { data: campaigns, error: campaignsError } = await supabaseClient
      .from('campaigns')
      .select(`
        id,
        campaign_id,
        name,
        sync_enabled,
        ad_accounts!inner(
          integration_id
        )
      `)
      .eq('ad_accounts.integration_id', integration.id)
      .eq('sync_enabled', true)
      .limit(MAX_CAMPAIGNS_PER_SYNC);

    if (campaignsError) {
      console.error(`[${logId}] Erro ao buscar campanhas:`, campaignsError);
      throw new Error('Erro ao buscar campanhas');
    }

    if (!campaigns || campaigns.length === 0) {
      console.log(`[${logId}] Nenhuma campanha com sync habilitado encontrada`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhuma campanha para sincronizar. Execute a sincronização de campanhas primeiro.',
          metricsSynced: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${logId}] Sincronizando métricas para ${campaigns.length} campanhas (limite: ${MAX_CAMPAIGNS_PER_SYNC})`);

    // Carregar mapas de IDs
    const campaignIds = campaigns.map((c: any) => c.id);

    const { data: adSets } = await supabaseClient
      .from('ad_sets')
      .select('id, ad_set_id, campaign_id')
      .in('campaign_id', campaignIds);

    const adSetMap = new Map();
    if (adSets) {
      adSets.forEach((adSet: any) => {
        adSetMap.set(adSet.ad_set_id, adSet.id);
      });
    }

    const adSetIds = adSets?.map((a: any) => a.id) || [];
    let adMap = new Map();

    if (adSetIds.length > 0) {
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
    const campaignsToDisable: string[] = [];

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

        if (level === 'adset' && insight.adset_id) {
          const adSetUUID = adSetMap.get(insight.adset_id);
          if (adSetUUID) {
            metric.ad_set_id = adSetUUID;
          }
        } else if (level === 'ad' && insight.ad_id) {
          const adUUID = adMap.get(insight.ad_id);
          if (adUUID) {
            metric.ad_id = adUUID;
            if (insight.adset_id) {
              const adSetUUID = adSetMap.get(insight.adset_id);
              if (adSetUUID) metric.ad_set_id = adSetUUID;
            }
          }
        }

        processedMetrics.push(metric);
      }
      return processedMetrics;
    };

    // Processar campanha e retornar métricas
    const processCampaign = async (campaign: any): Promise<{ metrics: any[], breakdowns: any[], errors: number, shouldDisable: boolean }> => {
      const campaignMetrics: any[] = [];
      const breakdowns: any[] = [];
      let campaignErrors = 0;
      let shouldDisable = false;

      try {
        const date30DaysAgo = new Date();
        date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
        const since = date30DaysAgo.toISOString().split('T')[0];
        const until = new Date().toISOString().split('T')[0];

        const fields = 'date_start,impressions,clicks,spend,actions,action_values,cost_per_action_type,ctr,cpc,adset_id,ad_id,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions';
        const timeRange = `{"since":"${since}","until":"${until}"}`;

        // 1. Buscar insights de campanha
        const campaignUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?` +
          `level=campaign&fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${accessToken}`;

        const campaignRes = await fetch(campaignUrl);

        if (campaignRes.ok) {
          const { data } = await campaignRes.json();
          if (data) campaignMetrics.push(...processInsights(data, 'campaign', campaign.id));
        } else {
          const errorText = await campaignRes.text();
          
          // Verificar se é erro 100 (objeto não existe ou sem permissão)
          if (errorText.includes('"code":100') || errorText.includes('does not exist')) {
            console.warn(`[${logId}] Campanha ${campaign.campaign_id} não existe ou sem permissão, desabilitando sync`);
            shouldDisable = true;
            return { metrics: [], breakdowns: [], errors: 1, shouldDisable: true };
          }
          
          console.error(`[${logId}] Erro insights campanha ${campaign.id}:`, errorText);
          campaignErrors++;
        }

        // Se a campanha existe, buscar os outros níveis
        if (!shouldDisable && campaignMetrics.length > 0) {
          // 2. Buscar breakdowns demográficos (apenas se campanha tem dados)
          const demographicFields = 'date_start,impressions,clicks,spend';
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
                });
              }
            }
          }
        }

      } catch (error) {
        console.error(`[${logId}] Erro ao sincronizar métricas da campanha ${campaign.id}:`, error);
        campaignErrors++;
      }

      return { metrics: campaignMetrics, breakdowns, errors: campaignErrors, shouldDisable };
    };

    // Processar 2 campanhas em paralelo (reduzido para evitar rate limit)
    const results = await processInChunks(campaigns, 2, processCampaign, 200);

    // Coletar todas as métricas e breakdowns
    const allMetrics: any[] = [];
    const allBreakdowns: any[] = [];
    for (const result of results) {
      allMetrics.push(...result.metrics);
      allBreakdowns.push(...result.breakdowns);
      errors += result.errors;
      if (result.shouldDisable) {
        // Encontrar a campanha correspondente
        const campaignIndex = results.indexOf(result);
        if (campaignIndex >= 0 && campaigns[campaignIndex]) {
          campaignsToDisable.push(campaigns[campaignIndex].id);
        }
      }
    }

    console.log(`[${logId}] Total de ${allMetrics.length} métricas e ${allBreakdowns.length} breakdowns coletados`);

    // Desabilitar campanhas que não existem mais no Meta
    if (campaignsToDisable.length > 0) {
      console.log(`[${logId}] Desabilitando sync para ${campaignsToDisable.length} campanhas inexistentes`);
      await supabaseClient
        .from('campaigns')
        .update({ sync_enabled: false })
        .in('id', campaignsToDisable);
    }

    // Deletar métricas antigas e inserir novas
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
    const dateStr = date30DaysAgo.toISOString().split('T')[0];

    if (allMetrics.length > 0) {
      const uniqueCampaignIds = [...new Set(allMetrics.map(m => m.campaign_id))];

      // Deletar em chunks
      for (let i = 0; i < uniqueCampaignIds.length; i += 50) {
        const batchIds = uniqueCampaignIds.slice(i, i + 50);
        await supabaseClient
          .from('metrics')
          .delete()
          .in('campaign_id', batchIds)
          .gte('date', dateStr);
      }

      // Inserir novas métricas
      await batchUpsert(supabaseClient, 'metrics', allMetrics);
      metricsSynced = allMetrics.length;
    }

    // Processar breakdowns demográficos
    if (allBreakdowns.length > 0) {
      const uniqueCampaignIds = [...new Set(allBreakdowns.map(b => b.campaign_id))];
      
      for (let i = 0; i < uniqueCampaignIds.length; i += 50) {
        const batchIds = uniqueCampaignIds.slice(i, i + 50);
        await supabaseClient
          .from('metric_breakdowns')
          .delete()
          .in('campaign_id', batchIds)
          .gte('date', dateStr);
      }

      await batchUpsert(supabaseClient, 'metric_breakdowns', allBreakdowns);
      console.log(`[${logId}] ${allBreakdowns.length} breakdowns demográficos sincronizados`);
    }

    await supabaseClient.from('sync_logs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      metrics_synced: metricsSynced,
      error_message: errors > 0 ? `${errors} erros, ${campaignsToDisable.length} campanhas desabilitadas` : null,
    }).eq('id', logId);

    console.log(`[${logId}] Sincronização concluída: ${metricsSynced} métricas, ${campaignsToDisable.length} campanhas desabilitadas`);

    return new Response(
      JSON.stringify({
        success: true,
        metricsSynced,
        campaignsDisabled: campaignsToDisable.length,
        errors,
        message: `${metricsSynced} métricas sincronizadas. ${campaignsToDisable.length} campanhas inexistentes desabilitadas.`,
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