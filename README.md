# Client Dashboard — Phase 1: "The Creation"

A personal admin dashboard for a yoga instructor with a busy beauty-appointment life.
One place to check instead of hopping between WhatsApp, Telegram and notes.

## What is in this phase

| Section | What it does |
| --- | --- |
| **Dashboard** | Greeting, four stat tiles, "Upcoming this week" (yoga + appointments merged), "Things to do" with quick-add and tick-off, and at-a-glance cards for each section incl. packages expiring soon. |
| **Yoga → Schedule** | Month calendar of all sessions (1-on-1, group class, workshop, self practice), a selected-day panel, "coming up" list, and a full session form (student, lesson plan, location, notes, status). Mark done / cancel / delete from the row menu. |
| **Yoga → Kanban** | Four columns (Ideas & backlog, To do, In progress, Done) with drag-and-drop between and within columns, priority / area / due-date badges, filters by area, and a task form. |
| **Yoga → Lesson Plans** | Your own lesson plans with **image upload** (photos or scans, downscaled in the browser), focus-area tags, level and duration. Pick a student and plans are **ranked by how many of that student's focus areas they cover**; assign the ones that fit. Students live in the side panel with their goals and notes. |
| **Appointments → Schedule** | Month calendar of treatments (facial, hair, nails, massage…), provider, notes, and package link. **Marking an appointment done deducts one session from its package.** |
| **Appointments → Package Counter** | Every package you have signed: store, name, total price, price per session, sessions used / left (progress bar), signed and expiry dates, notes. Status is derived: Active, Expiring soon (≤30 days), Fully used, Expired. "Use 1 session" and "Undo last session" keep the count honest. |

Everything is full CRUD and persists locally. Sample data is seeded on first run and can be restored with **Reset sample data** in the sidebar.

## Tech stack

- **React 19 + TypeScript**, built with **Vite 8**
- **Base UI** (`@base-ui/react`, the renamed successor of `@base-ui-components/react`) for all interactive primitives: Dialog, AlertDialog, Select, Tabs, Menu, Checkbox, Toast, Field/Input, Progress, Button
- **Tailwind CSS v4** for styling (Base UI ships no CSS, so every component is styled here)
- **Dexie** (IndexedDB) + `dexie-react-hooks` for local persistence, incl. image blobs
- **Supabase** (`@supabase/supabase-js`) as the cloud copy of the data and the `media` storage bucket; optional, see below
- **i18next** + `react-i18next` for English and Simplified Chinese
- **@dnd-kit** for the Kanban drag-and-drop
- **react-router v8**, **date-fns**, **lucide-react** icons, **clsx**

Data is cached in the browser's IndexedDB. When `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` are set (copy `.env.example` to `.env`), Supabase is the source of truth and the local copy mirrors it. Without them the app runs offline with sample data.

## Run it

```bash
npm install
npm run dev        # or: npm start
```

Then open http://localhost:5173.

```bash
npm run build     # type-check (tsc -b) + production build into dist/
npm run preview   # serve the production build
```

`npm run lint` uses oxlint. On some locked-down Windows machines the oxlint native binary is blocked by Application Control policy; swap in ESLint if that happens.

## Sign-in and accounts

With Supabase configured, the app opens with a **sign-in page** (`/sign-in`) and a **register page** (`/register`: name, email, password). Without Supabase the pages are skipped and the offline sample-data mode works as before.

Registering creates a Supabase Auth user and, through a database trigger, a row in `public.profiles` with `approved = false`. A signed-in but unapproved user sees a "Waiting for approval" screen and cannot read or write any data. Row Level Security on every dashboard table and on the `media` storage bucket allows only approved, signed-in users; anonymous access is gone.

**One-time setup in Supabase**

1. SQL editor: run `supabase/migrations/20261116170000_auth_profiles_rls.sql`. It is safe to re-run.
2. Authentication → Sign In / Providers → Email: turn **Confirm email off**. Supabase's built-in mailer only delivers to members of your Supabase organisation (and 2 emails per hour), so the client would never receive a confirmation link. Keep it on only if you add custom SMTP.
3. Authentication → URL Configuration: set **Site URL** to the Render URL and add `http://localhost:5173/**` to the redirect list.

**Approving someone** after they register (SQL editor):

```sql
update public.profiles set approved = true where email = 'kelly@example.com';
```

The sidebar shows who is signed in and has a **Sign out** button; signing out also clears the on-device cache.

## Deploy to Render

The app is a static Vite build that talks to Supabase from the browser, so it runs as a Render **Static Site**. `render.yaml` describes the service and `.node-version` pins the Node version Render builds with.

1. Push the repository to GitHub.
2. In Render choose **New → Blueprint** and pick the repository. Render reads `render.yaml`.
3. Render asks for two values. Both come from the Supabase dashboard:
   - `VITE_SUPABASE_URL`: Project Settings → Data API → Project URL
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: Project Settings → API Keys → Publishable key
4. Click **Apply**. Render runs `npm ci && npm run build` and serves `dist/`. Every push to `main` redeploys.

The `VITE_` values are baked into the bundle at build time. Render redeploys on its own when you change an environment variable, so the new values take effect after that build.

Setting it up by hand instead of the blueprint: **New → Static Site**, build command `npm ci && npm run build`, publish directory `dist`, the two environment variables above, and a **Redirects/Rewrites** rule with source `/*`, destination `/index.html`, action **Rewrite**, so React Router routes still work on reload.

> **Access:** the dashboard is behind Supabase Auth (see "Sign-in and accounts"). Run the auth migration and set the Site URL before sharing the Render link.

## Project layout

```
src/
  auth/          AuthProvider (session + approval state), RequireAuth (route gate), authErrors
  db/            Dexie schema (db.ts), record types (types.ts), CRUD helpers (api.ts), sample data (seed.ts),
                 boot.ts + remote.ts (Supabase sync)
  lib/           dates, money, tags, image compression, package status, plan ranking, labels
  components/
    ui/          Button, Card, Badge, Dialog, ConfirmDialog, Select, Field, Checkbox, Toaster,
                 ActionMenu, SectionTabs, TagInput, ImageUpload, MediaImage, StatTile, EmptyState…
    layout/      AppShell (sidebar + mobile header), Brand, LanguageSwitch
    calendar/    MonthCalendar, AgendaList
  pages/
    auth/        SignInPage, RegisterPage, PendingApprovalPage, AuthLayout, PasswordInput
    dashboard/   DashboardPage
    yoga/        YogaPage (tabs), YogaSchedule + SessionDialog, YogaKanban + TaskDialog,
                 LessonPlans + LessonPlanDialog + LessonPlanDetail + StudentDialog
    appointments/ AppointmentsPage (tabs), AppointmentSchedule + AppointmentDialog,
                 PackageCounter + PackageDialog
```

## Data model (short)

- `YogaSession` — title, kind, start/end, student, lesson plan, location, notes, status
- `Student` — name, focus areas (tags), goals, notes, assigned plan ids
- `LessonPlan` — title, description, focus areas, level, duration, image ids
- `MediaItem` — stored image blob
- `Task` — title, description, column, priority, area, due date, order
- `Appointment` — title, category, provider, start/end, package, notes, status
- `BeautyPackage` — name, provider, category, total price, currency, sessions total/used, signed/expiry dates, notes

## Ideas for the next phase

- Sync / backup (export-import JSON first, then a small backend or cloud DB)
- Reminders and notifications for upcoming sessions, appointments and expiring packages
- Attach the lesson plan actually used to each session and keep a per-student history
- AI help: suggest a lesson plan from a student's notes, or summarise a package contract photo
- PWA install so it opens like an app on the phone
