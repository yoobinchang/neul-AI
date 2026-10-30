-- DEMO ONLY: latest Parent Mode location, one row per family.
-- Parent Mode runs in a signed-in caregiver account, so any member of the family
-- may write and read it. Pairing, sessions, history and the 30-minute expiry from
-- contract C07 are intentionally not implemented here.
begin;

create table public.demo_locations (
  family_id uuid primary key references public.families on delete cascade,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  accuracy_m double precision check (accuracy_m is null or accuracy_m >= 0),
  recorded_at timestamptz not null default now()
);

alter table public.demo_locations enable row level security;

create policy demo_location_read on public.demo_locations for select to authenticated
using (family_id in (select family_id from public.family_memberships));
create policy demo_location_insert on public.demo_locations for insert to authenticated
with check (family_id in (select family_id from public.family_memberships));
create policy demo_location_update on public.demo_locations for update to authenticated
using (family_id in (select family_id from public.family_memberships))
with check (family_id in (select family_id from public.family_memberships));
create policy demo_location_delete on public.demo_locations for delete to authenticated
using (family_id in (select family_id from public.family_memberships));

revoke all on public.demo_locations from anon, authenticated;
grant select, insert, update, delete on public.demo_locations to authenticated;
grant all on public.demo_locations to service_role;

commit;
