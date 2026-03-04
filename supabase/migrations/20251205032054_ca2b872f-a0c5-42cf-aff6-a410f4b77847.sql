-- Create a secure function to validate invite codes without exposing profile data
CREATE OR REPLACE FUNCTION public.validate_invite_code(code TEXT)
RETURNS TABLE (is_valid BOOLEAN, is_already_used BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_profile_id UUID;
  code_used BOOLEAN;
BEGIN
  -- Search for the invite code (case insensitive)
  SELECT id, COALESCE(invite_code_used, FALSE) INTO found_profile_id, code_used
  FROM public.profiles
  WHERE invite_code = UPPER(code);
  
  -- If no profile found with this code
  IF found_profile_id IS NULL THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, FALSE::BOOLEAN;
    RETURN;
  END IF;
  
  -- If code was already used
  IF code_used = TRUE THEN
    RETURN QUERY SELECT FALSE::BOOLEAN, TRUE::BOOLEAN;
    RETURN;
  END IF;
  
  -- Code is valid and not used
  RETURN QUERY SELECT TRUE::BOOLEAN, FALSE::BOOLEAN;
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.validate_invite_code(TEXT) TO authenticated;