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
    // Inicializar cliente Supabase
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verificar se é uma chamada de serviço (Service Role)
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const isServiceRole = authHeader.includes(serviceRoleKey!);

    let user;
    let integrationId;

    if (isServiceRole) {
      const body = await req.json();
      integrationId = body.integration_id;
      if (!integrationId) throw new Error('integration_id obrigatório para chamadas de serviço');

      // Buscar usuário dono da integração
      const { data: integration, error } = await supabaseClient
        .from('integrations')
        .select('user_id')
        .eq('id', integrationId)
        .single();

      if (error || !integration) throw new Error('Integração não encontrada');
      user = { id: integration.user_id };
      console.log(`[${logId}] Execução via Service Role para integração ${integrationId}`);
    } else {
      // Autenticação normal de usuário
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !authUser) {
        throw new Error('Não autorizado');
      }
      user = authUser;
    }

    console.log(`[${logId}] Sincronizando Google Ads para usuário ${user.id}`);

    // Buscar integração Google ativa (se não fornecida via service role)
    let integration;
    if (integrationId) {
      const { data, error } = await supabaseClient
        .from('integrations')
        .select('*')
        .eq('id', integrationId)
        .single();
      integration = data;
    } else {
      const { data, error } = await supabaseClient
        .from('integrations')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', 'google')
        .eq('status', 'active')
        .single();
      integration = data;
    }

    if (!integration) {
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

    console.log(`[${logId}] Access token obtido (primeiros 20 chars): ${accessToken.substring(0, 20)}...`);

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

    console.log(`[${logId}] Developer token configurado: ${DEVELOPER_TOKEN.substring(0, 10)}...`);

    // Listar contas acessíveis
    console.log(`[${logId}] Chamando API Google Ads para listar contas...`);
    const accountsResponse = await fetch(
      'https://googleads.googleapis.com/v18/customers:listAccessibleCustomers',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': DEVELOPER_TOKEN,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`[${logId}] Resposta da API: Status ${accountsResponse.status}`);

    if (!accountsResponse.ok) {
      const error = await accountsResponse.text();
      console.error(`[${logId}] Erro da API Google Ads:`, error);
      throw new Error(`Erro ao listar contas Google Ads: ${error}`);
    }

    const { resourceNames } = await accountsResponse.json();
    const customerIds = resourceNames.map((name: string) => name.split('/')[1]);

    console.log(`[${logId}] Encontradas ${customerIds.length} contas Google Ads`);

    let accountsSynced = 0;
    let campaignsSynced = 0;
    let adGroupsSynced = 0;

    // Sincronizar cada conta
    for (const customerId of customerIds) {
      try {
        // Buscar detalhes da conta
        const accountDetailsResponse = await fetch(
          `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
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
            const { data: adAccount } = await supabaseClient.from('ad_accounts').upsert({
              integration_id: integration.id,
              account_id: customer.id.toString(),
              account_name: customer.descriptiveName || `Google Ads ${customer.id}`,
              provider: 'google',
              currency: customer.currencyCode || 'BRL',
              timezone: customer.timeZone,
              is_active: true,
            }, {
              onConflict: 'integration_id,account_id',
            }).select().single();

            accountsSynced++;
            console.log(`[${logId}] Conta sincronizada: ${customer.descriptiveName}`);

            // Sincronizar campanhas desta conta
            if (adAccount) {
              const campaignsResponse = await fetch(
                `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
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
                        campaign.id,
                        campaign.name,
                        campaign.status,
                        campaign.advertising_channel_type,
                        campaign.bidding_strategy_type,
                        campaign_budget.amount_micros,
                        campaign.start_date,
                        campaign.end_date
                      FROM campaign
                      WHERE campaign.status IN ('ENABLED', 'PAUSED')
                      ORDER BY campaign.name
                    `,
                  }),
                }
              );

              if (campaignsResponse.ok) {
                const campaignsData = await campaignsResponse.json();

                if (campaignsData.results && campaignsData.results.length > 0) {
                  for (const result of campaignsData.results) {
                    const campaign = result.campaign;
                    const budget = result.campaignBudget;

                    try {
                      // Converter status
                      const statusMap: Record<string, string> = {
                        'ENABLED': 'ACTIVE',
                        'PAUSED': 'PAUSED',
                        'REMOVED': 'DELETED',
                      };

                      // Converter budget de micros para valor normal
                      const budgetAmount = budget?.amountMicros
                        ? parseFloat(budget.amountMicros) / 1000000
                        : null;

                      // Upsert campanha
                      const { data: campaignData } = await supabaseClient
                        .from('campaigns')
                        .upsert({
                          ad_account_id: adAccount.id,
                          campaign_id: campaign.id.toString(),
                          name: campaign.name,
                          status: statusMap[campaign.status] || 'PAUSED',
                          objective: campaign.advertisingChannelType,
                          daily_budget: budgetAmount,
                          start_date: campaign.startDate || null,
                          end_date: campaign.endDate || null,
                        }, {
                          onConflict: 'ad_account_id,campaign_id',
                        })
                        .select()
                        .single();

                      campaignsSynced++;
                      console.log(`[${logId}] Campanha sincronizada: ${campaign.name}`);

                      // Sincronizar grupos de anúncios desta campanha
                      if (campaignData) {
                        const adGroupsResponse = await fetch(
                          `https://googleads.googleapis.com/v18/customers/${customerId}/googleAds:search`,
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
                                  ad_group.id,
                                  ad_group.name,
                                  ad_group.status,
                                  ad_group.type,
                                  ad_group.cpc_bid_micros
                                FROM ad_group
                                WHERE campaign.id = ${campaign.id}
                                  AND ad_group.status IN ('ENABLED', 'PAUSED')
                                ORDER BY ad_group.name
                              `,
                            }),
                          }
                        );

                        if (adGroupsResponse.ok) {
                          const adGroupsData = await adGroupsResponse.json();

                          if (adGroupsData.results && adGroupsData.results.length > 0) {
                            for (const agResult of adGroupsData.results) {
                              const adGroup = agResult.adGroup;

                              try {
                                await supabaseClient
                                  .from('ad_groups')
                                  .upsert({
                                    campaign_id: campaignData.id,
                                    ad_group_id: adGroup.id.toString(),
                                    name: adGroup.name,
                                    status: statusMap[adGroup.status] || 'PAUSED',
                                    type: adGroup.type,
                                    cpc_bid_micros: adGroup.cpcBidMicros || null,
                                  }, {
                                    onConflict: 'campaign_id,ad_group_id',
                                  });

                                adGroupsSynced++;
                              } catch (agError) {
                                console.error(`[${logId}] Erro ao sincronizar grupo de anúncios ${adGroup.name}:`, agError);
                              }
                            }
                          }
                        }
                      }
                    } catch (campaignError) {
                      console.error(`[${logId}] Erro ao sincronizar campanha ${campaign.name}:`, campaignError);
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`[${logId}] Erro ao sincronizar conta ${customerId}:`, error);
      }
    }

    console.log(`[${logId}] Sincronização concluída: ${accountsSynced} contas, ${campaignsSynced} campanhas, ${adGroupsSynced} grupos de anúncios`);

    // Atualizar log de sucesso
    await supabaseClient.from('sync_logs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      accounts_synced: accountsSynced,
      campaigns_synced: campaignsSynced,
      metrics_synced: adGroupsSynced, // Usando este campo para ad groups temporariamente
    }).eq('id', logId);

    return new Response(
      JSON.stringify({
        success: true,
        accountsSynced,
        campaignsSynced,
        adGroupsSynced,
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
