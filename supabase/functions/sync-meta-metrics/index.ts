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
              // Log para debug: mostrar todas as actions disponíveis
              if (insight.actions && Array.isArray(insight.actions)) {
                const actionTypes = insight.actions.map((a: any) => a.action_type);
                console.log(`📊 Available action_types for ${campaign.name} on ${insight.date_start}:`, actionTypes);
              }
              
              // Processar ações (conversões, mensagens, resultados)
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
                  
                  // CONVERSÕES - Lista expandida de todos os tipos de conversão
                  const conversionTypes = [
                    'omni_purchase',
                    'purchase',
                    'app_custom_event.fb_mobile_purchase',
                    'offsite_conversion.fb_pixel_purchase',
                    'offsite_conversion.custom',
                    'offsite_conversion.fb_pixel_custom',
                    'onsite_conversion.post_save',
                    'lead',
                    'complete_registration',
                    'omni_complete_registration',
                    'app_install',
                    'omni_app_install',
                    'onsite_web_app_purchase',
                    'onsite_conversion.purchase',
                  ];
                  
                  if (conversionTypes.some(type => actionType.includes(type))) {
                    conversions += value;
                  }
                  
                  // MENSAGENS - Lista expandida para capturar conversas
                  const messageTypes = [
                    'messaging_conversation_started_7d',
                    'onsite_conversion.messaging_conversation_started_7d',
                    'messaging_first_reply',
                    'contact',
                    'contact_total',
                    'onsite_conversion.messaging_block',
                    'messaging_user_depth_3_7d',
                  ];
                  
                  if (messageTypes.some(type => actionType.includes(type))) {
                    messages += value;
                  }
                  
                  // RESULTADOS - Lista expandida baseada em objetivos comuns
                  const resultTypes = [
                    'lead_grouped',
                    'onsite_conversion.lead_grouped',
                    'offsite_conversion.fb_pixel_lead',
                    'link_click',
                    'post_engagement',
                    'page_engagement',
                    'post_reaction',
                    'comment',
                    'video_view',
                    'landing_page_view',
                    'onsite_web_lead',
                    'offsite_conversion.fb_pixel_view_content',
                    'onsite_conversion.messaging_conversation_started_7d',
                  ];
                  
                  if (resultTypes.some(type => actionType.includes(type))) {
                    results += value;
                  }
                  
                  // Extrair métricas específicas
                  if (actionType === 'link_click') linkClicks += value;
                  if (actionType === 'landing_page_view') pageViews += value;
                  if (actionType === 'initiate_checkout') initiatedCheckout += value;
                });
                
                // FALLBACK: Se não encontramos resultados específicos, usar o primeiro action disponível
                if (results === 0 && insight.actions.length > 0) {
                  // Prioridade: conversões > mensagens > primeira action disponível
                  if (conversions > 0) {
                    results = conversions;
                    console.log(`📊 Using conversions as results: ${results}`);
                  } else if (messages > 0) {
                    results = messages;
                    console.log(`📊 Using messages as results: ${results}`);
                  } else {
                    // Pegar a primeira action que não seja impression ou reach
                    const firstAction = insight.actions.find((a: any) => 
                      !['impression', 'reach', 'frequency'].includes(a.action_type)
                    );
                    if (firstAction) {
                      results = parseInt(firstAction.value || '0');
                      console.log(`📊 Using first action as results: ${firstAction.action_type} = ${results}`);
                    }
                  }
                }
              }

              // Processar cost_per_action_type
              if (insight.cost_per_action_type && Array.isArray(insight.cost_per_action_type)) {
                insight.cost_per_action_type.forEach((costAction: any) => {
                  const cost = parseFloat(costAction.value || '0');
                  const actionType = costAction.action_type;
                  
                  // Custo por resultado
                  const resultCostTypes = [
                    'lead_grouped',
                    'onsite_conversion.lead_grouped',
                    'offsite_conversion.fb_pixel_lead',
                    'link_click',
                    'post_engagement',
                    'page_engagement',
                    'landing_page_view',
                  ];
                  
                  if (resultCostTypes.some(type => actionType.includes(type)) && costPerResult === 0) {
                    costPerResult = cost;
                  }
                  
                  // Custo por mensagem
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

              // CALCULAR custos se não vieram da API
              if (costPerResult === 0 && results > 0 && insight.spend) {
                costPerResult = parseFloat(insight.spend) / results;
                console.log(`💰 Calculated cost per result: ${costPerResult.toFixed(2)}`);
              }

              if (costPerMessage === 0 && messages > 0 && insight.spend) {
                costPerMessage = parseFloat(insight.spend) / messages;
                console.log(`💰 Calculated cost per message: ${costPerMessage.toFixed(2)}`);
              }
              
              console.log(`[${logId}] Campanha ${campaign.name} - Data: ${insight.date_start} - Messages: ${messages}, Results: ${results}, Cost/Message: ${costPerMessage}, Cost/Result: ${costPerResult}`);

              const { error: upsertError } = await supabaseClient.from('metrics').upsert({
                campaign_id: campaign.id,
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
