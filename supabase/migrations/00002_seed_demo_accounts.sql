-- Create demo tenant
INSERT INTO public.tenants (id, business_name, is_activated, activated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Business',
  true,
  now()
)
ON CONFLICT (id) DO UPDATE
  SET business_name = EXCLUDED.business_name,
      is_activated  = EXCLUDED.is_activated,
      activated_at  = EXCLUDED.activated_at;

-- Seed owner_demo and cashier_demo
DO $$
DECLARE
  _owner_id   uuid := '00000000-0000-0000-0001-000000000001';
  _cashier_id uuid := '00000000-0000-0000-0002-000000000001';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'owner_demo@posifypro.miaoda.com') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_user_meta_data,
      created_at, updated_at,
      is_sso_user, is_anonymous
    ) VALUES (
      _owner_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'owner_demo@posifypro.miaoda.com',
      crypt('Pos@Owner#2026!Xk', gen_salt('bf')),
      now(), now(),
      jsonb_build_object('username','owner_demo','role','owner','tenant_id','00000000-0000-0000-0000-000000000001'),
      now(), now(),
      false, false
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'cashier_demo@posifypro.miaoda.com') THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role,
      email, encrypted_password,
      email_confirmed_at, confirmation_sent_at,
      raw_user_meta_data,
      created_at, updated_at,
      is_sso_user, is_anonymous
    ) VALUES (
      _cashier_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      'cashier_demo@posifypro.miaoda.com',
      crypt('Pos@Cashier#2026!Zr', gen_salt('bf')),
      now(), now(),
      jsonb_build_object('username','cashier_demo','role','cashier','tenant_id','00000000-0000-0000-0000-000000000001'),
      now(), now(),
      false, false
    );
  END IF;
END;
$$;
