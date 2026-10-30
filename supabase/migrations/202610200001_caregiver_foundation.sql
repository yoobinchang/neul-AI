-- Caregiver data boundary. Auth and privileged provisioning are owned by Supabase.
begin;

create function public.valid_profile_items(items text[]) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(cardinality(items) <= 20 and not exists (
    select 1 from unnest(items) item where item is null or char_length(item) > 300
  ), false);
$$;

create table public.families (
  family_id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 100),
  neul_number text unique,
  created_at timestamptz not null default now()
);
create table public.family_memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references public.families on delete cascade,
  role text not null check (role in ('primary', 'backup')),
  primary key (user_id, family_id)
);
create table public.parents (
  parent_id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  name text not null,
  preferred_name text not null check (char_length(btrim(preferred_name)) between 1 and 100),
  routine text not null default '' check (char_length(routine) <= 2000),
  family_facts text[] not null default '{}' check (public.valid_profile_items(family_facts)),
  calming_topics text[] not null default '{}' check (public.valid_profile_items(calming_topics)),
  topics_to_avoid text[] not null default '{}' check (public.valid_profile_items(topics_to_avoid)),
  unique (parent_id, family_id)
);
create table public.contacts (
  contact_id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  display_name text not null,
  phone_number text not null check (phone_number ~ '^\+[1-9][0-9]{7,14}$'),
  priority integer not null check (priority > 0),
  unique (family_id, priority)
);
create table public.calls (
  call_id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  parent_id uuid,
  provider_call_id text unique,
  status text not null check (status in ('in_progress', 'ended')),
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  transcript text,
  urgency text not null check (urgency in ('routine', 'urgent', 'lost')),
  summary_status text not null check (summary_status in ('processing', 'completed', 'failed')),
  summary text,
  topic text,
  mood text,
  cost_cents integer check (cost_cents >= 0),
  unique (call_id, family_id),
  foreign key (parent_id, family_id) references public.parents(parent_id, family_id),
  check (ended_at is null or ended_at >= started_at),
  check (status <> 'ended' or ended_at is not null),
  check (summary_status = 'completed' or (summary is null and topic is null and mood is null)),
  check (summary_status <> 'completed' or nullif(btrim(summary), '') is not null)
);
create table public.alerts (
  alert_id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families on delete cascade,
  call_id uuid not null,
  event_id text not null unique,
  type text not null check (type in ('urgent', 'lost')),
  reason text not null,
  landmarks text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (alert_id, family_id),
  foreign key (call_id, family_id) references public.calls(call_id, family_id)
);
create table public.acknowledgments (
  alert_id uuid primary key,
  family_id uuid not null,
  caregiver_id uuid not null,
  acknowledged_at timestamptz not null default now(),
  foreign key (alert_id, family_id) references public.alerts(alert_id, family_id) on delete cascade,
  foreign key (caregiver_id, family_id) references public.family_memberships(user_id, family_id)
);
create index memberships_by_family on public.family_memberships(family_id);
create index parents_by_family on public.parents(family_id);
create index calls_family_feed on public.calls(family_id, started_at desc, call_id desc);
create index alerts_family_feed on public.alerts(family_id, created_at desc);

alter table public.families enable row level security;
alter table public.family_memberships enable row level security;
alter table public.parents enable row level security;
alter table public.contacts enable row level security;
alter table public.calls enable row level security;
alter table public.alerts enable row level security;
alter table public.acknowledgments enable row level security;

-- Membership is provisioned only by a trusted administrator. Clients cannot join
-- a family, promote themselves, move rows between families, or write call output.
create policy membership_read on public.family_memberships for select to authenticated
using (user_id = (select auth.uid()));
create policy family_read on public.families for select to authenticated
using (family_id in (select family_id from public.family_memberships));
create policy parent_read on public.parents for select to authenticated
using (family_id in (select family_id from public.family_memberships));
create policy parent_edit on public.parents for update to authenticated
using (family_id in (select family_id from public.family_memberships))
with check (family_id in (select family_id from public.family_memberships));
create policy contact_read on public.contacts for select to authenticated
using (family_id in (select family_id from public.family_memberships));
create policy call_read on public.calls for select to authenticated
using (family_id in (select family_id from public.family_memberships));
create policy alert_read on public.alerts for select to authenticated
using (family_id in (select family_id from public.family_memberships));
create policy acknowledgment_read on public.acknowledgments for select to authenticated
using (family_id in (select family_id from public.family_memberships));
create policy acknowledgment_insert on public.acknowledgments for insert to authenticated
with check (caregiver_id = (select auth.uid()) and family_id in (select family_id from public.family_memberships));

-- C03 deliberately excludes transcript and provider/billing fields. Column
-- grants prevent accessing those fields through the underlying calls endpoint.
create view public.call_details with (security_invoker = true) as
select family_id, call_id, parent_id, started_at, duration_seconds, urgency,
       summary_status, summary, topic, mood
from public.calls;

revoke all on public.families, public.family_memberships, public.parents,
  public.contacts, public.calls, public.alerts, public.acknowledgments,
  public.call_details from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.families, public.family_memberships, public.parents,
  public.contacts, public.alerts, public.acknowledgments, public.call_details to authenticated;
grant select (call_id, family_id, parent_id, started_at, duration_seconds, urgency,
  summary_status, summary, topic, mood) on public.calls to authenticated;
grant update (preferred_name, routine, family_facts, calming_topics, topics_to_avoid)
  on public.parents to authenticated;
grant insert (alert_id, family_id, caregiver_id) on public.acknowledgments to authenticated;
grant all on public.families, public.family_memberships, public.parents,
  public.contacts, public.calls, public.alerts, public.acknowledgments to service_role;
grant select on public.call_details to service_role;
commit;
