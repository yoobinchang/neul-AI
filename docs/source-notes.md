# Source reconciliation

Prepared 2026-10-12 from the supplied Neul Technical Plan v0.1 and Team Discussion: Platform and Roles, plus the user's repo-layout discussion. Updated 2026-10-13 with the team's build plan (Build & Pitch Plan, One App Two Modes, Roles and Weekly Plan). This is a consolidated plan, not an implemented system.

| Topic | v0.1 | Later discussion | Treatment here |
| --- | --- | --- | --- |
| UI | Web-first proposed; native later | App-first with React Native/Expo proposed | Keep decision open, record later proposal |
| Urgency/escalation owner | B | Moved to A | Use later A/B/C split as proposed working model |
| Folders | voice, brain, app, docs | voice, functions, database, app, docs/contracts | Use user's requested simple four-folder layout; put A backend logic in voice and B schema/logic in brain |
| Hand-off | Brain/provider/app interfaces | Database-centered hand-off | Propose named B-owned operations and caregiver API; transport and trigger mechanism still open |
| Memory | Profile-only decision but recent calls in call-flow example | Profile and recent calls | No automatic learned facts; recent-summary context is a separate decision |
| Lost Mode | Urgent/lost detection and family contact in demo | A owns Lost Mode | Preserve basic Lost Mode; backup timers/live joining remain later |
| Ownership rule | Teammate PR review | Only owner edits each folder | Recommend owner review while allowing coordinated contributions |
| Reliability | Voicemail fallback example | Limited detail | Require tested non-looping fallback; do not promise it exists |

## 2026-10-13 build plan changes

| Topic | Earlier drafts | 2026-10-13 plan | Treatment here |
| --- | --- | --- | --- |
| UI | Web-first (v0.1) vs. React Native/Expo (discussion) | PWA (Next.js on Vercel); native app after the pitch | D03 agreed |
| App structure | Caregiver app only | One app, two modes: Caregiver Mode + optional Parent Mode | D16 agreed |
| Location | No GPS through Neul; family's own location app only | Location only after an "I'm lost" tap in Parent Mode, ≤30 min, no tracking; voice-triggered location deferred to native | D17, D18; safety and contracts C07 updated |
| Roles | A Live Call / B Brain & Data / C Caregiver App | A Backend & Platform / B AI Engineer / C Frontend; alerts split into detection (B) and delivery (A) | D02; all ownership references updated |
| Database owner | B | A | data-model, contracts, contributing updated |
| Client data access | Caregiver API proposed in this scaffold | Direct Supabase access with row-level security + live updates | D07; contracts C03–C05 rewritten |
| Folders | voice / brain / app / docs | app / voice / supabase (migrations, functions) / tests / docs | D01; `brain/` placeholder replaced |
| Escalation | Backup timers later | Simplified ~2 minute backup step in the demo | D11 |
| Validation | Not planned in detail | Scripted test calls, usability tests, nurse review, caregiver survey | D19; plan and work plan updated |

## Added design proposals

Opaque IDs, draft endpoint names, explicit statuses/errors, deduplication, job retry rules, membership authorization, notification-attempt records and early M0 integration are authoring additions to make collaboration concrete. They are not quotations from the PDFs and require team review.

## Excluded assumptions

No vendor/account prices, guaranteed free demo, guaranteed voice quality, guaranteed cross-platform parity, or blanket legal-compliance claims are adopted. Provider selection and a real-user pilot require their own current checks.

## Original references

- neul-technical-plan-v0.1.pdf: product, principles, components, data categories, demo scope, milestones and open questions.
- neul-team-discussion-platform-and-roles(3).pdf: app-first proposal, revised live-call ownership, folder/contract coordination.
- neul-build-and-pitch-plan.pdf: Technical Build Plan v0.2 (PWA) and presentation preparation plan.
- neul-app-modes-and-location.pdf: one app with two modes and location permission (written for a native app; the PWA version is reflected in D17/D18).
- neul-roles-and-weekly-plan.md: final A/B/C roles by technical layer and the Week 1–4 plan.

The PDFs are not duplicated into the repository. Keep this document updated when the team approves changes so competing drafts do not become competing instructions.
