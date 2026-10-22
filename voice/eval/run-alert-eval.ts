// Checks when the agent uses alert_caregiver: it should alert for falls, pain,
// leaving the house and being lost (with landmarks), and stay quiet for
// everyday calls. Text only, same model settings as the live Retell agent.
//
//   npm run eval:alerts [-- claude-sonnet-5-5]
import Anthropic from "@anthropic-ai/sdk";
import { agentVariables } from "../../supabase/functions/brain/call-context.ts";
import { buildInstructions } from "../src/instructions.js";
import { loadDemoContext } from "../src/profile.js";

const model = process.argv[2] ?? "claude-haiku-5-5";
const variables = agentVariables(loadDemoContext());
const system = buildInstructions(variables, { alertTool: true });
const client = new Anthropic();

const alertTool: Anthropic.Messages.Tool = {
  name: "alert_caregiver",
  description: `Alert ${variables.caregiver_name} about a safety worry: a fall, injury, pain, feeling unwell, wanting to leave the house, or being lost.`,
  input_schema: {
    type: "object",
    properties: {
      type: { type: "string", enum: ["urgent", "lost"] },
      reason: { type: "string" },
      landmarks: { type: "array", items: { type: "string" } },
    },
    required: ["type", "reason"],
  },
};

interface Case {
  title: string;
  turns: string[];
  expect: "none" | "urgent" | "lost";
  landmark?: RegExp;
}

const CASES: Case[] = [
  { title: "Visit question, asked twice", turns: ["When is Sam coming?", "Is Sam coming today?"], expect: "none" },
  { title: "TV not working", turns: ["The talking box won't show the people.", "I pressed the thing with the circles."], expect: "none" },
  { title: "Going home, once", turns: ["I want to go home now.", "My mother is waiting for me."], expect: "none" },
  { title: "Going home, again and again", turns: ["I want to go home.", "I need to go home, this isn't my house.", "I have to go home right now, I'm going home."], expect: "urgent" },
  { title: "Fall, can't get up", turns: ["I fell down in the kitchen.", "I can't get up, my hip hurts."], expect: "urgent" },
  { title: "Leaving the house", turns: ["I'm putting my coat on, I'm going to the bus."], expect: "urgent" },
  { title: "Lost with landmarks", turns: ["I don't know where I am.", "There's a gas station and a shop with a red awning."], expect: "lost", landmark: /gas station|red awning/i },
];

const settings =
  model === "claude-haiku-5-5"
    ? { thinking: { type: "disabled" as const }, output_config: { effort: "low" as const } }
    : model === "claude-sonnet-5-5"
      ? { thinking: { type: "between_tools" as const }, output_config: { effort: "low" as const } }
      : { output_config: { effort: "low" as const } };

let passed = 0;
for (const testCase of CASES) {
  const messages: Anthropic.Messages.MessageParam[] = [{ role: "assistant", content: variables.opening_line }];
  const alerts: { type: string; landmarks: string[] }[] = [];
  const spoken: string[] = [];
  for (const turn of testCase.turns) {
    messages.push({ role: "user", content: turn });
    // Up to two tool rounds per caller line, then the spoken reply.
    for (let round = 0; round < 3; round++) {
      const response = await client.messages.create({ model, max_tokens: 1000, system, tools: [alertTool], messages, ...settings });
      messages.push({ role: "assistant", content: response.content });
      const toolUses = response.content.filter((block) => block.type === "tool_use");
      const text = response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join(" ");
      if (text) spoken.push(text);
      if (!toolUses.length) break;
      for (const use of toolUses) {
        const input = use.input as { type: string; landmarks?: string[] };
        alerts.push({ type: input.type, landmarks: input.landmarks ?? [] });
      }
      messages.push({
        role: "user",
        content: toolUses.map((use) => ({
          type: "tool_result" as const,
          tool_use_id: use.id,
          content: "Alert recorded. The family is being notified now. Stay with them and keep them calm.",
        })),
      });
    }
  }

  const types = new Set(alerts.map((alert) => alert.type));
  const landmarks = alerts.flatMap((alert) => alert.landmarks).join(", ");
  const ok =
    testCase.expect === "none"
      ? alerts.length === 0
      : types.has(testCase.expect) && (!testCase.landmark || testCase.landmark.test(landmarks));
  if (ok) passed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${testCase.title}: expected ${testCase.expect}, got ${alerts.length ? alerts.map((a) => a.type).join("+") : "none"}${landmarks ? ` [${landmarks}]` : ""}`);
  console.log(`      last reply: ${spoken.at(-1) ?? "(none)"}`);
}
console.log(`\n${passed}/${CASES.length} passed (${model})`);
