-- Demo tenant
INSERT INTO public.tenants (id, business_name, is_activated, activated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Business', true, now())
ON CONFLICT (id) DO UPDATE SET is_activated = true, activated_at = now();

-- Seed all 3 accounts with ALL required Supabase auth fields
DO $$
DECLARE
  _owner_id   uuid := '00000000-0000-0000-0001-000000000001';
  _cashier_id uuid := '00000000-0000-0000-0002-000000000001';
  _sa_id      uuid := '00000000-0000-0000-0003-000000000001';
BEGIN
  -- owner_demo
  DELETE FROM auth.users WHERE email = 'owner_demo@posifypro.miaoda.com';
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) VALUES (
    _owner_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'owner_demo@posifypro.miaoda.com',
    crypt('Pos@Owner#2026!Xk', gen_salt('bf', 10)),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"owner_demo","role":"owner","tenant_id":"00000000-0000-0000-0000-000000000001"}'::jsonb,
    now(), now(), false, false
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    _owner_id, _owner_id,
    jsonb_build_object('sub',_owner_id,'email','owner_demo@posifypro.miaoda.com','email_verified',true,'provider','email'),
    'email', 'owner_demo@posifypro.miaoda.com', now(), now(), now()
  ) ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = now();

  -- cashier_demo
  DELETE FROM auth.users WHERE email = 'cashier_demo@posifypro.miaoda.com';
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) VALUES (
    _cashier_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'cashier_demo@posifypro.miaoda.com',
    crypt('Pos@Cashier#2026!Zr', gen_salt('bf', 10)),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"cashier_demo","role":"cashier","tenant_id":"00000000-0000-0000-0000-000000000001"}'::jsonb,
    now(), now(), false, false
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    _cashier_id, _cashier_id,
    jsonb_build_object('sub',_cashier_id,'email','cashier_demo@posifypro.miaoda.com','email_verified',true,'provider','email'),
    'email', 'cashier_demo@posifypro.miaoda.com', now(), now(), now()
  ) ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = now();

  -- superadmin_pos
  DELETE FROM auth.users WHERE email = 'superadmin_pos@posifypro.miaoda.com';
  INSERT INTO auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmation_sent_at,
    raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, is_sso_user, is_anonymous
  ) VALUES (
    _sa_id, '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated',
    'superadmin_pos@posifypro.miaoda.com',
    crypt('Pos@SuperAdmin#2026!', gen_salt('bf', 10)),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"username":"superadmin_pos","role":"superadmin","tenant_id":null}'::jsonb,
    now(), now(), false, false
  );
  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    _sa_id, _sa_id,
    jsonb_build_object('sub',_sa_id,'email','superadmin_pos@posifypro.miaoda.com','email_verified',true,'provider','email'),
    'email', 'superadmin_pos@posifypro.miaoda.com', now(), now(), now()
  ) ON CONFLICT (id) DO UPDATE SET identity_data = EXCLUDED.identity_data, updated_at = now();
END;
$$;
