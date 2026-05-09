-- 1. LIMPEZA DE FUNÇÕES EXISTENTES (Para evitar erro de tipo de retorno)
DROP FUNCTION IF EXISTS public.increment_vibe(INTEGER, TEXT);
DROP FUNCTION IF EXISTS public.claim_daily_dew(INTEGER);
DROP FUNCTION IF EXISTS public.handle_post_zap(UUID, UUID, UUID);

-- 2. ADICIONAR COLUNA PARA CONTROLE DO ORVALHO DIÁRIO
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_dew_claim TIMESTAMP WITH TIME ZONE;

-- 2. FUNÇÃO: INCREMENTAR VIBE (RECOMPENSA BASE)
CREATE OR REPLACE FUNCTION public.increment_vibe(amount_to_add INTEGER, reward_type TEXT) 
RETURNS JSON AS $$
DECLARE
    user_id UUID := auth.uid();
    current_balance INTEGER;
BEGIN
    UPDATE public.profiles 
    SET vibes = vibes + amount_to_add 
    WHERE id = user_id 
    RETURNING vibes INTO current_balance;
    
    RETURN json_build_object('success', true, 'new_balance', current_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNÇÃO: COLETAR ORVALHO DIÁRIO (+6 VIBES)
CREATE OR REPLACE FUNCTION public.claim_daily_dew(dew_amount INTEGER) 
RETURNS JSON AS $$
DECLARE
    user_id UUID := auth.uid();
    last_claim TIMESTAMP WITH TIME ZONE;
    current_balance INTEGER;
BEGIN
    SELECT last_dew_claim INTO last_claim FROM public.profiles WHERE id = user_id;
    
    -- Se nunca coletou ou coletou em um dia anterior
    IF last_claim IS NULL OR last_claim < CURRENT_DATE THEN
        UPDATE public.profiles 
        SET vibes = vibes + dew_amount, 
            last_dew_claim = NOW() 
        WHERE id = user_id 
        RETURNING vibes INTO current_balance;
        
        RETURN json_build_object('success', true, 'new_balance', current_balance);
    ELSE
        RETURN json_build_object('success', false, 'message', 'Orvalho já coletado hoje.');
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNÇÃO: HANDLE POST ZAP (LIKE COM TRANSFERÊNCIA)
CREATE OR REPLACE FUNCTION public.handle_post_zap(target_post_id UUID, donor_id UUID, author_id UUID) 
RETURNS JSON AS $$
BEGIN
    -- Reutiliza a função transfer_vibe existente no seu schema
    RETURN public.transfer_vibe(author_id, 1, target_post_id, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. AJUSTE: TRANSFER_VIBE (GARANTIR COMPATIBILIDADE)
-- Se a função transfer_vibe já existe, garantimos que ela retorne o formato esperado
-- (A que está no SUPABASE_SCHEMA.sql já parece correta, exceto pelo nome dos parâmetros se houver conflito)
