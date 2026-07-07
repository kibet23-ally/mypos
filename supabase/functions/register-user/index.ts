<<<<<<< HEAD
// register-user v2 — posifypro
=======
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
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

<<<<<<< HEAD
// ─────────────────────────────────────────────────────────────────────────────
// ACTION: apply-template
// Idempotent: seeds categories + products from a business template.
// ─────────────────────────────────────────────────────────────────────────────
async function handleApplyTemplate(req: Request, supabaseAdmin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing authorization header" }, 401);

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(token);
  if (callerErr || !caller) return json({ error: "Unauthorized" }, 401);

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles").select("id, role, tenant_id").eq("id", caller.id).maybeSingle();
  if (!callerProfile) return json({ error: "Profile not found" }, 403);
  if (!["owner", "superadmin"].includes(callerProfile.role)) {
    return json({ error: "Only business owners can apply templates" }, 403);
  }

  const body = await req.json();
  const { tenant_id, business_type } = body;
  if (!tenant_id || !business_type) return json({ error: "tenant_id and business_type are required" }, 400);

  if (callerProfile.role === "owner" && callerProfile.tenant_id !== tenant_id) {
    return json({ error: "Tenant mismatch" }, 403);
  }

  const { data: existingLog } = await supabaseAdmin
    .from("template_seeding_log").select("id").eq("tenant_id", tenant_id).maybeSingle();
  if (existingLog) {
    await supabaseAdmin.from("tenants")
      .update({ business_type, onboarding_completed: true }).eq("id", tenant_id);
    return json({ success: true, already_seeded: true });
  }

  const { data: template, error: tmplErr } = await supabaseAdmin
    .from("business_templates").select("*").eq("business_type", business_type).maybeSingle();
  if (tmplErr || !template) return json({ error: "Template not found for this business type" }, 404);

  const rawCategories: Array<{ name: string; sort_order: number }> = template.default_categories ?? [];
  const categoryRows = rawCategories.map((c) => ({
    tenant_id, name: c.name, sort_order: c.sort_order ?? 0, is_active: true,
  }));

  const { data: insertedCategories, error: catErr } = await supabaseAdmin
    .from("categories").insert(categoryRows).select("id, name");
  if (catErr) throw catErr;

  const catMap: Record<string, string> = {};
  for (const c of (insertedCategories ?? [])) catMap[c.name] = c.id;

  interface RawProduct {
    name: string; sku: string; price: number; cost_price: number; unit: string; category: string;
  }
  const rawProducts: RawProduct[] = template.default_products ?? [];
  const productRows = rawProducts.map((p) => ({
    tenant_id, name: p.name, sku: p.sku, price: p.price, cost_price: p.cost_price,
    tax_rate: 0, unit: p.unit, category_id: catMap[p.category] ?? null,
    is_active: true, is_available: true,
  }));

  const { error: prodErr } = await supabaseAdmin.from("products").insert(productRows);
  if (prodErr) throw prodErr;

  const { error: tenantErr } = await supabaseAdmin.from("tenants")
    .update({ business_type, onboarding_completed: true }).eq("id", tenant_id);
  if (tenantErr) throw tenantErr;

  const { error: logErr } = await supabaseAdmin.from("template_seeding_log")
    .insert({ tenant_id, template_id: template.id });
  if (logErr && !logErr.message.includes("duplicate")) throw logErr;

  return json({ success: true, categories_seeded: categoryRows.length, products_seeded: productRows.length });
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: register (self-service signup)
// ─────────────────────────────────────────────────────────────────────────────
async function handleRegister(body: Record<string, string>, supabaseAdmin: ReturnType<typeof createClient>) {
  const { username, password, role, business_name, tenant_id } = body;

  if (!username || !password || !role) {
    return json({ error: "username, password, and role are required" }, 400);
  }
  const validRoles = ["superadmin", "owner", "cashier"];
  if (!validRoles.includes(role)) return json({ error: "Invalid role" }, 400);

  const email = `${username}@posifypro.miaoda.com`;

  const { data: existing } = await supabaseAdmin
    .from("profiles").select("id").eq("email", email).maybeSingle();
  if (existing) return json({ error: "Username already taken" }, 409);

  let resolvedTenantId = tenant_id || null;

  if (role === "owner" && business_name) {
    const { data: newTenant, error: tenantErr } = await supabaseAdmin
      .from("tenants").insert({ business_name }).select("id").single();
    if (tenantErr) throw tenantErr;
    resolvedTenantId = newTenant.id;
  }

  const metaTenantId = role === "superadmin" ? null : resolvedTenantId;

  const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { username, role, tenant_id: metaTenantId },
  });
  if (authErr) throw authErr;

  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!
  );
  const { data: session, error: signInErr } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (signInErr) throw signInErr;

  return json({ user: authData.user, session: session.session, tenant_id: resolvedTenantId });
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTER
// ─────────────────────────────────────────────────────────────────────────────
=======
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
<<<<<<< HEAD
=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

<<<<<<< HEAD
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "apply-template") return await handleApplyTemplate(req, supabaseAdmin);

    const body = await req.json();
    return await handleRegister(body, supabaseAdmin);

=======
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
>>>>>>> b72e8c4 (feat: dynamic multi-currency support, edge function fixes)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[register-user]", message);
    return json({ error: message }, 500);
  }
});
