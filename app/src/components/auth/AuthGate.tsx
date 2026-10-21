'use client';

import { useEffect, useState, type ReactNode } from 'react';
import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';
import NeulBrand from '@/components/NeulBrand';

export default function AuthGate({ children }: {
  children: (client: SupabaseClient, session: Session) => ReactNode;
}) {
  const [client] = useState(getSupabase);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!client) return;
    let active = true;
    let authEvent = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, next) => {
      authEvent = true;
      if (active) { setSession(next); setLoading(false); }
    });
    client.auth.getSession().then(({ data, error }) => {
      if (!active || authEvent) return;
      if (error) setError(error.message);
      setSession(data.session);
      setLoading(false);
    }).catch(() => {
      if (active) { setError('Unable to check your session. Please try again.'); setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, [client]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!client || busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const result = signup
        ? await client.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      setPassword('');
      if (signup && !result.data.session) setMessage('Check your email to confirm your account, then sign in.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Sign-in failed. Please try again.');
    } finally { setBusy(false); }
  }

  if (client && !loading && session) return children(client, session);
  return <main className="flex min-h-screen items-center justify-center bg-[#F6F8FC] p-6 text-[#1F3A5F]">
    <section className="w-full max-w-md rounded-3xl border border-[#E3EAF3] bg-white p-8 shadow-sm">
      <NeulBrand mode="caregiver" />
      {!client ? <><h1 className="mt-8 text-xl font-bold">Workspace setup needed</h1><p className="mt-3">The caregiver workspace is not connected yet. Please contact your project administrator.</p></>
      : loading ? <p role="status" className="mt-8">Checking your session…</p>
      : <form onSubmit={submit} className="mt-8 space-y-5">
        <h1 className="text-2xl font-bold">{signup ? 'Create your account' : 'Welcome back'}</h1>
        <label className="block">Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="neul-input mt-2" /></label>
        <label className="block">Password<input required type="password" minLength={signup ? 8 : 1} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} className="neul-input mt-2" /></label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="text-sm">{message}</p>}
        <button disabled={busy} className="w-full rounded-xl bg-[#1F3A5F] p-3 font-bold text-white disabled:opacity-50">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
        <button type="button" disabled={busy} onClick={() => { setSignup(!signup); setError(''); setMessage(''); }} className="text-sm underline">{signup ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
      </form>}
    </section>
  </main>;
}
