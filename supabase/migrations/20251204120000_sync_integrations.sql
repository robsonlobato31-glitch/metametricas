-- Função para sincronizar tokens do auth.identities para public.integrations
CREATE OR REPLACE FUNCTION public.handle_new_integration()
RETURNS TRIGGER AS $$
DECLARE
  v_provider public.integration_provider;
  v_access_token text;
  v_refresh_token text;
BEGIN
  -- Mapear provider
  IF NEW.provider = 'google' THEN
    v_provider := 'google';
  ELSIF NEW.provider = 'facebook' THEN
    v_provider := 'meta';
  ELSE
    RETURN NEW;
  END IF;

  -- Extrair tokens
  v_access_token := NEW.identity_data->>'provider_access_token';
  v_refresh_token := NEW.identity_data->>'provider_refresh_token';

  -- Se não tem access token, não faz nada
  IF v_access_token IS NULL THEN
    RETURN NEW;
  END IF;

  -- Inserir ou atualizar integração
  INSERT INTO public.integrations (
    user_id, 
    provider, 
    access_token, 
    refresh_token, 
    status, 
    updated_at
  )
  VALUES (
    NEW.user_id,
    v_provider,
    v_access_token,
    v_refresh_token,
    'active',
    now()
  )
  ON CONFLICT (user_id, provider)
  DO UPDATE SET
    access_token = EXCLUDED.access_token,
    -- Só atualiza refresh token se vier um novo (Google nem sempre manda)
    refresh_token = COALESCE(EXCLUDED.refresh_token, public.integrations.refresh_token),
    status = 'active',
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remover trigger se já existir para evitar duplicidade
DROP TRIGGER IF EXISTS on_auth_identity_created ON auth.identities;

-- Criar trigger
CREATE TRIGGER on_auth_identity_created
  AFTER INSERT OR UPDATE ON auth.identities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_integration();
