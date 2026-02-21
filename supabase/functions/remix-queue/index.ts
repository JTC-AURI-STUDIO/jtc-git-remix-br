import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Auto-cleanup: remove stale entries older than 30 minutes
    await supabase
      .from("remix_queue")
      .delete()
      .in("status", ["waiting", "processing"])
      .lt("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString());

    // Also clean old done/error entries
    await supabase
      .from("remix_queue")
      .delete()
      .in("status", ["done", "error"])
      .lt("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    const { action, queue_id, source_repo, target_repo, payment_id } = await req.json();

    // JOIN QUEUE
    if (action === "join") {
      const { data, error } = await supabase
        .from("remix_queue")
        .insert({
          source_repo: source_repo || "",
          target_repo: target_repo || "",
          payment_id: payment_id || null,
          status: "waiting",
        })
        .select()
        .single();

      if (error) throw error;

      // Get position
      const { count } = await supabase
        .from("remix_queue")
        .select("*", { count: "exact", head: true })
        .in("status", ["waiting", "processing"])
        .lte("created_at", data.created_at);

      return new Response(
        JSON.stringify({ success: true, queue_id: data.id, position: count || 1 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CHECK POSITION
    if (action === "position") {
      if (!queue_id) throw new Error("queue_id obrigatório");

      const { data: myEntry, error } = await supabase
        .from("remix_queue")
        .select("*")
        .eq("id", queue_id)
        .single();

      if (error || !myEntry) {
        return new Response(
          JSON.stringify({ success: true, position: 0, status: "not_found" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (myEntry.status === "processing" || myEntry.status === "done") {
        return new Response(
          JSON.stringify({ success: true, position: 0, status: myEntry.status, can_start: myEntry.status === "processing" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if anything is currently processing
      const { data: processing } = await supabase
        .from("remix_queue")
        .select("id")
        .eq("status", "processing")
        .limit(1);

      if (!processing || processing.length === 0) {
        // Nothing processing, check if we're first in line
        const { data: firstWaiting } = await supabase
          .from("remix_queue")
          .select("id")
          .eq("status", "waiting")
          .order("created_at", { ascending: true })
          .limit(1);

        if (firstWaiting && firstWaiting.length > 0 && firstWaiting[0].id === queue_id) {
          // It's our turn! Mark as processing
          await supabase
            .from("remix_queue")
            .update({ status: "processing", started_at: new Date().toISOString() })
            .eq("id", queue_id);

          return new Response(
            JSON.stringify({ success: true, position: 0, status: "processing", can_start: true }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Count how many are ahead
      const { count } = await supabase
        .from("remix_queue")
        .select("*", { count: "exact", head: true })
        .in("status", ["waiting", "processing"])
        .lte("created_at", myEntry.created_at);

      return new Response(
        JSON.stringify({ success: true, position: count || 1, status: "waiting", can_start: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MARK DONE
    if (action === "done") {
      if (!queue_id) throw new Error("queue_id obrigatório");

      await supabase
        .from("remix_queue")
        .update({ status: "done", finished_at: new Date().toISOString() })
        .eq("id", queue_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // MARK ERROR
    if (action === "error") {
      if (!queue_id) throw new Error("queue_id obrigatório");

      await supabase
        .from("remix_queue")
        .update({ status: "error", finished_at: new Date().toISOString() })
        .eq("id", queue_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error("Ação inválida. Use: join, position, done, error");
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
