import { Link } from "@tanstack/react-router";
import { MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface ChefCardData {
  id: string;
  display_name: string;
  avatar_url: string | null;
  headline: string;
  city: string;
  cuisines: string[];
  hourly_rate: number;
  years_experience: number;
  rating?: number | null;
  review_count?: number;
}

export function ChefCard({ chef }: { chef: ChefCardData }) {
  return (
    <Link
      to="/chefs/$chefId"
      params={{ chefId: chef.id }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {chef.avatar_url ? (
          <img
            src={chef.avatar_url}
            alt={chef.display_name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary-soft font-display text-4xl text-primary">
            {chef.display_name.charAt(0)}
          </div>
        )}
        {chef.rating != null && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
            <Star className="h-3.5 w-3.5 fill-warm text-warm" />
            {chef.rating.toFixed(1)}
            {chef.review_count ? <span className="text-muted-foreground">({chef.review_count})</span> : null}
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div>
          <h3 className="font-display text-lg leading-tight">{chef.display_name}</h3>
          <p className="line-clamp-1 text-sm text-muted-foreground">{chef.headline}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" /> {chef.city}
          <span className="mx-1">·</span>
          <span>{chef.years_experience}y experience</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          {chef.cuisines.slice(0, 3).map((c) => (
            <Badge key={c} variant="secondary" className="rounded-full bg-accent text-accent-foreground hover:bg-accent">
              {c}
            </Badge>
          ))}
        </div>
        <div className="flex items-baseline justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">From</span>
          <span className="font-display text-lg text-foreground">
            ${chef.hourly_rate}
            <span className="text-xs font-sans text-muted-foreground">/hr</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
