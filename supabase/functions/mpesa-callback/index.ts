/**
 * mpesa-callback Edge Function
 * Receives M-Pesa Daraja STK callback, activates subscription on success.
 */
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const stk = body?.Body?.stkCallback;
    if (!stk) return json({ error: "Invalid callback" }, 400);

    const checkoutRequestId = stk.CheckoutRequestID;
    const resultCode = String(stk.ResultCode);
    const resultDesc = stk.ResultDesc || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Find the subscription by checkout_request_id
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tenant_id, payment_reference, amount")
      .eq("mpesa_checkout_request_id", checkoutRequestId)
      .maybeSingle();

    if (!sub) {
      console.warn("[mpesa-callback] No subscription found for", checkoutRequestId);
      return json({ ok: false });
    }

    // Log the event
    await supabase.from("payment_events").insert({
      tenant_id: sub.tenant_id,
      event_type: resultCode === "0" ? "payment_success" : "payment_failed",
      reference: sub.payment_reference,
      amount: sub.amount,
      checkout_request_id: checkoutRequestId,
      result_code: resultCode,
      result_desc: resultDesc,
      raw: body,
    });

    if (resultCode === "0") {
      // Payment succeeded — activate subscription + tenant
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan: "starter",
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", sub.tenant_id);

      await supabase
        .from("tenants")
        .update({ is_activated: true, activated_at: new Date().toISOString() })
        .eq("id", sub.tenant_id);
    }

    return json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[mpesa-callback]", msg);
    return json({ error: msg }, 500);
  }
});
