import { buildInstructions, INSTRUCTIONS_VERSION, openingLine } from "./instructions.js";
import { loadDemoContext } from "./profile.js";

// One definition for both platforms, so the D04 comparison measures the
// platform rather than differences in prompt, timing, or limits.
export interface AgentSpec {
  name: string;
  instructionsVersion: string;
  firstMessage: string;
  instructions: string;
  maxCallSeconds: number;
  endCallAfterSilenceSeconds: number;
  language: string;
}

export function demoAgentSpec(): AgentSpec {
  const context = loadDemoContext();
  return {
    name: `neul-demo-${INSTRUCTIONS_VERSION}`,
    instructionsVersion: INSTRUCTIONS_VERSION,
    firstMessage: openingLine(context),
    instructions: buildInstructions(context),
    maxCallSeconds: 15 * 60,
    endCallAfterSilenceSeconds: 30,
    language: "en-US",
  };
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Add it to the repo-root .env (see .env.example).`);
    process.exit(1);
  }
  return value;
}
