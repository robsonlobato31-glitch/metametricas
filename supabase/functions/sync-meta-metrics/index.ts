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

    console.log(`[${logId}] Sincronizando métricas Meta para usuário ${user.id}`);

    const { data: integration } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'meta')
      .eq('status', 'active')
      .single();

    if (!integration) throw new Error('Integração Meta não encontrada');

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

    let metricsSynced = 0;
    let errors = 0;

    for (const campaign of campaigns) {
      try {
        // Buscar insights dos últimos 30 dias
        const date30DaysAgo = new Date();
        date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
        
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?` +
          `fields=date_start,impressions,clicks,spend,actions,action_values,cost_per_action_type,ctr,cpc&` +
          `time_range={"since":"${date30DaysAgo.toISOString().split('T')[0]}","until":"${new Date().toISOString().split('T')[0]}"}&` +
          `time_increment=1&` +
          `access_token=${accessToken}`
        );

        if (insightsResponse.ok) {
          const { data: insights } = await insightsResponse.json();

          if (insights && insights.length > 0) {
            for (const insight of insights) {
              const actions = insight.actions || [];
              const costPerActionType = insight.cost_per_action_type || [];
              
              const conversions = actions.find((a: any) => 
                a.action_type === 'offsite_conversion.fb_pixel_purchase' ||
                a.action_type === 'purchase'
              )?.value || 0;
              
              const linkClicks = actions.find((a: any) => a.action_type === 'link_click')?.value || 0;
              const pageViews = actions.find((a: any) => a.action_type === 'landing_page_view')?.value || 0;
              const initiatedCheckout = actions.find((a: any) => a.action_type === 'initiate_checkout')?.value || 0;
              
              // Extract results - general conversions based on campaign objective
              const results = actions.find((a: any) => 
                a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
                a.action_type === 'lead' ||
                a.action_type === 'purchase' ||
                a.action_type === 'omni_purchase' ||
                a.action_type === 'link_click' ||
                a.action_type === 'landing_page_view'
              )?.value || 0;
              
              // Extract messages
              const messages = actions.find((a: any) => 
                a.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
                a.action_type === 'onsite_conversion.messaging_first_reply'
              )?.value || 0;
              
              // Extract cost per result
              const costPerResult = costPerActionType.find((c: any) =>
                c.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
                c.action_type === 'lead' ||
                c.action_type === 'purchase' ||
                c.action_type === 'omni_purchase' ||
                c.action_type === 'link_click' ||
                c.action_type === 'landing_page_view'
              )?.value || 0;
              
              // Extract cost per message
              const costPerMessage = costPerActionType.find((c: any) =>
                c.action_type === 'onsite_conversion.messaging_conversation_started_7d' ||
                c.action_type === 'onsite_conversion.messaging_first_reply'
              )?.value || 0;

              const { error: upsertError } = await supabaseClient.from('metrics').upsert({
                campaign_id: campaign.id,
                date: insight.date_start,
                impressions: parseInt(insight.impressions) || 0,
                clicks: parseInt(insight.clicks) || 0,
                spend: parseFloat(insight.spend) || 0,
                conversions: parseInt(conversions) || 0,
                ctr: parseFloat(insight.ctr) || 0,
                cpc: parseFloat(insight.cpc) || 0,
                link_clicks: parseInt(linkClicks) || 0,
                page_views: parseInt(pageViews) || 0,
                initiated_checkout: parseInt(initiatedCheckout) || 0,
                purchases: parseInt(conversions) || 0,
                results: parseInt(results) || 0,
                messages: parseInt(messages) || 0,
                cost_per_result: parseFloat(costPerResult) || 0,
                cost_per_message: parseFloat(costPerMessage) || 0,
              }, {
                onConflict: 'campaign_id,date',
              });

              if (!upsertError) {
                metricsSynced++;
              } else {
                console.error(`[${logId}] Erro ao inserir métrica:`, upsertError);
                errors++;
              }
            }
          }
        } else {
          const errorText = await insightsResponse.text();
          
          // Check if it's an expired token error
          if (errorText.includes('Session has expired') || errorText.includes('OAuthException')) {
            // Mark integration as expired
            await supabaseClient
              .from('integrations')
              .update({ status: 'expired' })
              .eq('id', integration.id);
            
            console.error(`[${logId}] Token Meta expirado, marcando integração como expirada`);
            throw new Error('Token de acesso expirado. Por favor, reconecte sua conta Meta Ads.');
          }
          
          console.error(`[${logId}] Erro ao buscar insights da campanha ${campaign.name}:`, errorText);
          errors++;
        }
      } catch (error) {
        console.error(`[${logId}] Erro ao sincronizar métricas da campanha ${campaign.id}:`, error);
        errors++;
      }
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
