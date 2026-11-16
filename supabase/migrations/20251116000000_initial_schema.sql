-- Baseline for new projects. Existing table definitions and rows are left intact.
-- The later auth migration installs the shared-workspace access policies.
begin;

create table if not exists public.students (
  id text primary key,
  name text not null,
  focus_areas text[] not null default '{}',
  goals text,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.lesson_plans (
  id text primary key,
  title text not null,
  description text,
  focus_areas text[] not null default '{}',
  level text not null,
  duration_minutes integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.media (
  id text primary key,
  name text not null,
  mime_type text not null,
  byte_size bigint not null,
  storage_path text not null,
  created_at timestamptz not null
);

create table if not exists public.student_assigned_plans (
  student_id text references public.students(id) on delete cascade,
  lesson_plan_id text references public.lesson_plans(id) on delete cascade,
  primary key (student_id, lesson_plan_id)
);

create table if not exists public.lesson_plan_images (
  lesson_plan_id text references public.lesson_plans(id) on delete cascade,
  media_id text references public.media(id) on delete cascade,
  sort_order integer not null,
  primary key (lesson_plan_id, media_id)
);

create table if not exists public.yoga_sessions (
  id text primary key,
  title text not null,
  kind text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  student_id text references public.students(id) on delete set null,
  lesson_plan_id text references public.lesson_plans(id) on delete set null,
  location text,
  notes text,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.tasks (
  id text primary key,
  title text not null,
  description text,
  board_column text not null,
  priority text not null,
  area text not null,
  due_date date,
  sort_order integer not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.beauty_packages (
  id text primary key,
  name text not null,
  provider text not null,
  category text not null,
  total_price numeric not null,
  currency text not null,
  sessions_total integer not null,
  sessions_used integer not null,
  purchased_at date not null,
  expires_at date,
  notes text,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.appointments (
  id text primary key,
  title text not null,
  category text not null,
  provider text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  package_id text references public.beauty_packages(id) on delete set null,
  notes text,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

-- Retained for compatibility with previous releases.
create table if not exists public.sync_state (
  id text primary key,
  ready boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.students enable row level security;
alter table public.lesson_plans enable row level security;
alter table public.media enable row level security;
alter table public.student_assigned_plans enable row level security;
alter table public.lesson_plan_images enable row level security;
alter table public.yoga_sessions enable row level security;
alter table public.tasks enable row level security;
alter table public.beauty_packages enable row level security;
alter table public.appointments enable row level security;
alter table public.sync_state enable row level security;

grant select, insert, update, delete on
  public.students, public.lesson_plans, public.media, public.student_assigned_plans,
  public.lesson_plan_images, public.yoga_sessions, public.tasks,
  public.beauty_packages, public.appointments, public.sync_state
to authenticated;

commit;
