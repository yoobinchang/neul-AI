# Work plan and initial issues

Status: proposed sequencing. Assign actual names and estimates with the team.

## Roles

| Owner | Delivers | Depends on |
| --- | --- | --- |
| A: Live Call | Tested forwarding, voice prompt, provider adapter, live urgency/Lost Mode, urgent SMS/call attempts | B context/persistence contracts |
| B: Brain & Data | Auth/authorization, schema, context lookup, call/alert storage, summary jobs, caregiver API, push sending | A events and C UI needs/device registration |
| C: Caregiver App | Setup, profile/contact editing, call feed/detail, alerts, permission/error states, push registration | B contracts and A verified forwarding steps |
| Everyone | Safety scenarios, integration checks, demo rehearsal | All workstreams |

B coordinates contracts but A/C review their interfaces. A's live-call scope is uncertain and can be heavy; reassess workload after phone/alert integration instead of assuming perfect balance.

## Milestones

| ID | Observable completion |
| --- | --- |
| M0: First connection | A fictional completed call is persisted through B's boundary and shown in C's app |
| M1: It answers | Tested no-answer forwarding reaches Neul and AI disclosure is audible |
| M2: It uses context | Correct permitted caregiver profile is used and test-call transcript is stored |
| M3: It shows | Persisted summary appears in app; selected notification path is verified |
| M4: It alerts | Role-play urgent/lost signal triggers primary SMS and call attempts before call ends; status is recorded |
| M5: Demo ready | Full flow and failure scenarios rehearsed; limitations stated; fictional-data backup video prepared |

## Initial issues to copy into GitHub

| Issue | Owner | Done when | Dependency |
| --- | --- | --- | --- |
| Confirm MVP, owners and platform | All | Open decisions have named owners and first choices recorded | None |
| Initialize selected runtimes | B + C, A reviews | Actual install/run instructions work on a teammate's machine | Stack choice |
| Agree first contracts | A/B/C | Context, completed-call and call-detail examples approved | Scope |
| Test forwarding and AI answer | A | Tested carrier/device/decline behavior and failure route documented | Provider choice |
| Add fictional family/profile and call persistence | B | A fictional call survives restart and can be retrieved | Contract/runtime |
| Build call list and detail with fictional data | C | Processing, completed, failed and empty states work | Contract/runtime |
| Connect stored call to app | B + C | M0 works; cross-family access is rejected | Persistence + UI |
| Connect actual test-call event | A + B | Provider event maps to contract; duplicate event is harmless | Provider + persistence |
| Add summary worker | B | Summary is saved; failures are visible and retryable | Stored calls |
| Add profile/contact editing | B + C | Valid changes save and appear in next permitted context lookup | Auth + profile contract |
| Add primary urgent/lost notification | A + B | Immediate attempts and statuses recorded without waiting for summary | Alert contract + provider |
| Add app notifications | B + C | Device registration and actual notification delivery verified | Platform setup |
| Rehearse safety and demo | All | Scenario outcomes documented and failures resolved or explicitly scoped out | Relevant milestones |

Do not create every subtask upfront. Split an issue if it cannot be reviewed as a focused PR. Add API operations as a feature needs them.
