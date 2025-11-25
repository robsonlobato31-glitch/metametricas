import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getValidAccessToken } from '../_shared/token-refresh.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logId = crypto.randomUUID();
  const startedAt = new Date();

  try {
    // Autenticar usuário
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Não autorizado');
    }

    console.log(`[${logId}] Sincronizando Google Ads para usuário ${user.id}`);

    // Buscar integração Google ativa
    const { data: integration, error: integrationError } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('status', 'active')
      .single();

    if (integrationError || !integration) {
      throw new Error('Integração Google Ads não encontrada');
    }

    // Criar log de sincronização
    await supabaseClient.from('sync_logs').insert({
      id: logId,
      integration_id: integration.id,
      function_name: 'sync-google-ads-data',
      status: 'running',
      started_at: startedAt.toISOString(),
    });

    // Obter token válido (renova se necessário)
    const accessToken = await getValidAccessToken(supabaseClient, integration.id);

    const DEVELOPER_TOKEN = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    
    if (!DEVELOPER_TOKEN) {
      console.warn('⚠️ GOOGLE_ADS_DEVELOPER_TOKEN não configurado. Funcionalidade limitada.');
      
      await supabaseClient.from('sync_logs').update({
        status: 'error',
        finished_at: new Date().toISOString(),
        error_message: 'GOOGLE_ADS_DEVELOPER_TOKEN não configurado',
      }).eq('id', logId);

      return new Response(
        JSON.stringify({
          error: 'GOOGLE_ADS_DEVELOPER_TOKEN não configurado',
          message: 'Configure o token de desenvolvedor do Google Ads para sincronizar dados',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Listar contas acessíveis
    const accountsResponse = await fetch(
      'https://googleads.googleapis.com/v14/customers:listAccessibleCustomers',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': DEVELOPER_TOKEN,
        },
      }
    );

    if (!accountsResponse.ok) {
      const error = await accountsResponse.text();
      throw new Error(`Erro ao listar contas Google Ads: ${error}`);
    }

    const { resourceNames } = await accountsResponse.json();
    const customerIds = resourceNames.map((name: string) => name.split('/')[1]);

    console.log(`[${logId}] Encontradas ${customerIds.length} contas Google Ads`);

    let accountsSynced = 0;
    let campaignsSynced = 0;
    let metricsSynced = 0;

    // Sincronizar cada conta
    for (const customerId of customerIds) {
      try {
        // Buscar detalhes da conta
        const accountDetailsResponse = await fetch(
          `https://googleads.googleapis.com/v14/customers/${customerId}/googleAds:search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': DEVELOPER_TOKEN,
              'login-customer-id': customerId,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `
                SELECT
                  customer.id,
                  customer.descriptive_name,
                  customer.currency_code,
                  customer.time_zone
                FROM customer
                LIMIT 1
              `,
            }),
          }
        );

        if (accountDetailsResponse.ok) {
          const { results } = await accountDetailsResponse.json();
          if (results && results.length > 0) {
            const customer = results[0].customer;

            // Upsert conta
            await supabaseClient.from('ad_accounts').upsert({
              integration_id: integration.id,
              account_id: customer.id.toString(),
              account_name: customer.descriptiveName || `Google Ads ${customer.id}`,
              provider: 'google',
              currency: customer.currencyCode || 'BRL',
              timezone: customer.timeZone,
              is_active: true,
            }, {
              onConflict: 'integration_id,account_id',
            });

            accountsSynced++;
            console.log(`[${logId}] Conta sincronizada: ${customer.descriptiveName}`);
          }
        }
      } catch (error) {
        console.error(`[${logId}] Erro ao sincronizar conta ${customerId}:`, error);
      }
    }

    // Atualizar log de sucesso
    await supabaseClient.from('sync_logs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      accounts_synced: accountsSynced,
      campaigns_synced: campaignsSynced,
      metrics_synced: metricsSynced,
    }).eq('id', logId);

    return new Response(
      JSON.stringify({
        success: true,
        accountsSynced,
        campaignsSynced,
        metricsSynced,
        message: 'Sincronização concluída com sucesso',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    console.error(`[${logId}] Erro na sincronização:`, error);

    // Atualizar log de erro
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    await supabaseClient.from('sync_logs').update({
      status: 'error',
      finished_at: new Date().toISOString(),
      error_message: error.message,
      error_details: { stack: error.stack },
    }).eq('id', logId);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
