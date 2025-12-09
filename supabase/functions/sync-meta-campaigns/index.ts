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

        // Buscar campanhas
        let allCampaigns: any[] = [];
        let campaignsNextUrl: string | null = `https://graph.facebook.com/v18.0/act_${accountId}/campaigns?fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&limit=200&access_token=${accessToken}`;

        while (campaignsNextUrl) {
          const campaignsResponse: any = await fetch(campaignsNextUrl);
          if (campaignsResponse.ok) {
            const campaignsData: any = await campaignsResponse.json();
            allCampaigns = [...allCampaigns, ...campaignsData.data];
            campaignsNextUrl = campaignsData.paging?.next || null;
          } else {
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

        // Processar ad sets e ads para cada campanha (limitado para evitar timeout)
        const campaignsToProcess = allCampaigns.slice(0, 30);
        
        for (const campaign of campaignsToProcess) {
          try {
            const dbCampaignId = campaignIdMap.get(campaign.id);
            if (!dbCampaignId) continue;

            // Buscar ad sets
            const adSetsUrl = `https://graph.facebook.com/v18.0/${campaign.id}/adsets?fields=id,name,status,optimization_goal,billing_event,bid_amount,daily_budget,lifetime_budget,start_time,end_time,targeting&limit=100&access_token=${accessToken}`;
            const adSetsResponse = await fetch(adSetsUrl);

            if (!adSetsResponse.ok) continue;

            const adSetsData = await adSetsResponse.json();
            const allAdSets = adSetsData.data || [];

            if (allAdSets.length > 0) {
              const adSetsBatch = allAdSets.map((adSet: any) => ({
                campaign_id: dbCampaignId,
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

              await batchUpsert(supabaseClient, 'ad_sets', adSetsBatch, 'campaign_id,ad_set_id');
              adSetsSynced += allAdSets.length;
            }

            // Buscar ad sets do banco para obter IDs
            const { data: dbAdSets } = await supabaseClient
              .from('ad_sets')
              .select('id, ad_set_id')
              .eq('campaign_id', dbCampaignId);

            const adSetIdMap = new Map(dbAdSets?.map(as => [as.ad_set_id, as.id]) || []);

            // Buscar ads para cada ad set
            for (const adSet of allAdSets.slice(0, 15)) {
              try {
                const dbAdSetId = adSetIdMap.get(adSet.id);
                if (!dbAdSetId) continue;

                // Buscar ads com creative thumbnail
                const adsUrl = `https://graph.facebook.com/v18.0/${adSet.id}/ads?fields=id,name,status,creative{id,name,object_type,thumbnail_url,effective_object_story_id}&limit=50&access_token=${accessToken}`;
                const adsResponse = await fetch(adsUrl);

                if (!adsResponse.ok) continue;

                const adsData = await adsResponse.json();
                const allAds = adsData.data || [];

                if (allAds.length > 0) {
                  const adsBatch = allAds.map((ad: any) => ({
                    ad_set_id: dbAdSetId,
                    ad_id: ad.id,
                    name: ad.name,
                    status: ad.status,
                    creative_id: ad.creative?.id || null,
                    creative_name: ad.creative?.name || null,
                    creative_type: ad.creative?.object_type || null,
                    creative_url: ad.creative?.thumbnail_url || null,
                    ad_format: ad.creative?.object_type || null,
                  }));

                  await batchUpsert(supabaseClient, 'ads', adsBatch, 'ad_set_id,ad_id');
                  adsSynced += allAds.length;
                }
              } catch (error) {
                console.error(`[${logId}] Erro ao sincronizar ads do ad set ${adSet.id}:`, error);
              }
            }

            // Delay entre campanhas para evitar rate limit
            await delay(100);
          } catch (error) {
            console.error(`[${logId}] Erro ao sincronizar ad sets da campanha ${campaign.id}:`, error);
          }
        }

        // Delay entre contas
        await delay(200);
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

    console.log(`[${logId}] Sincronização concluída: ${accountsSynced} contas, ${campaignsSynced} campanhas, ${adSetsSynced} ad sets, ${adsSynced} ads`);

    return new Response(
      JSON.stringify({
        success: true,
        accountsSynced,
        campaignsSynced,
        adSetsSynced,
        adsSynced,
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
