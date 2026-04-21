import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Star, Briefcase, ChefHat, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

interface ChefDetail {
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
  display_name: string;
  avatar_url: string | null;
  services: Array<{ id: string; price_from: number; description: string | null; category: { name: string; slug: string } }>;
  portfolio: Array<{ id: string; image_url: string; caption: string | null }>;
  reviews: Array<{ id: string; rating: number; comment: string | null; created_at: string; client_name: string }>;
}

export const Route = createFileRoute("/chefs/$chefId")({
  head: ({ params }) => ({
    meta: [{ title: `Chef profile — Chefly` }, { name: "description", content: `Book a trained chef on Chefly.` }],
  }),
  component: ChefDetailPage,
});

function ChefDetailPage() {
  const { chefId } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [chef, setChef] = useState<ChefDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: cp } = await supabase
        .from("chef_profiles")
        .select(`
          id, user_id, headline, bio, city, country, cuisines, specialties, years_experience, hourly_rate, cover_image_url,
          profiles:profiles!chef_profiles_profile_fkey(display_name, avatar_url)
        `)
        .eq("id", chefId)
        .maybeSingle();

      if (!cp) { setChef(null); setLoading(false); return; }

      const [{ data: services }, { data: portfolio }, { data: reviews }] = await Promise.all([
        supabase.from("chef_services").select(`id, price_from, description, category:service_categories(name, slug)`).eq("chef_id", chefId),
        supabase.from("portfolio_items").select("id, image_url, caption").eq("chef_id", chefId),
        supabase.from("reviews").select(`id, rating, comment, created_at, client:profiles!reviews_client_profile_fkey(display_name)`).eq("chef_id", chefId).order("created_at", { ascending: false }),
      ]);

      const profileObj = Array.isArray(cp.profiles) ? cp.profiles[0] : cp.profiles;
      setChef({
        id: cp.id,
        user_id: cp.user_id,
        headline: cp.headline,
        bio: cp.bio,
        city: cp.city,
        country: cp.country,
        cuisines: cp.cuisines,
        specialties: cp.specialties,
        years_experience: cp.years_experience,
        hourly_rate: Number(cp.hourly_rate),
        cover_image_url: cp.cover_image_url,
        display_name: profileObj?.display_name ?? "Chef",
        avatar_url: profileObj?.avatar_url ?? null,
        services: (services ?? []).map((s) => ({
          id: s.id, price_from: Number(s.price_from), description: s.description,
          category: Array.isArray(s.category) ? s.category[0] : s.category,
        })),
        portfolio: portfolio ?? [],
        reviews: (reviews ?? []).map((r) => {
          const c = Array.isArray(r.client) ? r.client[0] : r.client;
          return { id: r.id, rating: r.rating, comment: r.comment, created_at: r.created_at, client_name: c?.display_name ?? "Client" };
        }),
      });
      setLoading(false);
    })();
  }, [chefId]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <Skeleton className="h-64 w-full rounded-3xl" />
        </div>
        <SiteFooter />
      </div>
    );
  }

  if (!chef) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-2xl">Chef not found</h2>
          <Link to="/chefs" className="mt-4 inline-block text-primary hover:underline">Back to browse</Link>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const avgRating = chef.reviews.length
    ? chef.reviews.reduce((s, r) => s + r.rating, 0) / chef.reviews.length
    : null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        {/* Header */}
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-[var(--shadow-card)]">
          <div className="grid gap-0 md:grid-cols-[280px_1fr]">
            <div className="aspect-square bg-muted md:aspect-auto">
              {chef.avatar_url || chef.cover_image_url ? (
                <img src={chef.cover_image_url ?? chef.avatar_url ?? ""} alt={chef.display_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-primary-soft font-display text-7xl text-primary">
                  {chef.display_name.charAt(0)}
                </div>
              )}
            </div>
            <div className="p-6 sm:p-8">
              <h1 className="font-display text-3xl sm:text-4xl">{chef.display_name}</h1>
              <p className="mt-1 text-lg text-muted-foreground">{chef.headline}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {chef.city}{chef.country ? `, ${chef.country}` : ""}</span>
                <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" /> {chef.years_experience} years</span>
                {avgRating != null && (
                  <span className="inline-flex items-center gap-1"><Star className="h-4 w-4 fill-warm text-warm" /> {avgRating.toFixed(1)} ({chef.reviews.length})</span>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {chef.cuisines.map((c) => <Badge key={c} className="rounded-full bg-accent text-accent-foreground">{c}</Badge>)}
              </div>

              <div className="mt-6 flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Starting at</p>
                  <p className="font-display text-3xl">${chef.hourly_rate}<span className="text-base font-sans text-muted-foreground">/hr</span></p>
                </div>
                <Button
                  size="lg"
                  className="rounded-full"
                  onClick={() => {
                    if (!user) navigate({ to: "/auth" });
                    else navigate({ to: "/book/$chefId", params: { chefId: chef.id } });
                  }}
                >
                  <ChefHat className="mr-2 h-4 w-4" /> Request booking
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div className="space-y-8 md:col-span-2">
            {chef.bio && (
              <Card className="p-6">
                <h2 className="font-display text-2xl">About</h2>
                <p className="mt-3 whitespace-pre-line text-muted-foreground">{chef.bio}</p>
                {chef.specialties.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-semibold">Specialties</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {chef.specialties.map((s) => <Badge key={s} variant="outline" className="rounded-full">{s}</Badge>)}
                    </div>
                  </div>
                )}
              </Card>
            )}

            {chef.portfolio.length > 0 && (
              <Card className="p-6">
                <h2 className="font-display text-2xl">Portfolio</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {chef.portfolio.map((p) => (
                    <div key={p.id} className="aspect-square overflow-hidden rounded-xl bg-muted">
                      <img src={p.image_url} alt={p.caption ?? ""} loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {chef.reviews.length > 0 && (
              <Card className="p-6">
                <h2 className="font-display text-2xl">Reviews</h2>
                <div className="mt-4 space-y-5">
                  {chef.reviews.map((r) => (
                    <div key={r.id} className="border-b border-border pb-4 last:border-0">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{r.client_name}</p>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? "fill-warm text-warm" : "text-muted"}`} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="mt-2 text-sm text-muted-foreground">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          <aside className="space-y-4">
            <Card className="p-6">
              <h2 className="font-display text-xl">Services offered</h2>
              <div className="mt-4 space-y-3">
                {chef.services.map((s) => (
                  <div key={s.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <h4 className="font-semibold">{s.category.name}</h4>
                      <span className="font-display">${s.price_from}+</span>
                    </div>
                    {s.description && <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>}
                  </div>
                ))}
              </div>
            </Card>
            <Button
              variant="outline"
              size="lg"
              className="w-full rounded-full"
              onClick={() => {
                if (!user) navigate({ to: "/auth" });
                else navigate({ to: "/book/$chefId", params: { chefId: chef.id } });
              }}
            >
              <MessageSquare className="mr-2 h-4 w-4" /> Contact chef
            </Button>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
