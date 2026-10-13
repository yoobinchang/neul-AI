# Product plan

Status: consolidated draft for team review, 2026-10-12.

## Problem and hypothesis

Neul is intended for families who experience repeated calls from a parent and cannot always answer. The hypothesis is that a calm AI conversation plus a useful summary can help both people. Frequency of need, caller acceptance, caregiver burden reduction, and willingness to pay still require validation; this repository does not claim they are proven.

## User journey

1. The caregiver creates an account and enters the parent's preferred name, routine, relevant family facts, calming topics, topics to avoid, and contact information.
2. The caregiver configures conditional forwarding to an assigned family Neul number and completes a test call.
3. A parent calls the child's existing number. The child has the first opportunity to answer.
4. If forwarding occurs, Neul resolves the family, applies the caller-identification policy, and loads permitted context.
5. The AI announces itself and explains that a summary will be shared with the family.
6. During the call, urgent/lost signals can start the family alert flow immediately.
7. After the call, the system stores the transcript, generates a summary, and notifies the caregiver.

## Intended demo scope

- Conditional forwarding on explicitly tested devices and carrier configurations.
- Per-family destination-number routing and a defined unknown-caller behavior.
- AI disclosure and conversation using caregiver-entered profile data.
- Urgent/lost detection followed by SMS and a phone-call attempt to the primary caregiver.
- Call records, summaries, and a caregiver notification path.
- Basic setup, profile/contact editing, and call/alert views.
- Basic Lost Mode: collect volunteered landmarks, notify family, and offer a configured external location-app link when available.

First integration is smaller: fictional call -> persistence -> app display. Notifications and urgent alerts follow as separate checkpoints before the full demo.

## Later

Automated backup-contact timers; joining a live call; automatically learned long-term memory; payments and payer/program integrations. Whether the first UI is web or mobile remains open; native apps cannot simultaneously be labeled both a confirmed first-version deliverable and a deferred feature.

## Product boundaries

No voice cloning, medical advice, automatic emergency-service calls, or GPS acquisition through Neul. External location apps require their own setup and permissions; a link does not guarantee location access.

## What to validate

Can the caller understand and accept the AI disclosure? Does the summary help the caregiver decide what to do? Do alerts add value without becoming excessive? Can the caregiver complete forwarding setup? Track actual call latency, interruption handling, failures, and cost per call during fictional-data testing.
