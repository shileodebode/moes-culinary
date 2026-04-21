import { supabase } from "@/integrations/supabase/client";
import type { ChefCardData } from "@/components/chef-card";

export interface ChefFilters {
  city?: string;
  cuisine?: string;
  categorySlug?: string;
  maxBudget?: number;
  search?: string;
}

interface RawChef {
  id: string;
  user_id: string;
  headline: string;
  bio: string | null;
  city: string;
  country: string | null;
  cuisines: string[];
  specialties: string[];
  years_experience: number;
  hourly_rate: number;
  cover_image_url: string | null;
  status: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
}

export async function fetchChefs(filters: ChefFilters = {}): Promise<ChefCardData[]> {
  let query = supabase
    .from("chef_profiles")
    .select(`
      id, user_id, headline, city, cuisines, hourly_rate, years_experience, cover_image_url,
      profiles:profiles!chef_profiles_user_id_fkey(display_name, avatar_url)
    `)
    .eq("status", "approved");

  if (filters.city) query = query.ilike("city", `%${filters.city}%`);
  if (filters.cuisine) query = query.contains("cuisines", [filters.cuisine]);
  if (filters.maxBudget) query = query.lte("hourly_rate", filters.maxBudget);
  if (filters.search) query = query.or(`headline.ilike.%${filters.search}%,city.ilike.%${filters.search}%`);

  const { data, error } = await query.order("years_experience", { ascending: false });
  if (error) throw error;

  let chefs = (data ?? []) as unknown as Array<RawChef & { profiles: { display_name: string; avatar_url: string | null } | null }>;

  // Filter by category (requires join)
  if (filters.categorySlug) {
    const { data: catData } = await supabase
      .from("service_categories").select("id").eq("slug", filters.categorySlug).maybeSingle();
    if (catData) {
      const { data: services } = await supabase
        .from("chef_services").select("chef_id").eq("category_id", catData.id);
      const allowed = new Set((services ?? []).map((s) => s.chef_id));
      chefs = chefs.filter((c) => allowed.has(c.id));
    }
  }

  // Fetch ratings in one query
  const ids = chefs.map((c) => c.id);
  const ratingMap = new Map<string, { avg: number; count: number }>();
  if (ids.length) {
    const { data: reviews } = await supabase.from("reviews").select("chef_id, rating").in("chef_id", ids);
    (reviews ?? []).forEach((r) => {
      const cur = ratingMap.get(r.chef_id) ?? { avg: 0, count: 0 };
      cur.avg = (cur.avg * cur.count + r.rating) / (cur.count + 1);
      cur.count += 1;
      ratingMap.set(r.chef_id, cur);
    });
  }

  return chefs.map((c) => ({
    id: c.id,
    display_name: c.profiles?.display_name ?? "Chef",
    avatar_url: c.cover_image_url ?? c.profiles?.avatar_url ?? null,
    headline: c.headline,
    city: c.city,
    cuisines: c.cuisines,
    hourly_rate: Number(c.hourly_rate),
    years_experience: c.years_experience,
    rating: ratingMap.get(c.id)?.avg ?? null,
    review_count: ratingMap.get(c.id)?.count ?? 0,
  }));
}
