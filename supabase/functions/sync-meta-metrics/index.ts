import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getValidAccessToken } from '../_shared/token-refresh.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Aumentado para processar mais campanhas
const MAX_CAMPAIGNS_PER_SYNC = 50;

// Helper para delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper para batch insert com tratamento de erros
async function batchInsert(
  supabaseClient: any,
  table: string,
  data: any[],
  batchSize = 50
) {
  let insertedCount = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error, data: result } = await supabaseClient.from(table).insert(batch).select('id');
    if (error) {
      console.error(`Erro no batch insert para tabela ${table}:`, error.message);
    } else {
      insertedCount += result?.length || batch.length;
    }
  }
  return insertedCount;
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
      console.log(`[${logId}] Nenhuma integração Meta Ads ativa encontrada`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'no_integration',
          message: 'Nenhuma integração Meta Ads encontrada.',
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

    // Buscar campanhas ativas com sync_enabled, PRIORIZANDO por conta e status
    const { data: campaigns, error: campaignsError } = await supabaseClient
      .from('campaigns')
      .select(`
        id,
        campaign_id,
        name,
        status,
        ad_account_id,
        ad_accounts!inner(integration_id, account_name)
      `)
      .eq('ad_accounts.integration_id', integration.id)
      .eq('sync_enabled', true)
      .order('status', { ascending: true }) // ACTIVE primeiro
      .limit(MAX_CAMPAIGNS_PER_SYNC);

    if (campaignsError) {
      throw new Error('Erro ao buscar campanhas');
    }

    if (!campaigns || campaigns.length === 0) {
      console.log(`[${logId}] Nenhuma campanha para sincronizar`);
      await supabaseClient.from('sync_logs').update({
        status: 'success',
        finished_at: new Date().toISOString(),
        metrics_synced: 0,
      }).eq('id', logId);

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhuma campanha para sincronizar.',
          metricsSynced: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${logId}] Sincronizando métricas para ${campaigns.length} campanhas`);

    // Mapear anúncios (ads) para vincular métricas de nível de anúncio
    const campaignIds = campaigns.map((c: any) => c.id);

    const { data: adSets } = await supabaseClient
      .from('ad_sets')
      .select('id, ad_set_id, campaign_id')
      .in('campaign_id', campaignIds);

    const adSetIds = (adSets || []).map((as: any) => as.id);

    const { data: ads } = await supabaseClient
      .from('ads')
      .select('id, ad_id, ad_set_id')
      .in('ad_set_id', adSetIds);

    const adIdMap = new Map<string, string>(
      (ads || []).map((ad: any) => [ad.ad_id as string, ad.id as string])
    );

    const allMetrics: any[] = [];
    const allBreakdowns: any[] = [];
    const campaignsToDisable: string[] = [];
    let errors = 0;

    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
    const since = date30DaysAgo.toISOString().split('T')[0];
    const until = new Date().toISOString().split('T')[0];

    for (const campaign of campaigns) {
      try {
        const fields = 'date_start,impressions,clicks,spend,actions,action_values,cost_per_action_type,ctr,cpc,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions';
        const timeRange = `{"since":"${since}","until":"${until}"}`;

        // Buscar insights da campanha em nível de ANÚNCIO (ad)
        const campaignUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?level=ad&fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${accessToken}`;
        const campaignRes = await fetch(campaignUrl);

        if (!campaignRes.ok) {
          const errorText = await campaignRes.text();
          if (errorText.includes('"code":100') || errorText.includes('does not exist')) {
            console.warn(`[${logId}] Campanha ${campaign.campaign_id} não existe, desabilitando sync`);
            campaignsToDisable.push(campaign.id);
            continue;
          }
          console.error(`[${logId}] Erro insights campanha ${campaign.campaign_id}:`, errorText.substring(0, 200));
          errors++;
          continue;
        }

        const { data: insights } = await campaignRes.json();

        if (insights && insights.length > 0) {
          for (const insight of insights) {
            // Processar actions
            let conversions = 0, messages = 0, results = 0, linkClicks = 0, pageViews = 0, initiatedCheckout = 0;
            let costPerResult = 0, costPerMessage = 0;

            if (insight.actions && Array.isArray(insight.actions)) {
              for (const action of insight.actions) {
                const value = parseInt(action.value || '0');
                const type = action.action_type;

                if (type.includes('purchase') || type.includes('conversion') || type.includes('lead') || type.includes('complete_registration')) {
                  conversions += value;
                }
                if (type.includes('messaging') || type.includes('contact')) {
                  messages += value;
                }
                if (type === 'link_click') linkClicks += value;
                if (type === 'landing_page_view') pageViews += value;
                if (type === 'initiate_checkout' || type.includes('initiate_checkout')) initiatedCheckout += value;
                
                // Results
                if (type.includes('lead') || type === 'link_click' || type.includes('engagement') || type === 'landing_page_view') {
                  results += value;
                }
              }

              if (results === 0) {
                results = conversions > 0 ? conversions : messages > 0 ? messages : 0;
              }
            }

            // Cost per action
            if (insight.cost_per_action_type && Array.isArray(insight.cost_per_action_type)) {
              for (const costAction of insight.cost_per_action_type) {
                const cost = parseFloat(costAction.value || '0');
                if (costAction.action_type.includes('lead') || costAction.action_type === 'link_click') {
                  if (costPerResult === 0) costPerResult = cost;
                }
                if (costAction.action_type.includes('messaging')) {
                  if (costPerMessage === 0) costPerMessage = cost;
                }
              }
            }

            if (costPerResult === 0 && results > 0 && insight.spend) {
              costPerResult = parseFloat(insight.spend) / results;
            }
            if (costPerMessage === 0 && messages > 0 && insight.spend) {
              costPerMessage = parseFloat(insight.spend) / messages;
            }

            // Video views
            let videoViews25 = 0, videoViews50 = 0, videoViews75 = 0, videoViews100 = 0;
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

            const adIdFromInsight = (insight as any).ad_id as string | undefined;
            const internalAdId = adIdFromInsight ? adIdMap.get(adIdFromInsight) || null : null;

            allMetrics.push({
              campaign_id: campaign.id,
              ad_id: internalAdId,
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
            });
          }

          // Buscar breakdowns demográficos
          const demographicFields = 'date_start,impressions,clicks,spend,actions';
          
          // Age breakdown
          try {
            const ageUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?level=campaign&fields=${demographicFields}&time_range=${timeRange}&breakdowns=age&time_increment=1&access_token=${accessToken}`;
            const ageRes = await fetch(ageUrl);
            if (ageRes.ok) {
              const { data: ageData } = await ageRes.json();
              if (ageData) {
                for (const item of ageData) {
                  // Extrair conversões das actions
                  let conversions = 0;
                  if (item.actions && Array.isArray(item.actions)) {
                    for (const action of item.actions) {
                      const type = action.action_type;
                      if (type.includes('purchase') || type.includes('conversion') || type.includes('lead')) {
                        conversions += parseInt(action.value || '0');
                      }
                    }
                  }
                  
                  allBreakdowns.push({
                    campaign_id: campaign.id,
                    date: item.date_start,
                    breakdown_type: 'age',
                    breakdown_value: item.age || 'unknown',
                    impressions: parseInt(item.impressions) || 0,
                    clicks: parseInt(item.clicks) || 0,
                    spend: parseFloat(item.spend) || 0,
                    conversions: conversions,
                  });
                }
              }
            }
          } catch (e) {
            console.error(`[${logId}] Erro ao buscar breakdown de idade:`, e);
          }

          // Gender breakdown
          try {
            const genderUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?level=campaign&fields=${demographicFields}&time_range=${timeRange}&breakdowns=gender&time_increment=1&access_token=${accessToken}`;
            const genderRes = await fetch(genderUrl);
            if (genderRes.ok) {
              const { data: genderData } = await genderRes.json();
              if (genderData) {
                for (const item of genderData) {
                  // Extrair conversões das actions
                  let conversions = 0;
                  if (item.actions && Array.isArray(item.actions)) {
                    for (const action of item.actions) {
                      const type = action.action_type;
                      if (type.includes('purchase') || type.includes('conversion') || type.includes('lead')) {
                        conversions += parseInt(action.value || '0');
                      }
                    }
                  }
                  
                  allBreakdowns.push({
                    campaign_id: campaign.id,
                    date: item.date_start,
                    breakdown_type: 'gender',
                    breakdown_value: item.gender || 'unknown',
                    impressions: parseInt(item.impressions) || 0,
                    clicks: parseInt(item.clicks) || 0,
                    spend: parseFloat(item.spend) || 0,
                    conversions: conversions,
                  });
                }
              }
            }
          } catch (e) {
            console.error(`[${logId}] Erro ao buscar breakdown de gênero:`, e);
          }
        }

        // Delay entre campanhas
        await delay(100);
      } catch (error) {
        console.error(`[${logId}] Erro ao processar campanha ${campaign.campaign_id}:`, error);
        errors++;
      }
    }

    console.log(`[${logId}] Total: ${allMetrics.length} métricas, ${allBreakdowns.length} breakdowns coletados`);

    // Desabilitar campanhas inexistentes
    if (campaignsToDisable.length > 0) {
      console.log(`[${logId}] Desabilitando sync para ${campaignsToDisable.length} campanhas`);
      await supabaseClient.from('campaigns').update({ sync_enabled: false }).in('id', campaignsToDisable);
    }

    // Deletar métricas antigas e inserir novas
    const dateStr = since;
    let metricsSynced = 0;

    if (allMetrics.length > 0) {
      const uniqueCampaignIds = [...new Set(allMetrics.map(m => m.campaign_id))];

      // Deletar em chunks
      for (let i = 0; i < uniqueCampaignIds.length; i += 20) {
        const batchIds = uniqueCampaignIds.slice(i, i + 20);
        await supabaseClient.from('metrics').delete().in('campaign_id', batchIds).gte('date', dateStr);
      }

      // Inserir novas métricas
      metricsSynced = await batchInsert(supabaseClient, 'metrics', allMetrics);
    }

    // Processar breakdowns
    let breakdownsSynced = 0;
    if (allBreakdowns.length > 0) {
      const uniqueCampaignIds = [...new Set(allBreakdowns.map(b => b.campaign_id))];

      for (let i = 0; i < uniqueCampaignIds.length; i += 20) {
        const batchIds = uniqueCampaignIds.slice(i, i + 20);
        await supabaseClient.from('metric_breakdowns').delete().in('campaign_id', batchIds).gte('date', dateStr);
      }

      breakdownsSynced = await batchInsert(supabaseClient, 'metric_breakdowns', allBreakdowns);
    }

    await supabaseClient.from('sync_logs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      metrics_synced: metricsSynced,
      error_message: errors > 0 ? `${errors} erros, ${campaignsToDisable.length} campanhas desabilitadas` : null,
    }).eq('id', logId);

    console.log(`[${logId}] Sincronização concluída: ${metricsSynced} métricas, ${breakdownsSynced} breakdowns`);

    return new Response(
      JSON.stringify({
        success: true,
        metricsSynced,
        breakdownsSynced,
        campaignsDisabled: campaignsToDisable.length,
        errors,
        message: `${metricsSynced} métricas e ${breakdownsSynced} breakdowns sincronizados.`,
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