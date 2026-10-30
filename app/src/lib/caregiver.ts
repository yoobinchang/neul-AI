import type { SupabaseClient } from '@supabase/supabase-js';

export type Family = { family_id: string; display_name: string };
export type Parent = {
  parent_id: string; family_id: string; name: string; preferred_name: string;
  routine: string; family_facts: string[]; calming_topics: string[]; topics_to_avoid: string[];
};
export type Contact = { contact_id: string; display_name: string; phone_number: string; priority: number };
export type CallDetail = {
  call_id: string; parent_id: string | null; started_at: string; duration_seconds: number;
  urgency: 'routine' | 'urgent' | 'lost'; summary_status: 'processing' | 'completed' | 'failed';
  summary: string | null; topic: string | null; mood: string | null;
};
export type CallRecord = {
  id: string; day: string; time: string; duration: string; title: string; summary: string;
  tag: 'Routine' | 'Urgent' | 'Lost'; summaryStatus: CallDetail['summary_status'];
};
export type AlertRecord = {
  id: string; label: string; when: string; details: string; callId: string; icon: 'location' | 'conversation';
};
export type Workspace = {
  family: Family; parents: Parent[]; contacts: Contact[]; calls: CallRecord[];
  alerts: AlertRecord[]; reviewedIds: string[]; callCount: number;
};
export const PAGE_SIZE = 20;
export const CALL_FIELDS = 'call_id,parent_id,started_at,duration_seconds,urgency,summary_status,summary,topic,mood';
export function toCall(row: CallDetail): CallRecord {
  const date = new Date(row.started_at);
  return {
    id: row.call_id,
    day: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    duration: `${Math.floor(row.duration_seconds / 60)}m ${row.duration_seconds % 60}s`,
    title: row.topic ?? (row.summary_status === 'processing' ? 'Summary processing' : row.summary_status === 'failed' ? 'Summary unavailable' : 'Conversation'),
    summary: row.summary_status === 'processing' ? 'This summary is still being prepared.'
      : row.summary_status === 'failed' ? 'The summary could not be generated.' : row.summary ?? 'No summary available.',
    tag: row.urgency === 'lost' ? 'Lost' : row.urgency === 'urgent' ? 'Urgent' : 'Routine',
    summaryStatus: row.summary_status,
  };
}

// The view enforces RLS; family_id is used only to scope the workspace.
// Reads use the C03 field list, never transcript/provider/billing columns.
export async function loadWorkspace(client: SupabaseClient, family: Family, page = 0): Promise<Workspace> {
  const parentsResult = await client.from('parents').select('*').eq('family_id', family.family_id).order('parent_id');
  if (parentsResult.error) throw parentsResult.error;
  const parents: Parent[] = parentsResult.data ?? [];
  // Select the agreed C03 fields; family_id is a filter-only view column.
  const results = await Promise.all([
    client.from('call_details').select(CALL_FIELDS, { count: 'exact' }).eq('family_id', family.family_id)
      .order('started_at', { ascending: false }).order('call_id', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1),
    client.from('contacts').select('contact_id,display_name,phone_number,priority').eq('family_id', family.family_id).order('priority'),
    client.from('alerts').select('alert_id,call_id,type,reason,created_at').eq('family_id', family.family_id).order('created_at', { ascending: false }),
    client.from('acknowledgments').select('alert_id').eq('family_id', family.family_id),
  ]);
  for (const result of results) if (result.error) throw result.error;
  const [calls, contacts, alerts, acknowledgments] = results;
  return {
    family, parents, contacts: contacts.data as Contact[], calls: (calls.data as unknown as CallDetail[]).map(toCall),
    callCount: calls.count ?? 0,
    alerts: (alerts.data as unknown as { alert_id: string; call_id: string; type: string; reason: string; created_at: string }[]).map(a => ({
      id: a.alert_id, callId: a.call_id, label: a.type === 'lost' ? 'Lost alert' : 'Urgent alert',
      details: a.reason, when: new Date(a.created_at).toLocaleString(), icon: a.type === 'lost' ? 'location' : 'conversation',
    })),
    reviewedIds: (acknowledgments.data as { alert_id: string }[]).map(a => a.alert_id),
  };
}
