// What the brain function does for each request. index.ts handles HTTP and
// auth; these take the parsed body and a BrainStore, so tests can run them
// against an in-memory store.
//
//   inbound   Retell asks who is calling → C01 lookup, call row, agent variables
//   alert     the agent's alert_caregiver tool → C06 alert record + call urgency
//   summarize A's "call ended" trigger → C02 summary written back to the call
import { agentVariables, UNKNOWN_CALLER_VARIABLES, type AgentVariables, type CallContext } from "./call-context.ts";
import type { BrainStore, Urgency } from "./store.ts";
import { summarizeCall, type Anthropic, type SummaryResult } from "./summarize.ts";

// ---- inbound -------------------------------------------------------------

export interface RetellInboundEvent {
  event: string;
  call_inbound?: { call_id?: string; from_number?: string; to_number?: string };
}

export interface RetellInboundResponse {
  call_inbound: {
    reject?: true;
    dynamic_variables?: AgentVariables;
    metadata?: { family_id: string; call_id: string | null; context_status: CallContext["context_status"] };
  };
}

/** Sent whenever the caller can't be matched to a family, including on errors. */
export const GENERIC_INBOUND_RESPONSE: RetellInboundResponse = {
  call_inbound: { dynamic_variables: UNKNOWN_CALLER_VARIABLES },
};

export async function handleInbound(
  event: RetellInboundEvent,
  store: BrainStore,
  now = new Date(),
): Promise<RetellInboundResponse> {
  const inbound = event.call_inbound;
  if (event.event !== "call_inbound" || !inbound?.to_number) return GENERIC_INBOUND_RESPONSE;
  // Neul's own alert call to the caregiver, forwarded back here because they
  // declined it. Answering it would hide the alert, so end it.
  if (inbound.from_number === inbound.to_number) return { call_inbound: { reject: true } };

  const familyId = await store.findFamilyIdByNumber(inbound.to_number);
  if (!familyId) return GENERIC_INBOUND_RESPONSE;

  const [parent, primaryContact] = await Promise.all([store.getParent(familyId), store.getPrimaryContact(familyId)]);
  // Until parents has a phone number, every caller to the family's Neul number
  // counts as the parent. Fine for the one-family demo; see docs/brain-handoff.md.
  const callerIsParent = !!parent && (!parent.phone_number || parent.phone_number === inbound.from_number);

  const callId = inbound.call_id
    ? await store.startCall({
        family_id: familyId,
        parent_id: callerIsParent ? parent.parent_id : null,
        provider_call_id: inbound.call_id,
        started_at: now.toISOString(),
      })
    : null;

  const contextStatus = callerIsParent ? "resolved" : "unknown_caller";
  const context: CallContext = {
    call_id: callId ?? "",
    family_id: familyId,
    context_status: contextStatus,
    parent: callerIsParent ? parent : null,
    primary_contact: primaryContact,
  };
  return {
    call_inbound: {
      dynamic_variables: agentVariables(context),
      metadata: { family_id: familyId, call_id: callId, context_status: contextStatus },
    },
  };
}

// ---- alert ---------------------------------------------------------------

export interface RetellToolCall {
  name?: string;
  call?: { call_id?: string };
  args?: { type?: unknown; reason?: unknown; landmarks?: unknown };
}

const URGENCY_RANK: Record<Urgency, number> = { routine: 0, urgent: 1, lost: 2 };

// Spoken to the agent's model, not the caller.
const ALERT_RECORDED = "Alert recorded. The family is being notified now. Stay with them and keep them calm.";
const ALERT_FAILED =
  "The alert could not be recorded. Stay with them and keep them calm. If anything serious is happening, tell them it's always okay to call 911.";

export const ALERT_FAILED_RESPONSE = { result: ALERT_FAILED, ok: false };

export async function handleAlertTool(body: RetellToolCall, store: BrainStore): Promise<{ result: string; ok: boolean }> {
  const providerCallId = body.call?.call_id;
  const { type, reason, landmarks } = body.args ?? {};
  if (!providerCallId || (type !== "urgent" && type !== "lost") || typeof reason !== "string" || !reason.trim()) {
    return ALERT_FAILED_RESPONSE;
  }
  const newLandmarks = Array.isArray(landmarks)
    ? landmarks.filter((item): item is string => typeof item === "string" && !!item.trim()).map((item) => item.trim().slice(0, 100))
    : [];

  const call = await store.findCallByProviderId(providerCallId);
  if (!call) return ALERT_FAILED_RESPONSE;

  // One alert per call and type, so a repeated tool call doesn't notify the family twice.
  // A later "lost" call adds the new landmarks to the same alert.
  const eventId = `retell:${providerCallId}:${type}`;
  const existing = await store.getAlertByEventId(eventId);
  if (!existing) {
    await store.insertAlert({
      event_id: eventId,
      family_id: call.family_id,
      call_id: call.call_id,
      type,
      reason: reason.trim().slice(0, 300),
      landmarks: newLandmarks.slice(0, 20),
    });
  } else {
    const merged = [...new Set([...existing.landmarks, ...newLandmarks])].slice(0, 20);
    if (merged.length > existing.landmarks.length) await store.setAlertLandmarks(existing.alert_id, merged);
  }

  if (URGENCY_RANK[type] > URGENCY_RANK[call.urgency]) await store.setUrgency(call.call_id, type);
  return { result: ALERT_RECORDED, ok: true };
}

// ---- summarize -----------------------------------------------------------

export interface SummarizeRequest {
  call_id?: string;
  /** Shape of a Supabase database webhook, if A's trigger uses one. */
  record?: { call_id?: string };
}

export type SummarizeOutcome =
  | { status: 200; body: { call_id: string; summary_status: SummaryResult["summary_status"]; written: boolean } }
  | { status: 200; body: { call_id: string; skipped: string } }
  | { status: 400 | 404; body: { error: { code: string; message: string } } };

export async function handleSummarize(
  request: SummarizeRequest,
  store: BrainStore,
  client: Anthropic,
): Promise<SummarizeOutcome> {
  const callId = request.call_id ?? request.record?.call_id;
  if (!callId) return { status: 400, body: { error: { code: "INVALID_INPUT", message: "call_id is required." } } };

  const call = await store.getCall(callId);
  if (!call) return { status: 404, body: { error: { code: "CALL_NOT_FOUND", message: "Call not found." } } };
  // Only ended calls still waiting for a summary; replays and early triggers change nothing.
  if (call.status !== "ended") return { status: 200, body: { call_id: callId, skipped: "call not ended" } };
  if (call.summary_status !== "processing") return { status: 200, body: { call_id: callId, skipped: "already summarized" } };

  const [parent, primaryContact] = await Promise.all([store.getParent(call.family_id), store.getPrimaryContact(call.family_id)]);
  const parentName = call.parent_id && parent ? parent.preferred_name : "the caller";
  const caregiverName = primaryContact?.display_name ?? "the caregiver";

  let result: SummaryResult;
  try {
    result = await summarizeCall(
      client,
      {
        call_id: call.call_id,
        started_at: call.started_at,
        duration_seconds: call.duration_seconds,
        transcript: call.transcript ?? "",
        urgency: call.urgency,
      },
      { parentName, caregiverName },
    );
  } catch (error) {
    console.error("summary failed", callId, error);
    result = { call_id: call.call_id, summary_status: "failed", summary: null, topic: null, mood: null, failure_reason: "unexpected error" };
  }

  const written = await store.writeSummary(result);
  return { status: 200, body: { call_id: callId, summary_status: result.summary_status, written } };
}
