-- Add phone_number to parents for caller identification
-- Allows the brain function to distinguish the parent (Alex) from other callers
-- who might be forwarded to the Neul number (e.g. Sam's boss).
-- While phone_number is null, every caller to the Neul number is treated as the parent.

begin;

alter table public.parents add column phone_number text
  check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$');

grant update (phone_number) on public.parents to authenticated;

commit;