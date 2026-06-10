# Succseed

A shared plant care tracker for couples and friends. Log waterings, fertilising, and care notes — and share plants with co-parents so everyone stays in the loop.

## Features

- **Plant library** — add plants with a photo, species, nickname, and acquisition date
- **Care logging** — record waterings, fertilising, and general care notes; log on any past date
- **Watering reminders** — set a "water every N days" interval per plant; cards turn yellow or red when a plant is overdue
- **Propagation tracking** — track cuttings and propagations from parent plants through to potting
- **Journal calendar** — tap any day to see everything that happened: waterings, fertilising, care logs, and plant anniversaries
- **Co-parents** — share a plant with another user so both of you can log care
- **Invite flow** — invite someone by email; if they don't have an account yet they receive a magic link that drops them straight into the app as a co-parent
- **In-app notifications** — bell icon shows when you've been added as a co-parent or someone accepted your invite
- **Installable PWA** — works offline and can be added to your phone's home screen (Android: native install prompt; iOS: Share → Add to Home Screen)

## Tech stack

| Layer | Choice |
|-------|--------|
| Frontend | React 19, TypeScript, Vite |
| Styling | Tailwind CSS v3 (custom `leaf` and `soil` colour palettes) |
| Routing | React Router v6 |
| Backend / DB | Supabase (PostgreSQL + RLS) |
| Auth | Supabase magic link (passwordless) |
| Storage | Supabase Storage (`plant-photos` bucket) |
| Edge functions | Supabase Edge Functions (Deno) |
| Email | Resend via `send-invite-email` edge function |
| Deployment | Vercel |

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Vercel](https://vercel.com) account (for deployment)

### Local development

1. Clone the repo and install dependencies:

   ```bash
   git clone https://github.com/alesstongwen/succseed.git
   cd succseed
   npm install
   ```

2. Create a `.env.local` file at the project root:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. Run the database migrations in the Supabase SQL editor (in order):

   ```
   supabase/migrations/001_initial_schema.sql
   supabase/migrations/002_invite_accept.sql
   supabase/migrations/003_notifications.sql
   supabase/migrations/004_watering_interval.sql
   ```

4. Create a public storage bucket named `plant-photos` in Supabase Storage.

5. Start the dev server:

   ```bash
   npm run dev
   ```

### Edge functions

Deploy the invite email function via the Supabase CLI:

```bash
supabase functions deploy send-invite-email
```

Set the required secret in the Supabase dashboard (Project Settings → Edge Functions):

```
RESEND_API_KEY=your-resend-key
```

### Deployment

The project deploys automatically to Vercel on every push to `main`. The `vercel.json` at the project root configures SPA routing and forces npm.

## Database schema

```
profiles          — mirror of auth.users, auto-created on sign-up
plants            — plant records (owner, species, nickname, photo, watering interval)
plant_caretakers  — many-to-many: users who care for a plant (OWNER or COPARENT)
plant_invites     — pending email invites for co-parents
watering_logs     — timestamped watering records per plant
fertilize_logs    — timestamped fertilise records per plant
care_logs         — general care notes (repotting, pruning, pest treatment, etc.)
notifications     — in-app notifications (co-parent added/accepted)
```

All tables have Row Level Security enabled. Users can only read and write data for plants they are a caretaker of.

## Project structure

```
src/
  components/     React components (one file per screen or modal)
  hooks/          useAuth hook
  lib/            Supabase client, image compression utility
  types/          TypeScript types (Plant, WateringLog, etc.)
public/
  manifest.webmanifest   PWA manifest
  sw.js                  Service worker
  icon.svg               App icon
supabase/
  migrations/     SQL migration files
  functions/      Edge functions (send-invite-email)
```
