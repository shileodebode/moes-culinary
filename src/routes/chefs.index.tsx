import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ChefCard, type ChefCardData } from "@/components/chef-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchChefs } from "@/lib/chef-queries";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const searchSchema = z.object({
  search: z.string().optional(),
  city: z.string().optional(),
  cuisine: z.string().optional(),
  category: z.string().optional(),
  budget: z.coerce.number().optional(),
});

export const Route = createFileRoute("/chefs/")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Browse chefs — Chefly" },
      { name: "description", content: "Search trained chefs by city, cuisine, service, and budget." },
    ],
  }),
  component: ChefsPage,
});

const CUISINES = ["French","Italian","Japanese","West African","Mediterranean","Caribbean","Fusion","French Pastry"];

function ChefsPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [chefs, setChefs] = useState<ChefCardData[] | null>(null);
  const [categories, setCategories] = useState<Array<{ slug: string; name: string }>>([]);
  const [text, setText] = useState(search.search ?? "");

  useEffect(() => {
    supabase.from("service_categories").select("slug,name").order("name").then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    setChefs(null);
    fetchChefs({
      search: search.search,
      city: search.city,
      cuisine: search.cuisine,
      categorySlug: search.category,
      maxBudget: search.budget,
    }).then(setChefs).catch((e) => { console.error(e); setChefs([]); });
  }, [search.search, search.city, search.cuisine, search.category, search.budget]);

  const update = (next: Partial<typeof search>) => {
    navigate({ to: "/chefs", search: { ...search, ...next } });
  };

  const hasFilters = !!(search.city || search.cuisine || search.category || search.budget || search.search);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6">
          <h1 className="font-display text-3xl sm:text-4xl">Browse chefs</h1>
          <p className="mt-2 text-muted-foreground">Filter by location, cuisine, service, and budget.</p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
          <form
            onSubmit={(e) => { e.preventDefault(); update({ search: text || undefined }); }}
            className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1"
          >
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or city"
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button type="submit" size="sm" className="rounded-full">Go</Button>
          </form>

          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <Input placeholder="City" value={search.city ?? ""} onChange={(e) => update({ city: e.target.value || undefined })} />

            <Select value={search.cuisine ?? "any"} onValueChange={(v) => update({ cuisine: v === "any" ? undefined : v })}>
              <SelectTrigger><SelectValue placeholder="Cuisine" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any cuisine</SelectItem>
                {CUISINES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={search.category ?? "any"} onValueChange={(v) => update({ category: v === "any" ? undefined : v })}>
              <SelectTrigger><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any service</SelectItem>
                {categories.map((c) => <SelectItem key={c.slug} value={c.slug}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select
              value={search.budget ? String(search.budget) : "any"}
              onValueChange={(v) => update({ budget: v === "any" ? undefined : Number(v) })}
            >
              <SelectTrigger><SelectValue placeholder="Max budget" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any budget</SelectItem>
                <SelectItem value="50">Up to $50/hr</SelectItem>
                <SelectItem value="80">Up to $80/hr</SelectItem>
                <SelectItem value="120">Up to $120/hr</SelectItem>
                <SelectItem value="200">Up to $200/hr</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start text-muted-foreground"
              onClick={() => { setText(""); navigate({ to: "/chefs", search: {} }); }}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Clear filters
            </Button>
          )}
        </div>

        {/* Results */}
        {chefs === null ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] rounded-2xl" />
            ))}
          </div>
        ) : chefs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
            <SlidersHorizontal className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-4 font-display text-xl">No chefs match your filters</h3>
            <p className="mt-1 text-sm text-muted-foreground">Try widening your search or clearing some filters.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {chefs.map((c) => <ChefCard key={c.id} chef={c} />)}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
