// Talk to Neul in the terminal, playing the parent. Uses the same prompt as the
// phone agent, text only.
//
//   npm run chat                       # Haiku 5.5
//   npm run chat -- claude-sonnet-5-5
//
// Type a line and press Enter; type "quit" to stop. Each reply costs a fraction of a cent.
import Anthropic from "@anthropic-ai/sdk";
import { createInterface } from "node:readline/promises";
import { demoAgentSpec } from "../src/agent-config.js";

const SETTINGS: Record<string, { thinking?: Anthropic.Messages.ThinkingConfigParam }> = {
  "claude-haiku-5-5": { thinking: { type: "disabled" } },
  "claude-sonnet-5-5": { thinking: { type: "between_tools" } },
  "claude-opus-5-5": {},
};

const model = process.argv[2] ?? "claude-haiku-5-5";
if (!SETTINGS[model]) {
  console.error(`Unknown model ${model}. Choose one of: ${Object.keys(SETTINGS).join(", ")}`);
  process.exit(1);
}

const client = new Anthropic();
const spec = demoAgentSpec();
const messages: Anthropic.MessageParam[] = [
  { role: "user", content: "[The call has connected.]" },
  { role: "assistant", content: spec.firstMessage },
];
const terminal = createInterface({ input: process.stdin, output: process.stdout });

console.log(`Talking to Neul (${model}, instructions ${spec.instructionsVersion}). Type "quit" to stop.\n`);
console.log(`Neul: ${spec.firstMessage}\n`);

while (true) {
  let line: string;
  try {
    line = (await terminal.question("You (as Alex): ")).trim();
  } catch {
    break; // input closed (Ctrl+D)
  }
  if (!line) continue;
  if (line.toLowerCase() === "quit") break;
  messages.push({ role: "user", content: line });

  const started = performance.now();
  try {
    const message = await client.messages.create({
      model,
      max_tokens: 1024,
      system: spec.instructions,
      messages,
      ...(SETTINGS[model].thinking ? { thinking: SETTINGS[model].thinking } : {}),
      output_config: { effort: "low" },
    });
    const reply = message.content
      .flatMap((block) => (block.type === "text" ? [block.text] : []))
      .join("")
      .trim();
    const seconds = ((performance.now() - started) / 1000).toFixed(1);
    console.log(`\nNeul: ${reply}\n      (${seconds}s, ${reply.split(/\s+/).filter(Boolean).length} words)\n`);
    messages.push({ role: "assistant", content: reply || "..." });
  } catch (error) {
    if (!(error instanceof Anthropic.APIError)) throw error;
    console.error(`\nAPI error ${error.status ?? ""}: ${error.message}\n`);
    messages.pop();
  }
}
terminal.close();
