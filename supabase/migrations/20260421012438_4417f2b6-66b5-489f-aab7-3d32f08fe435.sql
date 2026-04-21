
-- =========================
-- ROLES
-- =========================
CREATE TYPE public.app_role AS ENUM ('client', 'chef', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- TIMESTAMP TRIGGER
-- =========================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- =========================
-- PROFILES
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + default 'client' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'client'));
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- SERVICE CATEGORIES
-- =========================
CREATE TABLE public.service_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories viewable by all" ON public.service_categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.service_categories
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- =========================
-- CHEF PROFILES
-- =========================
CREATE TYPE public.chef_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TABLE public.chef_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  headline TEXT NOT NULL,
  bio TEXT,
  city TEXT NOT NULL,
  country TEXT,
  cuisines TEXT[] NOT NULL DEFAULT '{}',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  years_experience INT NOT NULL DEFAULT 0,
  hourly_rate NUMERIC(10,2) NOT NULL DEFAULT 0,
  cover_image_url TEXT,
  status chef_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.chef_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved chefs viewable by all" ON public.chef_profiles
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Chefs insert own profile" ON public.chef_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Chefs update own profile" ON public.chef_profiles
  FOR UPDATE USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete chef profiles" ON public.chef_profiles
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_chef_profiles_updated_at BEFORE UPDATE ON public.chef_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_chef_profiles_status ON public.chef_profiles(status);
CREATE INDEX idx_chef_profiles_city ON public.chef_profiles(city);

-- =========================
-- CHEF SERVICES (categories chef offers)
-- =========================
CREATE TABLE public.chef_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
  price_from NUMERIC(10,2) NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, category_id)
);
ALTER TABLE public.chef_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chef services viewable by all" ON public.chef_services FOR SELECT USING (true);
CREATE POLICY "Chef manages own services" ON public.chef_services
  FOR ALL USING (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()));

-- =========================
-- PORTFOLIO ITEMS
-- =========================
CREATE TABLE public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Portfolio viewable by all" ON public.portfolio_items FOR SELECT USING (true);
CREATE POLICY "Chef manages own portfolio" ON public.portfolio_items
  FOR ALL USING (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()));

-- =========================
-- AVAILABILITY
-- =========================
CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(chef_id, date)
);
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Availability viewable by all" ON public.availability FOR SELECT USING (true);
CREATE POLICY "Chef manages own availability" ON public.availability
  FOR ALL USING (EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid()));

-- =========================
-- BOOKINGS
-- =========================
CREATE TYPE public.booking_status AS ENUM ('pending','accepted','rejected','completed','cancelled');

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.service_categories(id) ON DELETE SET NULL,
  event_date DATE NOT NULL,
  guests INT NOT NULL DEFAULT 1,
  location TEXT NOT NULL,
  notes TEXT,
  budget NUMERIC(10,2),
  status booking_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking parties view" ON public.bookings
  FOR SELECT USING (
    auth.uid() = client_id
    OR EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Clients create bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Booking parties update" ON public.bookings
  FOR UPDATE USING (
    auth.uid() = client_id
    OR EXISTS (SELECT 1 FROM public.chef_profiles cp WHERE cp.id = chef_id AND cp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "Admins delete bookings" ON public.bookings
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_bookings_client ON public.bookings(client_id);
CREATE INDEX idx_bookings_chef ON public.bookings(chef_id);

-- =========================
-- MESSAGES
-- =========================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Booking parties view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.chef_profiles cp ON cp.id = b.chef_id
      WHERE b.id = booking_id
      AND (b.client_id = auth.uid() OR cp.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    )
  );
CREATE POLICY "Booking parties send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.bookings b
      LEFT JOIN public.chef_profiles cp ON cp.id = b.chef_id
      WHERE b.id = booking_id
      AND (b.client_id = auth.uid() OR cp.user_id = auth.uid())
    )
  );

CREATE INDEX idx_messages_booking ON public.messages(booking_id);

-- =========================
-- REVIEWS
-- =========================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL UNIQUE REFERENCES public.bookings(id) ON DELETE CASCADE,
  chef_id UUID NOT NULL REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviews viewable by all" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Client posts review for own completed booking" ON public.reviews
  FOR INSERT WITH CHECK (
    auth.uid() = client_id AND
    EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = booking_id AND b.client_id = auth.uid() AND b.status = 'completed')
  );
CREATE POLICY "Client updates own review" ON public.reviews
  FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "Admins delete reviews" ON public.reviews
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_reviews_chef ON public.reviews(chef_id);

-- =========================
-- STORAGE BUCKETS
-- =========================
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars','avatars', true),
  ('portfolio','portfolio', true),
  ('chef-covers','chef-covers', true);

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Users upload own avatar" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own avatar" ON storage.objects FOR UPDATE
  USING (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own avatar" ON storage.objects FOR DELETE
  USING (bucket_id='avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read portfolio" ON storage.objects FOR SELECT USING (bucket_id = 'portfolio');
CREATE POLICY "Users upload own portfolio" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own portfolio" ON storage.objects FOR DELETE
  USING (bucket_id='portfolio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read covers" ON storage.objects FOR SELECT USING (bucket_id = 'chef-covers');
CREATE POLICY "Users upload own cover" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id='chef-covers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users update own cover" ON storage.objects FOR UPDATE
  USING (bucket_id='chef-covers' AND auth.uid()::text = (storage.foldername(name))[1]);

-- =========================
-- SEED CATEGORIES
-- =========================
INSERT INTO public.service_categories (name, slug, description, icon) VALUES
  ('Private Chef','private-chef','Personal chef for intimate dining experiences','ChefHat'),
  ('Home Meal Prep','home-meal-prep','Weekly meal preparation for households','UtensilsCrossed'),
  ('Event Chef','event-chef','Chefs for parties, weddings, and special events','PartyPopper'),
  ('Catering Support','catering-support','Catering assistance for any size gathering','Soup'),
  ('Restaurant Placement','restaurant-placement','Skilled chefs available for restaurant work','Building2'),
  ('Culinary Training','culinary-training','Learn to cook from professional chefs','GraduationCap'),
  ('Menu Planning','menu-planning','Custom menu design for any occasion','BookOpen'),
  ('Kitchen Consulting','kitchen-consulting','Kitchen setup and operational consulting','Wrench');
