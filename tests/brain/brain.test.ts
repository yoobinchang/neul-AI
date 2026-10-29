// Brain function tests against an in-memory store (no database, no API calls).
//   cd voice && npm run test:brain
import assert from "node:assert/strict";
import { test } from "node:test";
import { UNKNOWN_CALLER_VARIABLES } from "../../supabase/functions/brain/call-context.ts";
import { handleAlertTool, handleInbound, handleSummarize, REJECTED_INBOUND_RESPONSE } from "../../supabase/functions/brain/handlers.ts";
import { signRetellBody, verifyRetellSignature } from "../../supabase/functions/brain/retell-signature.ts";
import type { AlertInput, BrainStore, CallRow } from "../../supabase/functions/brain/store.ts";
import type { Anthropic } from "../../supabase/functions/brain/summarize.ts";

const FAMILY = "family-1";
const NEUL_NUMBER = "+12025550100";
const ALEX_NUMBER = "+12025550101";
const STRANGER_NUMBER = "+12025550199";

function memoryStore({ parentPhone = ALEX_NUMBER }: { parentPhone?: string | null } = {}) {
  const calls = new Map<string, CallRow & { provider_call_id: string; summary: string | null }>();
  const alerts: (AlertInput & { alert_id: string })[] = [];
  const store: BrainStore = {
    async findFamilyIdByNumber(number) {
      return number === NEUL_NUMBER ? FAMILY : null;
    },
    async getParent(familyId) {
      if (familyId !== FAMILY) return null;
      return {
        parent_id: "parent-1",
        preferred_name: "Alex",
        routine: "Gardens in the morning.",
        family_facts: ["Sam is the primary caregiver."],
        calming_topics: ["Gardening"],
        topics_to_avoid: [],
        phone_number: parentPhone,
      };
    },
    async getPrimaryContact() {
      return { contact_id: "contact-1", display_name: "Sam", phone_number: "+12025550102" };
    },
    async startCall(row) {
      const existing = [...calls.values()].find((call) => call.provider_call_id === row.provider_call_id);
      if (existing) return existing.call_id;
      const call_id = `call-${calls.size + 1}`;
      calls.set(call_id, {
        ...row,
        call_id,
        status: "in_progress",
        duration_seconds: 0,
        transcript: null,
        urgency: "routine",
        summary_status: "processing",
        summary: null,
      });
      return call_id;
    },
    async findCallByProviderId(id) {
      return [...calls.values()].find((call) => call.provider_call_id === id) ?? null;
    },
    async getCall(id) {
      return calls.get(id) ?? null;
    },
    async getAlertByEventId(eventId) {
      return alerts.find((alert) => alert.event_id === eventId) ?? null;
    },
    async insertAlert(alert) {
      alerts.push({ ...alert, alert_id: `alert-${alerts.length + 1}` });
    },
    async setAlertLandmarks(alertId, landmarks) {
      alerts.find((alert) => alert.alert_id === alertId)!.landmarks = landmarks;
    },
    async setUrgency(callId, urgency) {
      calls.get(callId)!.urgency = urgency;
    },
    async writeSummary(result) {
      const call = calls.get(result.call_id);
      if (!call || call.summary_status !== "processing") return false;
      call.summary_status = result.summary_status;
      call.summary = result.summary;
      return true;
    },
  };
  return { store, calls, alerts };
}

const inbound = (from: string, to = NEUL_NUMBER, call_id = "retell-1") => ({
  event: "call_inbound",
  call_inbound: { call_id, from_number: from, to_number: to },
});

// A stand-in for the Anthropic client that returns a fixed summary.
const fakeClient = (calls: { count: number }) =>
  ({
    beta: {
      messages: {
        parse: async () => {
          calls.count++;
          return {
            stop_reason: "end_turn",
            usage: { input_tokens: 1, output_tokens: 1 },
            parsed_output: { summary: "Alex asked when you're visiting.", topic: "Visit timing", mood: "Calm" },
          };
        },
      },
    },
  }) as unknown as Anthropic;

test("Retell signature: accepts a fresh signature, rejects a changed body, wrong key, or old timestamp", async () => {
  const now = Date.now();
  const header = await signRetellBody('{"a":1}', "key", now);
  assert.equal(await verifyRetellSignature('{"a":1}', "key", header, now), true);
  assert.equal(await verifyRetellSignature('{"a":2}', "key", header, now), false);
  assert.equal(await verifyRetellSignature('{"a":1}', "other", header, now), false);
  assert.equal(await verifyRetellSignature('{"a":1}', "key", header, now + 6 * 60 * 1000), false);
  assert.equal(await verifyRetellSignature('{"a":1}', "key", null, now), false);
});

test("inbound: Alex calling the family's number gets Alex's profile and a call row", async () => {
  const { store, calls } = memoryStore();
  const response = await handleInbound(inbound(ALEX_NUMBER), store);
  const variables = response.call_inbound.dynamic_variables!;
  assert.equal(variables.preferred_name, "Alex");
  assert.equal(variables.caregiver_name, "Sam");
  assert.match(variables.known_facts, /Gardening/);
  assert.match(variables.opening_line, /^Hi Alex, this is Neul, an AI assistant/);
  assert.equal(response.call_inbound.metadata?.context_status, "resolved");
  assert.equal(calls.size, 1);
  // Retell retries the webhook; the same call must not create a second row.
  await handleInbound(inbound(ALEX_NUMBER), store);
  assert.equal(calls.size, 1);
});

test("inbound: anyone other than Alex is rejected before the agent starts", async () => {
  const { store, calls } = memoryStore();
  assert.deepEqual(await handleInbound(inbound(STRANGER_NUMBER), store), REJECTED_INBOUND_RESPONSE);
  assert.equal(calls.size, 0);
});

test("inbound: a parent with no saved number matches nobody", async () => {
  const { store, calls } = memoryStore({ parentPhone: null });
  assert.deepEqual(await handleInbound(inbound(ALEX_NUMBER), store), REJECTED_INBOUND_RESPONSE);
  assert.deepEqual(await handleInbound(inbound(STRANGER_NUMBER), store), REJECTED_INBOUND_RESPONSE);
  assert.equal(calls.size, 0);
});

test("inbound: an unknown Neul number, a hidden caller ID, or a non-inbound event is rejected", async () => {
  const { store, calls } = memoryStore();
  assert.deepEqual(await handleInbound(inbound(ALEX_NUMBER, "+19995550000"), store), REJECTED_INBOUND_RESPONSE);
  assert.deepEqual(
    await handleInbound({ event: "call_inbound", call_inbound: { call_id: "retell-1", to_number: NEUL_NUMBER } }, store),
    REJECTED_INBOUND_RESPONSE,
  );
  assert.deepEqual(await handleInbound({ event: "call_started", call_inbound: inbound(ALEX_NUMBER).call_inbound }, store), REJECTED_INBOUND_RESPONSE);
  assert.equal(calls.size, 0);
});

test("inbound: Neul's own alert call, forwarded back after a decline, is rejected", async () => {
  const { store, calls } = memoryStore();
  assert.deepEqual(await handleInbound(inbound(NEUL_NUMBER), store), REJECTED_INBOUND_RESPONSE);
  assert.equal(calls.size, 0);
});

test("fallback variables (webhook unreachable) carry no family details and end the call", () => {
  assert.doesNotMatch(JSON.stringify(UNKNOWN_CALLER_VARIABLES), /Alex|Sam|Gardening|message/);
  assert.match(UNKNOWN_CALLER_VARIABLES.known_facts, /end the call/);
});

test("alert: records once per type, merges new landmarks, raises urgency", async () => {
  const { store, calls, alerts } = memoryStore();
  await handleInbound(inbound(ALEX_NUMBER), store);
  const call = { call_id: "retell-1" };

  const first = await handleAlertTool({ call, args: { type: "lost", reason: "Doesn't know where she is.", landmarks: ["gas station"] } }, store);
  assert.equal(first.ok, true);
  await handleAlertTool({ call, args: { type: "lost", reason: "Still lost.", landmarks: ["gas station", "red awning"] } }, store);
  assert.equal(alerts.length, 1);
  assert.deepEqual(alerts[0].landmarks, ["gas station", "red awning"]);
  assert.equal(calls.get("call-1")!.urgency, "lost");

  // A later "urgent" alert is recorded, but doesn't lower urgency from lost.
  await handleAlertTool({ call, args: { type: "urgent", reason: "Says her knee hurts." } }, store);
  assert.equal(alerts.length, 2);
  assert.equal(calls.get("call-1")!.urgency, "lost");
});

test("alert: bad input or an unknown call fails without writing", async () => {
  const { store, alerts } = memoryStore();
  assert.equal((await handleAlertTool({ call: { call_id: "nope" }, args: { type: "lost", reason: "x" } }, store)).ok, false);
  await handleInbound(inbound(ALEX_NUMBER), store);
  assert.equal((await handleAlertTool({ call: { call_id: "retell-1" }, args: { type: "fire", reason: "x" } }, store)).ok, false);
  assert.equal((await handleAlertTool({ call: { call_id: "retell-1" }, args: { type: "urgent", reason: " " } }, store)).ok, false);
  assert.equal(alerts.length, 0);
});

test("summarize: writes once for an ended call, skips the rest", async () => {
  const { store, calls } = memoryStore();
  const model = { count: 0 };
  assert.equal((await handleSummarize({}, store, fakeClient(model))).status, 400);
  assert.equal((await handleSummarize({ call_id: "missing" }, store, fakeClient(model))).status, 404);

  await handleInbound(inbound(ALEX_NUMBER), store);
  const early = await handleSummarize({ call_id: "call-1" }, store, fakeClient(model));
  assert.deepEqual(early.body, { call_id: "call-1", skipped: "call not ended" });

  Object.assign(calls.get("call-1")!, { status: "ended", duration_seconds: 120, transcript: "Parent: When is Sam coming?" });
  // Database-webhook shape.
  const done = await handleSummarize({ record: { call_id: "call-1" } }, store, fakeClient(model));
  assert.deepEqual(done.body, { call_id: "call-1", summary_status: "completed", written: true });
  assert.equal(calls.get("call-1")!.summary, "Alex asked when you're visiting.");

  const replay = await handleSummarize({ call_id: "call-1" }, store, fakeClient(model));
  assert.deepEqual(replay.body, { call_id: "call-1", skipped: "already summarized" });
  assert.equal(model.count, 1);
});

test("summarize: an empty transcript is marked failed without a model call", async () => {
  const { store, calls } = memoryStore();
  const model = { count: 0 };
  await handleInbound(inbound(ALEX_NUMBER), store);
  Object.assign(calls.get("call-1")!, { status: "ended", transcript: null });
  const outcome = await handleSummarize({ call_id: "call-1" }, store, fakeClient(model));
  assert.deepEqual(outcome.body, { call_id: "call-1", summary_status: "failed", written: true });
  assert.equal(model.count, 0);
});
