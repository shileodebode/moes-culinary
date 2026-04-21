ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);

ALTER TABLE public.chef_profiles
  ADD CONSTRAINT chef_profiles_profile_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_client_profile_fkey
  FOREIGN KEY (client_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_client_profile_fkey
  FOREIGN KEY (client_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;