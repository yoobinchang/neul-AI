// Task 4 test: summarize the 10 fictional calls in tests/fixtures/sample-calls.json
// and grade each summary against its answer key (`expected`).
//
//   npm run eval:summaries
//
// Grading is done by a second model call that checks each must_mention,
// must_not_claim and unclear-word item, because a good summary paraphrases.
// Spot-check the grades yourself in summaries.txt; the grader can be wrong too.
// Output: tests/summary-eval/results/<timestamp>/ (results.json, summaries.txt).
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { z } from "zod";
import {
  Anthropic,
  DEFAULT_SUMMARY_MODEL,
  SUMMARY_PROMPT_VERSION,
  summarizeCall,
  type CompletedCall,
  type SummaryResult,
} from "../../supabase/functions/brain/summarize.js";

let inputTokens = 0;
let outputTokens = 0;
const GRADER_MODEL = "claude-opus-5-5";
const PRICE_PER_MTOK = { input: 4, output: 20 }; // claude-opus-5-5
const NAMES = { parentName: "Alex", caregiverName: "Sam" };
// SUMMARY_MODEL=claude-sonnet-5-5 npm run eval:summaries  to compare another model.
const SUMMARY_MODEL = process.env.SUMMARY_MODEL ?? DEFAULT_SUMMARY_MODEL;
const countUsage = (usage: { input_tokens: number; output_tokens: number }) => {
  inputTokens += usage.input_tokens;
  outputTokens += usage.output_tokens;
};

interface Fixture {
  event: Omit<CompletedCall, "transcript"> & { transcript_lines: string[] };
  expected: {
    scenario: string;
    must_mention: string[];
    must_not_claim: string[];
    mood_any_of: string[];
    unclear_words: string[];
  };
}

const GradeSchema = z.object({
  checks: z.array(
    z.object({
      kind: z.enum(["must_mention", "must_not_claim", "unclear_word"]),
      item: z.string(),
      pass: z.boolean(),
      note: z.string().describe("One short sentence on why."),
    }),
  ),
  mood_ok: z.boolean().describe("The mood matches one of the acceptable moods or a close synonym."),
  unexpected_unclear_words: z
    .boolean()
    .describe("True if no unclear words were expected but the summary includes an unclear-words sentence."),
});
type Grade = z.infer<typeof GradeSchema>;

const fixturesUrl = new URL("../../tests/fixtures/sample-calls.json", import.meta.url);
const { calls } = JSON.parse(readFileSync(fixturesUrl, "utf8")) as { calls: Fixture[] };
const client = new Anthropic();

function toCompletedCall({ event }: Fixture): CompletedCall {
  return {
    call_id: event.call_id,
    started_at: event.started_at,
    duration_seconds: event.duration_seconds,
    urgency: event.urgency,
    transcript: event.transcript_lines.join("\n"),
  };
}

async function grade(fixture: Fixture, transcript: string, result: SummaryResult & { summary_status: "completed" }): Promise<Grade> {
  const { expected } = fixture;
  const response = await client.beta.messages.parse({
    model: GRADER_MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(GradeSchema) },
    system:
      "You grade AI-written call summaries against an answer key. Be fair but strict. A must_mention item passes if the summary conveys its substance (paraphrase is fine; a vague nod is not). A must_not_claim item passes only if the summary neither states nor implies it. An unclear_word item passes if the summary names that word or phrase. Return one check per answer-key item, in order.",
    messages: [
      {
        role: "user",
        content: `<transcript>\n${transcript}\n</transcript>\n\n<summary>\nsummary: ${result.summary}\ntopic: ${result.topic}\nmood: ${result.mood}\n</summary>\n\n<answer_key>\nmust_mention: ${JSON.stringify(expected.must_mention)}\nmust_not_claim: ${JSON.stringify(expected.must_not_claim)}\nunclear_word: ${JSON.stringify(expected.unclear_words)}\nacceptable moods: ${JSON.stringify(expected.mood_any_of)}\n</answer_key>`,
      },
    ],
  });
  countUsage(response.usage);
  if (!response.parsed_output) throw new Error(`Grader returned no result for ${fixture.event.call_id}`);
  return response.parsed_output;
}

// Free check first: an empty transcript must fail without calling the model.
const empty = await summarizeCall(client, { ...toCompletedCall(calls[0]), transcript: "  " }, NAMES);
console.log(`Empty transcript → ${empty.summary_status} (${empty.summary_status === "failed" ? empty.failure_reason : "UNEXPECTED"})\n`);

let caught: unknown;
const rows = await Promise.all(
  calls.map(async (fixture) => {
    const call = toCompletedCall(fixture);
    const started = performance.now();
    const result = await summarizeCall(client, call, { ...NAMES, model: SUMMARY_MODEL, onUsage: countUsage }).catch((error) => {
      caught ??= error;
      return null;
    });
    const seconds = (performance.now() - started) / 1000;
    if (!result || result.summary_status === "failed") return { fixture, result, seconds, grade: null };
    const graded = await grade(fixture, call.transcript, result).catch((error) => {
      caught ??= error;
      return null;
    });
    return { fixture, result, seconds, grade: graded };
  }),
);

if (caught instanceof Anthropic.AuthenticationError) {
  console.error("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.");
  process.exit(1);
}
if (caught) console.error("Some calls errored:", caught);

const table = rows.map(({ fixture, result, seconds, grade: g }) => {
  const checks = g?.checks ?? [];
  const passed = (kind: string) => checks.filter((c) => c.kind === kind && c.pass).length;
  const total = (kind: string) => checks.filter((c) => c.kind === kind).length;
  const allPass = !!g && checks.every((c) => c.pass) && g.mood_ok && !g.unexpected_unclear_words;
  return {
    call: fixture.event.call_id.replace("call_demo_", ""),
    scenario: fixture.expected.scenario,
    status: result?.summary_status ?? "error",
    mentions: g ? `${passed("must_mention")}/${total("must_mention")}` : "-",
    no_false_claims: g ? `${passed("must_not_claim")}/${total("must_not_claim")}` : "-",
    unclear_words: g ? (total("unclear_word") ? `${passed("unclear_word")}/${total("unclear_word")}` : g.unexpected_unclear_words ? "extra!" : "ok") : "-",
    mood: result?.summary_status === "completed" ? `${result.mood}${g?.mood_ok ? "" : " ✗"}` : "-",
    seconds: Number(seconds.toFixed(1)),
    pass: allPass ? "PASS" : "FAIL",
  };
});

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outDir = new URL(`../../tests/summary-eval/results/${stamp}/`, import.meta.url);
mkdirSync(outDir, { recursive: true });
const costUsd = (inputTokens * PRICE_PER_MTOK.input + outputTokens * PRICE_PER_MTOK.output) / 1_000_000;
writeFileSync(
  new URL("results.json", outDir),
  JSON.stringify(
    { prompt_version: SUMMARY_PROMPT_VERSION, model: SUMMARY_MODEL, grader: GRADER_MODEL, cost_usd: costUsd, rows },
    null,
    2,
  ),
);

const lines: string[] = [];
for (const { fixture, result, grade: g } of rows) {
  lines.push(`=== ${fixture.event.call_id}: ${fixture.expected.scenario} (${fixture.event.urgency})`);
  if (result?.summary_status === "completed") {
    lines.push(`Topic: ${result.topic}   Mood: ${result.mood}`, `Summary: ${result.summary}`);
  } else {
    lines.push(`(no summary: ${result?.summary_status === "failed" ? result.failure_reason : "error"})`);
  }
  for (const check of g?.checks ?? []) {
    lines.push(`  ${check.pass ? "✓" : "✗"} [${check.kind}] ${check.item}: ${check.note}`);
  }
  if (g && !g.mood_ok) lines.push(`  ✗ mood not in ${JSON.stringify(fixture.expected.mood_any_of)}`);
  if (g?.unexpected_unclear_words) lines.push("  ✗ added an unclear-words sentence that wasn't expected");
  lines.push("");
}
writeFileSync(new URL("summaries.txt", outDir), lines.join("\n"));

console.table(table);
console.log(`\n${table.filter((row) => row.pass === "PASS").length}/${table.length} passed · cost about $${costUsd.toFixed(2)} (summaries + grading)`);
console.log(`Saved to ${outDir.pathname}`);
