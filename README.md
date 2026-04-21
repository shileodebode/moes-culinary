# Chefly — Chef & Culinary Marketplace

A mobile-first marketplace connecting trained chefs to households, event hosts, and businesses.

## Stack

- **Frontend**: TanStack Start (React 19, Vite 7) + Tailwind v4 + shadcn/ui
- **Backend**: Lovable Cloud (managed Supabase) — Postgres + Auth + Storage + Realtime
- **Validation**: Zod

## Roles

- **Client** — discover & book chefs, message, leave reviews
- **Chef** — manage profile, accept bookings, upload portfolio
- **Admin** — approve chef accounts, monitor activity

## Demo accounts (password: `password123`)

| Email | Role |
|-------|------|
| `demo@client.com` | Client |
| `sophia@demo.chef` | Chef (Paris, French) |
| `marcus@demo.chef` | Chef (Lagos, West African events) |
| `mei@demo.chef` | Chef (Tokyo, pastry) |
| `giuseppe@demo.chef` | Chef (Rome, Italian meal prep) |

To create an admin: sign up as a normal user, then run in the Cloud SQL editor:
```sql
UPDATE user_roles SET role='admin' WHERE user_id = (SELECT id FROM auth.users WHERE email = 'you@example.com');
```

## Features

- ✅ Email/password auth with auto-confirm (testing)
- ✅ Role-based navigation & RLS-protected data
- ✅ Chef discovery: search, filter by city / cuisine / service / budget
- ✅ Rich chef profile: bio, services, portfolio, reviews
- ✅ Booking request flow with status tracking
- ✅ Real-time in-app messaging per booking
- ✅ Star ratings & reviews on completed bookings
- ✅ Chef dashboard: bookings, earnings, portfolio uploads
- ✅ Admin dashboard: approve chefs, manage bookings, commission stats

## Local dev

Environment variables are auto-injected by Lovable Cloud. To run locally:

```bash
bun install
bun run dev
```

## Database

8 service categories seeded. Schema: `user_roles`, `profiles`, `chef_profiles`, `service_categories`, `chef_services`, `portfolio_items`, `availability`, `bookings`, `messages`, `reviews`. All tables protected by RLS.
