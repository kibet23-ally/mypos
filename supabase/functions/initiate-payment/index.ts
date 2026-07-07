/**
 * initiate-payment Edge Function
 *
 * Handles M-Pesa Daraja STK Push. Falls back to a simulated mock payment
 * if MPESA_CONSUMER_KEY / MPESA_CONSUMER_SECRET are not configured.
 *
 * POST body: { tenant_id, phone, amount }
 * Response:  { success, checkout_request_id?, reference, mock? }
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

// Format phone for Daraja: 07XXXXXXXX → 2547XXXXXXXX
function formatPhone(phone: string): string {
  const clean = phone.replace(/[\s\-+]/g, "");
  if (clean.startsWith("254")) return clean;
  if (clean.startsWith("0")) return "254" + clean.slice(1);
  return "254" + clean;
}

async function getMpesaToken(consumerKey: string, consumerSecret: string): Promise<string> {
  const creds = btoa(`${consumerKey}:${consumerSecret}`);
  const res = await fetch(
    "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
    { headers: { Authorization: `Basic ${creds}` } }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error("Failed to obtain M-Pesa token");
  return data.access_token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { tenant_id, phone, amount } = await req.json();

    if (!tenant_id || !phone || !amount) {
      return json({ error: "tenant_id, phone and amount are required" }, 400);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const consumerKey    = Deno.env.get("MPESA_CONSUMER_KEY");
    const consumerSecret = Deno.env.get("MPESA_CONSUMER_SECRET");
    const shortcode      = Deno.env.get("MPESA_SHORTCODE") || "174379";
    const passkey        = Deno.env.get("MPESA_PASSKEY") || "";
    const callbackUrl    = Deno.env.get("MPESA_CALLBACK_URL") || "https://example.com/mpesa-callback";

    const reference = "PAY-" + Date.now().toString(36).toUpperCase();

    // ── Mock mode (no real credentials) ────────────────────────────────────
    if (!consumerKey || !consumerSecret) {
      console.info("[initiate-payment] MOCK mode — no Daraja credentials");

      // Log the payment event
      await supabase.from("payment_events").insert({
        tenant_id,
        event_type: "stk_push_mock",
        reference,
        amount,
        phone,
        result_code: "0",
        result_desc: "Mock payment — credentials not configured",
        raw: { mock: true },
      });

      // Activate the subscription immediately in mock mode
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          plan: "starter",
          activated_at: new Date().toISOString(),
          payment_reference: reference,
          payment_method: "mpesa_mock",
          amount,
          mpesa_phone: phone,
          updated_at: new Date().toISOString(),
        })
        .eq("tenant_id", tenant_id);

      // Also activate tenant row
      await supabase
        .from("tenants")
        .update({ is_activated: true, activated_at: new Date().toISOString() })
        .eq("id", tenant_id);

      return json({ success: true, reference, mock: true, message: "Payment simulated (no M-Pesa credentials configured). Subscription activated." });
    }

    // ── Real Daraja STK Push ─────────────────────────────────────────────────
    const token     = await getMpesaToken(consumerKey, consumerSecret);
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
    const password  = btoa(`${shortcode}${passkey}${timestamp}`);

    const stkRes = await fetch(
      "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          BusinessShortCode: shortcode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: "CustomerPayBillOnline",
          Amount: Math.ceil(amount),
          PartyA: formatPhone(phone),
          PartyB: shortcode,
          PhoneNumber: formatPhone(phone),
          CallBackURL: callbackUrl,
          AccountReference: reference,
          TransactionDesc: "PosifyPro Subscription",
        }),
      }
    );

    const stkData = await stkRes.json();

    if (stkData.ResponseCode !== "0") {
      throw new Error(stkData.errorMessage || stkData.ResponseDescription || "STK push failed");
    }

    const checkoutRequestId = stkData.CheckoutRequestID;

    // Log payment event
    await supabase.from("payment_events").insert({
      tenant_id,
      event_type: "stk_push_initiated",
      reference,
      amount,
      phone,
      checkout_request_id: checkoutRequestId,
      result_code: "0",
      result_desc: "STK push sent",
      raw: stkData,
    });

    // Store pending state in subscriptions
    await supabase
      .from("subscriptions")
      .update({
        payment_reference: reference,
        mpesa_phone: phone,
        mpesa_checkout_request_id: checkoutRequestId,
        amount,
        payment_method: "mpesa",
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenant_id);

    return json({ success: true, reference, checkout_request_id: checkoutRequestId, mock: false });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[initiate-payment]", message);
    return json({ error: message }, 500);
  }
});
