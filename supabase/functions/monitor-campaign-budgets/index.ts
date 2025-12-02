import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Campaign {
  id: string;
  name: string;
  campaign_id: string;
  daily_budget: number | null;
  lifetime_budget: number | null;
  status: string;
  ad_account_id: string;
}

interface Metric {
  campaign_id: string;
  spend: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔍 Starting budget monitoring...');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active campaigns with budgets
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('id, name, campaign_id, daily_budget, lifetime_budget, status, ad_account_id')
      .eq('status', 'ACTIVE')
      .not('daily_budget', 'is', null);

    if (campaignsError) {
      console.error('Error fetching campaigns:', campaignsError);
      throw campaignsError;
    }

    console.log(`📊 Found ${campaigns?.length || 0} active campaigns with budgets`);

    if (!campaigns || campaigns.length === 0) {
      // Even with no campaigns, update existing alerts
      const { error: updateAllError } = await supabase
        .from('campaign_alerts')
        .update({ current_amount: 0 })
        .eq('is_active', true);
      
      if (updateAllError) {
        console.error('Error updating alerts:', updateAllError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active campaigns with budgets found',
          campaigns_checked: 0,
          alerts_created: 0,
          alerts_updated: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let alertsCreated = 0;
    let alertsUpdated = 0;
    const thresholds = [80, 90, 100]; // Percentages to check

    // Process each campaign
    for (const campaign of campaigns) {
      console.log(`\n🔎 Checking campaign: ${campaign.name} (${campaign.id})`);

      // Calculate current spend (sum of all metrics)
      const { data: metrics, error: metricsError } = await supabase
        .from('metrics')
        .select('spend')
        .eq('campaign_id', campaign.id);

      if (metricsError) {
        console.error(`Error fetching metrics for campaign ${campaign.id}:`, metricsError);
        continue;
      }

      const currentSpend = metrics?.reduce((sum, m) => sum + Number(m.spend || 0), 0) || 0;
      const budget = campaign.daily_budget || campaign.lifetime_budget || 0;

      if (budget === 0) {
        console.log(`⏭️ Skipping campaign ${campaign.name}: no budget set`);
        continue;
      }

      const percentage = (currentSpend / budget) * 100;
      console.log(`💰 Campaign spend: ${currentSpend.toFixed(2)} / ${budget} (${percentage.toFixed(1)}%)`);

      // UPDATE: Update current_amount for ALL existing active alerts of this campaign
      const { data: existingCampaignAlerts, error: existingAlertsError } = await supabase
        .from('campaign_alerts')
        .select('id')
        .eq('campaign_id', campaign.id)
        .eq('is_active', true);

      if (!existingAlertsError && existingCampaignAlerts && existingCampaignAlerts.length > 0) {
        const { error: updateError } = await supabase
          .from('campaign_alerts')
          .update({ current_amount: currentSpend })
          .eq('campaign_id', campaign.id)
          .eq('is_active', true);

        if (updateError) {
          console.error(`Error updating alerts for campaign ${campaign.id}:`, updateError);
        } else {
          alertsUpdated += existingCampaignAlerts.length;
          console.log(`🔄 Updated ${existingCampaignAlerts.length} existing alerts with current spend: ${currentSpend.toFixed(2)}`);
        }
      }

      // Check each threshold for creating NEW alerts
      for (const threshold of thresholds) {
        if (percentage >= threshold) {
          console.log(`⚠️ Campaign reached ${threshold}% threshold`);

          // Check if alert already exists for this threshold
          const { data: existingAlerts, error: alertCheckError } = await supabase
            .from('campaign_alerts')
            .select('id')
            .eq('campaign_id', campaign.id)
            .eq('threshold_amount', budget * (threshold / 100))
            .eq('is_active', true);

          if (alertCheckError) {
            console.error('Error checking existing alerts:', alertCheckError);
            continue;
          }

          if (existingAlerts && existingAlerts.length > 0) {
            console.log(`ℹ️ Alert already exists for ${threshold}% threshold, skipping creation...`);
            continue;
          }

          // Create new alert
          const { error: insertError } = await supabase
            .from('campaign_alerts')
            .insert({
              campaign_id: campaign.id,
              alert_type: `budget_${threshold}_percent`,
              threshold_amount: budget * (threshold / 100),
              current_amount: currentSpend,
              is_active: true,
              triggered_at: new Date().toISOString(),
            });

          if (insertError) {
            console.error(`Error creating alert for campaign ${campaign.id}:`, insertError);
            continue;
          }

          console.log(`✅ Alert created for campaign ${campaign.name} at ${threshold}% threshold`);
          alertsCreated++;
        }
      }
    }

    console.log(`\n🎉 Budget monitoring completed. Created ${alertsCreated} new alerts, updated ${alertsUpdated} existing alerts.`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Budget monitoring completed',
        campaigns_checked: campaigns.length,
        alerts_created: alertsCreated,
        alerts_updated: alertsUpdated,
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Error in budget monitoring:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
