import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/booking-utils";

interface Booking {
  id: string;
  event_date: string;
  guests: number;
  location: string;
  status: string;
  budget: number | null;
  chef: { id: string; display_name: string; avatar_url: string | null } | null;
}

export const Route = createFileRoute("/bookings")({
  head: () => ({ meta: [{ title: "My bookings — Chefly" }] }),
  component: BookingsPage,
});

function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("bookings")
        .select(`
          id, event_date, guests, location, status, budget,
          chef:chef_profiles!bookings_chef_id_fkey(
            id,
            profiles:profiles!chef_profiles_profile_fkey(display_name, avatar_url)
          )
        `)
        .eq("client_id", user.id)
        .order("event_date", { ascending: false });

      setBookings((data ?? []).map((b: { id: string; event_date: string; guests: number; location: string; status: string; budget: number | null; chef: unknown }) => {
        const chef = Array.isArray(b.chef) ? b.chef[0] : b.chef;
        const profile = chef?.profiles ? (Array.isArray(chef.profiles) ? chef.profiles[0] : chef.profiles) : null;
        return {
          id: b.id, event_date: b.event_date, guests: b.guests, location: b.location, status: b.status, budget: b.budget,
          chef: chef ? { id: chef.id, display_name: profile?.display_name ?? "Chef", avatar_url: profile?.avatar_url ?? null } : null,
        };
      }));
    })();
  }, [user]);

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="font-display text-3xl sm:text-4xl">My bookings</h1>
        <p className="mt-2 text-muted-foreground">Track requests, chat with chefs, and review past experiences.</p>

        <div className="mt-8 space-y-3">
          {bookings === null ? (
            Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)
          ) : bookings.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="font-display text-xl">No bookings yet</p>
              <p className="mt-2 text-sm text-muted-foreground">Browse chefs and send your first request.</p>
              <Link to="/chefs" className="mt-4 inline-block text-primary hover:underline">Browse chefs</Link>
            </Card>
          ) : (
            bookings.map((b) => (
              <Link
                key={b.id}
                to="/bookings/$bookingId"
                params={{ bookingId: b.id }}
                className="block rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-muted">
                    {b.chef?.avatar_url ? <img src={b.chef.avatar_url} alt="" className="h-full w-full object-cover" /> : (
                      <div className="flex h-full w-full items-center justify-center font-display text-xl text-primary">
                        {b.chef?.display_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg">{b.chef?.display_name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status]}`}>
                        {STATUS_LABELS[b.status]}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(b.event_date).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {b.guests} guests</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {b.location}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
