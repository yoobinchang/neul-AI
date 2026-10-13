# Decision register

Status: proposals awaiting explicit team approval. A later draft is not an approval.

| ID | Topic | Current proposal | Owner / next action |
| --- | --- | --- | --- |
| D01 | Initial layout | voice / brain / app / docs, as requested in discussion with the user | All: keep initial scaffold simple |
| D02 | Roles | A owns live-call logic and urgent SMS/calls; B owns data, summaries and push; C owns app | All: confirm names and workload |
| D03 | UI platform | Later team document proposes React Native + Expo; v0.1 proposes web-first | C + team: choose after setup and notification trial |
| D04 | Voice infrastructure | All-in-one voice service; compare candidates | A: measure real call latency and interruptions |
| D05 | Model | Compare two compatible models on the same scenarios | A: evaluate behavior, accuracy, latency, cost |
| D06 | Backend/data | Managed database/authentication; deployment still undecided | B: select stack and runtime |
| D07 | Client data access | This scaffold proposes authenticated caregiver API | B + C: confirm API vs managed direct DB access |
| D08 | Internal hand-off | Named B-owned operations; reliable job dispatch after completed calls | A + B: choose transport and retry mechanism |
| D09 | Urgency | Rules plus model signals | A + team: specify thresholds and scenarios; neither is a guarantee |
| D10 | Memory | Caregiver-authored profile; no automatic long-term learning | All: separately decide recent-summary context |
| D11 | Escalation | Primary caregiver SMS/call in demo; automated backup timers later | A: define acknowledgment and no-response behavior |
| D12 | Forwarding/fallback | Verify actual carrier behavior early | A: test no-answer, decline, busy, offline, voicemail and loop risks |
| D13 | Caller identity | Family routing plus explicit unknown-caller policy | A + B: define what context may be disclosed |
| D14 | Notification policy | Distinguish routine summaries from urgent alerts | All: decide quiet hours, frequency and fallback |
| D15 | Real-user readiness | Fictional data now; data/consent/retention review before pilot | All: assign reviewer and review scope |

## Technology candidates, not selections

The source drafts mention Twilio, Vapi/Retell, Claude/GPT, Supabase, Next.js/Vercel, and React Native/Expo. No dependency, paid account, or deployment is required by this scaffold. Evaluate compatibility before committing to a combination.

## Corrections to assumptions in the source drafts

- Managed voice infrastructure reduces integration effort; it does not prove conversation quality or reliability.
- Web access on a phone can support the caregiver workflow. Native appearance alone is not a platform requirement.
- Do not assume Expo Go supports the complete remote-push demo. Check development-build and device/account requirements before scheduling the demo.
- Web push on iPhone has installation/permission prerequisites; calling it inherently unreliable is too broad.
- Code sharing across web/mobile is possible but does not guarantee identical UI, notification, or platform behavior.
- Do not assume demo infrastructure is free; record actual telephony, AI, hosting, and developer-account costs.
- Do not copy blanket legal claims about health data from an early technical draft. Review applicability and vendor terms for the actual deployment before using real data.

Verification references for platform setup: [Expo development builds](https://docs.expo.dev/develop/development-builds/faq/), [Expo iOS setup](https://docs.expo.dev/get-started/set-up-your-environment/), [WebKit web push](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/). Recheck at implementation time.

## Recording approval

For each approved decision, add: status, date, reviewers, chosen option, reason, and any follow-up issue. Until then, keep the proposal label.
