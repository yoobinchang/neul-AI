# Neul

An AI phone assistant that supports families when a caregiver cannot answer.

A parent calls their child's existing number. When a tested conditional-forwarding setup routes an unanswered call to Neul, the AI identifies itself, uses caregiver-provided context, and talks with the parent. The caregiver reviews call summaries in the Neul app (an installable PWA) and receives alerts when follow-up may be needed.

**Status: caregiver UI with Supabase email/password auth, family RLS, profile editing, and database-backed calls/alerts.** Migration and fictional seed files are included; apply them to a development project using [the setup guide](docs/supabase-setup.md). Phone/voice integrations and hosted deployment are not configured by this repository.

## Product boundaries

- The child receives the original call first.
- The AI discloses that it is AI; no voice cloning or impersonation.
- Caregivers enter and edit parent information through the app.
- Neul does not provide medical advice or call emergency services. Escalation goes to the primary caregiver, then the backup contact.
- Location is shared only when the parent taps "I'm lost" in Parent Mode, for at most 30 minutes. Neul never tracks location in the background.
- Development and demo data must be fictional.

## One app, two modes

| Mode | Device | Purpose |
| --- | --- | --- |
| Caregiver Mode | Child's phone | Setup, parent profile, contacts, call feed and detail, alerts, Lost Mode map |
| Parent Mode (`/parent`, optional) | Parent's smartphone | Paired once by code, no login, PIN-locked; one "I'm lost" button that shares location and dials the child |

Neul works without Parent Mode (phone line + voice clues + the family's own location app).

## Roles and repository ownership

| Owner | Role | Folders |
| --- | --- | --- |
| A | Backend & Platform Engineer: database, auth, access rules, call handling, alert delivery, push sending, pairing, contracts | `supabase/migrations/`, `supabase/functions/` (except `brain/`), `docs/contracts.md` |
| B | AI Engineer: voice agent, AI instructions, urgency/lost detection, Lost Mode conversation, summaries, evaluation | `voice/`, `supabase/functions/brain/`, `tests/` |
| C | Frontend Engineer (Product & Design): both app modes, PWA, push registration, Lost Mode map, usability tests | `app/` |
| Everyone | Safety scenarios, test calls, survey outreach, demo rehearsal | `docs/` (shared) |

Ownership means review responsibility, not a prohibition on helping. See [contributing](docs/contributing.md).

## Stack

Twilio (phone) · Vapi or Retell (voice AI, chosen in Week 1) · AI model chosen by comparison · Supabase (database, auth, functions, live updates) · Next.js PWA on Vercel · Leaflet + OpenStreetMap · TypeScript everywhere.

## Start here

1. Read [the product plan](docs/plan.md) and [decisions](docs/decisions.md).
2. Find your weekly tasks in [the work plan](docs/work-plan.md).
3. Review [the architecture](docs/architecture.md), [data model](docs/data-model.md), and [draft contracts](docs/contracts.md).
4. Follow [the contribution workflow](docs/contributing.md) and [safety rules](docs/safety.md).
5. Use [fictional examples](docs/examples.json) to build independently.

## First integration target (M0)

Save one fictional completed call to the database and display it in C's app. A tests the phone/voice path independently, then replaces the fictional call with a real test-call event.

## Local setup

Use Node.js 22 or newer. In `app/`, run `npm ci` then `npm run dev`. Follow [Supabase setup](docs/supabase-setup.md) for migration, fictional seed, account assignment, environment variables and verification commands.

Copy `app/.env.example` to `app/.env.local` for the two public Supabase settings. Root `.env.example` documents future server integration variables. Never commit credentials or real family data.

## Document status

See [source reconciliation](docs/source-notes.md) for how the plan PDFs, the team discussion and the 2026-10-13 build plan were combined.
