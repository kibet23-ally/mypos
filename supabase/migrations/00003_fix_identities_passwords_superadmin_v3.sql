-- Fix owner_demo and cashier_demo: insert missing identities (email is generated from identity_data)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0001-000000000001'::uuid,
    '00000000-0000-0000-0001-000000000001'::uuid,
    '{"sub":"00000000-0000-0000-0001-000000000001","email":"owner_demo@posifypro.miaoda.com","email_verified":true,"provider":"email"}'::jsonb,
    'email',
    'owner_demo@posifypro.miaoda.com',
    now(), now(), now()
  ),
  (
    '00000000-0000-0000-0002-000000000001'::uuid,
    '00000000-0000-0000-0002-000000000001'::uuid,
    '{"sub":"00000000-0000-0000-0002-000000000001","email":"cashier_demo@posifypro.miaoda.com","email_verified":true,"provider":"email"}'::jsonb,
    'email',
    'cashier_demo@posifypro.miaoda.com',
    now(), now(), now()
  )
ON CONFLICT (id) DO UPDATE
  SET identity_data = EXCLUDED.identity_data,
      updated_at    = now();

-- Reset passwords with bcrypt cost 10 (Supabase default)
UPDATE auth.users
SET encrypted_password = crypt('Pos@Owner#2026!Xk', gen_salt('bf', 10)), updated_at = now()
WHERE email = 'owner_demo@posifypro.miaoda.com';

UPDATE auth.users
SET encrypted_password = crypt('Pos@Cashier#2026!Zr', gen_salt('bf', 10)), updated_at = now()
WHERE email = 'cashier_demo@posifypro.miaoda.com';

-- Create superadmin_pos account
DO $$
DECLARE
  _sa_id uuid := '00000000-0000-0000-0003-000000000001'::uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'superadmin_pos@posifypro.miaoda.com') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_user_meta_data,
      created_at, updated_at,
      is_sso_user, is_anonymous
    ) VALUES (
      _sa_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'superadmin_pos@posifypro.miaoda.com',
      crypt('Pos@SuperAdmin#2026!', gen_salt('bf', 10)),
      now(), now(),
      '{"username":"superadmin_pos","role":"superadmin","tenant_id":null}'::jsonb,
      now(), now(),
      false, false
    );
  ELSE
    UPDATE auth.users
    SET encrypted_password = crypt('Pos@SuperAdmin#2026!', gen_salt('bf', 10)), updated_at = now()
    WHERE email = 'superadmin_pos@posifypro.miaoda.com';
    SELECT id INTO _sa_id FROM auth.users WHERE email = 'superadmin_pos@posifypro.miaoda.com';
  END IF;

  INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
  VALUES (
    _sa_id,
    _sa_id,
    jsonb_build_object('sub', _sa_id, 'email', 'superadmin_pos@posifypro.miaoda.com', 'email_verified', true, 'provider', 'email'),
    'email',
    'superadmin_pos@posifypro.miaoda.com',
    now(), now(), now()
  )
  ON CONFLICT (id) DO UPDATE
    SET identity_data = EXCLUDED.identity_data,
        updated_at    = now();
END;
$$;
