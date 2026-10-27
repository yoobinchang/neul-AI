-- C05: caller number editable by the family's caregivers under existing RLS.
begin;
alter table public.parents add column phone_number text
  constraint parents_phone_number_e164 check (
    phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$'
  );
grant update (phone_number) on public.parents to authenticated;
commit;
