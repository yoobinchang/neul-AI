// Brain edge function (B). Deploy with JWT checks off, since Retell can't send a
// Supabase token; each route checks its own caller instead:
//   supabase functions deploy brain --no-verify-jwt
//
//   POST /brain/retell/inbound  Retell inbound-call webhook   (X-Retell-Signature)
//   POST /brain/retell/alert    alert_caregiver tool calls     (X-Retell-Signature)
//   POST /brain/summarize       A's "call ended" trigger       (X-Brain-Secret)
//
// Secrets: RETELL_API_KEY (the key with the webhook badge), ANTHROPIC_API_KEY,
// BRAIN_SECRET, optional DEMO_PARENT_NUMBERS. SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.
import { createClient } from "@supabase/supabase-js";
import { ALERT_FAILED_RESPONSE, REJECTED_INBOUND_RESPONSE, handleAlertTool, handleInbound, handleSummarize } from "./handlers.ts";
import { verifyRetellSignature } from "./retell-signature.ts";
import { supabaseStore } from "./store.ts";
import { Anthropic } from "./summarize.ts";

const env = (name: string) => {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing secret ${name}`);
  return value;
};

const store = supabaseStore(createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY")));
const anthropic = new Anthropic({ apiKey: env("ANTHROPIC_API_KEY") });
const retellKey = env("RETELL_API_KEY");
const brainSecret = env("BRAIN_SECRET");
// Optional, comma-separated E.164 numbers that count as the parent while the
// team builds and tests. Unset it for real families.
const testParentNumbers = (Deno.env.get("DEMO_PARENT_NUMBERS") ?? "")
  .split(",")
  .map((number) => number.trim())
  .filter((number) => /^\+[1-9][0-9]{7,14}$/.test(number));

// Optional: why the caregiver can't pick up, said first in the opening line. It finishes
// "<caregiver name> …", e.g. "is teaching right now and can talk after class".
const caregiverAway = (Deno.env.get("DEMO_CAREGIVER_AWAY") ?? "").trim().slice(0, 120);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const error = (status: number, code: string, message: string) => json(status, { error: { code, message } });

Deno.serve(async (request) => {
  if (request.method !== "POST") return error(404, "NOT_FOUND", "Not found.");
  const route = new URL(request.url).pathname.replace(/^.*?\/brain/, "");
  // Signatures are over the exact bytes Retell sent, so read the raw body first.
  const rawBody = await request.text();
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return error(400, "INVALID_JSON", "Body must be JSON.");
  }

  if (route === "/retell/inbound" || route === "/retell/alert") {
    if (!(await verifyRetellSignature(rawBody, retellKey, request.headers.get("x-retell-signature")))) {
      return error(401, "BAD_SIGNATURE", "Invalid Retell signature.");
    }
  } else if (route === "/summarize") {
    if (request.headers.get("x-brain-secret") !== brainSecret) return error(401, "UNAUTHORIZED", "Missing or wrong secret.");
  } else {
    return error(404, "NOT_FOUND", "Not found.");
  }

  try {
    if (route === "/retell/inbound") return json(200, await handleInbound(body as never, store, testParentNumbers, caregiverAway));
    if (route === "/retell/alert") return json(200, await handleAlertTool(body as never, store));
    const outcome = await handleSummarize(body as never, store, anthropic);
    return json(outcome.status, outcome.body);
  } catch (caught) {
    console.error(route, caught);
    // Never stall a call: if we can't confirm the parent, refuse it.
    if (route === "/retell/inbound") return json(200, REJECTED_INBOUND_RESPONSE);
    if (route === "/retell/alert") return json(200, ALERT_FAILED_RESPONSE);
    return error(503, "TEMPORARY_FAILURE", "Try again.");
  }
});
