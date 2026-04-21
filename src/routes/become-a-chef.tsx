import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ChefHat } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

const schema = z.object({
  headline: z.string().trim().min(5).max(120),
  bio: z.string().trim().min(20).max(2000),
  city: z.string().trim().min(2).max(100),
  country: z.string().trim().max(100).optional(),
  cuisines: z.string().trim().min(2).max(300),
  specialties: z.string().trim().max(300).optional(),
  years_experience: z.coerce.number().int().min(0).max(60),
  hourly_rate: z.coerce.number().min(10).max(2000),
});

export const Route = createFileRoute("/become-a-chef")({
  head: () => ({ meta: [{ title: "Become a chef — Chefly" }] }),
  component: BecomeChefPage,
});

function BecomeChefPage() {
  const { user, loading: authLoading, refreshRoles } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<{ status: string } | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("chef_profiles").select("status").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setExisting(data));
  }, [user]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    const f = new FormData(e.currentTarget);
    const parsed = schema.safeParse({
      headline: f.get("headline"),
      bio: f.get("bio"),
      city: f.get("city"),
      country: f.get("country") || undefined,
      cuisines: f.get("cuisines"),
      specialties: f.get("specialties") || undefined,
      years_experience: f.get("years_experience"),
      hourly_rate: f.get("hourly_rate"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    const { error } = await supabase.from("chef_profiles").insert({
      user_id: user.id,
      headline: parsed.data.headline,
      bio: parsed.data.bio,
      city: parsed.data.city,
      country: parsed.data.country || null,
      cuisines: parsed.data.cuisines.split(",").map((s) => s.trim()).filter(Boolean),
      specialties: parsed.data.specialties ? parsed.data.specialties.split(",").map((s) => s.trim()).filter(Boolean) : [],
      years_experience: parsed.data.years_experience,
      hourly_rate: parsed.data.hourly_rate,
      status: "pending",
    });

    // Add chef role
    await supabase.from("user_roles").insert({ user_id: user.id, role: "chef" }).select();
    await refreshRoles();
    setSubmitting(false);

    if (error) toast.error(error.message);
    else { toast.success("Application submitted! An admin will review your profile."); navigate({ to: "/chef/dashboard" }); }
  };

  if (!user) return null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground"><ChefHat className="h-5 w-5" /></span>
          <h1 className="font-display text-3xl">Become a chef</h1>
        </div>

        {existing ? (
          <Card className="p-6">
            <p className="font-semibold">Your chef profile status: <span className="capitalize text-primary">{existing.status}</span></p>
            <p className="mt-2 text-sm text-muted-foreground">
              {existing.status === "pending" && "Your application is pending admin review. You'll be notified when approved."}
              {existing.status === "approved" && "You're approved! Visit your chef dashboard to manage your profile."}
              {existing.status === "rejected" && "Your application was not approved. Contact support for details."}
            </p>
            <Button className="mt-4 rounded-full" onClick={() => navigate({ to: "/chef/dashboard" })}>Go to dashboard</Button>
          </Card>
        ) : (
          <Card className="p-6 sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="headline">Professional headline</Label>
                <Input id="headline" name="headline" required maxLength={120} placeholder="e.g. Modern Italian private chef" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" name="bio" required rows={5} minLength={20} maxLength={2000} placeholder="Your training, philosophy, and what makes your cooking special." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" required maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" maxLength={100} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cuisines">Cuisines (comma separated)</Label>
                <Input id="cuisines" name="cuisines" required placeholder="Italian, Mediterranean" maxLength={300} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="specialties">Specialties (comma separated)</Label>
                <Input id="specialties" name="specialties" placeholder="Pasta, Wine pairing" maxLength={300} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="years_experience">Years of experience</Label>
                  <Input id="years_experience" name="years_experience" type="number" min={0} max={60} required defaultValue={3} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="hourly_rate">Hourly rate (USD)</Label>
                  <Input id="hourly_rate" name="hourly_rate" type="number" min={10} max={2000} required defaultValue={75} />
                </div>
              </div>
              <Button type="submit" size="lg" className="w-full rounded-full" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit application"}
              </Button>
            </form>
          </Card>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
