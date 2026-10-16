/** Prototype-only state shared by the caregiver and parent views in ONE browser tab.
 * Never persist device coordinates in localStorage or send them to an API here.
 */
export type LostSession = {
  status: "requesting" | "located" | "unavailable";
  updatedAt: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  clue?: string;
};
