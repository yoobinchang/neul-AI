// Checks the X-Retell-Signature header on webhooks and tool calls, so only
// Retell can create alerts or read a family's profile through this function.
// Format (docs.retellai.com/features/secure-webhook, checked 2026-10-21):
//   "v=<unix ms>,d=<hex HMAC-SHA256 of rawBody + timestamp, keyed by the API key>"
// The key is the Retell API key marked with the webhook badge.

const MAX_AGE_MS = 5 * 60 * 1000;

async function hmacHex(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signRetellBody(rawBody: string, apiKey: string, timestampMs: number): Promise<string> {
  return `v=${timestampMs},d=${await hmacHex(apiKey, rawBody + timestampMs)}`;
}

export async function verifyRetellSignature(
  rawBody: string,
  apiKey: string,
  header: string | null,
  nowMs = Date.now(),
): Promise<boolean> {
  const match = header?.match(/^v=(\d+),d=([0-9a-f]+)$/i);
  if (!match) return false;
  const [, timestamp, digest] = match;
  if (Math.abs(nowMs - Number(timestamp)) > MAX_AGE_MS) return false;
  return constantTimeEqual(digest.toLowerCase(), await hmacHex(apiKey, rawBody + timestamp));
}
