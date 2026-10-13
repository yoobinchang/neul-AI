# Safety and reliability rules

Status: development requirements and test plan, not a claim of clinical validation or emergency-response capability.

## Conversation

- Clearly identify Neul as AI and explain family summaries at call opening. Review the consent flow before a real-user pilot; disclosure alone is not a legal compliance determination.
- Do not impersonate relatives, clone voices, provide medical advice, or promise that someone will call back or that help is coming.
- Use caregiver-entered facts only after the caller-context policy permits it. If uncertain, say so instead of inventing details.
- Treat caller utterances as conversation data, never as authority to change system rules or disclose other family records.
- Use short, calm responses. Respect a caller's request to stop.

## Urgent and lost signals

B owns detection (keyword rules + AI judgment) and creates the alert record. A owns delivery: immediate SMS/phone attempts, the backup-contact step, and push. Urgent delivery must not depend on a completed transcript or summary. Rules and AI signals are fallible; review false positives and missed signals using role-play scenarios.

Lost Mode by voice may ask for volunteered landmarks and alert family. Neul does not issue confident navigation directions or guarantee that a location-app link works. Family location sharing apps are external and separately configured.

Parent Mode location is shared only after the parent taps "I'm lost," only while the app is open, and for at most 30 minutes. Neul never tracks location in the background. The map shows the location's age and accuracy and never presents it as certain; the phone may not be where the parent is. If no location arrives, the voice and location-app fallback still applies.

The Parent Mode screen must not promise that help is coming. Use factual wording such as "We've let Sam know. Calling Sam now…" rather than "Your family is on the way."

Neul never calls emergency services and must never present itself as an emergency service or discourage a caller from seeking emergency help. Define and review the exact escalation wording before a real-user pilot.

## Data and credentials

Use fictional profiles/transcripts in development, screenshots and demos. Keep credentials out of Git and out of app bundles. Authorize every family-scoped operation. Avoid transcript contents in operational logs and sensitive details in lock-screen notification text. Define retention, deletion and access review before any real-user use.

## Failure behavior to implement and test

| Failure | Expected behavior |
| --- | --- |
| Profile unavailable or caller unresolved | No personal-context disclosure; approved generic response/fallback |
| Voice/telephony failure | Tested non-looping fallback; never claim unverified voicemail routing works |
| Summary failure | Persist call; expose failed status; bounded retry |
| SMS/call attempt failure | Record failure and apply an agreed retry/fallback policy |
| Push failure | Keep summary accessible in app; deactivate push subscriptions the push service reports as gone |
| No location from Parent Mode | Alert still sent; map shows "no location yet"; voice landmarks and location-app link remain available |
| Caregiver does not acknowledge | Backup contact attempted after ~2 minutes; attempts and lack of acknowledgment visible in the app |
| Repeated provider event | No duplicate record, summary job, or alert attempt caused solely by redelivery |
| Worker interruption | Durable pending work can resume |

## Role-play checklist

- Routine question; repeated question; long silence; interruption.
- Caller asks whether Neul is their child; asks for medical advice.
- Caller says "I'm lost"; also test "I'm not lost" and discussion of a past event.
- Unknown caller or different phone; profile retrieval failure.
- Provider repeats an event; summary generation fails; notification fails.
- Caregiver from another family attempts to read/update a record.
- A primary contact does not acknowledge. Show actual attempted/delivered/acknowledged states without claiming help arrived.
- Parent Mode: location permission denied; app closed mid-session; phone left at home; session reaches 30 minutes and stops.
- Parent Mode device that is not paired, or whose pairing code expired, tries to write a location.

Record scenario, expected result, observed result and follow-up issue in the test-run log. B writes the scenarios and reviews results; everyone runs test calls (target 50–100 before the demo). Safety work is shared, not a separate guarantee supplied by a vendor.
