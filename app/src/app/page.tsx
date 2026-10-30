"use client";

import { useEffect, useCallback, useRef, useState, type ReactNode } from "react";
import {
  Compass,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  CheckCheck,
  ChevronRight,
  Clock3,
  Heart,
  LayoutDashboard,
  MapPin,
  MessageCircle,
  Phone,
  PhoneIncoming,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import ParentMode from "@/components/ParentMode";
import NeulIntro from "@/components/NeulIntro";
import FocusHome from "@/components/FocusHome";
import NeulBrand from "@/components/NeulBrand";
import LocationPanel from "@/components/LocationPanel";
import type { LostSession } from "@/components/types";

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import AuthGate from '@/components/auth/AuthGate';
import { CALL_FIELDS, PAGE_SIZE, loadWorkspace, toCall, type CallDetail, type CallRecord, type Family, type Parent, type Workspace } from '@/lib/caregiver';
import { clearLocation, fetchLocation, pushLocation, type LocationPoint } from '@/lib/demoLocation';

const LOCATION_POLL_MS = 4000;
const LOCATION_PUSH_MIN_MS = 3000;

type Tab = "home" | "calls" | "alerts" | "location" | "profile";
type CallTag = CallRecord["tag"];

const NAV: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "calls", label: "Calls", icon: PhoneIncoming },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "location", label: "Location", icon: Compass },
  { id: "profile", label: "Profile", icon: UserRound },
];

function Brand() {
  return <NeulBrand mode="caregiver" />;
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.17em] text-[#7189A2]">{eyebrow}</p>}
        <h2 className="text-[22px] font-bold tracking-[-0.055em] text-[#1C3454] sm:text-[25px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function StatusChip({ tag }: { tag: CallTag }) {
  const classes = tag === "Routine"
    ? "bg-[#EFF4FA] text-[#294B73]"
    : tag === "Urgent"
      ? "bg-[#FFF2D7] text-[#8A5E15]"
      : "bg-[#ffebe6] text-[#b45f4f]";
  return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold ${classes}`}>{tag}</span>;
}

function DemoNotice() {
  return (
    <p className="mb-5 text-[12px] leading-6 text-[#75869B]">
      Development preview · Calls and profiles come from the family workspace. Parent Mode location is shared with this family workspace (demo); no emergency messages are sent.
    </p>
  );
}

export default function Page() {
  return <AuthGate>{(client, session) => <Dashboard key={session.user.id} client={client} session={session} />}</AuthGate>;
}

function Dashboard({ client, session }: { client: SupabaseClient; session: Session }) {
  const [tab, setTab] = useState<Tab>("home");
  const [mode, setMode] = useState<"caregiver" | "parent">("caregiver");
  const [lostSession, setLostSession] = useState<LostSession | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Urgent" | "Lost">("All");
  const [families, setFamilies] = useState<Family[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [profile, setProfile] = useState<Parent | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [introPhase, setIntroPhase] = useState<"checking" | "show" | "done">("checking");

  const enterApp = useCallback(() => {
    try { sessionStorage.setItem("neul-intro-seen-v05", "yes"); } catch { /* storage optional */ }
    setIntroPhase("done");
  }, []);

  useEffect(() => {
    const isParent = new URLSearchParams(window.location.search).get("mode") === "parent";
    if (isParent) { setMode("parent"); setIntroPhase("done"); return; }
    try {
      setIntroPhase(sessionStorage.getItem("neul-intro-seen-v05") === "yes" ? "done" : "show");
    } catch { setIntroPhase("show"); }
  }, []);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const request = useRef(0);

  const refresh = useCallback(async (family: Family, nextPage = 0) => {
    const current = ++request.current;
    setLoading(true); setError(''); setSelectedCall(null); setProfileSaved(false);
    try {
      const data = await loadWorkspace(client, family, nextPage);
      if (current !== request.current) return;
      setWorkspace(data); setProfile(data.parents[0] ?? null); setPage(nextPage);
    } catch (cause) {
      if (current === request.current) { setWorkspace(null); setError(cause instanceof Error ? cause.message : 'Unable to load family data. Please try again.'); }
    } finally { if (current === request.current) setLoading(false); }
  }, [client]);

  useEffect(() => {
    let active = true;
    client.from('families').select('family_id,display_name').order('created_at').then(({ data, error }) => {
      if (!active) return;
      if (error) { setError(error.message); setLoading(false); return; }
      setFamilies(data ?? []);
      if (data?.[0]) void refresh(data[0]);
      else setLoading(false);
    });
    return () => { active = false; };
  }, [client, refresh]);

  // DEMO location sync: Parent Mode uploads each GPS fix; Caregiver Mode polls the latest one.
  const familyId = workspace?.family.family_id;
  const lastPush = useRef(0);
  const fromRemote = useRef(false);
  const [syncNote, setSyncNote] = useState("");

  const sharePosition = useCallback((point: LocationPoint) => {
    if (!familyId) return;
    const now = Date.now();
    if (now - lastPush.current < LOCATION_PUSH_MIN_MS) return;
    lastPush.current = now;
    void pushLocation(client, familyId, point).then((message) => {
      setSyncNote(message
        ? `Could not share location: ${message}`
        : `Shared with your family at ${new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}`);
    });
  }, [client, familyId]);

  const clearSharedPosition = useCallback(() => {
    lastPush.current = 0;
    setSyncNote("");
    if (familyId) void clearLocation(client, familyId);
  }, [client, familyId]);

  useEffect(() => {
    if (mode !== "caregiver" || !familyId) return;
    let active = true;
    const poll = async () => {
      const { data, error } = await fetchLocation(client, familyId);
      if (!active || error) return;
      if (data) {
        fromRemote.current = true;
        setLostSession((prev) => prev && prev.status === "located" && prev.updatedAt >= data.updatedAt ? prev : { ...data, clue: prev?.clue });
      } else if (fromRemote.current) {
        // The parent tapped "I'm safe now" (or the point expired).
        fromRemote.current = false;
        setLostSession(null);
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), LOCATION_POLL_MS);
    return () => { active = false; window.clearInterval(timer); };
  }, [client, familyId, mode]);

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) setError(error.message);
  }

  useEffect(() => {
    if (!selectedCall) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedCall(null); };
    document.addEventListener("keydown", onEscape);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onEscape); document.body.style.overflow = oldOverflow; };
  }, [selectedCall]);

  const CALLS = workspace?.calls ?? [];
  const ALERTS = workspace?.alerts ?? [];
  const reviewedIds = workspace?.reviewedIds ?? [];
  const pendingAlerts = ALERTS.filter(a => !reviewedIds.includes(a.id)).length;
  const filteredCalls = CALLS.filter(call => (filter === 'All' || call.tag === filter)
    && `${call.title} ${call.summary} ${call.day}`.toLowerCase().includes(query.toLowerCase().trim()));

  async function openCall(id: string) {
    setError('');
    const current = request.current;
    const { data, error } = await client.from('call_details').select(CALL_FIELDS).eq('call_id', id).maybeSingle();
    if (current !== request.current) return;
    if (error) setError(error.message);
    else if (!data) setError('Call not found.');
    else setSelectedCall(toCall(data as CallDetail));
  }

  function goTo(next: Tab) {
    setCategoriesOpen(false);
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function markReviewed(id: string) {
    if (!workspace || saving) return;
    setSaving(true); setError('');
    const { error } = await client.from('acknowledgments').insert({
      alert_id: id, family_id: workspace.family.family_id, caregiver_id: session.user.id,
    });
    // Another caregiver may already have acknowledged this alert.
    if (error && error.code !== '23505') setError(error.message);
    else setWorkspace(current => current ? { ...current, reviewedIds: [...current.reviewedIds, id] } : current);
    setSaving(false);
  }

  function enterParentMode() {
    setMode("parent");
    window.history.replaceState(null, "", `${window.location.pathname}?mode=parent`);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function returnToCaregiver() {
    setMode("caregiver");
    setTab("location");
    window.history.replaceState(null, "", window.location.pathname);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  async function saveProfile() {
    if (!profile || saving) return;
    setSaving(true); setError(''); setProfileSaved(false);
    const { preferred_name, routine, family_facts, calming_topics, topics_to_avoid } = profile;
    const { data, error } = await client.from('parents')
      .update({ preferred_name, routine, family_facts, calming_topics, topics_to_avoid })
      .eq('parent_id', profile.parent_id).select().single();
    if (error) setError(error.message);
    else { setProfile(data as Parent); setWorkspace(current => current ? { ...current, parents: current.parents.map(p => p.parent_id === data.parent_id ? data as Parent : p) } : current); setProfileSaved(true); }
    setSaving(false);
  }

  const categoryGroups: { title: string; ids: Tab[] }[] = [
    { title: "Conversations", ids: ["calls"] },
    { title: "Safety & support", ids: ["alerts", "location"] },
    { title: "Your people", ids: ["profile"] },
  ];

  if (introPhase === "checking") return <div className="neul-intro-checking" aria-label="Opening Neul"><span>neul<span className="text-[#F5A623]">.</span></span></div>;
  if (introPhase === "show") return <NeulIntro onEnter={enterApp} />;

  if (loading || !workspace) return <main className="min-h-screen bg-[#F6F8FC] p-8 text-[#1F3A5F]">
    <Brand /><h1 className="mt-8 text-2xl font-bold">Caregiver workspace</h1>
    {loading ? <p role="status" className="mt-4">Loading your family…</p> : <>
      {error ? <p role="alert" className="mt-4">{error}</p> : <p className="mt-4">Your account is ready. Ask your project administrator to connect it to your family.</p>}
      <p className="mt-2">{session.user.email}</p>
      <button className="mt-5 mr-5 underline" onClick={() => window.location.reload()}>Try again</button>
      <button className="mt-5 underline" onClick={signOut}>Sign out</button>
    </>}
  </main>;

  if (mode === "parent") {
    return <ParentMode parentName={profile?.preferred_name ?? "Parent"} lostSession={lostSession} onLostUpdate={setLostSession} onCaregiverMode={returnToCaregiver} onPosition={sharePosition} onSafe={clearSharedPosition} syncNote={syncNote} />;
  }

  return (
    <div className="min-h-screen bg-[#F6F8FC] text-[#1F3A5F]">
      <aside className="neul-sidebar fixed inset-y-0 left-0 z-20 hidden w-[256px] flex-col border-r border-[#E4EAF2] bg-[#FFFFFF] px-5 py-8 lg:flex">
        <div className="px-3"><Brand /></div>
        <div className="mt-14 mb-3 px-4 text-[12px] font-medium text-[#708299]">Menu</div>
        <nav aria-label="Desktop navigation" className="space-y-2">
          <button onClick={() => goTo("home")} className={`neul-nav-pill ${tab === "home" ? "neul-nav-pill-active" : ""}`} type="button"><LayoutDashboard size={19}/><span>Home</span>{tab === "home" && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#F5A623]"/>}</button>
          <button onClick={() => setCategoriesOpen(true)} className={`neul-nav-pill ${tab !== "home" ? "neul-nav-pill-active" : ""}`} type="button"><Compass size={19}/><span>Categories</span><ChevronRight size={17} className="ml-auto"/></button>
        </nav>
        {tab !== "home" && <div className="mt-4 rounded-2xl border border-[#E3EAF3] bg-[#F6F8FC] px-4 py-3 text-[12px] font-semibold text-[#527391]">Viewing: <span className="text-[#1F3A5F]">{NAV.find((item) => item.id === tab)?.label}</span></div>}
        <div className="neul-side-quote mt-auto rounded-[24px] bg-[#EAF0F7] px-5 py-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-[#527391]"><Heart size={20} /></div>
          <p className="text-[14px] font-semibold leading-6 tracking-[-0.02em] text-[#294B73]">Start here.</p>
          <p className="mt-2 text-[12px] leading-5 text-[#527391]">Home shows the latest summary first.</p>
        </div>
        <button type="button" onClick={enterParentMode} className="mt-5 flex min-h-[49px] w-full items-center justify-between rounded-2xl border border-[#EFF4FA] bg-white px-4 text-[13px] font-bold text-[#294B73] hover:bg-[#EFF4FA]"><span className="inline-flex items-center gap-2"><ArrowLeftRight size={17}/> Parent Mode</span><ChevronRight size={17}/></button>
        <p className="mt-4 px-4 text-[11px] text-[#7189A2]">Neul · Caregiver workspace</p>
      </aside>

      <div className="lg:ml-[256px]">
        <header className="sticky top-0 z-10 border-b border-[#EFF4FA] bg-[#F6F8FC]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 sm:px-9 lg:px-12 lg:py-5">
            <div className="lg:hidden"><Brand /></div>
            <div className="hidden items-center gap-2 text-[13px] font-semibold text-[#7189A2] lg:flex"><span>Caregiver</span><ChevronRight size={14} /><span className="text-[#294B73]">{NAV.find((n) => n.id === tab)?.label}</span></div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIntroPhase("show")} type="button" className="hidden items-center gap-2 rounded-full border border-[#EFF4FA] bg-white px-3 py-2 text-[11px] font-semibold text-[#527391] transition hover:bg-[#EEF3F9] sm:inline-flex"><Sparkles size={13} className="text-[#D69B40]" /> Replay intro</button>
              <button onClick={() => setCategoriesOpen(true)} type="button" className="inline-flex items-center gap-1.5 rounded-full border border-[#E5EBF3] bg-white px-3 py-2 text-[11px] font-semibold text-[#294B73] transition hover:bg-[#EEF3F9] lg:hidden"><Compass size={15}/> Categories</button>
              <button type="button" onClick={enterParentMode} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#E8EFF8] px-3 text-[11px] font-bold text-[#1F3A5F] transition hover:bg-[#DFE9F5] sm:px-4 sm:text-[12px]"><ArrowLeftRight size={15}/><span className="hidden min-[360px]:inline">Parent Mode</span><span className="min-[360px]:hidden">Parent</span></button>
              <button onClick={signOut} className="text-xs underline">Sign out</button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] px-5 pb-32 pt-7 sm:px-9 sm:pt-10 lg:px-12 lg:pb-16">
          <DemoNotice />
          <div className="mb-5 flex flex-wrap items-center gap-4">
            <label className="text-sm">Family <select aria-label="Family" className="rounded-lg border bg-white p-2" value={workspace.family.family_id} disabled={saving} onChange={e => { const family = families.find(f => f.family_id === e.target.value); if (family) { setLostSession(null); void refresh(family); } }}>{families.map(f => <option key={f.family_id} value={f.family_id}>{f.display_name}</option>)}</select></label>
            <button disabled={saving} className="text-sm underline" onClick={() => refresh(workspace.family, page)}>Refresh data</button>
          </div>
          {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}

          {tab === "home" && (
            <FocusHome
              nickname={profile?.preferred_name?.trim() || profile?.name || "Parent"}
              parentName={profile?.preferred_name?.trim() || profile?.name || "Parent"}
              summary={CALLS[0]?.summary || "No calls have been saved yet."}
              title={CALLS[0]?.title || "No recent calls"}
              callTime={CALLS[0] ? `${CALLS[0].day} · ${CALLS[0].time} · ${CALLS[0].duration}` : "No calls yet"}
              pendingAlerts={pendingAlerts}
              isLost={Boolean(lostSession)}
              onOpenCall={() => { if (CALLS[0]) void openCall(CALLS[0].id); }}
              onCategories={() => setCategoriesOpen(true)}
              onLocation={() => goTo("location")}
              lostSession={lostSession}
              onParentMode={enterParentMode}
            />
          )}

          {tab === "calls" && (
            <div>
              <div className="mb-8"><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#527391]">Conversations</p><h1 className="text-[36px] font-bold tracking-[-0.065em] text-[#1F3A5F] sm:text-[46px]">Every little moment.</h1><p className="mt-3 text-[14px] leading-7 text-[#527391]">Browse saved call summaries and durations. Search and filters apply to the current page.</p></div>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-h-[50px] max-w-[440px] flex-1 items-center gap-3 rounded-2xl border border-[#EFF4FA] bg-white px-4"><Search size={19} className="text-[#7189A2]"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="w-full border-0 bg-transparent py-3 text-[13px] text-[#294B73] outline-none placeholder:text-[#7189A2]" /></div>
                <div aria-label="Filter calls" className="flex flex-wrap gap-2">{(["All", "Urgent", "Lost"] as const).map((label) => <button type="button" key={label} onClick={() => setFilter(label)} className={`rounded-full px-4 py-2.5 text-[12px] font-bold transition ${filter === label ? "bg-[#1F3A5F] text-white" : "border border-[#EFF4FA] bg-white text-[#7189A2] hover:text-[#294B73]"}`}>{label}</button>)}</div>
              </div>
              <div className="overflow-hidden rounded-[26px] border border-[#E3EAF3] bg-white">
                {filteredCalls.length ? filteredCalls.map((call, index) => (
                  <button key={call.id} onClick={() => openCall(call.id)} className={`flex w-full items-start gap-3 p-5 text-left transition hover:bg-[#F7F9FC] sm:gap-5 sm:p-6 ${index !== 0 ? "border-t border-[#EFF4FA]" : ""}`}>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF4FA] text-[#527391]"><PhoneIncoming size={21}/></div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 sm:justify-between"><h3 className="text-[14px] font-bold leading-6 text-[#294B73] sm:text-[15px]">{call.title}</h3><StatusChip tag={call.tag}/></div><p className="mt-2 line-clamp-2 text-[12px] leading-6 text-[#7189A2]">{call.summary}</p><p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#7189A2]"><span>{call.day}, {call.time}</span><span>{call.duration}</span><span>{call.summaryStatus}</span></p></div>
                    <ChevronRight size={19} className="mt-2 shrink-0 text-[#A8BBD0]"/>
                  </button>
                )) : <div className="p-12 text-center text-[14px] text-[#7189A2]">{workspace.callCount ? "No calls match on this page." : "No calls yet."}</div>}
              </div>
            </div>
          )}

          {tab === "calls" && <div className="mt-5 flex items-center gap-4 text-sm">
            <button disabled={page === 0} onClick={() => refresh(workspace.family, page - 1)} className="underline disabled:opacity-40">Previous</button>
            <span>Page {page + 1} of {Math.max(1, Math.ceil(workspace.callCount / PAGE_SIZE))}</span>
            <button disabled={(page + 1) * PAGE_SIZE >= workspace.callCount} onClick={() => refresh(workspace.family, page + 1)} className="underline disabled:opacity-40">Next</button>
          </div>}

          {tab === "alerts" && (
            <div>
              <div className="mb-8"><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#527391]">Your notifications</p><h1 className="text-[36px] font-bold tracking-[-0.065em] text-[#1F3A5F] sm:text-[46px]">Here when it matters.</h1><p className="mt-3 text-[14px] leading-7 text-[#527391]">An organized view of situations that may deserve a little extra attention.</p></div>
              <div className="mb-7 flex items-center gap-4 rounded-[26px] border border-[#EFF4FA] bg-white p-5 sm:p-7"><div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#EFF4FA] text-[#527391]"><ShieldCheck size={24}/></div><div><h2 className="text-[16px] font-bold text-[#294B73]">{lostSession ? "Lost Mode demo" : "Family alerts"}</h2><p className="mt-1 text-[12px] leading-6 text-[#7189A2]">{lostSession ? "A Parent Mode demo location was received; no SMS, calls or push alerts were delivered." : `${pendingAlerts} ${pendingAlerts === 1 ? "item needs" : "items need"} review. Real SMS, calls and push delivery are not yet connected.`}</p></div></div>
              {lostSession && <div className="mb-7 flex flex-col gap-4 rounded-[24px] border border-[#f1d8c3] bg-[#fff8ed] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-start gap-3"><MapPin className="mt-1 shrink-0 text-[#b47752]" size={23}/><div><p className="text-[15px] font-bold text-[#865f43]">Parent selected “I&apos;m lost”</p><p className="mt-1 text-[12px] leading-6 text-[#947965]">Demo event only · {lostSession.status === "located" ? "Device position available" : "Location unavailable or pending"} · not delivered</p></div></div><button type="button" onClick={() => goTo("location")} className="min-h-[46px] shrink-0 rounded-2xl bg-[#e8d1bd] px-5 text-[13px] font-bold text-[#77553e]">View location preview <ArrowRight className="ml-1 inline" size={16}/></button></div>}
              <SectionHeading title="Alert history" eyebrow="Stored events" />
              <div className="space-y-4">
                {!ALERTS.length && <p className="p-6 text-sm">No alerts yet.</p>}
                {ALERTS.map((alert) => {
                  const reviewed = reviewedIds.includes(alert.id);
                  const Icon = alert.icon === "location" ? MapPin : MessageCircle;
                  return <article key={alert.id} className="rounded-[26px] border border-[#E3EAF3] bg-white p-6 sm:p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${reviewed ? "bg-[#EFF4FA] text-[#527391]" : "bg-[#FFF1D7] text-[#c28c59]"}`}><Icon size={22}/></div>
                    <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[16px] font-bold text-[#294B73]">{alert.label}</h3><span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${reviewed ? "bg-[#EFF4FA] text-[#527391]" : "bg-[#FFF1D7] text-[#ac7b36]"}`}>{reviewed ? "Reviewed" : "Needs review"}</span></div><p className="mt-1 text-[12px] text-[#7189A2]">{alert.when}</p><p className="mt-4 text-[13px] leading-7 text-[#527391]">{alert.details}</p>
                    <div className="mt-5 flex flex-wrap gap-3"><button onClick={() => openCall(alert.callId)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#EFF4FA] px-4 text-[12px] font-bold text-[#527391]">View related call <ArrowUpRight size={15}/></button>{!reviewed && <button disabled={saving} onClick={() => markReviewed(alert.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1F3A5F] px-4 text-[12px] font-bold text-white hover:bg-[#1C3454]"><CheckCheck size={15}/> Mark reviewed</button>}</div>
                    </div></div>
                  </article>;
                })}
              </div>
            </div>
          )}

          {tab === "location" && <LocationPanel lostSession={lostSession} onParentMode={enterParentMode} />}

          {tab === "profile" && (
            <div>
              <div className="mb-8"><p className="mb-3 text-[12px] font-medium text-[#7189A2]">Family</p><h1 className="text-[36px] font-bold tracking-[-0.065em] text-[#1F3A5F] sm:text-[46px]">Mom&apos;s profile</h1><p className="mt-3 text-[14px] leading-7 text-[#527391]">Help Neul feel familiar by keeping a few personal details close at hand.</p></div>
              <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                {profile ? <form onSubmit={event => { event.preventDefault(); void saveProfile(); }} className="rounded-[28px] border border-[#E3EAF3] bg-white p-6 sm:p-8">
                  {workspace.parents.length > 1 && <label className="block mb-5">Parent<select className="neul-input" value={profile.parent_id} onChange={e => { setProfile(workspace.parents.find(p => p.parent_id === e.target.value) ?? null); setProfileSaved(false); }}>{workspace.parents.map(p => <option key={p.parent_id} value={p.parent_id}>{p.name}</option>)}</select></label>}
                  <h2 className="mb-6 text-xl font-bold">{profile.name}</h2>
                  <label className="block">Preferred name<input required maxLength={100} value={profile.preferred_name} onChange={e => { setProfile({ ...profile, preferred_name: e.target.value }); setProfileSaved(false); }} className="neul-input mt-2" /></label>
                  <label className="mt-5 block">Everyday routine<textarea maxLength={2000} rows={4} value={profile.routine} onChange={e => { setProfile({ ...profile, routine: e.target.value }); setProfileSaved(false); }} className="neul-input mt-2" /></label>
                  {(['family_facts', 'calming_topics', 'topics_to_avoid'] as const).map(field => <label key={field} className="mt-5 block">
                    {{ family_facts: 'Family facts', calming_topics: 'Calming topics', topics_to_avoid: 'Topics to avoid' }[field]}
                    <span className="block text-xs text-[#7189A2]">One per line, up to 20 items of 300 characters each.</span>
                    <textarea rows={3} value={profile[field].join('\n')} onChange={e => { setProfile({ ...profile, [field]: e.target.value === '' ? [] : e.target.value.split('\n') }); setProfileSaved(false); }} className="neul-input mt-2" />
                  </label>)}
                  <div className="mt-7 flex items-center gap-3"><button disabled={saving} className="rounded-2xl bg-[#1F3A5F] px-6 py-3 font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save profile'}</button>{profileSaved && <span role="status" className="text-sm">Saved to your family</span>}</div>
                </form> : <p className="rounded-3xl bg-white p-8">No parent profile has been set up. Ask your project administrator to add one.</p>}
                <section className="rounded-[28px] border border-[#E3EAF3] bg-white p-6 sm:p-7">
                  <Users size={24} /><h2 className="mt-4 text-xl font-bold">Care circle</h2>
                  {!workspace.contacts.length && <p className="mt-4">No contacts configured.</p>}
                  {workspace.contacts.map(contact => <div key={contact.contact_id} className="mt-4 rounded-2xl bg-[#F7F9FC] p-4"><p className="font-bold">{contact.display_name}</p><p className="mt-1 text-sm">{contact.priority === 1 ? 'Primary contact' : `Backup priority ${contact.priority}`} · {contact.phone_number}</p></div>)}
                  <p className="mt-6 text-sm text-[#527391]">Only members of your family can read this workspace and edit its parent profiles.</p>
                </section>
              </div>
            </div>
          )}
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="neul-mobile-nav lg:hidden">
        <button type="button" aria-current={tab === "home" ? "page" : undefined} className={tab === "home" ? "neul-mobile-active" : ""} onClick={() => goTo("home")}><LayoutDashboard size={21}/><span>Home</span></button>
        <button type="button" className={tab !== "home" ? "neul-mobile-active" : ""} onClick={() => setCategoriesOpen(true)}><Compass size={21}/><span>Categories</span></button>
        <button type="button" onClick={enterParentMode}><Heart size={21}/><span>Parent Mode</span></button>
      </nav>

      {categoriesOpen && (
        <div className="neul-categories-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCategoriesOpen(false); }}>
          <section className="neul-categories-sheet" role="dialog" aria-modal="true" aria-labelledby="neul-categories-title">
            <div className="neul-categories-head"><div><span className="neul-drawer-kicker">Neul</span><h2 id="neul-categories-title">Explore categories</h2></div><button type="button" onClick={() => setCategoriesOpen(false)} aria-label="Close categories"><X size={22}/></button></div>
            <div className="neul-categories-groups">
              {categoryGroups.map((group) => <div key={group.title}><p className="neul-categories-group-title">{group.title}</p><div className="neul-categories-group-items">{group.ids.map((id) => { const item = NAV.find((nav) => nav.id === id)!; const Icon = item.icon; const detail: Record<string, string> = { calls: "Past calls & AI summaries", alerts: "Updates worth reviewing", location: "Lost Mode & location preview", profile: "Mom's details & preferences" }; return <button key={id} type="button" onClick={() => goTo(id)} className="neul-category-item"><span className="neul-category-icon"><Icon size={22}/></span><span className="neul-category-text"><strong>{item.label}</strong><small>{detail[id]}</small></span>{id === "alerts" && pendingAlerts > 0 && <span className="neul-category-count">{pendingAlerts}</span>}<ArrowRight size={19} className="neul-category-chevron"/></button>; })}</div></div>)}
            </div>
            <button type="button" className="neul-drawer-parent" onClick={() => { setCategoriesOpen(false); enterParentMode(); }}><ArrowLeftRight size={18}/> Switch to Parent Mode <ArrowRight size={17}/></button>
            <p className="neul-drawer-foot">Neul UI demonstration · Not a live care monitoring service.</p>
          </section>
        </div>
      )}

      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1C3454]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCall(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="call-dialog-title" className="max-h-[92dvh] w-full max-w-[660px] overflow-y-auto rounded-t-[30px] bg-[#F7F9FC] p-6 shadow-2xl sm:rounded-[30px] sm:p-9">
            <div className="mb-6 flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#527391]"><Phone size={16}/> Call details</span><button autoFocus aria-label="Close call details" onClick={() => setSelectedCall(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF4FA] text-[#294B73] hover:bg-[#DFE9F5]"><X size={19}/></button></div>
            <div className="flex flex-wrap items-start justify-between gap-3"><h2 id="call-dialog-title" className="max-w-[450px] text-[27px] font-bold leading-tight tracking-[-0.06em] text-[#1C3454]">{selectedCall.title}</h2><StatusChip tag={selectedCall.tag}/></div>
            <div className="mt-5 flex flex-wrap gap-3 text-[11px] font-semibold text-[#7189A2]"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14}/>{selectedCall.day}, {selectedCall.time}</span><span className="inline-flex items-center gap-1.5"><Clock3 size={14}/>{selectedCall.duration}</span><span>{selectedCall.summaryStatus}</span></div>
            <div className="mt-7 rounded-[22px] bg-[#EFF4FA] p-5"><div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#527391]"><Sparkles size={16}/> Call summary</div><p className="text-[13px] leading-7 text-[#294B73]">{selectedCall.summary}</p></div>
            <p className="mt-8 border-t border-[#EFF4FA] pt-4 text-[11px] leading-5 text-[#7189A2]">Transcripts and billing data are not included in the caregiver call-detail contract.</p>
          </section>
        </div>
      )}

    </div>
  );
}
