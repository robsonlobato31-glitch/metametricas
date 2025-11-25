import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncSchedule {
  id: string;
  user_id: string;
  provider: 'meta' | 'google';
  sync_type: 'campaigns' | 'metrics' | 'full';
  frequency: 'hourly' | 'daily' | 'weekly';
  last_sync_at: string | null;
  next_sync_at: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting scheduled sync processing...');

    // Get all active schedules that need syncing
    const now = new Date();
    const { data: schedules, error: schedulesError } = await supabase
      .from('sync_schedules')
      .select('*')
      .eq('is_active', true)
      .or(`next_sync_at.is.null,next_sync_at.lte.${now.toISOString()}`);

    if (schedulesError) {
      throw new Error(`Error fetching schedules: ${schedulesError.message}`);
    }

    console.log(`Found ${schedules?.length || 0} schedules to process`);

    const results: any[] = [];

    for (const schedule of schedules || []) {
      console.log(`Processing schedule ${schedule.id} for user ${schedule.user_id}`);

      try {
        // Get user's integrations
        const { data: integrations, error: intError } = await supabase
          .from('integrations')
          .select('*')
          .eq('user_id', schedule.user_id)
          .eq('provider', schedule.provider)
          .eq('status', 'active')
          .single();

        if (intError || !integrations) {
          console.log(`No active integration found for user ${schedule.user_id}, provider ${schedule.provider}`);
          continue;
        }

        // Determine which function to call
        let functionName = '';
        if (schedule.provider === 'meta') {
          if (schedule.sync_type === 'campaigns' || schedule.sync_type === 'full') {
            functionName = 'sync-meta-campaigns';
          } else if (schedule.sync_type === 'metrics') {
            functionName = 'sync-meta-metrics';
          }
        } else if (schedule.provider === 'google') {
          functionName = 'sync-google-ads-data';
        }

        if (!functionName) {
          console.log(`Unknown sync configuration: ${schedule.provider}/${schedule.sync_type}`);
          continue;
        }

        console.log(`Invoking ${functionName} for integration ${integrations.id}`);

        // Call the sync function
        const { data: syncResult, error: syncError } = await supabase.functions.invoke(
          functionName,
          {
            body: {
              integration_id: integrations.id,
              user_id: schedule.user_id,
            },
          }
        );

        if (syncError) {
          console.error(`Sync error for ${functionName}:`, syncError);
          results.push({
            schedule_id: schedule.id,
            success: false,
            error: syncError.message,
          });
          continue;
        }

        // Calculate next sync time based on frequency
        let nextSyncAt = new Date();
        switch (schedule.frequency) {
          case 'hourly':
            nextSyncAt.setHours(nextSyncAt.getHours() + 1);
            break;
          case 'daily':
            nextSyncAt.setDate(nextSyncAt.getDate() + 1);
            break;
          case 'weekly':
            nextSyncAt.setDate(nextSyncAt.getDate() + 7);
            break;
        }

        // Update schedule with last sync and next sync times
        const { error: updateError } = await supabase
          .from('sync_schedules')
          .update({
            last_sync_at: now.toISOString(),
            next_sync_at: nextSyncAt.toISOString(),
          })
          .eq('id', schedule.id);

        if (updateError) {
          console.error(`Error updating schedule ${schedule.id}:`, updateError);
        }

        results.push({
          schedule_id: schedule.id,
          success: true,
          function: functionName,
          result: syncResult,
        });

        console.log(`Successfully processed schedule ${schedule.id}`);
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        results.push({
          schedule_id: schedule.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    console.log('Scheduled sync processing completed');

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Fatal error in process-scheduled-syncs:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
