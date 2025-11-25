import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getValidAccessToken } from '../_shared/token-refresh.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      throw new Error('Integração Meta Ads não encontrada');
    }

    await supabaseClient.from('sync_logs').insert({
      id: logId,
      integration_id: integration.id,
      function_name: 'sync-meta-campaigns',
      status: 'running',
      started_at: startedAt.toISOString(),
    });

    const accessToken = await getValidAccessToken(supabaseClient, integration.id);

    // Buscar ad accounts do usuário
    const meResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,currency,account_status&access_token=${accessToken}`
    );

    if (!meResponse.ok) {
      const errorText = await meResponse.text();
      
      // Check if it's an expired token error
      if (errorText.includes('Session has expired') || errorText.includes('OAuthException')) {
        // Mark integration as expired
        await supabaseClient
          .from('integrations')
          .update({ status: 'expired' })
          .eq('id', integration.id);
        
        console.error(`[${logId}] Token Meta expirado, marcando integração como expirada`);
      }
      
      throw new Error(`Erro ao buscar contas Meta: ${errorText}`);
    }

    const { data: adAccounts } = await meResponse.json();
    console.log(`[${logId}] Encontradas ${adAccounts.length} contas Meta Ads`);

    let accountsSynced = 0;
    let campaignsSynced = 0;

    for (const account of adAccounts) {
      try {
        const accountId = account.id.replace('act_', '');

        // Upsert conta
        const { data: dbAccount } = await supabaseClient
          .from('ad_accounts')
          .upsert({
            integration_id: integration.id,
            account_id: account.id,
            account_name: account.name,
            provider: 'meta',
            currency: account.currency || 'BRL',
            is_active: account.account_status === 1,
          }, {
            onConflict: 'integration_id,account_id',
          })
          .select()
          .single();

        accountsSynced++;

        if (!dbAccount) continue;

        // Buscar campanhas da conta
        const campaignsResponse = await fetch(
          `https://graph.facebook.com/v18.0/act_${accountId}/campaigns?` +
          `fields=id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time&` +
          `access_token=${accessToken}`
        );

        if (campaignsResponse.ok) {
          const { data: campaigns } = await campaignsResponse.json();

          for (const campaign of campaigns) {
            await supabaseClient.from('campaigns').upsert({
              ad_account_id: dbAccount.id,
              campaign_id: campaign.id,
              name: campaign.name,
              status: campaign.status,
              objective: campaign.objective,
              daily_budget: campaign.daily_budget ? parseFloat(campaign.daily_budget) / 100 : null,
              lifetime_budget: campaign.lifetime_budget ? parseFloat(campaign.lifetime_budget) / 100 : null,
              start_date: campaign.start_time ? new Date(campaign.start_time).toISOString().split('T')[0] : null,
              end_date: campaign.stop_time ? new Date(campaign.stop_time).toISOString().split('T')[0] : null,
            }, {
              onConflict: 'ad_account_id,campaign_id',
            });

            campaignsSynced++;
          }
        }
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

    return new Response(
      JSON.stringify({
        success: true,
        accountsSynced,
        campaignsSynced,
        message: 'Campanhas Meta sincronizadas com sucesso',
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
