# Data model

Status: conceptual draft; not SQL or a finalized schema. B coordinates schema changes.

The caregiver enters personal information in the app. The app sends it to the backend; the backend validates and persists it. This document describes the structure, not actual user data.

| Entity | Example fields | Origin |
| --- | --- | --- |
| Family | family_id, assigned Neul number, account status | System and onboarding |
| Caregiver / membership | user_id, family_id, role | Authentication and authorized membership setup |
| Parent profile | parent_id, family_id, name, preferred_name, routine, family_facts, calming_topics, topics_to_avoid, approved caller numbers | Caregiver input |
| Contact | contact_id, family_id, display_name, phone_number, priority | Caregiver input |
| Call | call_id, family_id, nullable parent_id, provider_call_id, start/end time, duration_seconds, transcript, urgency, summary_status, summary | Provider events and Neul processing |
| Alert | alert_id, family_id, call_id, type, reason, created_at, status | Live-call logic |
| Notification attempt | attempt_id, alert_id or call_id, channel, target reference, provider_message_id, delivery_status, attempted_at | Notification logic and provider callbacks |
| Acknowledgment | alert_id, caregiver_id, acknowledged_at | Authenticated caregiver action |
| Settings | family_id, notification preferences, quiet hours/timezone, optional external location-app link | Caregiver input |
| Device registration | user_id, device token, platform, active flag | App registration and server updates |

## Relationships

A family can have multiple authorized caregivers, profiles, contacts, and calls. Every profile and call belongs to one family. A call may have no resolved parent; in that case use no personal profile. Alerts belong to calls, and notification attempts reference their source alert or call. Server-side checks must prevent cross-family references.

The first demo may expose one parent per family even if the data model can accommodate more.

## Field conventions proposed for contracts

IDs are opaque strings. JSON uses snake_case. API timestamps are ISO 8601 UTC strings; display in local time. Durations are nonnegative integer seconds. Telephone numbers use normalized international format. Optional field omission and explicit null must be defined per operation.

Summary status is processing, completed, or failed. Summary text is null unless completed. Calls can be stored before a summary exists. Call mood is an optional tentative AI description, not a diagnosis; decide whether it is useful before adding it to the API.

## Memory distinction

Caregiver-entered profile data is the first-version source of durable personal facts. Saving a transcript/summary does not automatically make it profile memory. Passing recent summaries into the next conversation is a separate open decision, not permission to turn model guesses into permanent facts.

## Deferred and unresolved fields

Subscription plan and call allowance appear in v0.1 but payments are deferred. Do not build billing enforcement merely because the source lists these fields. Define retention/deletion, transcript storage, caller-number handling, and quiet-hour exceptions before a real-user pilot. Do not store account passwords in application profile tables; use the selected authentication system.
