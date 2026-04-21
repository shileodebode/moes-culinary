import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Calendar, MapPin, Send, Star, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/booking-utils";

interface BookingDetail {
  id: string;
  event_date: string;
  guests: number;
  location: string;
  status: string;
  notes: string | null;
  budget: number | null;
  client_id: string;
  chef_user_id: string;
  chef_name: string;
  chef_id: string;
  client_name: string;
}

interface Message { id: string; sender_id: string; content: string; created_at: string }

export const Route = createFileRoute("/bookings/$bookingId")({
  head: () => ({ meta: [{ title: "Booking — Chefly" }] }),
  component: BookingDetailPage,
});

function BookingDetailPage() {
  const { bookingId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [hasReview, setHasReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (!authLoading && !user) navigate({ to: "/auth" }); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: b } = await supabase
        .from("bookings")
        .select(`
          id, event_date, guests, location, status, notes, budget, client_id, chef_id,
          chef:chef_profiles!bookings_chef_id_fkey(id, user_id, profiles:profiles!chef_profiles_user_id_fkey(display_name)),
          client:profiles!bookings_client_id_fkey(display_name)
        `)
        .eq("id", bookingId).maybeSingle();

      if (!b) return;
      const chef = Array.isArray(b.chef) ? b.chef[0] : b.chef;
      const chefP = chef?.profiles ? (Array.isArray(chef.profiles) ? chef.profiles[0] : chef.profiles) : null;
      const client = Array.isArray(b.client) ? b.client[0] : b.client;
      setBooking({
        id: b.id, event_date: b.event_date, guests: b.guests, location: b.location,
        status: b.status, notes: b.notes, budget: b.budget, client_id: b.client_id,
        chef_user_id: chef?.user_id ?? "", chef_name: chefP?.display_name ?? "Chef",
        chef_id: chef?.id ?? b.chef_id, client_name: client?.display_name ?? "Client",
      });

      const { data: msgs } = await supabase.from("messages").select("*").eq("booking_id", bookingId).order("created_at");
      setMessages(msgs ?? []);

      const { data: rev } = await supabase.from("reviews").select("id").eq("booking_id", bookingId).maybeSingle();
      setHasReview(!!rev);
    })();
  }, [bookingId, user]);

  // realtime messages
  useEffect(() => {
    const ch = supabase.channel(`booking-${bookingId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => setMessages((m) => [...m, payload.new as Message]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [bookingId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  if (!user) return null;
  if (!booking) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8"><Skeleton className="h-64 rounded-2xl" /></div>
        <SiteFooter />
      </div>
    );
  }

  const isClient = booking.client_id === user.id;
  const isChef = booking.chef_user_id === user.id;

  const sendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 2000) return;
    const { error } = await supabase.from("messages").insert({ booking_id: bookingId, sender_id: user.id, content: trimmed });
    if (error) toast.error(error.message);
    else setText("");
  };

  const updateStatus = async (status: string) => {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);
    if (error) toast.error(error.message);
    else { toast.success(`Booking ${status}`); setBooking({ ...booking, status }); }
  };

  const submitReview = async () => {
    if (reviewComment.length > 1000) { toast.error("Comment too long"); return; }
    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId, chef_id: booking.chef_id, client_id: user.id,
      rating: reviewRating, comment: reviewComment.trim() || null,
    });
    if (error) toast.error(error.message);
    else { toast.success("Review submitted"); setHasReview(true); }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate({ to: isChef ? "/chef/dashboard" : "/bookings" })}>
          <ArrowLeft className="mr-1 h-4 w-4" /> Back
        </Button>

        <Card className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">{isClient ? "Booking with" : "Booking from"}</p>
              <h1 className="font-display text-2xl">{isClient ? booking.chef_name : booking.client_name}</h1>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLORS[booking.status]}`}>
              {STATUS_LABELS[booking.status]}
            </span>
          </div>

          <div className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
            <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(booking.event_date).toLocaleDateString()}</span>
            <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {booking.guests} guests</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {booking.location}</span>
          </div>

          {booking.notes && (
            <div className="mt-4 rounded-xl bg-muted p-3 text-sm">
              <p className="font-semibold">Notes</p>
              <p className="mt-1 text-muted-foreground">{booking.notes}</p>
            </div>
          )}
          {booking.budget != null && (
            <p className="mt-3 text-sm"><span className="text-muted-foreground">Budget:</span> <strong>${Number(booking.budget)}</strong></p>
          )}

          {/* Action buttons */}
          <div className="mt-5 flex flex-wrap gap-2">
            {isChef && booking.status === "pending" && (
              <>
                <Button onClick={() => updateStatus("accepted")} className="rounded-full">Accept</Button>
                <Button variant="outline" onClick={() => updateStatus("rejected")} className="rounded-full">Decline</Button>
              </>
            )}
            {isChef && booking.status === "accepted" && (
              <Button onClick={() => updateStatus("completed")} className="rounded-full">Mark completed</Button>
            )}
            {isClient && (booking.status === "pending" || booking.status === "accepted") && (
              <Button variant="outline" onClick={() => updateStatus("cancelled")} className="rounded-full">Cancel</Button>
            )}
          </div>
        </Card>

        {/* Review (client only, completed bookings) */}
        {isClient && booking.status === "completed" && !hasReview && (
          <Card className="mt-6 p-6">
            <h2 className="font-display text-xl">Leave a review</h2>
            <div className="mt-3 flex gap-1">
              {[1,2,3,4,5].map((r) => (
                <button key={r} type="button" onClick={() => setReviewRating(r)}>
                  <Star className={`h-7 w-7 ${r <= reviewRating ? "fill-warm text-warm" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <Textarea
              className="mt-3"
              placeholder="Share your experience…"
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              maxLength={1000}
              rows={3}
            />
            <Button className="mt-3 rounded-full" onClick={submitReview}>Submit review</Button>
          </Card>
        )}

        {/* Messages */}
        <Card className="mt-6 p-0">
          <div className="border-b border-border p-4">
            <h2 className="font-display text-xl">Messages</h2>
          </div>
          <div className="max-h-96 min-h-[200px] space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && <p className="text-center text-sm text-muted-foreground">No messages yet. Start the conversation!</p>}
            {messages.map((m) => {
              const mine = m.sender_id === user.id;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 border-t border-border p-3">
            <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Type a message…" />
            <Button type="submit" size="icon" className="shrink-0 rounded-full"><Send className="h-4 w-4" /></Button>
          </form>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}
