import { ChefHat } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-muted/40">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <ChefHat className="h-4 w-4 text-primary" />
          <span className="font-display text-base text-foreground">Chefly</span>
          <span className="hidden sm:inline">— a culinary marketplace</span>
        </div>
        <p>© {new Date().getFullYear()} Chefly. All rights reserved.</p>
      </div>
    </footer>
  );
}
