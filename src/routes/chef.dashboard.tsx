import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, DollarSign, ImagePlus, MapPin, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/booking-utils";

interface ChefBooking {
  id: string;
  event_date: string;
  guests: number;
  location: string;
  status: string;
  budget: number | null;
  client_name: string;
}

interface PortfolioItem { id: string; image_url: string; caption: string | null }

export const Route = createFileRoute("/chef/dashboard")({
  head: () => ({ meta: [{ title: "Chef dashboard — Chefly" }] }),
  component: ChefDashboard,
});

function ChefDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [chefProfile, setChefProfile] = useState<{ id: string; status: string; headline: string; city: string; hourly_rate: number } | null>(null);
  const [bookings, setBookings] = useState<ChefBooking[] | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cp } = await supabase
        .from("chef_profiles").select("id, status, headline, city, hourly_rate").eq("user_id", user.id).maybeSingle();
      if (!cp) { setChefProfile(null); setBookings([]); return; }
      setChefProfile({ ...cp, hourly_rate: Number(cp.hourly_rate) });

      const { data: bks } = await supabase
        .from("bookings")
        .select(`id, event_date, guests, location, status, budget, client:profiles!bookings_client_id_fkey(display_name)`)
        .eq("chef_id", cp.id)
        .order("event_date", { ascending: false });
      setBookings((bks ?? []).map((b: { id: string; event_date: string; guests: number; location: string; status: string; budget: number | null; client: unknown }) => {
        const c = Array.isArray(b.client) ? b.client[0] : b.client;
        return { id: b.id, event_date: b.event_date, guests: b.guests, location: b.location, status: b.status, budget: b.budget, client_name: c?.display_name ?? "Client" };
      }));

      const { data: pf } = await supabase.from("portfolio_items").select("*").eq("chef_id", cp.id).order("created_at", { ascending: false });
      setPortfolio(pf ?? []);
    })();
  }, [user]);

  const uploadPortfolio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !chefProfile) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    setUploading(true);
    const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { error: upErr } = await supabase.storage.from("portfolio").upload(path, file);
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("portfolio").getPublicUrl(path);
    const { data: item, error } = await supabase.from("portfolio_items")
      .insert({ chef_id: chefProfile.id, image_url: pub.publicUrl }).select().single();
    setUploading(false);
    if (error) toast.error(error.message);
    else { setPortfolio((p) => [item, ...p]); toast.success("Image added"); }
    e.target.value = "";
  };

  const deletePortfolio = async (id: string) => {
    const { error } = await supabase.from("portfolio_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else setPortfolio((p) => p.filter((x) => x.id !== id));
  };

  if (!user) return null;

  if (chefProfile === null && bookings !== null) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 text-center">
          <h1 className="font-display text-3xl">You're not a chef yet</h1>
          <p className="mt-2 text-muted-foreground">Apply to start receiving bookings.</p>
          <Link to="/become-a-chef" className="mt-4 inline-block rounded-full bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90">
            Become a chef
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const earnings = (bookings ?? []).filter((b) => b.status === "completed").reduce((s, b) => s + (b.budget ?? 0), 0);
  const pending = (bookings ?? []).filter((b) => b.status === "pending").length;
  const upcoming = (bookings ?? []).filter((b) => b.status === "accepted").length;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl sm:text-4xl">Chef dashboard</h1>
            {chefProfile && (
              <p className="mt-1 text-sm text-muted-foreground">
                {chefProfile.headline} · {chefProfile.city}
                {chefProfile.status !== "approved" && (
                  <Badge className="ml-2" variant="outline">Status: {chefProfile.status}</Badge>
                )}
              </p>
            )}
          </div>
          {chefProfile && (
            <Button variant="outline" className="rounded-full" onClick={() => navigate({ to: "/chefs/$chefId", params: { chefId: chefProfile.id } })}>
              View public profile
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-3 sm:grid-cols-3">
          <Card className="p-4"><p className="text-xs text-muted-foreground">Pending requests</p><p className="font-display text-2xl">{pending}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Upcoming bookings</p><p className="font-display text-2xl">{upcoming}</p></Card>
          <Card className="p-4"><p className="text-xs text-muted-foreground">Estimated earnings</p><p className="font-display text-2xl">${earnings.toLocaleString()}</p></Card>
        </div>

        {/* Bookings */}
        <h2 className="font-display text-2xl">Bookings</h2>
        <div className="mt-3 space-y-2">
          {bookings === null ? (
            Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : bookings.length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">No bookings yet.</Card>
          ) : (
            bookings.map((b) => (
              <Link key={b.id} to="/bookings/$bookingId" params={{ bookingId: b.id }}
                className="block rounded-2xl border border-border bg-card p-4 transition hover:shadow-[var(--shadow-soft)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{b.client_name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(b.event_date).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {b.guests}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {b.location}</span>
                      {b.budget != null && <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" /> ${b.budget}</span>}
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status]}`}>{STATUS_LABELS[b.status]}</span>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Portfolio */}
        {chefProfile && (
          <>
            <h2 className="mt-10 font-display text-2xl">Portfolio</h2>
            <p className="text-sm text-muted-foreground">Showcase your best work. Images under 5MB.</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {portfolio.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl bg-muted">
                  <img src={p.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  <button
                    onClick={() => deletePortfolio(p.id)}
                    className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 opacity-0 shadow-sm transition group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              ))}
              <label className={`flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card text-sm text-muted-foreground transition hover:border-primary hover:text-primary ${uploading ? "pointer-events-none opacity-50" : ""}`}>
                <ImagePlus className="h-6 w-6" />
                {uploading ? "Uploading…" : "Add image"}
                <input type="file" accept="image/*" className="hidden" onChange={uploadPortfolio} disabled={uploading} />
              </label>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
