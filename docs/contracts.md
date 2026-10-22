# Interface contracts

**Status: agreed interface contracts; implementation is incremental.** A maintains this document; B and C review changes to the parts they produce or consume. The caregiver integration implements C03 reads, paginated C04 reads (manual refresh), C05 edits and C06 acknowledgment persistence. See [setup and implementation scope](supabase-setup.md).

## Common conventions

- JSON fields and database columns use snake_case; internal variable names can differ.
- IDs are opaque strings. Examples are fictional, not real provider identifiers.
- Timestamps use ISO 8601 UTC strings; durations use integer seconds.
- Caregiver reads/writes go directly to Supabase tables/views under row-level security (D07). Server functions (call handling, summaries, delivery) use service credentials that never reach the app.
- Every listed field is required unless explicitly optional. Null is a value, not an omitted field.
- Server-function HTTP errors: 400 invalid input; 401 missing/invalid authentication; 403 wrong role; 404 resource absent or inaccessible; 409 duplicate key with conflicting content; 500 unexpected failure; 503 temporary dependency failure.
- Error envelope: `{"error":{"code":"CALL_NOT_FOUND","message":"Call not found."}}`. Consumers branch on code, not message text.

## Overview

| ID | Contract | Producer → consumer |
| --- | --- | --- |
| C01 | Call context | A (lookup) → B (instructions) |
| C02 | Completed call | A (stores) → B (summary trigger) |
| C03 | Call detail | Database → C |
| C04 | Call list + live updates | Database → C |
| C05 | Parent profile edit | C → database |
| C06 | Alert record + delivery attempts | B (creates) → A (delivers) → C (displays) |
| C07 | Lost Mode location | C (Parent Mode) → database → C (map) |
| C08 | Pairing and push subscription | C ↔ A |

## C01: Call context (A → B)

When a forwarded call starts, A's call handler resolves the family and passes context to B's instruction builder.

Lookup input:

```json
{
  "provider_call_id": "provider_demo_001",
  "neul_number": "+12025550100",
  "caller_number": "+12025550101"
}
```

Numbers are normalized strings; caller_number may be null. Family resolution uses trusted destination/routing information.

Context passed to B:

```json
{
  "call_id": "call_demo_001",
  "family_id": "family_demo_001",
  "context_status": "resolved",
  "parent": {
    "parent_id": "parent_demo_001",
    "preferred_name": "Alex",
    "routine": "Enjoys gardening in the morning.",
    "family_facts": ["Sam is the primary caregiver."],
    "calming_topics": ["Gardening"],
    "topics_to_avoid": []
  },
  "primary_contact": {
    "contact_id": "contact_demo_001",
    "display_name": "Sam",
    "phone_number": "+12025550102"
  }
}
```

context_status is resolved or unknown_caller. For unknown_caller, parent is null and B uses generic instructions; primary_contact is used only for the alert path. Unknown destination returns FAMILY_NOT_FOUND and no family context. Missing primary contact is null and must not silently count as a valid escalation setup. A creates the call row at call start (status in_progress) so alerts can reference call_id. Whether recent summaries are included is open (D10).

## C02: Completed call (A → B)

A finalizes the call row when the provider reports the call ended:

```json
{
  "event_id": "event_demo_001",
  "call_id": "call_demo_001",
  "provider_call_id": "provider_demo_001",
  "family_id": "family_demo_001",
  "parent_id": "parent_demo_001",
  "started_at": "2026-10-12T04:00:00Z",
  "ended_at": "2026-10-12T04:02:00Z",
  "duration_seconds": 120,
  "transcript": "Parent: When will Sam visit?\nNeul: I do not have a confirmed visit time. I can let Sam know you asked.",
  "urgency": "routine",
  "cost_cents": 14
}
```

parent_id may be null. ended_at must not precede started_at. transcript is nonempty; missing-transcript/provider-failure events need a separate path and must not produce invented summaries. urgency is routine, urgent, or lost. cost_cents is the provider-reported phone + AI cost, or null if unavailable.

Finalizing sets summary_status to processing and fires the trigger that calls B's summary function. B writes back:

```json
{
  "call_id": "call_demo_001",
  "summary_status": "completed",
  "summary": "Asked when Sam would visit. No confirmed time was provided.",
  "topic": "Visit timing",
  "mood": "calm"
}
```

On failure, summary_status is failed and summary is null; retries are bounded. An exact replay of event_id changes nothing; reusing event_id with different content is rejected (EVENT_CONFLICT). mood is a tentative description, not a diagnosis.

## C03: Call detail (database → C)

The view also exposes `family_id` as an additive filter column for multi-family workspaces; the selected C03 fields below are unchanged.

C reads one row from the `call_details` view (row-level security restricts it to the caregiver's family):

```json
{
  "call_id": "call_demo_001",
  "parent_id": "parent_demo_001",
  "started_at": "2026-10-12T04:00:00Z",
  "duration_seconds": 120,
  "urgency": "routine",
  "summary_status": "completed",
  "summary": "Asked when Sam would visit. No confirmed time was provided.",
  "topic": "Visit timing",
  "mood": "calm"
}
```

summary_status is processing, completed, or failed; summary, topic and mood are null unless completed. The transcript is not included. A row from another family is simply not returned; the app shows "Call not found."

## C04: Call list and live updates (database → C)

C queries `call_details` ordered by started_at descending (call_id as tie-breaker), 20 rows per page, and subscribes to live inserts/updates for its family's calls and alerts. Empty list is valid. The app shows distinct processing, completed, failed and empty states.

## C05: Parent profile edit (C → database)

C updates the `parents` row directly. Editable fields:

```json
{
  "preferred_name": "Alex",
  "routine": "Enjoys gardening in the morning.",
  "family_facts": ["Sam is the primary caregiver."],
  "calming_topics": ["Gardening"],
  "topics_to_avoid": [],
  "phone_number": "+12025550101"
}
```

Row-level security allows edits only by caregivers of that family. Database constraints enforce: preferred_name nonempty, max 100 characters; routine max 2000; arrays max 20 items, 300 characters each; phone_number must be null or valid E.164 format. IDs and family ownership are not editable. Changes apply to the next C01 lookup. Initial profile creation is part of onboarding and needs its own contract.

## C06: Alert record and delivery attempts (B → A → C)

B's detection creates an alert record mid-call:

```json
{
  "event_id": "alert_event_demo_001",
  "call_id": "call_demo_001",
  "type": "lost",
  "reason": "Caller said she does not know where she is.",
  "landmarks": ["gas station", "red awning"],
  "created_at": "2026-10-12T04:01:10Z"
}
```

type is urgent or lost. landmarks is an array (may be empty) of volunteered clues. Identical replay of event_id creates nothing new. Recording an alert means intent, not delivery.

A's delivery code reacts to each new alert and records every attempt:

```json
{
  "attempt_id": "attempt_demo_001",
  "alert_id": "alert_demo_001",
  "contact_id": "contact_demo_001",
  "channel": "sms",
  "attempted_at": "2026-10-12T04:01:12Z",
  "status": "sent"
}
```

channel is sms, call, or push. status is queued, sent, delivered, or failed. Acknowledgment (caregiver pressed 1 or tapped "I've got it") is stored separately with caregiver_id and acknowledged_at. If no acknowledgment arrives within ~2 minutes, A attempts the next contact by priority. C displays the alert, attempts and acknowledgment without claiming help arrived.

## C07: Lost Mode location (Parent Mode → database → C)

When the parent taps "I'm lost," Parent Mode starts a session and writes location points while the app is open, for at most 30 minutes:

```json
{
  "session_id": "lost_session_demo_001",
  "device_id": "device_demo_001",
  "latitude": 40.9126,
  "longitude": -73.1234,
  "accuracy_m": 20,
  "recorded_at": "2026-10-12T05:00:00Z"
}
```

Only a paired device can write, only for its own family, and only while its session is active. Session start also creates a `lost` alert (C06) so delivery runs. Caregiver Mode reads the latest point per session and shows "updated X min ago, ±accuracy_m m". Coordinates above are fictional.

## C08: Pairing and push subscription (C ↔ A)

Pairing: a caregiver requests a 6-digit code (expires after 10 minutes, single use). Parent Mode submits the code and receives a device record:

```json
{
  "device_id": "device_demo_001",
  "family_id": "family_demo_001",
  "parent_id": "parent_demo_001",
  "paired_at": "2026-10-12T03:00:00Z"
}
```

Push: Caregiver Mode stores the browser's push subscription (endpoint and keys) against the signed-in caregiver. A's push sender removes subscriptions the push service reports as gone. Lock-screen text never includes transcript content.

## Change process

Update this document and `examples.json` in the same PR. Producer and consumer review changes before merge. Field removal/renaming, type changes and new required fields are breaking changes; coordinate them. Do not silently change a contract while a teammate builds against it.
