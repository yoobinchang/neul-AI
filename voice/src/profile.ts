import { readFileSync } from "node:fs";

// Parent profile fields as they appear in docs/examples.json. The live version
// arrives through call context C01 (Week 2); until then every script uses this
// fictional profile so the voice agent and the model comparison stay in sync.
export interface ParentProfile {
  parent_id: string;
  preferred_name: string;
  routine: string;
  family_facts: string[];
  calming_topics: string[];
  topics_to_avoid: string[];
}

export interface CallContext {
  profile: ParentProfile;
  caregiver_name: string;
}

const examplesUrl = new URL("../../docs/examples.json", import.meta.url);

export function loadDemoContext(): CallContext {
  const examples = JSON.parse(readFileSync(examplesUrl, "utf8"));
  return {
    profile: examples.profile as ParentProfile,
    // Not a profile field yet; matches "Sam is the primary caregiver." in examples.json.
    caregiver_name: "Sam",
  };
}
