// Points the existing Retell agent at the brain function: the instructions
// become a template filled per call by the inbound webhook, the opening line
// comes from the webhook, and the agent gets the alert_caregiver tool.
// Updates in place (no duplicates); safe to re-run after a prompt change.
//
//   NEUL_BRAIN_URL=https://<project>.supabase.co/functions/v1/brain \
//   RETELL_LLM_ID=llm_... [RETELL_PHONE_NUMBER=+1...] npm run update:retell
//
// With RETELL_PHONE_NUMBER set, it also sets that number's inbound webhook.
// Field names checked against docs.retellai.com/api-references on 2026-10-21.
import { UNKNOWN_CALLER_VARIABLES } from "../../supabase/functions/brain/call-context.ts";
import { requireEnv } from "../src/agent-config.js";
import { INSTRUCTIONS_VERSION, retellInstructionsTemplate } from "../src/instructions.js";

const apiKey = requireEnv("RETELL_API_KEY");
const brainUrl = requireEnv("NEUL_BRAIN_URL").replace(/\/$/, "");
const llmId = requireEnv("RETELL_LLM_ID");
const phoneNumber = process.env.RETELL_PHONE_NUMBER;

async function retell(path: string, body: unknown) {
  const response = await fetch(`https://api.retellai.com${path}`, {
    method: "PATCH",
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

await retell(`/update-retell-llm/${llmId}`, {
  general_prompt: retellInstructionsTemplate(),
  begin_message: "{{opening_line}}",
  // Used if the webhook can't be reached: no family details, ever.
  default_dynamic_variables: UNKNOWN_CALLER_VARIABLES,
  general_tools: [
    { type: "end_call", name: "end_call", description: "End the call after saying goodbye." },
    {
      type: "custom",
      name: "alert_caregiver",
      description:
        "Alert {{caregiver_name}} about a safety worry: a fall, injury, pain, feeling unwell, wanting to leave the house, or being lost.",
      url: `${brainUrl}/retell/alert`,
      method: "POST",
      // The agent has already said it's letting {{caregiver_name}} know; no filler while this runs.
      speak_during_execution: false,
      speak_after_execution: true,
      timeout_ms: 8000,
      max_retry: 1,
      parameters: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["urgent", "lost"], description: '"lost" if they are lost or outside and unsure where they are; otherwise "urgent".' },
          reason: { type: "string", description: "One short, plain sentence about what they said." },
          landmarks: {
            type: "array",
            items: { type: "string" },
            description: "Things they can see that could help find them, such as a shop, a street sign, or a park. Empty if none.",
          },
        },
        required: ["type", "reason"],
      },
    },
  ],
});
console.log(`Updated Retell LLM ${llmId} to instructions ${INSTRUCTIONS_VERSION} with alert_caregiver → ${brainUrl}/retell/alert.`);

if (phoneNumber) {
  await retell(`/update-phone-number/${encodeURIComponent(phoneNumber)}`, {
    inbound_webhook_url: `${brainUrl}/retell/inbound`,
  });
  console.log(`Set ${phoneNumber}'s inbound webhook to ${brainUrl}/retell/inbound.`);
} else {
  console.log("RETELL_PHONE_NUMBER not set; set the number's inbound webhook in the dashboard or re-run with it.");
}
