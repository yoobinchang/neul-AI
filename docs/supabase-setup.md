# Caregiver integration setup

This slice implements email/password authentication, family-scoped reads, C05 profile updates, persisted acknowledgments, and fictional database fixtures. It does not deploy a Supabase project or configure Twilio.

## Apply to a development project

1. In the Supabase SQL editor, run `supabase/migrations/202610200001_caregiver_foundation.sql` **once**. The transaction creates the tables, RLS policies, column grants, and security-invoker `call_details` view. If this project already has tables with these names, reconcile that schema before running the migration; do not drop existing tables.
2. Run `supabase/seed.sql`. It adds one fictional family, one parent, two contacts, ten calls (including processing and failed summaries), and two alerts. Repeating it does not duplicate or overwrite rows. It does not create login credentials or grant anyone access.
3. Enable the email/password provider in Supabase Auth. Keep email confirmation enabled. Configure Site URL and allowed redirect URLs for `http://localhost:3000` and your deployed app URL. Create a test account through the app and confirm its email. No test password is committed.
4. A trusted administrator connects that confirmed account to the demo family in the SQL editor. Replace the example email with the exact test account address. Verify the returned user ID first:

   ```sql
   select id, email, email_confirmed_at
   from auth.users
   where email = 'your-test-account@example.com';
   ```

   Then grant membership to that verified, confirmed account:

   ```sql
   insert into public.family_memberships (user_id, family_id, role)
   select id, '10000000-0000-4000-8000-000000000001'::uuid, 'primary'
   from auth.users
   where email = 'your-test-account@example.com'
     and email_confirmed_at is not null
   on conflict (user_id, family_id) do nothing
   returning user_id, family_id, role;
   ```

   Require one returned row on the first run. Zero rows means the account is missing/unconfirmed or already assigned. Memberships and initial parent/contact creation are administrator-managed in this slice. A signed-in unassigned account sees a waiting-for-family screen, never the demo records.
5. Copy `app/.env.example` to `app/.env.local` and supply the project URL and public anon/publishable key. **Never put a service-role key in the app.** In Vercel, set the same two variables and use `app` as Root Directory, then rebuild. Public environment variables are embedded at build time.
6. In `app`, run `npm ci` and `npm run dev`. Sign in with the assigned account. Ten calls and two alerts should appear. Edit the profile and reload to verify persistence.

## Access model

- Authenticated users can read families they belong to. Multi-family accounts can select a workspace.
- Clients cannot insert/edit memberships, create families, change parent IDs/ownership, write calls, or fabricate alerts.
- Only `preferred_name`, `routine`, `family_facts`, `calming_topics`, and `topics_to_avoid` are editable, as in C05. Database constraints enforce lengths and array sizes.
- C03 selects exactly the agreed fields from `call_details`. The view additionally exposes `family_id` solely for filtering a multi-family workspace; it uses the caller's RLS rules. Transcript, provider IDs, and billing fields are not granted to caregivers even through the base table.
- Alert acknowledgment records the actual signed-in caregiver and database time. Another family cannot acknowledge it; a client cannot forge another caregiver or change an acknowledgment afterward.
- New accounts get **no automatic access** to fictional or existing family data. The seed never binds all users to one shared family.

## Verify

```bash
cd app
npm ci
npm run lint
npm run typecheck
npm run test:db
npx playwright install chromium
npm run test:ui
npm run build
```

`test:db` executes the actual migration and seed in PostgreSQL (PGlite), with a minimal Supabase `auth.users`/JWT helper shim. It tests RLS, column grants, cross-family writes/references, anonymous users, unassigned accounts, seed replay, and constraints. It does not test hosted email delivery or Supabase Auth configuration.

`test:ui` runs the app against intercepted fictional Supabase responses. It checks login, database-backed display, profile save/reload, pagination, errors, and logout. These are UI contract tests, not proof of a live deployment.

Before declaring M0 deployed, use two confirmed accounts assigned to separate families against the hosted project. Verify that account B cannot read account A's `call_details`, alerts, or parent row, and cannot update A's profile through the API. Confirm email delivery and session refresh in that environment.

## Scope and follow-up

- This is the minimum database foundation needed for the requested integration, not every future entity in `data-model.md`.
- The call detail intentionally does not display transcript or cost because C03 excludes them. Urgency labels now map to routine/urgent/lost rather than prototype-only tags.
- Call pagination is 20 rows ordered by `started_at DESC, call_id DESC`; search/filter applies to the current page. Refresh is manual; realtime subscriptions and push remain Week 2 work.
- Parent Mode/location remain a local demonstration in the same signed-in browser tab; pairing, device auth, location storage, delivery attempts and backup timers are not implemented. This slice's alerts reference a call; the future Lost Mode migration must add session-backed alerts and their ownership constraints.
- The auth screen has sign-up/sign-in/sign-out; self-service onboarding, invitations and password recovery are follow-up work.
- No hosted migration, data insertion, email delivery, or Vercel deployment is performed by committing these files.
