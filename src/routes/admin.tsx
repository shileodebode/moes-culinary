import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, X, Users, ChefHat, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, hasRole } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface PendingChef { id: string; headline: string; city: string; years_experience: number; hourly_rate: number; status: string; display_name: string }
interface AdminBooking { id: string; event_date: string; status: string; client_name: string; chef_name: string; budget: number | null }

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Chefly" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, roles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [chefs, setChefs] = useState<PendingChef[] | null>(null);
  const [bookings, setBookings] = useState<AdminBooking[] | null>(null);
  const [stats, setStats] = useState({ chefs: 0, clients: 0, bookings: 0, earnings: 0 });

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate({ to: "/auth" }); return; }
    if (!hasRole(roles, "admin")) { toast.error("Admin access required"); navigate({ to: "/" }); }
  }, [user, roles, authLoading, navigate]);

  const load = async () => {
    const [{ data: cps }, { data: bks }, { count: chefCount }, { count: clientCount }] = await Promise.all([
      supabase.from("chef_profiles").select(`id, headline, city, years_experience, hourly_rate, status, profiles:profiles!chef_profiles_profile_fkey(display_name)`).order("created_at", { ascending: false }),
      supabase.from("bookings").select(`id, event_date, status, budget, client:profiles!bookings_client_profile_fkey(display_name), chef:chef_profiles!bookings_chef_id_fkey(profiles:profiles!chef_profiles_profile_fkey(display_name))`).order("created_at", { ascending: false }).limit(50),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "chef"),
      supabase.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "client"),
    ]);

    setChefs((cps ?? []).map((c) => {
      const p = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
      return { ...c, hourly_rate: Number(c.hourly_rate), display_name: p?.display_name ?? "Chef" };
    }));

    const allBookings = (bks ?? []).map((b: { id: string; event_date: string; status: string; budget: number | null; client: unknown; chef: unknown }) => {
      const cl = Array.isArray(b.client) ? b.client[0] : b.client;
      const ch = Array.isArray(b.chef) ? b.chef[0] : b.chef;
      const chP = ch?.profiles ? (Array.isArray(ch.profiles) ? ch.profiles[0] : ch.profiles) : null;
      return { id: b.id, event_date: b.event_date, status: b.status, budget: b.budget, client_name: cl?.display_name ?? "Client", chef_name: chP?.display_name ?? "Chef" };
    });
    setBookings(allBookings);

    const earnings = allBookings.filter((b) => b.status === "completed").reduce((s, b) => s + (b.budget ?? 0), 0);
    setStats({ chefs: chefCount ?? 0, clients: clientCount ?? 0, bookings: allBookings.length, earnings: earnings * 0.1 });
  };

  useEffect(() => { if (hasRole(roles, "admin")) load(); }, [roles]);

  const updateChefStatus = async (id: string, status: "approved" | "pending" | "rejected" | "suspended") => {
    const { error } = await supabase.from("chef_profiles").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success(`Chef ${status}`); load(); }
  };

  if (!user || !hasRole(roles, "admin")) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl sm:text-4xl">Admin dashboard</h1>

        <div className="mt-6 grid gap-3 sm:grid-cols-4">
          <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><ChefHat className="h-4 w-4" /> Chefs</div><p className="mt-1 font-display text-2xl">{stats.chefs}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4" /> Clients</div><p className="mt-1 font-display text-2xl">{stats.clients}</p></Card>
          <Card className="p-4"><div className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarCheck className="h-4 w-4" /> Bookings</div><p className="mt-1 font-display text-2xl">{stats.bookings}</p></Card>
          <Card className="p-4"><div className="text-xs text-muted-foreground">Commission (10%)</div><p className="mt-1 font-display text-2xl">${stats.earnings.toFixed(0)}</p></Card>
        </div>

        <Tabs defaultValue="chefs" className="mt-8">
          <TabsList>
            <TabsTrigger value="chefs">Chef applications</TabsTrigger>
            <TabsTrigger value="bookings">All bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="chefs" className="mt-4 space-y-2">
            {chefs === null ? <Skeleton className="h-24 rounded-2xl" /> :
              chefs.length === 0 ? <Card className="p-6 text-center text-sm text-muted-foreground">No chef profiles yet.</Card> :
              chefs.map((c) => (
                <Card key={c.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold">{c.display_name} <Badge variant="outline" className="ml-1">{c.status}</Badge></p>
                    <p className="text-sm text-muted-foreground">{c.headline}</p>
                    <p className="text-xs text-muted-foreground">{c.city} · {c.years_experience}y · ${c.hourly_rate}/hr</p>
                  </div>
                  <div className="flex gap-2">
                    {c.status !== "approved" && <Button size="sm" className="rounded-full" onClick={() => updateChefStatus(c.id, "approved")}><Check className="mr-1 h-3.5 w-3.5" /> Approve</Button>}
                    {c.status !== "rejected" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => updateChefStatus(c.id, "rejected")}><X className="mr-1 h-3.5 w-3.5" /> Reject</Button>}
                    {c.status === "approved" && <Button size="sm" variant="outline" className="rounded-full" onClick={() => updateChefStatus(c.id, "suspended")}>Suspend</Button>}
                  </div>
                </Card>
              ))}
          </TabsContent>

          <TabsContent value="bookings" className="mt-4 space-y-2">
            {bookings === null ? <Skeleton className="h-24 rounded-2xl" /> :
              bookings.length === 0 ? <Card className="p-6 text-center text-sm text-muted-foreground">No bookings.</Card> :
              bookings.map((b) => (
                <Card key={b.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="flex-1 min-w-[200px]">
                    <p className="font-semibold">{b.client_name} → {b.chef_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(b.event_date).toLocaleDateString()} · {b.budget ? `$${b.budget}` : "no budget"}</p>
                  </div>
                  <Badge variant="outline">{b.status}</Badge>
                </Card>
              ))}
          </TabsContent>
        </Tabs>
      </main>
      <SiteFooter />
    </div>
  );
}
