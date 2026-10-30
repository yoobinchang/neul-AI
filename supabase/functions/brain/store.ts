// The database reads and writes the brain function makes, behind one small
// interface so handlers.ts can be tested without a database. Tables are A's
// (supabase/migrations); this uses the service role and only the columns the
// contracts give B.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ParentProfile, PrimaryContact } from "./call-context.ts";
import type { SummaryResult } from "./summarize.ts";

export type Urgency = "routine" | "urgent" | "lost";

export interface CallRow {
  call_id: string;
  family_id: string;
  parent_id: string | null;
  status: "in_progress" | "ended";
  started_at: string;
  duration_seconds: number;
  transcript: string | null;
  urgency: Urgency;
  summary_status: "processing" | "completed" | "failed";
}

export interface AlertInput {
  event_id: string;
  family_id: string;
  call_id: string;
  type: "urgent" | "lost";
  reason: string;
  landmarks: string[];
}

export interface BrainStore {
  findFamilyIdByNumber(neulNumber: string): Promise<string | null>;
  /** The family's parent. phone_number is null until parents has that column. */
  getParent(familyId: string): Promise<(ParentProfile & { phone_number: string | null }) | null>;
  getPrimaryContact(familyId: string): Promise<PrimaryContact | null>;
  /** Creates the in-progress call row once per provider call; returns its call_id. */
  startCall(row: { family_id: string; parent_id: string | null; provider_call_id: string; started_at: string }): Promise<string>;
  findCallByProviderId(providerCallId: string): Promise<CallRow | null>;
  getCall(callId: string): Promise<CallRow | null>;
  getAlertByEventId(eventId: string): Promise<{ alert_id: string; landmarks: string[] } | null>;
  insertAlert(alert: AlertInput): Promise<void>;
  setAlertLandmarks(alertId: string, landmarks: string[]): Promise<void>;
  setUrgency(callId: string, urgency: Urgency): Promise<void>;
  /** Writes only while the row is still processing; false if it was already written. */
  writeSummary(result: SummaryResult): Promise<boolean>;
}

const CALL_COLUMNS =
  "call_id, family_id, parent_id, status, started_at, duration_seconds, transcript, urgency, summary_status";

function check<T>({ data, error }: { data: T; error: { message: string } | null }, what: string): T {
  if (error) throw new Error(`${what}: ${error.message}`);
  return data;
}

export function supabaseStore(db: SupabaseClient): BrainStore {
  return {
    async findFamilyIdByNumber(neulNumber) {
      const row = check(
        await db.from("families").select("family_id").eq("neul_number", neulNumber).maybeSingle(),
        "family lookup",
      );
      return row?.family_id ?? null;
    },

    async getParent(familyId) {
      // select("*") so a future parents.phone_number column is picked up without a code change.
      const rows = check(await db.from("parents").select("*").eq("family_id", familyId).limit(1), "parent lookup");
      const row = rows?.[0];
      if (!row) return null;
      return {
        parent_id: row.parent_id,
        preferred_name: row.preferred_name,
        routine: row.routine,
        family_facts: row.family_facts,
        calming_topics: row.calming_topics,
        topics_to_avoid: row.topics_to_avoid,
        phone_number: row.phone_number ?? null,
      };
    },

    async getPrimaryContact(familyId) {
      return check(
        await db
          .from("contacts")
          .select("contact_id, display_name, phone_number")
          .eq("family_id", familyId)
          .order("priority")
          .limit(1)
          .maybeSingle(),
        "contact lookup",
      );
    },

    async startCall(row) {
      check(
        await db.from("calls").upsert(
          { ...row, status: "in_progress", urgency: "routine", summary_status: "processing" },
          { onConflict: "provider_call_id", ignoreDuplicates: true },
        ),
        "call start",
      );
      const call = check(
        await db.from("calls").select("call_id").eq("provider_call_id", row.provider_call_id).single(),
        "call start",
      );
      if (!call) throw new Error("call start: row missing after upsert");
      return call.call_id;
    },

    async findCallByProviderId(providerCallId) {
      return check(
        await db.from("calls").select(CALL_COLUMNS).eq("provider_call_id", providerCallId).maybeSingle(),
        "call lookup",
      ) as CallRow | null;
    },

    async getCall(callId) {
      return check(
        await db.from("calls").select(CALL_COLUMNS).eq("call_id", callId).maybeSingle(),
        "call lookup",
      ) as CallRow | null;
    },

    async getAlertByEventId(eventId) {
      return check(
        await db.from("alerts").select("alert_id, landmarks").eq("event_id", eventId).maybeSingle(),
        "alert lookup",
      );
    },

    async insertAlert(alert) {
      // A retried tool call with the same event_id creates nothing new (C06).
      check(await db.from("alerts").upsert(alert, { onConflict: "event_id", ignoreDuplicates: true }), "alert insert");
    },

    async setAlertLandmarks(alertId, landmarks) {
      check(await db.from("alerts").update({ landmarks }).eq("alert_id", alertId), "alert update");
    },

    async setUrgency(callId, urgency) {
      check(await db.from("calls").update({ urgency }).eq("call_id", callId), "urgency update");
    },

    async writeSummary(result) {
      const { call_id, summary_status, summary, topic, mood } = result;
      const rows = check(
        await db
          .from("calls")
          .update({ summary_status, summary, topic, mood })
          .eq("call_id", call_id)
          .eq("summary_status", "processing")
          .select("call_id"),
        "summary write",
      );
      return (rows?.length ?? 0) > 0;
    },
  };
}
