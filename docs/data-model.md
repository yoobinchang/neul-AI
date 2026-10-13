# Data model

Status: conceptual draft; not SQL or a finalized schema. A owns the schema and coordinates changes.

The caregiver enters personal information in the app. Row-level security controls who can read and write each row. This document describes structure, not actual user data.

| Entity | Example fields | Origin |
| --- | --- | --- |
| Family | family_id, assigned Neul number, account status | System and onboarding |
| Caregiver / membership | user_id, family_id, role (primary, backup) | Supabase Auth and membership setup |
| Parent profile | parent_id, family_id, name, preferred_name, routine, family_facts, calming_topics, topics_to_avoid, approved caller numbers | Caregiver input |
| Contact | contact_id, family_id, display_name, phone_number, priority | Caregiver input |
| Call | call_id, family_id, nullable parent_id, provider_call_id, status (in_progress, ended), start/end time, duration_seconds, transcript, urgency, summary_status, summary, topic, mood, cost_cents | Call handler (A) and summary function (B) |
| Alert | alert_id, family_id, call_id (nullable for Parent Mode alerts), session_id (nullable), type, reason, landmarks, created_at | Detection (B) or Parent Mode "I'm lost" |
| Delivery attempt | attempt_id, alert_id or call_id, contact_id, channel (sms, call, push), provider_message_id, status, attempted_at | Alert delivery (A) and provider callbacks |
| Acknowledgment | alert_id, caregiver_id, acknowledged_at | Caregiver action |
| Settings | family_id, quiet hours/timezone, location app (Find My, Google Maps, Life360, none), location-app link | Caregiver input |
| Paired device | device_id, family_id, parent_id, paired_at, last_seen, active flag | Parent Mode pairing |
| Pairing code | code, family_id, expires_at, used_at | Caregiver request |
| Lost session | session_id, device_id, family_id, started_at, ends_at (≤30 min), ended_at | Parent Mode "I'm lost" |
| Location point | session_id, device_id, latitude, longitude, accuracy_m, recorded_at | Parent Mode during a lost session |
| Push subscription | subscription_id, user_id, endpoint, keys, created_at, active flag | Caregiver Mode PWA |
| Test run | run_id, scenario, expected, observed, passed, alert_seconds, tester, notes | Scripted test calls (B) |

## Relationships

A family can have multiple caregivers, profiles, contacts, calls and paired devices. Every profile, call and device belongs to one family. A call may have no resolved parent; in that case use no personal profile. Alerts belong to a call or a lost session. Delivery attempts reference their source alert or call. Location points belong to one lost session. Access rules must prevent cross-family references.

The first demo exposes one parent per family even though the model can hold more.

## Field conventions

IDs are opaque strings. JSON and columns use snake_case. Timestamps are ISO 8601 UTC; display in local time. Durations are nonnegative integer seconds. Telephone numbers use normalized international format.

Summary status is processing, completed, or failed. Summary text, topic and mood are null unless completed. Mood is a tentative AI description, not a diagnosis.

## Location rules

Location points are written only during an active lost session (≤30 minutes) from a paired device. No location is stored outside a session. Define a retention period for location points before any real-user pilot; for the demo, the reset script deletes them.

## Memory distinction

Caregiver-entered profile data is the first-version source of durable personal facts. Saving a transcript/summary does not make it profile memory. Passing recent summaries into the next conversation is a separate open decision (D10).

## Deferred and unresolved fields

Subscription plan and call allowance are deferred with payments. Define retention/deletion, transcript storage, caller-number handling and quiet-hour exceptions before a real-user pilot. Do not store passwords in application tables; use Supabase Auth.
