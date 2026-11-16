-- Store address separately from the shop name on packages and appointments.
alter table public.beauty_packages
  add column if not exists location text;

alter table public.appointments
  add column if not exists location text;
