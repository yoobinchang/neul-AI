import { readFileSync } from "node:fs";
import type { CallContext, ParentProfile } from "../../supabase/functions/brain/call-context.ts";

// Local scripts (chat, model eval, print) use the fictional Alex/Sam family from
// docs/examples.json, shaped like the C01 context the live webhook receives.
const examplesUrl = new URL("../../docs/examples.json", import.meta.url);

export function loadDemoContext(): CallContext {
  const examples = JSON.parse(readFileSync(examplesUrl, "utf8"));
  return {
    call_id: "call_demo_001",
    family_id: "family_demo_001",
    context_status: "resolved",
    parent: examples.profile as ParentProfile,
    // Matches "Sam is the primary caregiver." in examples.json.
    primary_contact: { contact_id: "contact_demo_001", display_name: "Sam", phone_number: "+12025550102" },
  };
}
