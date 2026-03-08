-- Fix for: record "NEW" has no field "updated_at" on updates to public.drivers
-- Run in Supabase SQL Editor for the target project.

alter table if exists public.drivers
  add column if not exists updated_at timestamptz default now();

create or replace function public.set_drivers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_drivers_updated_at on public.drivers;
create trigger trg_drivers_updated_at
before update on public.drivers
for each row
execute function public.set_drivers_updated_at();
