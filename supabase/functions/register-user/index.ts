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
    const { email, phone_number, password, role, business_name, tenant_id, full_name, username } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    if (!email || !phone_number || !password || !role) {
      return json({ error: "email, phone_number, password, and role are required" }, 400);
    }

    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) {
      return json({ error: "Invalid email format" }, 400);
    }

    const phoneRx = /^\+?[1-9]\d{6,14}$/;
    if (!phoneRx.test(phone_number.replace(/[\s\-()]/g, ""))) {
      return json({ error: "Invalid phone number format" }, 400);
    }

    if (password.length < 8) {
      return json({ error: "Password must be at least 8 characters" }, 400);
    }

    const validRoles = ["owner", "cashier"];
    if (!validRoles.includes(role)) {
      return json({ error: "Role must be owner or cashier" }, 400);
    }

    if (role === "owner" && !business_name?.trim()) {
      return json({ error: "business_name is required for owner accounts" }, 400);
    }

    if (role === "cashier" && !tenant_id?.trim()) {
      return json({ error: "tenant_id is required for cashier accounts" }, 400);
    }

    // ── Admin client ─────────────────────────────────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── Duplicate checks ─────────────────────────────────────────────────────
    const { data: emailExists } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();
    if (emailExists) {
      return json({ error: "An account with this email already exists" }, 409);
    }

    const { data: phoneExists } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone_number", phone_number.trim())
      .maybeSingle();
    if (phoneExists) {
      return json({ error: "An account with this phone number already exists" }, 409);
    }

    // ── Resolve tenant ────────────────────────────────────────────────────────
    let resolvedTenantId: string | null = null;

    if (role === "owner") {
      const { data: newTenant, error: tenantErr } = await supabaseAdmin
        .from("tenants")
        .insert({ business_name: business_name.trim() })
        .select("id")
        .single();
      if (tenantErr) throw tenantErr;
      resolvedTenantId = newTenant.id;
    } else if (role === "cashier") {
      // Verify tenant exists
      const { data: tenantRow } = await supabaseAdmin
        .from("tenants")
        .select("id")
        .eq("id", tenant_id.trim())
        .maybeSingle();
      if (!tenantRow) {
        return json({ error: "Tenant not found. Ask your business owner for the correct Tenant ID." }, 404);
      }
      resolvedTenantId = tenantRow.id;
    }

    // ── Create Supabase Auth user (email_confirm:true = no email verification) ──
    const normalizedEmail = email.toLowerCase().trim();
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        tenant_id: resolvedTenantId,
        phone_number: phone_number.trim(),
      },
    });

    if (authErr) {
      if (authErr.message.toLowerCase().includes("already registered")) {
        return json({ error: "An account with this email already exists" }, 409);
      }
      throw authErr;
    }

    // ── Create/update profile row ─────────────────────────────────────────────
    const { error: profileErr } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.user.id,
        email: normalizedEmail,
        phone_number: phone_number.trim(),
        role,
        tenant_id: resolvedTenantId,
        full_name: full_name?.trim() || null,
        username: username?.trim() || null,
        display_name: full_name?.trim() || username?.trim() || null,
      });

    if (profileErr) {
      // Rollback: delete the auth user so we don't leave orphaned auth records
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw profileErr;
    }

    // ── Link created_by on tenant ─────────────────────────────────────────────
    if (role === "owner" && resolvedTenantId) {
      await supabaseAdmin
        .from("tenants")
        .update({ created_by: authData.user.id })
        .eq("id", resolvedTenantId);
    }

    // ── Sign in to return a session ───────────────────────────────────────────
    const supabaseAnon = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );

    const { data: sessionData, error: signInErr } = await supabaseAnon.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (signInErr) throw signInErr;

    return json({
      user: authData.user,
      session: sessionData.session,
      tenant_id: resolvedTenantId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[register-user]", message);
    return json({ error: message }, 500);
  }
});
