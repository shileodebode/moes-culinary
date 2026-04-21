UPDATE auth.users
SET encrypted_password = crypt('password123', gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email IN ('demo@client.com', 'sophia@demo.chef', 'marcus@demo.chef', 'mei@demo.chef', 'giuseppe@demo.chef');