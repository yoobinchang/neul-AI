/** Shared state for the Parent Mode / Caregiver Mode location demo.
 * DEMO ONLY: the latest point is also shared through the signed-in family's
 * `demo_locations` row (see lib/demoLocation.ts). Never persist coordinates in
 * localStorage, and replace this with the paired-device contract (C07) before any
 * real-user pilot.
 */
export type LostSession = {
  status: "requesting" | "located" | "unavailable";
  updatedAt: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  clue?: string;
  /** "call": the parent said they were lost on a Neul call (the AI created a lost alert). */
  source?: "call" | "tap";
};
