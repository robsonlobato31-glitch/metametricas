import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getValidAccessToken } from '../_shared/token-refresh.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para batch upsert com tratamento de erros
async function batchUpsert(
  supabaseClient: any,
  table: string,
  data: any[],
  onConflict: string,
  batchSize = 50
) {
  let insertedCount = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const { error, data: result } = await supabaseClient
      .from(table)
      .upsert(batch, { onConflict, ignoreDuplicates: false })
      .select('id');
    
    if (error) {
      console.error(`Erro no batch upsert para tabela ${table}:`, error.message);
    } else {
      insertedCount += result?.length || batch.length;
    }
  }
  return insertedCount;
}

// Helper para delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Tempo máximo de execução (55 segundos para ter margem)
const MAX_EXECUTION_TIME = 55000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logId = crypto.randomUUID();
  const startedAt = new Date();
  const startTime = Date.now();

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Não autorizado');

    console.log(`[${logId}] Sincronizando Meta Ads para usuário ${user.id}`);

    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'meta')
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      console.log(`[${logId}] Nenhuma integração Meta Ads ativa encontrada`);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'no_integration',
          message: 'Nenhuma integração Meta Ads encontrada. Conecte sua conta Meta Ads primeiro.',
          accountsSynced: 0,
          campaignsSynced: 0,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    await supabaseClient.from('sync_logs').insert({
      id: logId,
      integration_id: integration.id,
      function_name: 'sync-meta-campaigns',
      status: 'running',
      started_at: startedAt.toISOString(),
    });

    const accessToken = await getValidAccessToken(supabaseClient, integration.id);

    // Buscar todas as ad accounts com paginação
    let allAdAccounts: any[] = [];
    let nextUrl: string | null = `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,currency,account_status&limit=50&access_token=${accessToken}`;

    while (nextUrl) {
      console.log(`[${logId}] Buscando contas Meta Ads...`);
      const meResponse: any = await fetch(nextUrl);

      if (!meResponse.ok) {
        const errorText = await meResponse.text();
        if (errorText.includes('Session has expired') || errorText.includes('OAuthException')) {
          await supabaseClient.from('integrations').update({ status: 'expired' }).eq('id', integration.id);
          console.error(`[${logId}] Token Meta expirado`);
        }
        throw new Error(`Erro ao buscar contas Meta: ${errorText}`);
      }

      const response: any = await meResponse.json();
      allAdAccounts = [...allAdAccounts, ...response.data];
      nextUrl = response.paging?.next || null;
    }

    console.log(`[${logId}] Total de ${allAdAccounts.length} contas Meta Ads encontradas`);

    let accountsSynced = 0;
    let campaignsSynced = 0;
    let adSetsSynced = 0;
    let adsSynced = 0;

    for (const account of allAdAccounts) {
      // Verificar tempo de execução
      if (Date.now() - startTime > MAX_EXECUTION_TIME) {
        console.warn(`[${logId}] Tempo máximo atingido, salvando progresso parcial`);
        break;
      }

      try {
        const accountId = account.id.replace('act_', '');

        // Upsert conta
        const { data: dbAccount, error: accountError } = await supabaseClient
          .from('ad_accounts')
          .upsert({
            integration_id: integration.id,
            account_id: account.id,
            account_name: account.name,
            provider: 'meta',
            currency: account.currency || 'BRL',
            is_active: account.account_status === 1,
          }, { onConflict: 'integration_id,account_id' })
          .select()
          .single();

        if (accountError || !dbAccount) {
          console.error(`[${logId}] Erro ao upsert conta ${account.id}:`, accountError?.message);
          continue;
        }

        accountsSynced++;

        // ===== BUSCAR CAMPANHAS =====
        let allCampaigns: any[] = [];
        let campaignsNextUrl: string | null = `https://graph.facebook.com/v18.0/act_${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=200&access_token=${accessToken}`;

        while (campaignsNextUrl) {
          const campaignsResponse: any = await fetch(campaignsNextUrl);
          if (campaignsResponse.ok) {
            const campaignsData: any = await campaignsResponse.json();
            allCampaigns = [...allCampaigns, ...campaignsData.data];
            campaignsNextUrl = campaignsData.paging?.next || null;
          } else {
            const errorText = await campaignsResponse.text();
            console.error(`[${logId}] Erro ao buscar campanhas da conta ${account.id}:`, errorText.substring(0, 200));
            campaignsNextUrl = null;
          }
        }

        console.log(`[${logId}] Conta ${account.name}: ${allCampaigns.length} campanhas`);

        // Batch upsert campanhas
        if (allCampaigns.length > 0) {
          const campaignsBatch = allCampaigns.map(campaign => ({
            ad_account_id: dbAccount.id,
            campaign_id: campaign.id,
            name: campaign.name,
            status: campaign.status,
            objective: campaign.objective,
            daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
            lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
            start_date: campaign.start_time ? new Date(campaign.start_time).toISOString().split('T')[0] : null,
            end_date: campaign.stop_time ? new Date(campaign.stop_time).toISOString().split('T')[0] : null,
            sync_enabled: true,
          }));

          await batchUpsert(supabaseClient, 'campaigns', campaignsBatch, 'ad_account_id,campaign_id');
          campaignsSynced += allCampaigns.length;
        }

        // Buscar campanhas do banco para obter IDs internos
        const { data: dbCampaigns } = await supabaseClient
          .from('campaigns')
          .select('id, campaign_id')
          .eq('ad_account_id', dbAccount.id);

        const campaignIdMap = new Map(dbCampaigns?.map(c => [c.campaign_id, c.id]) || []);

        // ===== BUSCAR AD SETS DIRETAMENTE DA CONTA (OTIMIZADO) =====
        console.log(`[${logId}] Buscando ad sets diretamente da conta ${account.name}...`);
        
        let allAdSets: any[] = [];
        let adSetsNextUrl: string | null = `https://graph.facebook.com/v18.0/act_${accountId}/adsets?fields=id,name,status,campaign_id,optimization_goal,billing_event,bid_amount,daily_budget,lifetime_budget,start_time,end_time,targeting&limit=200&access_token=${accessToken}`;

        while (adSetsNextUrl && (Date.now() - startTime < MAX_EXECUTION_TIME)) {
          const adSetsResponse: Response = await fetch(adSetsNextUrl);
          if (adSetsResponse.ok) {
            const adSetsData: any = await adSetsResponse.json();
            allAdSets = [...allAdSets, ...adSetsData.data];
            adSetsNextUrl = adSetsData.paging?.next || null;
          } else {
            const errorText = await adSetsResponse.text();
            console.error(`[${logId}] Erro ao buscar ad sets:`, errorText.substring(0, 150));
            adSetsNextUrl = null;
          }
        }

        console.log(`[${logId}] Conta ${account.name}: ${allAdSets.length} ad sets encontrados da API`);

        // Batch upsert ad sets
        if (allAdSets.length > 0) {
          const filteredAdSets = allAdSets.filter(adSet => campaignIdMap.has(adSet.campaign_id));
          console.log(`[${logId}] Ad sets filtrados: ${filteredAdSets.length}/${allAdSets.length} (match com campanhas)`);
          
          if (filteredAdSets.length === 0 && allAdSets.length > 0) {
            console.warn(`[${logId}] AVISO: Nenhum ad set correspondeu. Campaign IDs no mapa: ${Array.from(campaignIdMap.keys()).slice(0, 3).join(', ')}`);
            console.warn(`[${logId}] Ad set campaign_ids: ${allAdSets.slice(0, 3).map((as: any) => as.campaign_id).join(', ')}`);
          }
          
          const adSetsBatch = filteredAdSets.map((adSet: any) => ({
              campaign_id: campaignIdMap.get(adSet.campaign_id),
              ad_set_id: adSet.id,
              name: adSet.name,
              status: adSet.status,
              optimization_goal: adSet.optimization_goal,
              billing_event: adSet.billing_event,
              bid_amount: adSet.bid_amount ? parseFloat(adSet.bid_amount) / 100 : null,
              daily_budget: adSet.daily_budget ? parseFloat(adSet.daily_budget) / 100 : null,
              lifetime_budget: adSet.lifetime_budget ? parseFloat(adSet.lifetime_budget) / 100 : null,
              start_date: adSet.start_time ? new Date(adSet.start_time).toISOString().split('T')[0] : null,
              end_date: adSet.end_time ? new Date(adSet.end_time).toISOString().split('T')[0] : null,
              targeting: adSet.targeting || null,
            }));

          const insertedAdSets = await batchUpsert(supabaseClient, 'ad_sets', adSetsBatch, 'campaign_id,ad_set_id');
          adSetsSynced += insertedAdSets;
        }

        // Buscar ad sets do banco para obter IDs
        const { data: dbAdSets } = await supabaseClient
          .from('ad_sets')
          .select('id, ad_set_id')
          .in('campaign_id', Array.from(campaignIdMap.values()));

        const adSetIdMap = new Map(dbAdSets?.map(as => [as.ad_set_id, as.id]) || []);

        // ===== BUSCAR ADS DIRETAMENTE DA CONTA (OTIMIZADO) =====
        console.log(`[${logId}] Buscando ads diretamente da conta ${account.name}...`);
        
        let allAds: any[] = [];
        let adsNextUrl: string | null = `https://graph.facebook.com/v18.0/act_${accountId}/ads?fields=id,name,status,adset_id,creative{id,name,object_type,thumbnail_url,effective_object_story_id}&limit=200&access_token=${accessToken}`;

        while (adsNextUrl && (Date.now() - startTime < MAX_EXECUTION_TIME)) {
          const adsResponse: Response = await fetch(adsNextUrl);
          if (adsResponse.ok) {
            const adsData: any = await adsResponse.json();
            allAds = [...allAds, ...adsData.data];
            adsNextUrl = adsData.paging?.next || null;
          } else {
            const errorText = await adsResponse.text();
            console.error(`[${logId}] Erro ao buscar ads:`, errorText.substring(0, 150));
            adsNextUrl = null;
          }
        }

        console.log(`[${logId}] Conta ${account.name}: ${allAds.length} ads encontrados da API`);

        // Batch upsert ads
        if (allAds.length > 0) {
          const filteredAds = allAds.filter(ad => adSetIdMap.has(ad.adset_id));
          console.log(`[${logId}] Ads filtrados: ${filteredAds.length}/${allAds.length} (match com ad_sets existentes)`);
          
          if (filteredAds.length === 0 && allAds.length > 0) {
            console.warn(`[${logId}] AVISO: Nenhum ad correspondeu aos ad_sets. AdSet IDs no mapa: ${Array.from(adSetIdMap.keys()).slice(0, 5).join(', ')}...`);
            console.warn(`[${logId}] Ad adset_ids: ${allAds.slice(0, 5).map(a => a.adset_id).join(', ')}...`);
          }
          
          const adsBatch = filteredAds.map((ad: any) => ({
              ad_set_id: adSetIdMap.get(ad.adset_id),
              ad_id: ad.id,
              name: ad.name,
              status: ad.status,
              creative_id: ad.creative?.id || null,
              creative_name: ad.creative?.name || null,
              creative_type: ad.creative?.object_type || null,
              creative_url: ad.creative?.thumbnail_url || null,
              ad_format: ad.creative?.object_type || null,
            }));

          const insertedAds = await batchUpsert(supabaseClient, 'ads', adsBatch, 'ad_set_id,ad_id');
          adsSynced += insertedAds;
        }

        // Delay entre contas para evitar rate limit
        await delay(100);
      } catch (error) {
        console.error(`[${logId}] Erro ao sincronizar conta ${account.id}:`, error);
      }
    }

    await supabaseClient.from('sync_logs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      accounts_synced: accountsSynced,
      campaigns_synced: campaignsSynced,
    }).eq('id', logId);

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[${logId}] Sincronização concluída em ${executionTime}s: ${accountsSynced} contas, ${campaignsSynced} campanhas, ${adSetsSynced} ad sets, ${adsSynced} ads`);

    return new Response(
      JSON.stringify({
        success: true,
        accountsSynced,
        campaignsSynced,
        adSetsSynced,
        adsSynced,
        executionTime: `${executionTime}s`,
        message: `Campanhas Meta sincronizadas: ${campaignsSynced} campanhas, ${adSetsSynced} ad sets, ${adsSynced} ads`,
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
