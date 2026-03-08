-- Fix for: record "NEW" has no field "updated_at" on updates to orders tables.
-- Safe to run multiple times.

-- Ensure canonical lowercase table has the column.
alter table if exists public.orders
  add column if not exists updated_at timestamptz default now();

-- If a legacy quoted table exists as a real table, patch it too.
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'Orders'
      and c.relkind = 'r'
  ) then
    execute 'alter table public."Orders" add column if not exists updated_at timestamptz default now()';
  end if;
end;
$$;

-- Use jsonb_populate_record so trigger never crashes on schema variants.
create or replace function public.set_orders_updated_at()
returns trigger
language plpgsql
as $$
begin
  new := jsonb_populate_record(new, jsonb_build_object('updated_at', now()));
  return new;
end;
$$;

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
before update on public.orders
for each row
execute function public.set_orders_updated_at();

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'Orders'
      and c.relkind = 'r'
  ) then
    execute 'drop trigger if exists trg_orders_updated_at on public."Orders"';
    execute 'create trigger trg_orders_updated_at before update on public."Orders" for each row execute function public.set_orders_updated_at()';
  end if;
end;
$$;
