import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Integration {
  id: string;
  provider: 'meta' | 'google';
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  status: string;
}

/**
 * Obtém um access token válido, renovando se necessário
 * @param supabase Cliente Supabase
 * @param integrationId ID da integração
 * @returns Access token válido
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  integrationId: string
): Promise<string> {
  // Busca integração
  const { data: integration, error } = await supabase
    .from('integrations')
    .select('*')
    .eq('id', integrationId)
    .single();

  if (error || !integration) {
    throw new Error('Integração não encontrada');
  }

  const now = new Date();
  const expiresAt = integration.expires_at ? new Date(integration.expires_at) : null;
  const fiveMinutes = 5 * 60 * 1000;

  // Se não tem expires_at, assumir que pode estar expirado e tentar renovar
  if (expiresAt && (expiresAt.getTime() - now.getTime()) > fiveMinutes) {
    // Token ainda válido
    return integration.access_token;
  }

  // Se expires_at é null ou está próximo de expirar, tentar renovar
  if (!expiresAt) {
    console.log(`Token sem data de expiração para integração ${integrationId}, tentando usar token atual...`);
    return integration.access_token;
  }

  console.log(`Token expirando em breve, renovando para integração ${integrationId}...`);

  // Renovar token baseado no provider
  if (integration.provider === 'google') {
    return await renewGoogleToken(supabase, integration);
  } else if (integration.provider === 'meta') {
    return await renewMetaToken(supabase, integration);
  }

  return integration.access_token;
}

/**
 * Renova token do Google OAuth
 */
async function renewGoogleToken(
  supabase: SupabaseClient,
  integration: Integration
): Promise<string> {
  if (!integration.refresh_token) {
    throw new Error('Refresh token não disponível para Google');
  }

  const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
  const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Credenciais Google não configuradas');
  }

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: integration.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro ao renovar token Google:', error);
      throw new Error('Falha ao renovar token Google');
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600; // 1 hora padrão

    // Atualiza token no banco
    await supabase
      .from('integrations')
      .update({
        access_token: newAccessToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    console.log('Token Google renovado com sucesso');
    return newAccessToken;
  } catch (error) {
    console.error('Erro ao renovar token Google:', error);
    
    // Marca integração como expirada
    await supabase
      .from('integrations')
      .update({ status: 'expired' })
      .eq('id', integration.id);

    throw error;
  }
}

/**
 * Renova token do Meta Ads (long-lived token)
 */
async function renewMetaToken(
  supabase: SupabaseClient,
  integration: Integration
): Promise<string> {
  const FACEBOOK_APP_ID = Deno.env.get('FACEBOOK_APP_ID');
  const FACEBOOK_APP_SECRET = Deno.env.get('FACEBOOK_APP_SECRET');

  if (!FACEBOOK_APP_ID || !FACEBOOK_APP_SECRET) {
    throw new Error('Credenciais Meta não configuradas');
  }

  try {
    // Meta usa long-lived tokens (60 dias)
    const url = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `client_secret=${FACEBOOK_APP_SECRET}&` +
      `fb_exchange_token=${integration.access_token}`;

    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.text();
      console.error('Erro ao renovar token Meta:', error);
      throw new Error('Falha ao renovar token Meta');
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 5184000; // 60 dias padrão

    // Atualiza token no banco
    await supabase
      .from('integrations')
      .update({
        access_token: newAccessToken,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', integration.id);

    console.log('Token Meta renovado com sucesso');
    return newAccessToken;
  } catch (error) {
    console.error('Erro ao renovar token Meta:', error);
    
    // Marca integração como expirada
    await supabase
      .from('integrations')
      .update({ status: 'expired' })
      .eq('id', integration.id);

    throw error;
  }
}
