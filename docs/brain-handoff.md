# Brain function: hand-off to Backend (A)

**Status:** B's side is built and tested locally (9 unit tests, alert eval 7/7, summary eval 9/10 on Sonnet). It hasn't been deployed yet, because it needs the hosted Supabase project. This note lists what the backend needs to connect.

For the pitch we run **one demo family, Alex (parent) and Sam (caregiver)**; there's no self-service onboarding. The code still looks everything up by family.

## How a call flows

```
Alex calls Sam → Sam doesn't pick up → carrier forwards → Neul number (Twilio → Retell)
  1. Retell → POST /brain/retell/inbound        (B)  family lookup by Neul number, call row created,
                                                     Alex's profile → agent variables
  2. Mid-call, agent → POST /brain/retell/alert  (B)  alert row (C06) + call urgency
        └─ new alert row → A's delivery (SMS/call Sam, then backup)
  3. Call ends, Retell → A's webhook (A)              finalize row: status ended, ended_at,
                                                     duration_seconds, transcript, cost_cents
        └─ A → POST /brain/summarize {call_id}   (B)  summary, topic, mood written to the row
```

## Endpoints (`supabase/functions/brain/`)

| Route | Caller | Auth | Body → response |
|---|---|---|---|
| `POST /brain/retell/inbound` | Retell inbound webhook (set on the phone number) | `X-Retell-Signature` | Retell `call_inbound` event → `{call_inbound: {dynamic_variables, metadata}}` |
| `POST /brain/retell/alert` | The agent's `alert_caregiver` tool | `X-Retell-Signature` | `{call, args: {type, reason, landmarks}}` → `{result, ok}` (read by the agent's model) |
| `POST /brain/summarize` | A, once a call is finalized | `X-Brain-Secret` header | `{call_id}` (or a database-webhook `{record: {call_id}}`) → `{call_id, summary_status, written}` or `{call_id, skipped}` |

Errors follow the envelope in contracts.md. The two Retell routes never stall a live call. If something breaks, inbound rejects the call (Neul never talks with a caller it can't confirm as the parent), and alert tells the agent the alert failed so it falls back to suggesting 911 for serious signs.

## Deploy (once the hosted project exists)

```
supabase secrets set RETELL_API_KEY=... ANTHROPIC_API_KEY=... BRAIN_SECRET=<random string>
supabase functions deploy brain --no-verify-jwt     # Retell can't send a Supabase token
supabase functions deploy call-events --no-verify-jwt
```
**Team test phones (optional):** while building, every teammate's phone can count as Alex:
```
supabase secrets set DEMO_PARENT_NUMBERS=+1XXXXXXXXXX,+1XXXXXXXXXX,+1XXXXXXXXXX
supabase secrets unset DEMO_PARENT_NUMBERS     # back to the saved parent number only
```
Numbers are E.164, comma-separated; malformed entries are ignored. A secret change takes effect without redeploying. Never set it for real families: everyone on the list hears Alex's profile.

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically. `RETELL_API_KEY` must be the Retell key with the **webhook badge**, because only that key verifies signatures.

Then B runs (this updates the live agent in place, with no duplicates):
```
cd voice
NEUL_BRAIN_URL=https://<project>.supabase.co/functions/v1/brain \
RETELL_LLM_ID=llm_508848302fd4217498958bb5f8c8 RETELL_AGENT_ID=agent_256167d9e8674f7b708a2a9970 \
RETELL_PHONE_NUMBER=+1... npm run update:retell
```
It sets all three Retell URLs: the number's inbound webhook (`brain/retell/inbound`), the `alert_caregiver` tool (`brain/retell/alert`) and the agent's `call_ended` webhook (`call-events`). It then publishes the agent and pins the number to that published version, so editing the agent in the dashboard doesn't change live calls until you re-run it. `RETELL_API_KEY` can also live in the repo-root `.env`.

## What A needs to do

1. **Seed the demo family as Alex & Sam.** The current `supabase/seed.sql` has "Mom" (Grace Kim) with Alex as the caregiver. The pitch uses **Alex = parent, Sam = primary caregiver** (plus a backup contact). Give Alex a detailed profile: routine, family facts, calming topics, topics to avoid.
2. **Set `families.neul_number`** to the demo number in E.164 (e.g. `+12025550100`). Inbound finds the family by the number that was called.
3. **Add a parent phone number** (proposed migration):
   ```sql
   alter table public.parents add column phone_number text
     check (phone_number is null or phone_number ~ '^\+[1-9][0-9]{7,14}$');
   ```
   Neul only talks with the parent: only calls from Alex's saved number are answered. Anyone else whose call to Sam forwards to Neul is refused before the agent starts (they hear the call end, and can't leave Sam a voicemail while forwarding is on). **If the number is blank, every call is refused, including Alex's**, so set the real demo phone in the hosted database before live calls. The carrier must also keep Alex's caller ID when it forwards; check this with one real test call.
4. **End of call:** handle Retell's `call_ended`/`call_analyzed` webhook (agent `webhook_url`) and update the call row found by `provider_call_id` = Retell `call_id`: `status='ended'`, `ended_at`, `duration_seconds`, `transcript`, `cost_cents`. Leave `summary_status='processing'`. Then `POST /brain/summarize` with `{"call_id": "<uuid>"}` and header `X-Brain-Secret`. Calling it twice is safe.
5. **Alert delivery:** react to new `alerts` rows (type `urgent`/`lost`, `reason`, `landmarks`) per C06. B writes **one alert per call per type** (`event_id = retell:<retell call id>:<type>`). If Alex mentions more landmarks, B adds them to the same row, so watch for updates as well as inserts if you want to re-send landmarks.
6. **Phone number:** connect the Twilio number to Retell (import the number or use a SIP trunk) and assign the agent `agent_256167d9e8674f7b708a2a9970`. `update:retell` sets the inbound webhook and pins the published agent version.

## Choices B made that touch A's side (change them if you disagree)

- **Inbound creates the call row** (`status in_progress`, `urgency routine`, `summary_status processing`), keyed by `provider_call_id`. C01 says A creates it at call start. The inbound webhook is the earliest moment, and alerts need the row to exist. If you'd rather own it, move `startCall` into your code.
- **Alerts raise `calls.urgency`** (routine → urgent → lost, never down). C02's `urgency` then already holds the in-call result when you finalize, so don't overwrite it with `routine`.
- **Every caller except the parent is rejected** (`call_inbound.reject`), so no call row is created and no `call_ended` webhook arrives for them. If Retell can't reach the webhook, the agent's default variables say a short goodbye and end the call.
- **This also rejects calls from the Neul number itself.** If Sam declines Neul's alert call, Sam's phone forwards it back to the Neul number, and answering it would hide the alert. So place alert calls *from* the family's Neul number, and treat a declined or rejected alert call as "not acknowledged" (try the next contact).

## For C (app)
- An in-progress call shows `summary_status = processing` from the moment it starts. The "summary coming" state covers it.
- The mood is now lowercase words, e.g. "worried, calm".

## Models and cost
- Voice agent: Retell + Claude 5.5 Haiku (D04/D05, cheapest setup, ~$0.085/min all-in).
- Summaries: Claude Sonnet 5.5 (~$0.006 per call, under $1 per family per month). Haiku was cheaper but inconsistent on the test calls.
