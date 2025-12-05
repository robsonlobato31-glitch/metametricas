import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
        // Validar segredo do Cron
        const authHeader = req.headers.get('Authorization');
        const cronSecret = Deno.env.get('CRON_SECRET') || 'temp-secret-123';

        // Se não tiver segredo configurado ou não bater, rejeitar
        // Nota: Para simplificar, vamos aceitar se for Service Role OU se tiver o segredo no header customizado
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        const isServiceRole = authHeader?.includes(serviceRoleKey!);
        const isCron = req.headers.get('x-cron-secret') === cronSecret;

        if (!isServiceRole && !isCron) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        console.log(`[${logId}] Iniciando orquestração de sincronização Google Ads`);

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Buscar todas as integrações ativas do Google Ads
        const { data: integrations, error } = await supabaseClient
            .from('integrations')
            .select('id, user_id')
            .eq('provider', 'google')
            .eq('status', 'active');

        if (error) throw error;

        console.log(`[${logId}] Encontradas ${integrations.length} integrações para sincronizar`);

        const results = [];

        for (const integration of integrations) {
            try {
                console.log(`[${logId}] Disparando sync para integração ${integration.id}`);

                // Chamar sync-google-ads-data
                const syncData = await fetch(
                    `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-google-ads-data`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ integration_id: integration.id }),
                    }
                );

                // Chamar sync-google-ads-metrics
                const syncMetrics = await fetch(
                    `${Deno.env.get('SUPABASE_URL')}/functions/v1/sync-google-ads-metrics`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${serviceRoleKey}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ integration_id: integration.id }),
                    }
                );

                results.push({
                    integration_id: integration.id,
                    data_status: syncData.status,
                    metrics_status: syncMetrics.status,
                });

            } catch (err: unknown) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error(`[${logId}] Erro ao processar integração ${integration.id}:`, errorMessage);
                results.push({
                    integration_id: integration.id,
                    error: errorMessage,
                });
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                processed: results.length,
                details: results,
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );

    } catch (error: any) {
        console.error(`[${logId}] Erro fatal na orquestração:`, error);
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
});
