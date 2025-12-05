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
      const { data: { user: authUser }, error: authError } = await supabaseClient.auth.getUser();
      if (authError || !authUser) throw new Error('Não autorizado');
      user = authUser;
    }

    console.log(`[${logId}] Sincronizando métricas Google Ads para usuário ${user.id}`);

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

    if (!integration) throw new Error('Integração Google Ads não encontrada');

    await supabaseClient.from('sync_logs').insert({
      id: logId,
      integration_id: integration.id,
      function_name: 'sync-google-ads-metrics',
      status: 'running',
      started_at: startedAt.toISOString(),
    });

    const accessToken = await getValidAccessToken(supabaseClient, integration.id);

    // Buscar campanhas do usuário
    const { data: campaigns } = await supabaseClient
      .from('campaigns')
      .select(`
        *,
        ad_accounts!inner(
          integration_id,
          account_id
        )
      `)
      .eq('ad_accounts.integration_id', integration.id);

    if (!campaigns || campaigns.length === 0) {
      throw new Error('Nenhuma campanha encontrada. Sincronize as campanhas primeiro.');
    }

    console.log(`[${logId}] Encontradas ${campaigns.length} campanhas para sincronizar métricas`);

    // Definir período (últimos 30 dias por padrão)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    const startDateStr = formatDate(startDate);
    const endDateStr = formatDate(endDate);

    console.log(`[${logId}] Buscando métricas de ${startDateStr} a ${endDateStr}`);

    const DEVELOPER_TOKEN = Deno.env.get('GOOGLE_ADS_DEVELOPER_TOKEN');
    if (!DEVELOPER_TOKEN) throw new Error('GOOGLE_ADS_DEVELOPER_TOKEN não configurado');

    let metricsSynced = 0;
    let errors = 0;

    // Agrupar campanhas por conta para otimizar chamadas
    const campaignsByAccount: Record<string, any[]> = {};
    campaigns.forEach(c => {
      const accountId = c.ad_accounts.account_id;
      if (!campaignsByAccount[accountId]) {
        campaignsByAccount[accountId] = [];
      }
      campaignsByAccount[accountId].push(c);
    });

    // Processar por conta
    for (const [accountId, accountCampaigns] of Object.entries(campaignsByAccount)) {
      try {
        console.log(`[${logId}] Processando conta ${accountId} (${accountCampaigns.length} campanhas)`);

        const response = await fetch(
          `https://googleads.googleapis.com/v18/customers/${accountId}/googleAds:search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'developer-token': DEVELOPER_TOKEN,
              'login-customer-id': accountId,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: `
                SELECT
                  campaign.id,
                  segments.date,
                  metrics.impressions,
                  metrics.clicks,
                  metrics.cost_micros,
                  metrics.conversions,
                  metrics.ctr,
                  metrics.average_cpc,
                  metrics.conversions_value,
                  metrics.video_views,
                  metrics.video_view_rate
                FROM campaign
                WHERE segments.date BETWEEN '${startDateStr}' AND '${endDateStr}'
                  AND campaign.status != 'REMOVED'
              `,
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[${logId}] Erro na API Google Ads para conta ${accountId}:`, errorText);
          errors++;
          continue;
        }

        const { results } = await response.json();

        if (results && results.length > 0) {
          console.log(`[${logId}] Encontrados ${results.length} registros de métricas para conta ${accountId}`);

          // Mapear IDs de campanha do Google para UUIDs do banco
          const campaignMap = new Map(
            accountCampaigns.map(c => [c.campaign_id, c.id])
          );

          const metricsToUpsert = [];

          for (const row of results) {
            const googleCampaignId = row.campaign.id.toString();
            const dbCampaignId = campaignMap.get(googleCampaignId);

            if (dbCampaignId) {
              const m = row.metrics;

              metricsToUpsert.push({
                campaign_id: dbCampaignId,
                date: row.segments.date,
                impressions: parseInt(m.impressions || '0'),
                clicks: parseInt(m.clicks || '0'),
                spend: parseFloat(m.costMicros || '0') / 1000000,
                conversions: parseFloat(m.conversions || '0'),
                ctr: parseFloat(m.ctr || '0'),
                cpc: parseFloat(m.averageCpc || '0') / 1000000,
                conversion_value: parseFloat(m.conversionsValue || '0'),
                video_views: parseInt(m.videoViews || '0'),
                video_view_rate: parseFloat(m.videoViewRate || '0'),
                updated_at: new Date().toISOString(),
              });
            }
          }

          // Upsert em lotes de 100
          for (let i = 0; i < metricsToUpsert.length; i += 100) {
            const batch = metricsToUpsert.slice(i, i + 100);
            const { error: upsertError } = await supabaseClient
              .from('metrics')
              .upsert(batch, {
                onConflict: 'campaign_id,date',
              });

            if (upsertError) {
              console.error(`[${logId}] Erro ao salvar métricas:`, upsertError);
              errors++;
            } else {
              metricsSynced += batch.length;
            }
          }
        }
      } catch (err) {
        console.error(`[${logId}] Erro ao processar conta ${accountId}:`, err);
        errors++;
      }
    }

    console.log(`[${logId}] Sincronização concluída: ${metricsSynced} métricas salvas`);

    await supabaseClient.from('sync_logs').update({
      status: errors > 0 ? 'warning' : 'success',
      finished_at: new Date().toISOString(),
      metrics_synced: metricsSynced,
      error_message: errors > 0 ? `Ocorreram ${errors} erros durante a sincronização` : null,
    }).eq('id', logId);

    return new Response(
      JSON.stringify({
        success: true,
        metricsSynced,
        errors,
        message: 'Sincronização de métricas concluída',
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
