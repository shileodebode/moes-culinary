
DO $$
DECLARE
  c1 UUID := '11111111-1111-1111-1111-111111111111';
  c2 UUID := '22222222-2222-2222-2222-222222222222';
  c3 UUID := '33333333-3333-3333-3333-333333333333';
  c4 UUID := '44444444-4444-4444-4444-444444444444';
  client1 UUID := '55555555-5555-5555-5555-555555555555';
  cp1 UUID; cp2 UUID; cp3 UUID; cp4 UUID;
  cat_private UUID; cat_event UUID; cat_meal UUID; cat_train UUID;
  booking1 UUID;
BEGIN
  INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, aud, role)
  VALUES
    (c1, '00000000-0000-0000-0000-000000000000', 'sophia@demo.chef', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Sophia Laurent","role":"chef"}', 'authenticated', 'authenticated'),
    (c2, '00000000-0000-0000-0000-000000000000', 'marcus@demo.chef', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Marcus Adeyemi","role":"chef"}', 'authenticated', 'authenticated'),
    (c3, '00000000-0000-0000-0000-000000000000', 'mei@demo.chef', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Mei Tanaka","role":"chef"}', 'authenticated', 'authenticated'),
    (c4, '00000000-0000-0000-0000-000000000000', 'giuseppe@demo.chef', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Giuseppe Rossi","role":"chef"}', 'authenticated', 'authenticated'),
    (client1, '00000000-0000-0000-0000-000000000000', 'demo@client.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{"display_name":"Demo Client","role":"client"}', 'authenticated', 'authenticated');

  -- handle_new_user trigger created profiles + default 'client' role for all. Upgrade chefs to 'chef' role.
  UPDATE user_roles SET role='chef' WHERE user_id IN (c1,c2,c3,c4);

  SELECT id INTO cat_private FROM service_categories WHERE slug='private-chef';
  SELECT id INTO cat_event FROM service_categories WHERE slug='event-chef';
  SELECT id INTO cat_meal FROM service_categories WHERE slug='home-meal-prep';
  SELECT id INTO cat_train FROM service_categories WHERE slug='culinary-training';

  INSERT INTO chef_profiles (user_id, headline, bio, city, country, cuisines, specialties, years_experience, hourly_rate, status)
  VALUES (c1, 'Modern French private chef', 'Trained at Le Cordon Bleu Paris. I create intimate fine-dining experiences in your home, blending French technique with seasonal local produce.', 'Paris', 'France', ARRAY['French','Mediterranean'], ARRAY['Tasting menus','Wine pairing','Pastry'], 8, 95, 'approved')
  RETURNING id INTO cp1;

  INSERT INTO chef_profiles (user_id, headline, bio, city, country, cuisines, specialties, years_experience, hourly_rate, status)
  VALUES (c2, 'West African event & catering chef', 'I bring bold West African flavors to events of every size. From intimate dinners to weddings of 200, I handle the full menu.', 'Lagos', 'Nigeria', ARRAY['West African','Caribbean','Fusion'], ARRAY['Live grilling','Large events','Vegan menus'], 12, 75, 'approved')
  RETURNING id INTO cp2;

  INSERT INTO chef_profiles (user_id, headline, bio, city, country, cuisines, specialties, years_experience, hourly_rate, status)
  VALUES (c3, 'Pastry chef & culinary instructor', 'Pastry chef from Tokyo with 6 years experience teaching home cooks the art of French and Japanese desserts.', 'Tokyo', 'Japan', ARRAY['Japanese','French Pastry'], ARRAY['Pastry','Desserts','Teaching'], 6, 60, 'approved')
  RETURNING id INTO cp3;

  INSERT INTO chef_profiles (user_id, headline, bio, city, country, cuisines, specialties, years_experience, hourly_rate, status)
  VALUES (c4, 'Authentic Italian home meal prep', 'Nonna-approved recipes brought to your kitchen. Weekly meal prep, fresh pasta classes, and family-style catering.', 'Rome', 'Italy', ARRAY['Italian'], ARRAY['Fresh pasta','Sauces','Meal prep'], 25, 55, 'approved')
  RETURNING id INTO cp4;

  INSERT INTO chef_services (chef_id, category_id, price_from, description) VALUES
    (cp1, cat_private, 350, '4-course tasting menu for up to 6 guests'),
    (cp1, cat_event, 1200, 'Full event service for up to 50 guests'),
    (cp2, cat_event, 800, 'Live-fire cooking station for events'),
    (cp2, cat_private, 280, 'West African dinner for your home'),
    (cp3, cat_train, 90, 'Pastry masterclass (3 hours)'),
    (cp3, cat_private, 220, 'Dessert tasting evening'),
    (cp4, cat_meal, 180, 'Weekly Italian meal prep, 5 days'),
    (cp4, cat_train, 120, 'Fresh pasta workshop');

  INSERT INTO portfolio_items (chef_id, image_url, caption) VALUES
    (cp1, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800', 'Seasonal tasting menu'),
    (cp1, 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800', 'Plated entrée'),
    (cp2, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800', 'Live grill station'),
    (cp2, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', 'Event spread'),
    (cp3, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800', 'Mille-feuille'),
    (cp3, 'https://images.unsplash.com/photo-1495147466023-ac5c588e2e94?w=800', 'Macarons'),
    (cp4, 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800', 'Fresh tagliatelle'),
    (cp4, 'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=800', 'Sunday sauce');

  INSERT INTO bookings (client_id, chef_id, category_id, event_date, guests, location, notes, budget, status)
  VALUES (client1, cp1, cat_private, CURRENT_DATE - 14, 4, 'Paris, 6th arr.', 'Anniversary dinner', 500, 'completed')
  RETURNING id INTO booking1;

  INSERT INTO reviews (booking_id, chef_id, client_id, rating, comment)
  VALUES (booking1, cp1, client1, 5, 'Sophia was absolutely incredible. Every course was a work of art and the conversation flowed beautifully. Booking again for our next celebration!');
END $$;
