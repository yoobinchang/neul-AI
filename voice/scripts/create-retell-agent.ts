// Creates the Neul demo agent on Retell from the shared AgentSpec: a Retell LLM
// (instructions + opening line) and an agent (voice + call timing) that uses it.
// Each run creates new objects; delete old ones in the Retell dashboard.
// Field names checked against docs.retellai.com/api-references on 2026-10-17.
import { demoAgentSpec, requireEnv } from "../src/agent-config.js";

const apiKey = requireEnv("RETELL_API_KEY");
// Browse voices in the Retell dashboard; this is the API docs' example voice.
const voiceId = process.env.RETELL_VOICE_ID ?? "retell-Cimo";
const model = process.env.RETELL_MODEL ?? "claude-5.5-haiku";
const spec = demoAgentSpec();

async function retell(path: string, body: unknown) {
  const response = await fetch(`https://api.retellai.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) {
    console.error(`Retell ${path} returned ${response.status}:`, JSON.stringify(result, null, 2));
    process.exit(1);
  }
  return result;
}

const llm = await retell("/create-retell-llm", {
  model,
  general_prompt: spec.instructions,
  begin_message: spec.firstMessage,
  start_speaker: "agent",
  general_tools: [
    { type: "end_call", name: "end_call", description: "End the call after saying goodbye." },
  ],
});

const agent = await retell("/create-agent", {
  agent_name: spec.name,
  response_engine: { type: "retell-llm", llm_id: llm.llm_id },
  voice_id: voiceId,
  language: spec.language,
  end_call_after_silence_ms: spec.endCallAfterSilenceSeconds * 1000,
  max_call_duration_ms: spec.maxCallSeconds * 1000,
});

console.log(`Created Retell LLM ${llm.llm_id} and agent ${agent.agent_id} (${spec.name}, model ${model}).`);
console.log("Next: attach the Twilio number to this agent in the Retell dashboard and run the test-call script.");
