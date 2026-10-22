// D05: compare AI models on the same scripted scenarios for speed, tone and cost.
//
//   npm run eval:models                                    # default pair
//   npm run eval:models -- claude-haiku-5-5 claude-sonnet-5-5
//
// Text only: this measures how fast each model starts replying and what it says,
// not speech recognition or voice. Real phone calls on the chosen platform are
// still needed for end-to-end latency. Caller lines are fixed (they don't react
// to the reply), so treat tone results as a first pass.
//
// Output goes to tests/model-eval/results/<timestamp>/: results.json (everything),
// transcripts.txt and tone-scores.csv. Models are labeled A/B/... in the
// transcripts and CSV so tone can be scored blind; the key is in results.json.
import Anthropic from "@anthropic-ai/sdk";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { demoAgentSpec } from "../src/agent-config.js";

interface ModelSettings {
  thinking?: Anthropic.Messages.ThinkingConfigParam;
  effort: "low" | "medium" | "high";
  inputPerMTok: number;
  outputPerMTok: number;
}

// Thinking is turned off or kept minimal: on a phone call, time spent
// thinking is silence before the reply starts.
const MODEL_SETTINGS: Record<string, ModelSettings> = {
  "claude-haiku-5-5": { thinking: { type: "disabled" }, effort: "low", inputPerMTok: 0.1, outputPerMTok: 0.5 },
  "claude-sonnet-5-5": { thinking: { type: "between_tools" }, effort: "low", inputPerMTok: 2, outputPerMTok: 10 },
  "claude-opus-5-5": { effort: "low", inputPerMTok: 4, outputPerMTok: 20 },
};

const DEFAULT_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"];
const LONG_REPLY_WORDS = 45;
const RED_FLAGS: Array<[string, RegExp]> = [
  ["claims to be Sam", /\b(this is|i am|i'm|it's) sam\b/i],
  ["promises a callback or help", /\bsam will (call|come|be there)|\bon (the|their|his|her) way\b|\bhelp is coming\b/i],
  ["tells caller to hang up", /\bhang up\b/i],
];

interface Scenario {
  id: string;
  title: string;
  caller_turns: string[];
  good_response: string;
}

interface TurnResult {
  caller: string;
  reply: string;
  ttft_ms: number | null;
  total_ms: number;
  input_tokens: number;
  output_tokens: number;
  words: number;
  flags: string[];
  error?: string;
}

const scenariosUrl = new URL("../../tests/model-eval/scenarios.json", import.meta.url);
const { scenarios } = JSON.parse(readFileSync(scenariosUrl, "utf8")) as { scenarios: Scenario[] };

const models = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_MODELS;
for (const model of models) {
  if (!MODEL_SETTINGS[model]) {
    console.error(`No settings for ${model}. Known: ${Object.keys(MODEL_SETTINGS).join(", ")}`);
    process.exit(1);
  }
}

const client = new Anthropic();
const spec = demoAgentSpec();

function flagsFor(reply: string): string[] {
  const flags = RED_FLAGS.filter(([, pattern]) => pattern.test(reply)).map(([name]) => name);
  if (wordCount(reply) > LONG_REPLY_WORDS) flags.push(`over ${LONG_REPLY_WORDS} words`);
  return flags;
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

async function runTurn(model: string, messages: Anthropic.MessageParam[]): Promise<Omit<TurnResult, "caller">> {
  const settings = MODEL_SETTINGS[model];
  const started = performance.now();
  let firstTextAt: number | null = null;

  const stream = client.messages.stream({
    model,
    max_tokens: 1024,
    system: spec.instructions,
    messages,
    ...(settings.thinking ? { thinking: settings.thinking } : {}),
    output_config: { effort: settings.effort },
  });
  stream.on("text", () => {
    firstTextAt ??= performance.now();
  });
  const message = await stream.finalMessage();
  const totalMs = performance.now() - started;

  const reply = message.content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("")
    .trim();
  const flags = flagsFor(reply);
  if (message.stop_reason === "refusal") flags.push("refusal");
  if (message.stop_reason === "max_tokens") flags.push("hit max_tokens");

  return {
    reply,
    ttft_ms: firstTextAt === null ? null : Math.round(firstTextAt - started),
    total_ms: Math.round(totalMs),
    input_tokens: message.usage.input_tokens,
    output_tokens: message.usage.output_tokens,
    words: wordCount(reply),
    flags,
  };
}

async function runScenario(model: string, scenario: Scenario): Promise<TurnResult[]> {
  // The platform speaks the opening line before the caller's first words.
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: "[The call has connected.]" },
    { role: "assistant", content: spec.firstMessage },
  ];
  const turns: TurnResult[] = [];

  for (const caller of scenario.caller_turns) {
    messages.push({ role: "user", content: caller });
    try {
      const turn = await runTurn(model, messages);
      turns.push({ caller, ...turn });
      messages.push({ role: "assistant", content: turn.reply || "..." });
    } catch (error) {
      if (error instanceof Anthropic.AuthenticationError) {
        console.error("\nThe Anthropic API key was rejected. Check ANTHROPIC_API_KEY in your terminal or the repo-root .env.");
        process.exit(1);
      }
      if (!(error instanceof Anthropic.APIError)) throw error;
      turns.push({
        caller, reply: "", ttft_ms: null, total_ms: 0, input_tokens: 0, output_tokens: 0, words: 0,
        flags: ["api error"], error: `${error.status ?? ""} ${error.message}`.trim(),
      });
      break;
    }
  }
  return turns;
}

function percentile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function costUsd(model: string, turns: TurnResult[]): number {
  const { inputPerMTok, outputPerMTok } = MODEL_SETTINGS[model];
  const input = turns.reduce((sum, t) => sum + t.input_tokens, 0);
  const output = turns.reduce((sum, t) => sum + t.output_tokens, 0);
  return (input * inputPerMTok + output * outputPerMTok) / 1_000_000;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

// Shuffle so label A is not always the first model on the command line.
const labels = models
  .map((model) => ({ model, sort: Math.random() }))
  .sort((a, b) => a.sort - b.sort)
  .map(({ model }, index) => ({ model, label: String.fromCharCode(65 + index) }));
const labelOf = (model: string) => labels.find((entry) => entry.model === model)!.label;

const results: Record<string, Record<string, TurnResult[]>> = {};
for (const model of models) {
  results[model] = {};
  for (const scenario of scenarios) {
    process.stdout.write(`${model} · ${scenario.id}... `);
    results[model][scenario.id] = await runScenario(model, scenario);
    console.log("done");
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = new URL(`../../tests/model-eval/results/${stamp}/`, import.meta.url);
mkdirSync(outDir, { recursive: true });

const summary = models.map((model) => {
  const turns = Object.values(results[model]).flat();
  const ttfts = turns.flatMap((t) => (t.ttft_ms === null ? [] : [t.ttft_ms]));
  return {
    model,
    label: labelOf(model),
    turns: turns.length,
    ttft_median_ms: percentile(ttfts, 50),
    ttft_p90_ms: percentile(ttfts, 90),
    reply_median_ms: percentile(turns.map((t) => t.total_ms), 50),
    avg_words: Math.round(turns.reduce((sum, t) => sum + t.words, 0) / Math.max(turns.length, 1)),
    flagged_turns: turns.filter((t) => t.flags.length).length,
    cost_usd: Number(costUsd(model, turns).toFixed(4)),
  };
});

writeFileSync(
  new URL("results.json", outDir),
  JSON.stringify({ instructions_version: spec.instructionsVersion, models: MODEL_SETTINGS, labels, summary, results }, null, 2),
);

const transcriptLines: string[] = [];
const csvRows = [["scenario", "model_label", "tone_1to5", "followed_rules_yes_no", "notes"].join(",")];
for (const scenario of scenarios) {
  transcriptLines.push(`=== ${scenario.id}: ${scenario.title}`, `Good response: ${scenario.good_response}`, "");
  for (const { model, label } of labels) {
    transcriptLines.push(`--- Model ${label}`);
    for (const turn of results[model][scenario.id]) {
      transcriptLines.push(`Caller: ${turn.caller}`, `Neul:   ${turn.reply || `(no reply: ${turn.error ?? "empty"})`}`);
      if (turn.flags.length) transcriptLines.push(`        [auto flags: ${turn.flags.join(", ")}]`);
    }
    transcriptLines.push("");
    csvRows.push([scenario.id, label, "", "", ""].map(csvCell).join(","));
  }
}
writeFileSync(new URL("transcripts.txt", outDir), transcriptLines.join("\n"));
writeFileSync(new URL("tone-scores.csv", outDir), csvRows.join("\n") + "\n");

console.table(summary);
console.log(`\nSaved to ${outDir.pathname}`);
console.log("Score tone blind in tone-scores.csv using transcripts.txt, then check the label key in results.json.");
