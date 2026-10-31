import type { SupabaseClient } from '@supabase/supabase-js';
import type { LostSession } from '@/components/types';

// DEMO ONLY: one "latest location" row per family (see 202610300001_demo_location.sql).
// Parent Mode writes it from a signed-in browser; Caregiver Mode polls it.

const MAX_AGE_MS = 30 * 60 * 1000;

export type LocationPoint = { latitude: number; longitude: number; accuracy?: number };

export async function pushLocation(client: SupabaseClient, familyId: string, point: LocationPoint): Promise<string | null> {
  const { error } = await client.from('demo_locations').upsert({
    family_id: familyId,
    latitude: point.latitude,
    longitude: point.longitude,
    accuracy_m: Number.isFinite(point.accuracy) ? point.accuracy : null,
    recorded_at: new Date().toISOString(),
  }, { onConflict: 'family_id' });
  return error ? error.message : null;
}

export async function clearLocation(client: SupabaseClient, familyId: string): Promise<string | null> {
  const { error } = await client.from('demo_locations').delete().eq('family_id', familyId);
  return error ? error.message : null;
}

// Returns null data when there is no row or it is older than 30 minutes.
export async function fetchLocation(client: SupabaseClient, familyId: string): Promise<{ data: LostSession | null; error: string | null }> {
  const { data, error } = await client.from('demo_locations')
    .select('latitude,longitude,accuracy_m,recorded_at').eq('family_id', familyId).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  const updatedAt = Date.parse(data.recorded_at);
  if (!Number.isFinite(updatedAt) || Date.now() - updatedAt > MAX_AGE_MS) return { data: null, error: null };
  return {
    data: {
      status: 'located',
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy_m ?? undefined,
      updatedAt,
    },
    error: null,
  };
}

export type LostAlert = { alertId: string; reason: string; landmarks: string[] };

// The newest "lost" alert the AI created on a call, or null if there is none.
export async function fetchLatestLostAlert(client: SupabaseClient, familyId: string): Promise<{ data: LostAlert | null; error: string | null }> {
  const { data, error } = await client.from('alerts')
    .select('alert_id,reason,landmarks').eq('family_id', familyId).eq('type', 'lost')
    .order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error) return { data: null, error: error.message };
  if (!data) return { data: null, error: null };
  return { data: { alertId: data.alert_id, reason: data.reason, landmarks: data.landmarks ?? [] }, error: null };
}
