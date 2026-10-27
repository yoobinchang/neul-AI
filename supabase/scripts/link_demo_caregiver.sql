-- Replace UID_PLACEHOLDER with a confirmed test user's UID before running.
-- Run manually as an administrator after applying migrations and seed.sql.
-- Keep real user IDs and credentials out of Git.
-- One returned row means the membership was created.
-- Zero rows means the account is missing/unconfirmed or already linked.

insert into public.family_memberships (
  user_id,
  family_id,
  role
)
select
  id,
  '10000000-0000-4000-8000-000000000001'::uuid,
  'primary'
from auth.users
where id = 'UID_PLACEHOLDER'::uuid
  and email_confirmed_at is not null
on conflict (user_id, family_id) do nothing
returning user_id, family_id, role;
