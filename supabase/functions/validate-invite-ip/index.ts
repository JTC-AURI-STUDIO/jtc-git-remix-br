import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { invite_code, action } = await req.json();
    
    // Get client IP from headers
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';

    console.log(`Action: ${action}, IP: ${clientIP}, Invite Code: ${invite_code}`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'check') {
      // Check if this IP already used this invite code
      const { data: existingUsage, error: checkError } = await supabase
        .from('invite_code_usage')
        .select('id')
        .eq('ip_address', clientIP)
        .eq('invite_code', invite_code.toUpperCase())
        .maybeSingle();

      if (checkError) {
        console.error('Error checking usage:', checkError);
        throw checkError;
      }

      const canUse = !existingUsage;
      console.log(`IP ${clientIP} can use code ${invite_code}: ${canUse}`);

      return new Response(
        JSON.stringify({ 
          can_use: canUse,
          message: canUse ? 'OK' : 'Este dispositivo já utilizou este código de convite para criar uma conta.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'register') {
      // Register the IP + invite code usage
      const { user_id } = await req.json().catch(() => ({}));
      
      const { error: insertError } = await supabase
        .from('invite_code_usage')
        .insert({
          ip_address: clientIP,
          invite_code: invite_code.toUpperCase(),
          user_id: user_id || null
        });

      if (insertError) {
        // If duplicate, it's already registered
        if (insertError.code === '23505') {
          console.log('Usage already registered');
          return new Response(
            JSON.stringify({ success: true, message: 'Already registered' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        console.error('Error registering usage:', insertError);
        throw insertError;
      }

      console.log(`Registered IP ${clientIP} with code ${invite_code}`);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
