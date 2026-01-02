import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getValidAccessToken } from '../_shared/token-refresh.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper para batch upsert
async function batchUpsertMetrics(supabaseClient: any, data: any[], batchSize = 50) {
  let upsertedCount = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error, data: result } = await supabaseClient
      .from('metrics')
      .upsert(batch, { onConflict: 'campaign_id,date,ad_id', ignoreDuplicates: false })
      .select('id');
    if (error) {
      console.error(`Erro no upsert metrics:`, error.message);
      for (const item of batch) {
        const { error: singleError } = await supabaseClient
          .from('metrics')
          .upsert(item, { onConflict: 'campaign_id,date,ad_id' });
        if (!singleError) upsertedCount++;
      }
    } else {
      upsertedCount += result?.length || batch.length;
    }
  }
  return upsertedCount;
}

async function batchUpsertBreakdowns(supabaseClient: any, data: any[], batchSize = 50) {
  let upsertedCount = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error, data: result } = await supabaseClient
      .from('metric_breakdowns')
      .upsert(batch, { onConflict: 'campaign_id,date,breakdown_type,breakdown_value', ignoreDuplicates: false })
      .select('id');
    if (error) {
      console.error(`Erro no upsert breakdowns:`, error.message);
      for (const item of batch) {
        const { error: singleError } = await supabaseClient
          .from('metric_breakdowns')
          .upsert(item, { onConflict: 'campaign_id,date,breakdown_type,breakdown_value' });
        if (!singleError) upsertedCount++;
      }
    } else {
      upsertedCount += result?.length || batch.length;
    }
  }
  return upsertedCount;
}

// Processar uma campanha
async function processCampaign(
  campaign: any,
  accessToken: string,
  since: string,
  until: string,
  adIdMap: Map<string, string>,
  logId: string
): Promise<{ metrics: any[]; breakdowns: any[]; disable: boolean; error: boolean }> {
  const metrics: any[] = [];
  const breakdowns: any[] = [];
  
  const fields = 'date_start,impressions,clicks,spend,actions,action_values,cost_per_action_type,ctr,cpc,video_p25_watched_actions,video_p50_watched_actions,video_p75_watched_actions,video_p100_watched_actions';
  const timeRange = `{"since":"${since}","until":"${until}"}`;

  try {
    // Buscar insights em nível de AD
    const campaignUrl = `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?level=ad&fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${accessToken}`;
    const campaignRes = await fetch(campaignUrl);

    if (!campaignRes.ok) {
      const errorText = await campaignRes.text();
      if (errorText.includes('"code":100') || errorText.includes('does not exist')) {
        console.warn(`[${logId}] Campanha ${campaign.campaign_id} não existe`);
        return { metrics: [], breakdowns: [], disable: true, error: false };
      }
      console.error(`[${logId}] Erro insights campanha ${campaign.campaign_id}:`, errorText.substring(0, 200));
      return { metrics: [], breakdowns: [], disable: false, error: true };
    }

    const { data: insights } = await campaignRes.json();

    if (insights && insights.length > 0) {
      for (const insight of insights) {
        let conversions = 0, messages = 0, results = 0, linkClicks = 0, pageViews = 0, initiatedCheckout = 0, purchases = 0;
        let costPerResult = 0, costPerMessage = 0;

        if (insight.actions && Array.isArray(insight.actions)) {
          for (const action of insight.actions) {
            const value = parseInt(action.value || '0');
            const type = action.action_type;

            if (type === 'omni_purchase' || type === 'purchase' || type.includes('purchase')) purchases += value;
            if (type.includes('lead') || type.includes('complete_registration')) conversions += value;
            if (type.includes('messaging') || type.includes('contact') || type === 'onsite_conversion.messaging_conversation_started_7d') messages += value;
            if (type === 'link_click') linkClicks += value;
            if (type === 'landing_page_view') pageViews += value;
            if (type === 'initiate_checkout' || type.includes('initiate_checkout')) initiatedCheckout += value;
            if (type.includes('lead') || type === 'link_click' || type.includes('engagement') || type === 'landing_page_view') results += value;
          }

          if (results === 0) {
            results = conversions > 0 ? conversions : messages > 0 ? messages : purchases;
          }
        }

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

        metrics.push({
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
          purchases: purchases || 0,
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

      // Buscar breakdowns demográficos em paralelo
      const demographicFields = 'date_start,impressions,clicks,spend,actions';
      
      const breakdownPromises = [
        fetch(`https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?level=campaign&fields=${demographicFields}&time_range=${timeRange}&breakdowns=age&time_increment=1&access_token=${accessToken}`)
          .then(async res => ({ type: 'age', data: res.ok ? (await res.json()).data : null }))
          .catch(() => ({ type: 'age', data: null })),
        fetch(`https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?level=campaign&fields=${demographicFields}&time_range=${timeRange}&breakdowns=gender&time_increment=1&access_token=${accessToken}`)
          .then(async res => ({ type: 'gender', data: res.ok ? (await res.json()).data : null }))
          .catch(() => ({ type: 'gender', data: null })),
        fetch(`https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?level=campaign&fields=${demographicFields}&time_range=${timeRange}&breakdowns=region&time_increment=1&access_token=${accessToken}`)
          .then(async res => ({ type: 'region', data: res.ok ? (await res.json()).data : null }))
          .catch(() => ({ type: 'region', data: null })),
      ];

      const breakdownResults = await Promise.all(breakdownPromises);

      for (const result of breakdownResults) {
        if (!result.data) continue;
        
        for (const item of result.data) {
          let itemConversions = 0;
          if (item.actions && Array.isArray(item.actions)) {
            for (const action of item.actions) {
              const type = action.action_type;
              if (type.includes('purchase') || type.includes('conversion') || type.includes('lead')) {
                itemConversions += parseInt(action.value || '0');
              }
            }
          }
          
          const breakdownValue = item[result.type] || item.age || item.gender || item.region || 'unknown';
          
          breakdowns.push({
            campaign_id: campaign.id,
            date: item.date_start,
            breakdown_type: result.type,
            breakdown_value: breakdownValue,
            impressions: parseInt(item.impressions) || 0,
            clicks: parseInt(item.clicks) || 0,
            spend: parseFloat(item.spend) || 0,
            conversions: itemConversions,
          });
        }
      }
    }

    return { metrics, breakdowns, disable: false, error: false };
  } catch (error) {
    console.error(`[${logId}] Erro ao processar campanha ${campaign.campaign_id}:`, error);
    return { metrics: [], breakdowns: [], disable: false, error: true };
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

    // Obter account_id do body
    const body = await req.json().catch(() => ({}));
    const accountId = body.account_id;

    if (!accountId) {
      return new Response(
        JSON.stringify({ success: false, error: 'account_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${logId}] Sincronizando métricas para conta ${accountId}`);

    // Verificar se a conta pertence ao usuário e está ativa
    const { data: account, error: accountError } = await supabaseClient
      .from('ad_accounts')
      .select(`
        id,
        account_id,
        account_name,
        is_active,
        integration_id,
        integrations!inner(id, user_id, provider, status)
      `)
      .eq('id', accountId)
      .eq('integrations.user_id', user.id)
      .eq('integrations.provider', 'meta')
      .eq('integrations.status', 'active')
      .single();

    if (accountError || !account) {
      console.error(`[${logId}] Conta não encontrada ou sem permissão:`, accountError);
      return new Response(
        JSON.stringify({ success: false, error: 'Conta não encontrada ou sem permissão' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se a conta está ativa
    if (!account.is_active) {
      console.log(`[${logId}] Conta ${account.account_name} está inativa, pulando sincronização`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Conta inativa',
          message: 'Esta conta foi marcada como inativa. Reconecte sua integração Meta Ads.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const integration = (account as any).integrations;
    const accessToken = await getValidAccessToken(supabaseClient, integration.id);

    // Testar acesso à conta antes de prosseguir
    const testUrl = `https://graph.facebook.com/v18.0/${account.account_id}?fields=id,name&access_token=${accessToken}`;
    const testRes = await fetch(testUrl);
    
    if (!testRes.ok) {
      const errorText = await testRes.text();
      if (errorText.includes('"code":100') || errorText.includes('does not exist') || errorText.includes('OAuthException')) {
        console.warn(`[${logId}] Sem acesso à conta ${account.account_name}, marcando como inativa`);
        await supabaseClient.from('ad_accounts').update({ is_active: false }).eq('id', accountId);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Sem acesso à conta',
            message: 'Você não tem mais acesso a esta conta de anúncios. A conta foi marcada como inativa.'
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Buscar apenas campanhas ativas com sync_enabled
    const { data: campaigns, error: campaignsError } = await supabaseClient
      .from('campaigns')
      .select('id, campaign_id, name, status')
      .eq('ad_account_id', accountId)
      .eq('sync_enabled', true)
      .in('status', ['ACTIVE', 'PAUSED']);

    if (campaignsError) {
      throw new Error('Erro ao buscar campanhas');
    }

    if (!campaigns || campaigns.length === 0) {
      console.log(`[${logId}] Nenhuma campanha ativa para sincronizar na conta ${account.account_name}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhuma campanha ativa para sincronizar.',
          account_name: account.account_name,
          metricsSynced: 0,
          breakdownsSynced: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[${logId}] Sincronizando ${campaigns.length} campanhas ativas da conta ${account.account_name}`);

    // Mapear ads
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

    // Processar campanhas em lotes
    const BATCH_SIZE = 3;
    for (let i = 0; i < campaigns.length; i += BATCH_SIZE) {
      const batch = campaigns.slice(i, i + BATCH_SIZE);
      
      const batchResults = await Promise.all(
        batch.map(campaign => processCampaign(campaign, accessToken, since, until, adIdMap, logId))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        if (result.disable) {
          campaignsToDisable.push(batch[j].id);
        }
        if (result.error) {
          errors++;
        }
        allMetrics.push(...result.metrics);
        allBreakdowns.push(...result.breakdowns);
      }

      if (i + BATCH_SIZE < campaigns.length) {
        await delay(300);
      }
    }

    console.log(`[${logId}] Total: ${allMetrics.length} métricas, ${allBreakdowns.length} breakdowns`);

    // Desabilitar campanhas inexistentes
    if (campaignsToDisable.length > 0) {
      await supabaseClient.from('campaigns').update({ sync_enabled: false }).in('id', campaignsToDisable);
    }

    // Upsert métricas
    let metricsSynced = 0;
    if (allMetrics.length > 0) {
      metricsSynced = await batchUpsertMetrics(supabaseClient, allMetrics);
    }

    // Upsert breakdowns
    let breakdownsSynced = 0;
    if (allBreakdowns.length > 0) {
      breakdownsSynced = await batchUpsertBreakdowns(supabaseClient, allBreakdowns);
    }

    const finishedAt = new Date();
    const duration = (finishedAt.getTime() - startedAt.getTime()) / 1000;

    console.log(`[${logId}] Concluído em ${duration}s: ${metricsSynced} métricas, ${breakdownsSynced} breakdowns`);

    return new Response(
      JSON.stringify({
        success: true,
        account_name: account.account_name,
        campaigns_processed: campaigns.length,
        campaigns_disabled: campaignsToDisable.length,
        metricsSynced,
        breakdownsSynced,
        errors,
        duration_seconds: duration,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error(`[${logId}] Erro:`, error.message);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
