# Work plan and initial issues

Status: agreed weekly plan (2026-10-13). Assign names to A/B/C; dates are tracked on the task board, not here.

## Roles

The team is split by technical layer. Alerts are split at "deciding" (AI, B) vs. "delivering" (backend, A).

| Owner | Role | Delivers | Depends on |
| --- | --- | --- | --- |
| A | Backend & Platform Engineer | Schema, auth, access rules, contracts, fictional data, Twilio ↔ voice platform connection, call storage, alert delivery (SMS/call, backup timer), push sending, pairing + location records, test dashboard, demo reset | B's alert records; C's UI needs |
| B | AI Engineer | Voice agent setup, AI instructions + safety rules, urgency/lost detection → alert records, Lost Mode conversation, summaries, test scenarios, evaluation, survey analysis | A's context and call records |
| C | Frontend Engineer (Product & Design) | Figma screens, PWA setup, Caregiver Mode screens, setup wizard, push registration, live feed, Parent Mode, Lost Mode map, survey form, usability tests | A's schema/access rules; B's summary output |
| Everyone | — | Forwarding tests on own phone, survey outreach, scripted test calls, demo rehearsal | All workstreams |

Pick roles by skill: strongest backend coder → A, most analytical → B, most design-minded → C.

## Weekly plan

### Week 1 · Foundation + "It answers"

**A**
- Create the Supabase project and share access
- Design and create all tables with fictional data (1 family, parent profile, contacts, 10 sample calls, 2 alerts)
- Write contracts C01–C08 and get B and C to agree (by day 3)
- Email login + row-level security (each family sees only its own data)
- Get a Twilio number and connect it to the voice platform
- Collect everyone's carrier forwarding test results

**B**
- Pick Vapi or Retell; set up the voice agent (voice, model, opening disclosure line)
- Compare two AI models for speed and tone, then pick one
- AI instructions with a fictional profile + first draft of the safety rules
- Summary function, built and tested on the 10 sample transcripts

**C**
- Figma screens for both modes
- Next.js PWA project on Vercel (icon, full screen, splash)
- Build every Caregiver Mode screen on fictional data
- Everyone can open the app on their phone
- Build the caregiver survey form

**Everyone:** test forwarding on your own phone (missed and declined calls) · survey outreach · deck audit

**Checkpoints:** M0 (fictional call shown in app) and M1 (a missed call is forwarded and the AI answers as Neul).

### Week 2 · "It remembers" + "It shows"

**A**
- Context lookup C01 from the Neul number + caller number
- Store completed calls C02 (transcript, length, cost)
- Trigger B's summary automatically when a call is stored
- Live updates for calls and alerts
- Push sending: store browser subscriptions, send "new summary" notifications
- Test dashboard on fictional data (detection rate, false alarms, alert time, cost per call)

**B**
- Connect AI instructions to the real profile from C01
- Urgency/lost detection: keyword list + AI flag mid-call → create alert record C06
- Lost Mode conversation (calm the parent, gather landmarks)
- Write 10 test scenarios + a results sheet (see [safety](safety.md))

**C**
- Connect screens to real data (C03–C05)
- Live call feed (no refresh)
- Push: ask permission, subscribe, show notifications
- Setup wizard: carrier forwarding steps + "Add to Home Screen" pictures

**Everyone:** survey outreach + reminder · 3–5 caregiver interviews

**Checkpoints:** M2 (AI uses the right profile; call and summary stored) and M3 (summary appears live in the app with a push notification).

### Week 3 · "It protects" + testing

**A**
- Alert delivery: on a new alert → SMS + phone call to the primary caregiver ("press 1") → backup contact after ~2 minutes
- Push for alerts
- Pairing codes (6 digits, 10-minute expiry) + location records C07 (only paired devices can write)
- Stress-test: many calls in a row, nothing lost or duplicated
- Send 10 fictional transcripts to the nurse reviewer

**B**
- Coordinate scripted test calls and review results
- Tune instructions and detection based on failures
- Survey analysis → strongest 3–4 findings

**C**
- Parent Mode: pairing screen + "I'm lost" button → location → dial the child
- Lost Mode map: pin, "updated X min ago, ±Y m", landmarks, "Call" button
- Usability tests with 5–8 caregivers; polish from feedback

**Everyone:** run scripted test calls (50–100 total) · record the location field-test video

**Checkpoint:** M4 ("I'm lost" or an urgent call → the caregiver gets an SMS, a call and a map).

### Week 4 · Demo-ready

**A**
- Demo reset script (clean fictional family in one command)
- Read-only demo account (if used)
- Database backup; check keys and usage limits
- Demo phones: forwarding on, hotspot ready
- Backup: run usability tests if C's Week 3 overruns

**B**
- Final test round; freeze the numbers
- Validation and cost-per-call figures for the pitch
- Prepared answers on AI safety, misjudgment and consent

**C**
- Screenshots and screen mirroring for the demo
- Demo script and full backup video

**Everyone:** two timed rehearsals · code freeze two days before the pitch

**Checkpoint:** M5 (full flow and failure scenarios rehearsed; limitations stated; fictional-data backup video ready).

## Milestones

| ID | Observable completion |
| --- | --- |
| M0: First connection | A fictional completed call is stored and shown in C's app; cross-family access is rejected |
| M1: It answers | Tested no-answer forwarding reaches Neul and the AI disclosure is audible |
| M2: It remembers | The correct permitted profile is used; transcript and summary are stored |
| M3: It shows | The summary appears live in the app; push notification verified on an installed PWA |
| M4: It protects | Urgent/lost signal → SMS and call attempts before the call ends, backup after ~2 min; "I'm lost" tap → location on the map |
| M5: Demo ready | Full flow and failure scenarios rehearsed; limitations stated; backup video prepared |

## Load check

| | Week 1 | Week 2 | Week 3 | Week 4 |
| --- | --- | --- | --- | --- |
| A | Heavy | Medium–heavy | Medium–heavy | Light |
| B | Medium–heavy | Medium–heavy | Medium | Medium |
| C | Medium | Medium–heavy | Heavy | Medium |

## Initial issues to copy into GitHub

| Issue | Owner | Done when | Dependency |
| --- | --- | --- | --- |
| Assign names to A/B/C and confirm open decisions | All | D04, D05, D10, D13 have owners and dates | None |
| Initialize Next.js PWA + Supabase project | A + C | Install/run instructions work on a teammate's machine | Stack (agreed) |
| Agree first contracts | A, reviewed by B/C | C01–C03 examples approved | Scope |
| Schema, auth and row-level security | A | Fictional family loads; another family's data is rejected | Contracts |
| Call list and detail on fictional data | C | Processing, completed, failed and empty states work | Contracts |
| M0: stored call shown in app | A + C | Fictional call visible in the app | Schema + UI |
| Test forwarding + AI answer | A (all test) + B | Carrier/decline/failure results documented; AI answers with disclosure | Voice platform choice |
| Summary function + trigger | B + A | Summary saved after a stored call; failures visible and retryable | Stored calls |
| Profile/contact editing | C + A | Edits save and appear in the next context lookup | Auth + C05 |
| Urgency/lost detection | B | Alert record created mid-call for scripted scenarios | C06 |
| Alert delivery + backup timer | A | SMS/call attempts recorded without waiting for the summary | Alert records |
| PWA push (summaries and alerts) | A + C | Delivery verified on installed PWA (iPhone + Android) | PWA install |
| Parent Mode pairing + "I'm lost" | C + A | Paired device shares location for ≤30 min and dials the child | C07, C08 |
| Lost Mode map | C | Map shows age, accuracy and landmarks | C07 |
| Test scenarios + dashboard | B + A | Scenario results and metrics visible | Stored calls/alerts |
| Survey form, outreach and analysis | C (form), all (outreach), B (analysis) | Responses analyzed | None |
| Usability tests | C | 5–8 sessions documented | Working app |
| Rehearse safety and demo | All | Scenario outcomes documented; failures resolved or scoped out | M4 |

Do not create every subtask upfront. Split an issue if it cannot be reviewed as a focused PR.
