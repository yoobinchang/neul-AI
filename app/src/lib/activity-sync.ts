/**
 * Read-only caregiver activity snapshot.
 * Calls are fetched from the existing RLS-protected call_details VIEW.
 * Do not subscribe to the view with Postgres Changes; it is not a base table.
 * Never select raw calls/transcripts, provider info or billing columns.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { CALL_FIELDS, PAGE_SIZE, toCall, type CallDetail, type CallRecord, type AlertRecord } from './caregiver';

export type ActivitySnapshot = {
  calls: CallRecord[];
  callCount: number;
  alerts: AlertRecord[];
  reviewedIds: string[];
};

export async function loadActivitySnapshot(client: SupabaseClient, familyId: string, page: number): Promise<ActivitySnapshot> {
  const [calls, alerts, acknowledgments] = await Promise.all([
    client.from('call_details').select(CALL_FIELDS, { count: 'exact' })
      .eq('family_id', familyId)
      .order('started_at', { ascending: false }).order('call_id', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
    client.from('alerts').select('alert_id,call_id,type,reason,created_at')
      .eq('family_id', familyId).order('created_at', { ascending: false }),
    client.from('acknowledgments').select('alert_id').eq('family_id', familyId),
  ]);
  for (const result of [calls, alerts, acknowledgments]) {
    if (result.error) throw result.error;
  }
  const alertRows = (alerts.data ?? []) as {
    alert_id: string; call_id: string; type: string; reason: string; created_at: string;
  }[];
  return {
    calls: ((calls.data ?? []) as unknown as CallDetail[]).map(toCall),
    callCount: calls.count ?? 0,
    alerts: alertRows.map((row) => ({
      id: row.alert_id,
      callId: row.call_id,
      label: row.type === 'lost' ? 'Lost alert' : 'Urgent alert',
      details: row.reason,
      when: new Date(row.created_at).toLocaleString(),
      icon: row.type === 'lost' ? 'location' : 'conversation',
    })),
    reviewedIds: ((acknowledgments.data ?? []) as { alert_id: string }[]).map(row => row.alert_id),
  };
}
