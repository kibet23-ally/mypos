
-- Create auth user + profile + tenant for innoquestresearchsolutions@gmail.com.
-- Uses a DO block so we can check for existence and avoid duplicate inserts.
DO $$
DECLARE
  v_user_id     uuid;
  v_tenant_id   uuid;
  v_email       text := 'innoquestresearchsolutions@gmail.com';
  v_username    text := 'innoquest_owner';
  v_business    text := 'InnoQuest Research Solutions';
BEGIN
  -- ── 1. Check if auth user already exists ──────────────────────────────────
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  IF v_user_id IS NULL THEN
    -- Create the auth user with a secure temporary password.
    -- The owner must use "Forgot Password" or be given credentials out-of-band.
    v_user_id := gen_random_uuid();
    INSERT INTO auth.users (
      id, instance_id, aud, role, email,
      encrypted_password, email_confirmed_at,
      created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data,
      is_super_admin, confirmation_token, recovery_token,
      email_change_token_new, email_change
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_email,
      -- bcrypt hash of 'InnoQuest@2026!' — owner must reset via forgot-password
      crypt('InnoQuest@2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('business_name', v_business),
      false, '', '', '', ''
    );
    RAISE NOTICE 'Created auth user % for %', v_user_id, v_email;
  ELSE
    RAISE NOTICE 'Auth user already exists: % (%)', v_email, v_user_id;
  END IF;

  -- ── 2. Check / create tenant ───────────────────────────────────────────────
  SELECT tenant_id INTO v_tenant_id
  FROM profiles WHERE id = v_user_id;

  IF v_tenant_id IS NULL THEN
    -- Check if there's already a tenant for this business
    SELECT id INTO v_tenant_id FROM tenants WHERE business_name = v_business LIMIT 1;
  END IF;

  IF v_tenant_id IS NULL THEN
    v_tenant_id := gen_random_uuid();
    INSERT INTO tenants (
      id, business_name, business_type, license_key,
      is_activated, activated_at, onboarding_completed,
      currency_code, currency_symbol, currency_name,
      created_at, updated_at
    ) VALUES (
      v_tenant_id, v_business, 'general',
      upper(replace(v_tenant_id::text, '-', '')),
      true, now(), true,
      'KES', 'KSh', 'Kenyan Shilling',
      now(), now()
    );
    RAISE NOTICE 'Created tenant % for %', v_tenant_id, v_business;
  ELSE
    RAISE NOTICE 'Tenant already exists: %', v_tenant_id;
  END IF;

  -- ── 3. Upsert profile ──────────────────────────────────────────────────────
  INSERT INTO profiles (
    id, username, email, role, tenant_id, branch_id, created_at, updated_at
  ) VALUES (
    v_user_id, v_username, v_email, 'owner', v_tenant_id, null, now(), now()
  )
  ON CONFLICT (id) DO UPDATE SET
    username  = EXCLUDED.username,
    email     = EXCLUDED.email,
    role      = EXCLUDED.role,
    tenant_id = EXCLUDED.tenant_id,
    updated_at = now();

  RAISE NOTICE 'Profile upserted for % (tenant: %)', v_email, v_tenant_id;
END $$;
