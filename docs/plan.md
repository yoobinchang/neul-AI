# Product plan

Status: consolidated plan, updated 2026-10-13 (PWA, two modes, Parent Mode location).

## Problem and hypothesis

Neul is intended for families who experience repeated calls from a parent and cannot always answer. The hypothesis is that a calm AI conversation plus a useful summary can help both people. Frequency of need, caller acceptance, caregiver burden reduction, and willingness to pay still require validation; this repository does not claim they are proven.

## User journey

1. The caregiver installs the Neul PWA, creates an account and enters the parent's preferred name, routine, relevant family facts, calming topics, topics to avoid, and contact information.
2. The caregiver configures conditional forwarding to an assigned family Neul number and completes a test call. The setup wizard shows carrier-specific steps and the "Add to Home Screen" step needed for push.
3. Optional: the caregiver pairs the parent's smartphone in Parent Mode with a 6-digit code and grants location permission while setting it up together with the parent.
4. A parent calls the child's existing number. The child has the first opportunity to answer.
5. If forwarding occurs, Neul resolves the family, applies the caller-identification policy, and loads permitted context.
6. The AI announces itself and explains that a summary will be shared with the family.
7. During the call, urgent/lost signals start the family alert flow immediately.
8. After the call, the system stores the transcript, generates a summary, and notifies the caregiver.
9. If the parent taps "I'm lost" in Parent Mode, the app shares their location for up to 30 minutes and dials the child. The caregiver sees a map with the location's age and accuracy.

## Intended demo scope

- Conditional forwarding on explicitly tested devices and carrier configurations.
- Per-family destination-number routing and a defined unknown-caller behavior.
- AI disclosure and conversation using caregiver-entered profile data.
- Urgent/lost detection followed by SMS and a phone-call attempt to the primary caregiver, then the backup contact after ~2 minutes without acknowledgment (simplified timer).
- Call records, summaries, live call feed, and PWA push notifications.
- Basic setup, profile/contact editing, and call/alert views.
- Lost Mode: collect volunteered landmarks by voice, notify family, offer the family's configured external location-app link.
- Parent Mode: pairing + "I'm lost" button → location shared → child dialed; Lost Mode map in Caregiver Mode.

First integration is smaller (M0): fictional call → database → app display. Notifications, alerts and Parent Mode follow as separate checkpoints. See [work plan](work-plan.md).

## Later (after the pitch)

Native app; voice-triggered background location (not possible in a PWA); joining a live call; automatically learned long-term memory; payments and payer/program integrations; app store release.

## Product boundaries

No voice cloning, medical advice, or emergency-service calls. Location is read only after an explicit "I'm lost" tap in Parent Mode, stops automatically, and is never tracked in the background. The map shows location age and accuracy and never presents a position as certain (the phone may not be where the parent is). External location apps require their own setup and permissions; a link does not guarantee location access.

## What to validate

| Question | How |
| --- | --- |
| Can the caller understand and accept the AI disclosure? Does the AI follow safety rules? | 50–100 scripted role-play test calls; nurse review of fictional transcripts |
| Are urgent/lost signals caught without excessive false alarms? How fast do alerts arrive? | Test-call results: detection rate, false alarms, alert time |
| Can a caregiver complete setup and understand summaries and alerts? | Usability tests with 5–8 caregivers using fictional data |
| How common is the problem, and what would families pay? | Caregiver survey (target 30–50 responses) and 3–5 interviews |
| What does a call cost? | Cost per call from call records |

No testing with real people with dementia. Track call latency, interruption handling, failures and cost per call throughout.
