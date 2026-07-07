// invite-staff v2 — posifypro
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization header" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: callerErr } = await supabaseAdmin.auth.getUser(token);
    if (callerErr || !caller) return json({ error: "Unauthorized" }, 401);

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles").select("id, role, tenant_id").eq("id", caller.id).maybeSingle();

    if (!callerProfile) return json({ error: "Caller profile not found" }, 403);
    if (!["owner", "superadmin"].includes(callerProfile.role)) {
      return json({ error: "Only business owners can invite staff" }, 403);
    }

    const { email, full_name, branch_id } = await req.json();
    if (!email || !full_name) return json({ error: "email and full_name are required" }, 400);
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRx.test(email)) return json({ error: "Invalid email address" }, 400);

    const tenantId = callerProfile.tenant_id;
    if (!tenantId) return json({ error: "Caller has no associated tenant" }, 400);

    if (branch_id) {
      const { data: branch } = await supabaseAdmin.from("branches")
        .select("id").eq("id", branch_id).eq("tenant_id", tenantId).maybeSingle();
      if (!branch) return json({ error: "Branch not found or does not belong to your business" }, 400);
    }

    const { data: existing } = await supabaseAdmin.from("profiles")
      .select("id, role, tenant_id").eq("email", email.toLowerCase()).maybeSingle();

    if (existing) {
      if (existing.tenant_id === tenantId && existing.role === "cashier") {
        return json({ message: "Staff member already exists in your business", already_exists: true });
      }
      return json({ error: "This email is already registered with another account" }, 409);
    }

    const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");

    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email.toLowerCase(),
      {
        data: { full_name, username, role: "cashier", tenant_id: tenantId, branch_id: branch_id ?? null },
        redirectTo: `${Deno.env.get("SITE_URL") ?? "https://posifypro.miaoda.com"}/login?invited=1`,
      }
    );
    if (inviteErr) throw inviteErr;

    const newUserId = inviteData.user.id;
    const { error: profileInsertErr } = await supabaseAdmin.from("profiles").insert({
      id: newUserId, username, email: email.toLowerCase(), full_name,
      role: "cashier", tenant_id: tenantId, branch_id: branch_id ?? null,
    });
    if (profileInsertErr && !profileInsertErr.message.includes("duplicate")) throw profileInsertErr;

    await supabaseAdmin.from("audit_logs").insert({
      tenant_id: tenantId,
      user_id: caller.id,
      action: "staff.invited",
      entity_type: "profiles",
      entity_id: newUserId,
      new_data: { username, full_name, role: "cashier", branch_id: branch_id ?? null },
    });

    return json({ success: true, message: `Invitation sent to ${email}`, user_id: newUserId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[invite-staff]", message);
    return json({ error: message }, 500);
  }
});
