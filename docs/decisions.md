# Decision register

Status: updated 2026-10-13 to match the team's build plan (PWA, one app with two modes, A/B/C roles by technical layer). Rows marked **Agreed** reflect that plan; add reviewer names when the team signs off. Rows marked **Open** still need a choice.

| ID | Topic | Decision | Status | Owner / next action |
| --- | --- | --- | --- | --- |
| D01 | Repository layout | `app/` (C), `voice/` (B), `supabase/migrations/` (A), `supabase/functions/` (A; `brain/` subfolder is B's), `tests/` (B), `docs/` (shared; A maintains contracts) | Agreed | All: rename freely in one PR if the stack setup needs it |
| D02 | Roles | A = Backend & Platform Engineer; B = AI Engineer; C = Frontend Engineer (Product & Design). See [work plan](work-plan.md) | Agreed | All: assign names (strongest backend coder → A, most analytical → B, most design-minded → C) |
| D03 | UI platform | **PWA** built with Next.js, hosted on Vercel. Installs to the home screen, opens full screen, supports web push. Native app is deferred until after the pitch | Agreed | C: verify install + push on one iPhone and one Android phone in Week 2 |
| D04 | Voice infrastructure | All-in-one voice platform: Vapi or Retell | Open (choose Week 1) | B: compare both on real test calls (latency, interruptions); A connects the Twilio number |
| D05 | Model | Compare two models on the same scenarios, pick by naturalness, speed and cost | Open (choose Week 1) | B |
| D06 | Backend/data | Supabase: database, authentication, server functions, live updates | Agreed | A: create project, schema and access rules in Week 1 |
| D07 | Client data access | The app reads and writes the database directly through Supabase with row-level security (each family sees only its own data) and live updates. No separate custom caregiver API | Agreed | A: write access rules; C: use them. Revisit only if a rule cannot be expressed in row-level security |
| D08 | Internal hand-off | A stores the completed call; a database trigger/webhook starts B's summary function. Retries must not create duplicate summaries or notifications | Agreed | A + B: implement trigger and idempotency in Week 2 |
| D09 | Urgency | Keyword rules as a safety net + AI judgment. B decides (creates the alert record); A delivers | Agreed | B: specify phrases and scenarios; neither is a guarantee |
| D10 | Memory | Caregiver-authored profile; no automatic long-term learning | Agreed | Open sub-question: include the last 3 call summaries in call context? B proposes, team decides before C01 is finalized |
| D11 | Escalation | Text + call the primary caregiver ("press 1"), then the backup contact after ~2 minutes without acknowledgment (simplified demo timer) | Agreed | A: implement delivery and timer in Week 3; B: alert wording |
| D12 | Forwarding/fallback | Verify actual carrier behavior early. Everyone tests their own phone; A collects results | Agreed | A: document no-answer, decline, busy, offline, voicemail and loop results in Week 1 |
| D13 | Caller identity | Family routing plus explicit unknown-caller policy | Open | A + B: define what context may be disclosed |
| D14 | Notification policy | Routine summaries → push. Urgent/lost → SMS + phone call (A) and push | Agreed | Open sub-question: quiet hours and frequency limits |
| D15 | Real-user readiness | Fictional data only; data/consent/retention review before any pilot | Agreed | All: assign reviewer and scope before a pilot |
| D16 | App structure | **One app, two modes.** Caregiver Mode (child: setup, profile, call feed, alerts, map). Parent Mode at `/parent` (optional; paired by code, no login, PIN-locked, one "I'm lost" button) | Agreed | C builds both modes; A provides pairing + device records |
| D17 | Location | Read **only when the parent taps "I'm lost"** in Parent Mode while the app is open. Updates for up to 30 minutes, then stop. Shows age and accuracy. No background tracking. Fallback: voice clues + link to the family's own location app. Replaces the earlier "no GPS through our system" principle with "location only in Lost Mode, never tracking" | Agreed | C: button + map; A: location records and access rules |
| D18 | Voice-triggered location | Not possible in a PWA (web apps cannot read location in the background). Deferred to the native app | Agreed (deferred) | Revisit after the pitch |
| D19 | Evaluation | Scripted test calls (50–100), caregiver usability tests (5–8), nurse review of fictional transcripts, caregiver survey | Agreed | B coordinates and analyzes; everyone runs test calls and survey outreach |

## Selected stack

| Part | Choice |
| --- | --- |
| Phone line | Twilio |
| Voice AI | Vapi or Retell (D04) |
| AI model | To be chosen by comparison (D05) |
| Database, auth, server functions, live updates | Supabase |
| App | Next.js PWA on Vercel |
| Map | Leaflet + OpenStreetMap |
| Language | TypeScript everywhere |

Record actual telephony, AI, hosting and account costs; do not assume the demo is free.

## Notes carried over from the source review

- Managed voice infrastructure reduces integration effort; it does not prove conversation quality or reliability.
- Web push on iPhone requires the PWA to be installed to the home screen (iOS 16.4+) and permission to be granted. The setup wizard must show the "Add to Home Screen" step.
- Browser location works only while the page is open and in front; it stops when the screen locks or the user switches apps. Pre-grant permission before demos.
- Do not copy blanket legal claims about health data from an early technical draft. Review applicability and vendor terms for the actual deployment before using real data.

Verification references: [WebKit web push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [MDN Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API), [Supabase row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security). Recheck at implementation time.

## Recording approval

For each decision, add: status, date, reviewers, chosen option, reason, and any follow-up issue. A later draft is not an approval until the team signs off.
