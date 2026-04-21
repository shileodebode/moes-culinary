import { Link, useNavigate } from "@tanstack/react-router";
import { ChefHat, Menu, User as UserIcon, LogOut, LayoutDashboard } from "lucide-react";
import { useState } from "react";
import { useAuth, hasRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function SiteHeader() {
  const { user, roles, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const isChef = hasRole(roles, "chef");
  const isAdmin = hasRole(roles, "admin");

  const navLinks = (
    <>
      <Link to="/" className="text-sm font-medium text-foreground/80 hover:text-foreground" onClick={() => setOpen(false)}>
        Home
      </Link>
      <Link to="/chefs" className="text-sm font-medium text-foreground/80 hover:text-foreground" onClick={() => setOpen(false)}>
        Browse chefs
      </Link>
      {user && (
        <Link to="/bookings" className="text-sm font-medium text-foreground/80 hover:text-foreground" onClick={() => setOpen(false)}>
          My bookings
        </Link>
      )}
      {isChef && (
        <Link to="/chef/dashboard" className="text-sm font-medium text-foreground/80 hover:text-foreground" onClick={() => setOpen(false)}>
          Chef dashboard
        </Link>
      )}
      {isAdmin && (
        <Link to="/admin" className="text-sm font-medium text-foreground/80 hover:text-foreground" onClick={() => setOpen(false)}>
          Admin
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ChefHat className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Chefly</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">{navLinks}</nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  <UserIcon className="mr-2 h-4 w-4" />
                  Account
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate({ to: "/bookings" })}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> My bookings
                </DropdownMenuItem>
                {!isChef && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/become-a-chef" })}>
                    <ChefHat className="mr-2 h-4 w-4" /> Become a chef
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth" })}>
                Sign in
              </Button>
              <Button size="sm" className="rounded-full" onClick={() => navigate({ to: "/auth", search: { mode: "signup" } })}>
                Get started
              </Button>
            </>
          )}
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="mt-8 flex flex-col gap-5">{navLinks}</div>
            <div className="mt-8 flex flex-col gap-2 border-t border-border pt-6">
              {user ? (
                <Button variant="outline" onClick={async () => { await signOut(); setOpen(false); navigate({ to: "/" }); }}>
                  Sign out
                </Button>
              ) : (
                <>
                  <Button variant="outline" onClick={() => { setOpen(false); navigate({ to: "/auth" }); }}>
                    Sign in
                  </Button>
                  <Button onClick={() => { setOpen(false); navigate({ to: "/auth", search: { mode: "signup" } }); }}>
                    Get started
                  </Button>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
