# Source reconciliation

Prepared 2026-10-12 from the supplied Neul Technical Plan v0.1 and Team Discussion: Platform and Roles, plus the user's repo-layout discussion. This is a consolidated planning draft, not an approved v0.2 or an implemented system.

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

## Added design proposals

Opaque IDs, draft endpoint names, explicit statuses/errors, deduplication, job retry rules, membership authorization, notification-attempt records and early M0 integration are authoring additions to make collaboration concrete. They are not quotations from the PDFs and require team review.

## Excluded assumptions

No vendor/account prices, guaranteed free demo, guaranteed voice quality, guaranteed cross-platform parity, or blanket legal-compliance claims are adopted. Provider selection and a real-user pilot require their own current checks.

## Original references

- neul-technical-plan-v0.1.pdf: product, principles, components, data categories, demo scope, milestones and open questions.
- neul-team-discussion-platform-and-roles(3).pdf: app-first proposal, revised live-call ownership, folder/contract coordination.

The PDFs are not duplicated into the repository. Keep this document updated when the team approves changes so competing drafts do not become competing instructions.
