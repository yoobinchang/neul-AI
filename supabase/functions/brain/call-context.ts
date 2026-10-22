// Call context (contract C01) → the values the voice agent needs at call start.
//
// The Retell agent's instructions are a template with {{preferred_name}},
// {{caregiver_name}}, {{known_facts}} and {{opening_line}}; the inbound-call
// webhook fills them from this module. Local scripts (chat, model eval) render
// the same text with real values, so every path uses one set of words.

export interface ParentProfile {
  parent_id: string;
  preferred_name: string;
  routine: string;
  family_facts: string[];
  calming_topics: string[];
  topics_to_avoid: string[];
}

export interface PrimaryContact {
  contact_id: string;
  display_name: string;
  phone_number: string;
}

// C01 "Context passed to B".
export interface CallContext {
  call_id: string;
  family_id: string;
  context_status: "resolved" | "unknown_caller";
  parent: ParentProfile | null;
  primary_contact: PrimaryContact | null;
}

export interface PromptInputs {
  preferred_name: string;
  caregiver_name: string;
  known_facts: string;
}

// Retell dynamic variables are strings only.
export interface AgentVariables extends PromptInputs {
  opening_line: string;
}

function bulletList(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- (none provided)";
}

export function knownFacts(parent: ParentProfile): string {
  return `Preferred name: ${parent.preferred_name}
Routine: ${parent.routine || "(none provided)"}
Family facts:
${bulletList(parent.family_facts)}
Topics that usually help them feel calm:
${bulletList(parent.calming_topics)}
Topics to avoid:
${bulletList(parent.topics_to_avoid)}`;
}

// Used when the caller isn't the family's parent (or the lookup failed): no
// names, no family facts, nothing that could reveal anything to a stranger.
export const UNKNOWN_CALLER_VARIABLES: AgentVariables = {
  preferred_name: "the caller",
  caregiver_name: "the person they called",
  known_facts:
    "No family profile is linked to this caller, so you don't know who they are. Don't guess who they are, don't use any names, and don't share anything about any family. Be kind, offer to take a short message, and then say a warm goodbye.",
  opening_line:
    "Hi, this is Neul, an AI assistant. The person you called couldn't pick up, so I answered. Can I take a short message?",
};

export function openingLine(preferredName: string, caregiverName: string): string {
  return (
    `Hi ${preferredName}, this is Neul, an AI assistant for your family. ` +
    `${caregiverName} couldn't pick up right now, so I answered. ` +
    `I'll share a short summary of our chat with ${caregiverName}. How are you doing?`
  );
}

export function agentVariables(context: CallContext): AgentVariables {
  const { parent } = context;
  if (context.context_status !== "resolved" || !parent) return UNKNOWN_CALLER_VARIABLES;
  // C01: a missing primary contact is allowed but must not look like a valid setup.
  const caregiverName = context.primary_contact?.display_name ?? "your family";
  return {
    preferred_name: parent.preferred_name,
    caregiver_name: caregiverName,
    known_facts: knownFacts(parent),
    opening_line: openingLine(parent.preferred_name, caregiverName),
  };
}
