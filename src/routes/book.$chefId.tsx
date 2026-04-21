import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

const bookingSchema = z.object({
  category_id: z.string().uuid().optional().or(z.literal("")),
  event_date: z.string().min(1),
  guests: z.coerce.number().int().min(1).max(500),
  location: z.string().trim().min(2).max(200),
  notes: z.string().max(1000).optional(),
  budget: z.coerce.number().min(0).optional().or(z.literal("")),
});

export const Route = createFileRoute("/book/$chefId")({
  head: () => ({ meta: [{ title: "Request booking — Chefly" }] }),
  component: BookingPage,
});

function BookingPage() {
  const { chefId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [chefName, setChefName] = useState("");
  const [services, setServices] = useState<Array<{ id: string; name: string }>>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  useEffect(() => {
    (async () => {
      const { data: cp } = await supabase
        .from("chef_profiles")
        .select(`profiles:profiles!chef_profiles_profile_fkey(display_name)`)
        .eq("id", chefId).maybeSingle();
      const p = Array.isArray(cp?.profiles) ? cp?.profiles?.[0] : cp?.profiles;
      setChefName(p?.display_name ?? "this chef");

      const { data: svc } = await supabase
        .from("chef_services")
        .select(`category_id, category:service_categories(name)`)
        .eq("chef_id", chefId);
      setServices((svc ?? []).map((s) => {
        const cat = Array.isArray(s.category) ? s.category[0] : s.category;
        return { id: s.category_id, name: cat?.name ?? "Service" };
      }));
    })();
  }, [chefId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const form = new FormData(e.currentTarget);
    const parsed = bookingSchema.safeParse({
      category_id: form.get("category_id") || undefined,
      event_date: form.get("event_date"),
      guests: form.get("guests"),
      location: form.get("location"),
      notes: form.get("notes") || undefined,
      budget: form.get("budget") || undefined,
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }

    setSubmitting(true);
    const { data, error } = await supabase.from("bookings").insert({
      client_id: user.id,
      chef_id: chefId,
      category_id: parsed.data.category_id || null,
      event_date: parsed.data.event_date,
      guests: parsed.data.guests,
      location: parsed.data.location,
      notes: parsed.data.notes || null,
      budget: parsed.data.budget ? Number(parsed.data.budget) : null,
      status: "pending",
    }).select().single();
    setSubmitting(false);

    if (error) { toast.error(error.message); return; }
    toast.success("Booking request sent!");
    navigate({ to: "/bookings/$bookingId", params: { bookingId: data.id } });
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate({ to: "/chefs/$chefId", params: { chefId } })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back to profile
        </Button>

        <Card className="p-6 sm:p-8">
          <h1 className="font-display text-3xl">Request a booking</h1>
          <p className="mt-1 text-muted-foreground">Send your details to <strong>{chefName}</strong>. They'll respond within 24 hours.</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="category_id">Service</Label>
              <Select name="category_id" defaultValue="">
                <SelectTrigger><SelectValue placeholder="Select a service" /></SelectTrigger>
                <SelectContent>
                  {services.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="event_date">Date</Label>
                <Input id="event_date" name="event_date" type="date" required min={new Date().toISOString().split("T")[0]} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="guests">Guests</Label>
                <Input id="guests" name="guests" type="number" min={1} max={500} defaultValue={4} required />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" placeholder="Your address or city" required maxLength={200} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="budget">Budget (optional)</Label>
              <Input id="budget" name="budget" type="number" min={0} placeholder="e.g. 500" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes for the chef</Label>
              <Textarea id="notes" name="notes" rows={4} maxLength={1000} placeholder="Tell the chef about the occasion, dietary requirements, etc." />
            </div>

            <Button type="submit" size="lg" className="w-full rounded-full" disabled={submitting}>
              {submitting ? "Sending…" : "Send booking request"}
            </Button>
          </form>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
