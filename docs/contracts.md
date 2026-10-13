# Interface contracts

**Status: draft examples for review, not implemented endpoints.** B maintains this document; A and C review the parts they consume. Start with C01-C03. Keep other operations in the backlog until needed.

## Common conventions

- JSON fields use snake_case; internal variable names can differ.
- IDs are opaque strings. Examples are fictional, not real provider identifiers.
- Timestamps use ISO 8601 UTC strings; durations use integer seconds.
- Caregiver HTTP operations require a valid bearer token and server-side family membership checks. Internal operations require trusted service authentication or an equivalent in-process boundary; caregiver tokens do not grant internal write access.
- Every listed field is required unless explicitly optional. Null is a value, not an omitted field.
- Common HTTP errors: 400 invalid input; 401 missing/invalid authentication; 403 wrong role for an operation; 404 resource absent or inaccessible in the caller's family; 409 duplicate key with conflicting content; 500 unexpected internal failure; 503 temporary dependency failure.
- Error envelope: `{"error":{"code":"CALL_NOT_FOUND","message":"Call not found."}}`. Consumers branch on code, not message text.

Internal names below are logical operations. If HTTP is chosen, implement an authenticated internal route; do not expose them as public client operations.

## C01: Resolve call context (A -> B)

Input:

```json
{
  "provider_call_id": "provider_demo_001",
  "neul_number": "+12025550100",
  "caller_number": "+12025550101"
}
```

Numbers are normalized strings; caller_number may be null. Family resolution uses trusted destination/routing information. Verify source-provider events before accepting them.

Resolved example:

```json
{
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
    "phone_number": "+12025550102"
  }
}
```

context_status is resolved or unknown_caller. The caller-policy decision must define when resolved is permitted; a matching number is not strong identity proof. For unknown_caller, return parent=null; expose primary_contact only internally for the permitted alert path. Unknown destination returns FAMILY_NOT_FOUND and no family context. Missing primary contact is null and must not silently count as a valid escalation setup. Recent summaries are excluded until D10 is decided.

## C02: Store completed call (A -> B)

Input:

```json
{
  "event_id": "event_demo_001",
  "provider_call_id": "provider_demo_001",
  "family_id": "family_demo_001",
  "parent_id": "parent_demo_001",
  "started_at": "2026-10-12T04:00:00Z",
  "ended_at": "2026-10-12T04:02:00Z",
  "duration_seconds": 120,
  "transcript": "Parent: When will Sam visit?\nNeul: I do not have a confirmed visit time. I can let Sam know you asked.",
  "urgency": "routine"
}
```

parent_id may be null for an unresolved caller. Both timestamps are required, ended_at must not precede started_at, and duration_seconds is a nonnegative integer reported by the provider adapter; small timing discrepancies may exist. transcript is a nonempty string for this first contract. Missing-transcript/provider-failure events need a separate agreed ingestion path and must not produce invented summaries. urgency is routine, urgent, or lost.

B verifies family/parent relationships against trusted routing. A service caller cannot attach arbitrary profiles to a family. Successful storage durably registers summary work.

Response:

```json
{
  "call_id": "call_demo_001",
  "summary_status": "processing",
  "duplicate": false
}
```

If transported over HTTP, use 201 for a new record and 200 for an identical replay. An exact replay of event_id returns the existing call and current summary_status with duplicate=true; it does not create another job. Reusing event_id with different content returns 409 EVENT_CONFLICT. Deduplicate a completed call by provider namespace plus provider_call_id as well. A provider adapter supplies/normalizes event IDs; not every provider has identical event semantics.

## C03: Get call detail (C -> B)

`GET /api/calls/{call_id}` with `Authorization: Bearer <token>`.

Success: 200.

```json
{
  "call_id": "call_demo_001",
  "parent_id": "parent_demo_001",
  "started_at": "2026-10-12T04:00:00Z",
  "duration_seconds": 120,
  "urgency": "routine",
  "summary_status": "completed",
  "summary": "Asked when Sam would visit. No confirmed time was provided."
}
```

This endpoint initially serves ended calls. parent_id may be null. summary_status is processing, completed, or failed. summary is a nonempty string only when completed; otherwise null. The UI displays a distinct processing/failed state. Transcript is not included in this first response. Cross-family or nonexistent IDs return 404 CALL_NOT_FOUND.

## C04: List calls (C -> B)

`GET /api/calls?limit=20&cursor=<opaque_cursor>`.

limit is optional, default 20, integer range 1-100. cursor is optional on the first request. Return 200 with `{"items": [], "next_cursor": null}` when there are no calls. Each item has the C03 fields. Sort newest first by started_at, with call_id as a deterministic tie-breaker. next_cursor is string or null. Restrict results to the authorized active family; decide multi-family selection before extending the demo.

## C05: Update parent profile (C -> B)

`PATCH /api/parents/{parent_id}`. Bearer token and authorized caregiver edit role required.

Example body:

```json
{
  "preferred_name": "Alex",
  "routine": "Enjoys gardening in the morning.",
  "family_facts": ["Sam is the primary caregiver."],
  "calming_topics": ["Gardening"],
  "topics_to_avoid": []
}
```

At least one field is required; omitted fields remain unchanged. Null is rejected. preferred_name is a nonempty string; routine may be an empty string to clear it. Arrays contain strings and [] clears a list. Reject unknown fields. Provisional limits: preferred_name 100 characters, routine 2000, arrays at most 20 items and 300 characters per item. IDs/family ownership are not editable here.

Return 200 with parent_id and all five editable fields. Validate server-side. Initial profile creation belongs to onboarding and needs a separate contract; this PATCH does not create accounts/profiles.

## C06: Record an alert (A -> B)

Logical operation record_alert takes event_id, call_id, type (urgent or lost), reason (string), and created_at (UTC). Return alert_id and duplicate flag. Apply identical-replay/conflicting-replay rules from C02. This operation records intent; it does not mean a message was delivered.

A live call must already have a call_id. Before urgent-alert implementation, add an idempotent start_call operation returning that ID and extend C02 to finalize the existing call instead of creating another one. Do not link alerts to an unrelated or not-yet-existent completed-call record.

A separately records each SMS/call attempt with attempt_id, alert_id, contact_id, channel, attempted_at, and status. Proposed statuses: queued, sent, delivered, failed. Define provider-specific mappings before implementation. Acknowledgment is a separate authenticated caregiver action, not a delivery status.

## Next contracts to agree when needed

Call start/finalization; onboarding/profile creation; contacts and settings edits; device registration/removal; alert list/detail and acknowledgment; notification retry and backup timing. Endpoint names for these are intentionally not invented here.

## Change process

Update this document and examples in the same PR. Producer and consumer review changes before merge. Field removal/renaming, type changes, and new required fields are breaking changes; coordinate the update or provide a compatible transition. Do not silently change a contract while a teammate builds against it.
