// Creates the Neul demo assistant on Vapi from the shared AgentSpec.
// Each run creates a new assistant; delete old ones in the Vapi dashboard.
// Field names checked against https://api.vapi.ai/api-json on 2026-10-17.
import { demoAgentSpec, requireEnv } from "../src/agent-config.js";

const apiKey = requireEnv("VAPI_API_KEY");
const model = process.env.VAPI_MODEL ?? "claude-haiku-5-5";
const spec = demoAgentSpec();

const body = {
  name: spec.name,
  firstMessage: spec.firstMessage,
  firstMessageMode: "assistant-speaks-first",
  maxDurationSeconds: spec.maxCallSeconds,
  model: {
    provider: "anthropic",
    model,
    messages: [{ role: "system", content: spec.instructions }],
    // Thinking adds silence before each reply; Vapi accepts this only for claude-haiku-5-5.
    ...(model === "claude-haiku-5-5" ? { reasoningEffort: "none" } : {}),
    maxTokens: 300,
    tools: [{ type: "endCall" }],
  },
  voice: {
    provider: process.env.VAPI_VOICE_PROVIDER ?? "vapi",
    voiceId: process.env.VAPI_VOICE_ID ?? "Clara",
  },
  transcriber: { provider: "deepgram", model: "nova-3", language: "en" },
  metadata: { instructions_version: spec.instructionsVersion },
};

const response = await fetch("https://api.vapi.ai/assistant", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const result = await response.json();

if (!response.ok) {
  console.error(`Vapi returned ${response.status}:`, JSON.stringify(result, null, 2));
  process.exit(1);
}
console.log(`Created Vapi assistant ${result.id} (${spec.name}, model ${model}).`);
console.log("Next: attach the Twilio number to this assistant in the Vapi dashboard and run the test-call script.");
