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

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) throw new Error('Não autorizado');

    const { data: integration } = await supabaseClient
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('provider', 'meta')
      .eq('status', 'active')
      .single();

    if (!integration) throw new Error('Integração Meta não encontrada');

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

    let metricsSynced = 0;

    for (const campaign of campaigns || []) {
      try {
        const accountId = campaign.ad_accounts.account_id.replace('act_', '');
        
        // Buscar insights dos últimos 30 dias
        const date30DaysAgo = new Date();
        date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
        
        const insightsResponse = await fetch(
          `https://graph.facebook.com/v18.0/${campaign.campaign_id}/insights?` +
          `fields=date_start,impressions,clicks,spend,actions,ctr,cpc&` +
          `time_range={"since":"${date30DaysAgo.toISOString().split('T')[0]}","until":"${new Date().toISOString().split('T')[0]}"}&` +
          `time_increment=1&` +
          `access_token=${accessToken}`
        );

        if (insightsResponse.ok) {
          const { data: insights } = await insightsResponse.json();

          for (const insight of insights) {
            const conversions = insight.actions?.find((a: any) => a.action_type === 'offsite_conversion.fb_pixel_purchase')?.value || 0;
            const linkClicks = insight.actions?.find((a: any) => a.action_type === 'link_click')?.value || 0;

            await supabaseClient.from('metrics').upsert({
              campaign_id: campaign.id,
              date: insight.date_start,
              impressions: parseInt(insight.impressions) || 0,
              clicks: parseInt(insight.clicks) || 0,
              spend: parseFloat(insight.spend) || 0,
              conversions: parseInt(conversions) || 0,
              ctr: parseFloat(insight.ctr) || 0,
              cpc: parseFloat(insight.cpc) || 0,
              link_clicks: parseInt(linkClicks) || 0,
            }, {
              onConflict: 'campaign_id,date',
            });

            metricsSynced++;
          }
        }
      } catch (error) {
        console.error(`Erro ao sincronizar métricas da campanha ${campaign.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        metricsSynced,
        message: 'Métricas sincronizadas com sucesso',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
