-- Fix raw_app_meta_data — required by Supabase Auth for signInWithPassword
UPDATE auth.users
SET raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb
WHERE email IN (
  'owner_demo@posifypro.miaoda.com',
  'cashier_demo@posifypro.miaoda.com',
  'superadmin_pos@posifypro.miaoda.com'
)
AND (raw_app_meta_data IS NULL OR raw_app_meta_data = '{}'::jsonb);

-- Verify all fields are now complete
SELECT
  email,
  raw_app_meta_data->>'provider'  AS provider,
  encrypted_password IS NOT NULL  AS has_password,
  email_confirmed_at IS NOT NULL  AS confirmed
FROM auth.users
WHERE email IN (
  'owner_demo@posifypro.miaoda.com',
  'cashier_demo@posifypro.miaoda.com',
  'superadmin_pos@posifypro.miaoda.com'
)
ORDER BY email;
