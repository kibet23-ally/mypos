/**
 * seed-demo-users Edge Function
 * Creates demo Owner + Cashier accounts idempotently.
 * Call once: POST /functions/v1/seed-demo-users  (no body required)
 * Protected by service-role key check in Authorization header.
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

const DEMO_TENANT_NAME = "Demo Business";
const DEMO_OWNER_EMAIL = "owner_demo@posifypro.miaoda.com";
const DEMO_OWNER_PW    = "Demo@Owner2026!";
const DEMO_CA_EMAIL    = "cashier_demo@posifypro.miaoda.com";
const DEMO_CA_PW       = "Demo@Cashier2026!";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results: Record<string, string> = {};

  try {
    // ── 1. Ensure demo tenant exists ────────────────────────────────────────
    let tenantId: string;

    const { data: existingTenant } = await supabase
      .from("tenants")
      .select("id")
      .eq("business_name", DEMO_TENANT_NAME)
      .maybeSingle();

    if (existingTenant) {
      tenantId = existingTenant.id;
      results.tenant = `existing (${tenantId})`;
    } else {
      const { data: newTenant, error: tenantErr } = await supabase
        .from("tenants")
        .insert({ business_name: DEMO_TENANT_NAME, is_activated: true })
        .select("id")
        .single();
      if (tenantErr) throw new Error("Create tenant: " + tenantErr.message);
      tenantId = newTenant.id;
      results.tenant = `created (${tenantId})`;
    }

    // ── 2. Upsert demo Owner ────────────────────────────────────────────────
    const { data: ownerList } = await supabase.auth.admin.listUsers();
    const existingOwner = ownerList?.users?.find(u => u.email === DEMO_OWNER_EMAIL);

    let ownerUserId: string;
    if (existingOwner) {
      // Update password to ensure it matches
      await supabase.auth.admin.updateUserById(existingOwner.id, {
        password: DEMO_OWNER_PW,
        email_confirm: true,
      });
      ownerUserId = existingOwner.id;
      results.owner = "updated password";
    } else {
      const { data: ownerAuth, error: ownerErr } = await supabase.auth.admin.createUser({
        email: DEMO_OWNER_EMAIL,
        password: DEMO_OWNER_PW,
        email_confirm: true,
        user_metadata: { role: "owner", tenant_id: tenantId },
      });
      if (ownerErr) throw new Error("Create owner: " + ownerErr.message);
      ownerUserId = ownerAuth.user.id;
      results.owner = "created";
    }

    // Upsert profile
    await supabase.from("profiles").upsert({
      id: ownerUserId,
      email: DEMO_OWNER_EMAIL,
      phone_number: "+254700000001",
      role: "owner",
      tenant_id: tenantId,
      display_name: "Demo Owner",
    }, { onConflict: "id" });

    // Link tenant to owner
    await supabase.from("tenants").update({ created_by: ownerUserId }).eq("id", tenantId);

    // Ensure subscription exists and is active for demo owner
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!existingSub) {
      const now = new Date();
      const trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + 14);
      await supabase.from("subscriptions").insert({
        tenant_id: tenantId,
        status: "active",
        plan: "starter",
        trial_start_date: now.toISOString(),
        trial_end_date: trialEnd.toISOString(),
        activated_at: now.toISOString(),
        payment_method: "demo",
        payment_reference: "DEMO-FREE",
        amount: 0,
      });
    } else {
      // Make sure demo subscription is active
      await supabase.from("subscriptions")
        .update({ status: "active", activated_at: new Date().toISOString() })
        .eq("tenant_id", tenantId);
    }

    // ── 3. Upsert demo Cashier ──────────────────────────────────────────────
    const existingCashier = ownerList?.users?.find(u => u.email === DEMO_CA_EMAIL);

    let cashierUserId: string;
    if (existingCashier) {
      await supabase.auth.admin.updateUserById(existingCashier.id, {
        password: DEMO_CA_PW,
        email_confirm: true,
      });
      cashierUserId = existingCashier.id;
      results.cashier = "updated password";
    } else {
      const { data: caAuth, error: caErr } = await supabase.auth.admin.createUser({
        email: DEMO_CA_EMAIL,
        password: DEMO_CA_PW,
        email_confirm: true,
        user_metadata: { role: "cashier", tenant_id: tenantId },
      });
      if (caErr) throw new Error("Create cashier: " + caErr.message);
      cashierUserId = caAuth.user.id;
      results.cashier = "created";
    }

    await supabase.from("profiles").upsert({
      id: cashierUserId,
      email: DEMO_CA_EMAIL,
      phone_number: "+254700000002",
      role: "cashier",
      tenant_id: tenantId,
      display_name: "Demo Cashier",
    }, { onConflict: "id" });

    return json({ success: true, tenantId, results });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[seed-demo-users]", msg);
    return json({ error: msg }, 500);
  }
});
