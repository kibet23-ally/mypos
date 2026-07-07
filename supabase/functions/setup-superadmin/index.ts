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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const body = await req.json().catch(() => ({}));
    const username: string = body.username ?? "superadmin_pos";
    const password: string = body.password ?? "SuperAdmin@PosifyPro2026!";
    const email = `${username}@posifypro.miaoda.com`;

    // Check if auth user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);

    let userId: string;

    if (existing) {
      // Update password and ensure email is confirmed
      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(
        existing.id,
        { password, email_confirm: true }
      );
      if (updateErr) throw updateErr;
      userId = existing.id;

      // Ensure profile has superadmin role
      const { error: profileErr } = await supabaseAdmin.rpc("set_user_superadmin", {
        target_id: userId,
      }).then(() => ({ error: null })).catch((e) => ({ error: e }));

      // Fallback: direct update via service role
      if (profileErr) {
        await supabaseAdmin
          .from("profiles")
          .update({ role: "superadmin" })
          .eq("id", userId);
      }

      return json({
        success: true,
        action: "updated",
        username,
        password,
        message: `Superadmin password reset. Login with username: ${username}`,
      });
    } else {
      // Create new superadmin auth user
      const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { username, role: "superadmin", tenant_id: null },
      });
      if (authErr) throw authErr;
      userId = authData.user.id;

      // Upsert profile
      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .upsert({
          id: userId,
          username,
          email,
          role: "superadmin",
          tenant_id: null,
        }, { onConflict: "id" });
      if (profileErr) throw profileErr;

      return json({
        success: true,
        action: "created",
        username,
        password,
        message: `Superadmin created. Login with username: ${username}`,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[setup-superadmin]", message);
    return json({ error: message }, 500);
  }
});
