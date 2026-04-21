import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Search, ShieldCheck, Sparkles, UtensilsCrossed } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChefCard, type ChefCardData } from "@/components/chef-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchChefs } from "@/lib/chef-queries";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-chef.jpg";

interface Category { id: string; name: string; slug: string; description: string | null; icon: string | null }

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Chefly — Hire trained chefs for any occasion" },
      { name: "description", content: "Discover, book, and connect with trained chefs for private dinners, events, meal prep, and more." },
      { property: "og:title", content: "Chefly — Hire trained chefs" },
      { property: "og:description", content: "Discover and book trained chefs near you." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [chefs, setChefs] = useState<ChefCardData[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchChefs().then((c) => setChefs(c.slice(0, 6))).catch(console.error);
    supabase.from("service_categories").select("*").order("name").then(({ data }) => {
      if (data) setCategories(data as Category[]);
    });
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 md:py-20 md:gap-16 lg:py-28">
          <div className="flex flex-col justify-center">
            <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Trained chefs, vetted profiles
            </span>
            <h1 className="font-display text-4xl leading-[1.05] sm:text-5xl md:text-6xl">
              The chef <em className="text-primary not-italic">your table</em> deserves.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Hire trained chefs for private dinners, events, weekly meal prep, and culinary lessons. Discover, message, and book — all in one place.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                window.location.href = `/chefs?search=${encodeURIComponent(search)}`;
              }}
              className="mt-7 flex w-full max-w-md items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-[var(--shadow-soft)]"
            >
              <Search className="ml-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="City or cuisine…"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
              <Button type="submit" className="rounded-full">Search</Button>
            </form>

            <div className="mt-8 flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Vetted chefs</div>
              <div className="flex items-center gap-2"><UtensilsCrossed className="h-4 w-4 text-primary" /> Every cuisine</div>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl shadow-[var(--shadow-lift)]">
              <img src={heroImg} alt="Professional chef plating a dish" width={1536} height={1024} className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)] sm:block">
              <p className="font-display text-2xl">{chefs.length || "—"}+ chefs</p>
              <p className="text-xs text-muted-foreground">across the platform</p>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl md:text-4xl">Browse by service</h2>
            <p className="mt-2 text-muted-foreground">From private dining to kitchen consulting.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/chefs"
              search={{ category: c.slug }}
              className="group rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <UtensilsCrossed className="h-5 w-5" />
              </div>
              <h3 className="font-display text-base leading-tight">{c.name}</h3>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured chefs */}
      <section className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 md:py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-display text-3xl md:text-4xl">Featured chefs</h2>
            <p className="mt-2 text-muted-foreground">Hand-picked talent ready to book.</p>
          </div>
          <Link to="/chefs" className="hidden text-sm font-medium text-primary hover:underline sm:inline-flex sm:items-center sm:gap-1">
            View all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {chefs.map((c) => <ChefCard key={c.id} chef={c} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6">
        <div className="rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12 sm:py-16">
          <h2 className="font-display text-3xl sm:text-4xl">Are you a trained chef?</h2>
          <p className="mx-auto mt-3 max-w-lg text-primary-foreground/85">
            Join Chefly to reach new clients, manage bookings, and grow your culinary business.
          </p>
          <Link
            to="/become-a-chef"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-background px-6 py-3 text-sm font-semibold text-foreground shadow-md transition hover:bg-background/90"
          >
            Become a Chefly chef
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
