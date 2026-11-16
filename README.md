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
- **@dnd-kit** for the Kanban drag-and-drop
- **react-router v8**, **date-fns**, **lucide-react** icons, **clsx**

No backend yet. Data lives in the browser's IndexedDB, so it is per device and per browser profile.

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

## Project layout

```
src/
  db/            Dexie schema (db.ts), record types (types.ts), CRUD helpers (api.ts), sample data (seed.ts)
  lib/           dates, money, tags, image compression, package status, plan ranking, labels
  components/
    ui/          Button, Card, Badge, Dialog, ConfirmDialog, Select, Field, Checkbox, Toaster,
                 ActionMenu, SectionTabs, TagInput, ImageUpload, MediaImage, StatTile, EmptyState…
    layout/      AppShell (sidebar + mobile header)
    calendar/    MonthCalendar, AgendaList
  pages/
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
