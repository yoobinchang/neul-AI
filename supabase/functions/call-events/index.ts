// call-events edge function (A): receives Retell webhook events for call_ended
// and finalizes the call row, then triggers B's summary function.
//
// Deploy with JWT checks off: supabase functions deploy call-events --no-verify-jwt
// Secrets: RETELL_API_KEY (the key with the webhook badge), BRAIN_SECRET,
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from "@supabase/supabase-js";
import { verifyRetellSignature } from "../brain/retell-signature.ts";

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
};

const supabase = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"));
const retellKey = env("RETELL_API_KEY");
const brainSecret = env("BRAIN_SECRET");
const brainUrl = `${env("SUPABASE_URL")}/functions/v1/brain/summarize`;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const error = (status: number, code: string, message: string) => json(status, { error: { code, message } });

interface RetellCallEndedEvent {
  event: "call_ended";
  call: {
    call_id: string;
    end_timestamp: number;
    duration_ms: number;
    transcript?: string;
    cost_cents?: number;
    [key: string]: unknown;
  };
}

async function findCallByProviderId(providerCallId: string) {
  const { data, error: err } = await supabase
    .from("calls")
    .select("call_id, family_id, parent_id, status, started_at, duration_seconds, transcript, urgency, summary_status")
    .eq("provider_call_id", providerCallId)
    .maybeSingle();
  if (err) throw new Error(`call lookup: ${err.message}`);
  return data;
}

async function endCall(callId: string, endedAt: string, durationSeconds: number, transcript: string | null, costCents: number | null) {
  const { error: err } = await supabase
    .from("calls")
    .update({
      status: "ended",
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      transcript,
      cost_cents: costCents,
    })
    .eq("call_id", callId);
  if (err) throw new Error(`call end: ${err.message}`);
}

async function triggerSummarize(callId: string): Promise<boolean> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(brainUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Brain-Secret": brainSecret,
      },
      body: JSON.stringify({ call_id: callId }),
    });

    if (response.ok) {
      return true;
    }

    if (response.status === 503 && attempt < 2) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }

    const body = await response.text().catch(() => "");
    console.error("summarize failed", { callId, attempt, status: response.status, body });
    return false;
  }
  return false;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return error(404, "NOT_FOUND", "Not found.");

  const rawBody = await request.text();
  let body: RetellCallEndedEvent;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return error(400, "INVALID_JSON", "Body must be JSON.");
  }

  if (!(await verifyRetellSignature(rawBody, retellKey, request.headers.get("x-retell-signature")))) {
    return error(401, "BAD_SIGNATURE", "Invalid Retell signature.");
  }

  if (body.event !== "call_ended") {
    return json(200, { received: true });
  }

  const callData = body.call;
  const providerCallId = callData.call_id;
  if (!providerCallId) {
    return error(400, "MISSING_CALL_ID", "call.call_id is required.");
  }

  const call = await findCallByProviderId(providerCallId);
  if (!call) {
    console.warn("call not found for provider_call_id", providerCallId);
    return json(200, { received: true });
  }

  const endedAt = new Date(callData.end_timestamp).toISOString();
  const durationSeconds = Math.round(callData.duration_ms / 1000);
  const transcript = callData.transcript?.trim() ?? null;
  const costCents = typeof callData.cost_cents === "number" ? callData.cost_cents : null;

  try {
    await endCall(call.call_id, endedAt, durationSeconds, transcript, costCents);
  } catch (err) {
    console.error("failed to end call", { callId: call.call_id, error: err });
    return error(503, "TEMPORARY_FAILURE", "Try again.");
  }

  // Fire-and-forget: trigger summarize but don't block Retell's webhook response.
  // The summarize function is idempotent (only acts when summary_status = 'processing').
  triggerSummarize(call.call_id).catch((err) => {
    console.error("triggerSummarize failed", { callId: call.call_id, error: err });
  });

  return json(200, { received: true });
});