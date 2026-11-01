import type { LostSession } from "@/components/types";

// English names use the first word (Grace Kim → Grace); Korean names stay intact.
export function shortName(name: string): string {
  const trimmed = name.trim() || "Parent";
  return /[가-힣]/.test(trimmed) ? trimmed : trimmed.split(/\s+/)[0];
}

export function possessive(name: string): string {
  return /[가-힣]/.test(name) ? name : `${name}'s`;
}

// Title and detail line for the red Lost Mode banner on the caregiver screens.
export function lostBannerText(name: string, session: LostSession) {
  const parts: string[] = [];
  if (session.source === "call") {
    parts.push("From the call");
    if (session.clue?.startsWith("From the call: ")) parts.push(`Saw: ${session.clue.slice("From the call: ".length)}`);
  } else {
    parts.push("Shared from Parent Mode");
  }
  parts.push(session.status === "located" ? "Live location on" : "Waiting for location");
  return { title: `${name} needs help finding the way`, detail: parts.join(" · ") };
}
