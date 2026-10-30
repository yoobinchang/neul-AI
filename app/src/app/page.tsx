"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Activity,
  Compass,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronRight,
  CircleCheck,
  Clock3,
  Heart,
  Info,
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
import CallDetailsModal from "@/components/CallDetailsModal";
import NeulIntro from "@/components/NeulIntro";
import FocusHome from "@/components/FocusHome";
import NeulBrand from "@/components/NeulBrand";
import LocationPanel from "@/components/LocationPanel";
import type { LostSession } from "@/components/types";

type Tab = "home" | "calls" | "alerts" | "location" | "profile";
type CallTag = "Routine" | "Follow-up" | "Flagged";

type TranscriptLine = { speaker: "Mom" | "Neul"; text: string };
type CallRecord = {
  id: string;
  day: string;
  time: string;
  duration: string;
  cost: string;
  title: string;
  summary: string;
  tag: CallTag;
  transcript: TranscriptLine[];
};
type AlertRecord = {
  id: string;
  label: string;
  when: string;
  details: string;
  callId: string;
  icon: "location" | "conversation";
};
type ParentProfile = {
  name: string;
  nickname: string;
  phone: string;
  conversationNotes: string;
  everydayRoutine: string;
};

const INITIAL_PROFILE: ParentProfile = {
  name: "Grace Kim",
  nickname: "Mom",
  phone: "+1 (555) 010-0184",
  conversationNotes:
    "Speak slowly and warmly. She loves gardening, her dog Coco, and hearing about family visits.",
  everydayRoutine:
    "Usually takes a morning walk and enjoys a check-in after lunch.",
};

// Mock records only. Replace this data source with the team's agreed Supabase contract later.
const CALLS: CallRecord[] = [
  {
    id: "call-01", day: "Today", time: "10:42 AM", duration: "3m 24s", cost: "$0.19",
    title: "A lovely morning check-in", tag: "Routine",
    summary: "Mom talked about watering her plants and asked when Alex is visiting. She sounded comfortable and cheerful.",
    transcript: [
      { speaker: "Neul", text: "Hi, I'm Neul, an AI companion. How are you feeling today?" },
      { speaker: "Mom", text: "Pretty good! I watered all the flowers this morning." },
      { speaker: "Neul", text: "That sounds lovely. Anything you would like Alex to know?" },
      { speaker: "Mom", text: "Just ask when they're coming to visit." },
    ],
  },
  {
    id: "call-02", day: "Today", time: "9:15 AM", duration: "2m 08s", cost: "$0.12",
    title: "Question about an appointment", tag: "Follow-up",
    summary: "Mom asked twice about an upcoming appointment. A quick family follow-up may help reassure her.",
    transcript: [
      { speaker: "Neul", text: "Hello, I'm Neul. What can I help you with?" },
      { speaker: "Mom", text: "Do I have an appointment tomorrow?" },
      { speaker: "Neul", text: "I don't have a confirmed schedule for that. Alex can check with you." },
      { speaker: "Mom", text: "Okay. Will you remind Alex to check?" },
    ],
  },
  {
    id: "call-03", day: "Yesterday", time: "6:28 PM", duration: "4m 31s", cost: "$0.25",
    title: "Looking for the way home", tag: "Flagged",
    summary: "During a scripted Lost Mode test, Mom said she was unsure where she was. This is demonstration data; no real alert was sent.",
    transcript: [
      { speaker: "Mom", text: "I'm not sure where I am right now." },
      { speaker: "Neul", text: "I'm here with you. Are you somewhere safe where you can stay for a moment?" },
      { speaker: "Mom", text: "I see a small park and a blue bench." },
      { speaker: "Neul", text: "Thank you. I'll note those details for your family." },
    ],
  },
  {
    id: "call-04", day: "Yesterday", time: "1:06 PM", duration: "2m 52s", cost: "$0.16",
    title: "Family lunch plans", tag: "Routine",
    summary: "Mom chatted about making soup and remembered that Alex likes homemade noodles.",
    transcript: [
      { speaker: "Neul", text: "It's nice to hear from you. What are you up to?" },
      { speaker: "Mom", text: "Making soup. Alex used to ask for noodles every time!" },
    ],
  },
  {
    id: "call-05", day: "Oct 14", time: "11:30 AM", duration: "1m 46s", cost: "$0.10",
    title: "A quick hello", tag: "Routine",
    summary: "Mom said hello and shared that she had enjoyed her morning walk.",
    transcript: [
      { speaker: "Neul", text: "Hi! I'm Neul. How is your day going?" },
      { speaker: "Mom", text: "Just got back from a nice walk!" },
    ],
  },
  {
    id: "call-06", day: "Oct 14", time: "8:20 AM", duration: "2m 18s", cost: "$0.13",
    title: "Checking the weather", tag: "Routine",
    summary: "Mom asked about the weather before heading outside. No follow-up was requested.",
    transcript: [
      { speaker: "Mom", text: "Does it look like rain today?" },
      { speaker: "Neul", text: "I can't verify live weather right now. Checking a forecast before leaving would be best." },
    ],
  },
  {
    id: "call-07", day: "Oct 13", time: "7:10 PM", duration: "3m 08s", cost: "$0.17",
    title: "Remembering a favorite song", tag: "Routine",
    summary: "Mom reminisced about a song she used to listen to with the family.",
    transcript: [
      { speaker: "Mom", text: "That old song reminds me of family road trips." },
      { speaker: "Neul", text: "What do you remember most about those trips?" },
    ],
  },
  {
    id: "call-08", day: "Oct 13", time: "2:42 PM", duration: "2m 55s", cost: "$0.16",
    title: "Where did I put my keys?", tag: "Follow-up",
    summary: "Mom asked where she might have left her keys. She planned to check the kitchen counter.",
    transcript: [
      { speaker: "Mom", text: "I can't find my keys anywhere." },
      { speaker: "Neul", text: "We can think through the last place you remember using them." },
    ],
  },
  {
    id: "call-09", day: "Oct 12", time: "4:12 PM", duration: "1m 33s", cost: "$0.09",
    title: "Checking on Coco", tag: "Routine",
    summary: "Mom mentioned that Coco had been sleeping in the sun all afternoon.",
    transcript: [
      { speaker: "Mom", text: "Coco's found the warmest spot in the house again." },
      { speaker: "Neul", text: "That sounds cozy!" },
    ],
  },
  {
    id: "call-10", day: "Oct 12", time: "9:50 AM", duration: "2m 11s", cost: "$0.12",
    title: "Weekend plans", tag: "Routine",
    summary: "Mom was looking forward to a weekend video call with the family.",
    transcript: [
      { speaker: "Mom", text: "Will we have our family video call this weekend?" },
      { speaker: "Neul", text: "Alex can confirm the plans with you." },
    ],
  },
];

const ALERTS: AlertRecord[] = [
  {
    id: "alert-01", label: "Lost Mode test", when: "Yesterday · 6:28 PM",
    details: "A scripted location-support scenario mentioned a park and a blue bench. Marked reviewed in this demo.",
    callId: "call-03", icon: "location",
  },
  {
    id: "alert-02", label: "Conversation follow-up", when: "Today · 9:15 AM",
    details: "Mom asked about an appointment more than once. Consider checking the date with her.",
    callId: "call-02", icon: "conversation",
  },
];

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
    : tag === "Follow-up"
      ? "bg-[#FFF2D7] text-[#8A5E15]"
      : "bg-[#ffebe6] text-[#b45f4f]";
  return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold ${classes}`}>{tag}</span>;
}

function DemoNotice() {
  return <div className="mb-5 text-[12px] text-[#7189A2]">Prototype preview · sample data only.</div>;
}

export default function Page() {
  const [tab, setTab] = useState<Tab>("home");
  const [mode, setMode] = useState<"caregiver" | "parent">("caregiver");
  const [lostSession, setLostSession] = useState<LostSession | null>(null);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"All" | "Flagged" | "Follow-up">("All");
  const [profile, setProfile] = useState<ParentProfile>(INITIAL_PROFILE);
  const [reviewedIds, setReviewedIds] = useState<string[]>(["alert-01"]);
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

  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem("neul-demo-profile-v1");
      if (savedProfile) setProfile({ ...INITIAL_PROFILE, ...JSON.parse(savedProfile) });
      const savedAlerts = localStorage.getItem("neul-demo-reviewed-v1");
      if (savedAlerts) setReviewedIds(JSON.parse(savedAlerts));
    } catch {
      // Demo still works when localStorage is unavailable.
    }
  }, []);

  useEffect(() => {
    if (!selectedCall) return;
    const onEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setSelectedCall(null); };
    document.addEventListener("keydown", onEscape);
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onEscape); document.body.style.overflow = oldOverflow; };
  }, [selectedCall]);

  const pendingAlerts = ALERTS.filter((a) => !reviewedIds.includes(a.id)).length;
  const filteredCalls = useMemo(() => CALLS.filter((call) => {
    const matchesFilter = filter === "All" || call.tag === filter;
    const matchesText = `${call.title} ${call.summary} ${call.day}`.toLowerCase().includes(query.toLowerCase().trim());
    return matchesFilter && matchesText;
  }), [filter, query]);

  function goTo(next: Tab) {
    setCategoriesOpen(false);
    setTab(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function markReviewed(id: string) {
    const next = Array.from(new Set([...reviewedIds, id]));
    setReviewedIds(next);
    try { localStorage.setItem("neul-demo-reviewed-v1", JSON.stringify(next)); } catch { /* ignore */ }
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

  function saveProfile() {
    try { localStorage.setItem("neul-demo-profile-v1", JSON.stringify(profile)); } catch { /* ignore */ }
    setProfileSaved(true);
  }

  const categoryGroups: { title: string; ids: Tab[] }[] = [
    { title: "Conversations", ids: ["calls"] },
    { title: "Safety & support", ids: ["alerts", "location"] },
    { title: "Your people", ids: ["profile"] },
  ];

  if (introPhase === "checking") return <div className="neul-intro-checking" aria-label="Opening Neul"><span>neul<span className="text-[#F5A623]">.</span></span></div>;
  if (introPhase === "show") return <NeulIntro onEnter={enterApp} />;

  if (mode === "parent") {
    return <ParentMode parentName={profile.name.split(" ")[0] || profile.nickname} lostSession={lostSession} onLostUpdate={setLostSession} onCaregiverMode={returnToCaregiver} />;
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
        <p className="mt-4 px-4 text-[11px] text-[#7189A2]">Neul · Preview</p>
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
              <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#F4E3C3] text-[12px] font-extrabold text-[#665235] sm:flex" aria-label="Demo caregiver Alex">AX</div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] px-5 pb-32 pt-7 sm:px-9 sm:pt-10 lg:px-12 lg:pb-16">
          {tab !== "home" && <DemoNotice />}

          {tab === "home" && (
            <FocusHome
              nickname={profile.nickname}
              parentName={profile.name}
              summary={CALLS[0].summary}
              title={CALLS[0].title}
              callTime={`${CALLS[0].day} · ${CALLS[0].time} · ${CALLS[0].duration}`}
              pendingAlerts={pendingAlerts}
              isLost={Boolean(lostSession)}
              onOpenCall={() => setSelectedCall(CALLS[0])}
              onCategories={() => setCategoriesOpen(true)}
              onLocation={() => goTo("location")}
              lostSession={lostSession}
              onParentMode={enterParentMode}
            />
          )}

          {tab === "calls" && (
            <div>
              <div className="mb-8"><p className="mb-3 text-[12px] font-medium text-[#7189A2]">Calls</p><h1 className="text-[36px] font-bold tracking-[-0.065em] text-[#1F3A5F] sm:text-[46px]">Call history</h1><p className="mt-3 text-[14px] leading-7 text-[#527391]">Browse ten sample call summaries and open a conversation to read the transcript, duration, and estimated cost.</p></div>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-h-[50px] max-w-[440px] flex-1 items-center gap-3 rounded-2xl border border-[#EFF4FA] bg-white px-4"><Search size={19} className="text-[#7189A2]"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="w-full border-0 bg-transparent py-3 text-[13px] text-[#294B73] outline-none placeholder:text-[#7189A2]" /></div>
                <div aria-label="Filter calls" className="flex flex-wrap gap-2">{(["All", "Follow-up", "Flagged"] as const).map((label) => <button type="button" key={label} onClick={() => setFilter(label)} className={`rounded-full px-4 py-2.5 text-[12px] font-bold transition ${filter === label ? "bg-[#1F3A5F] text-white" : "border border-[#EFF4FA] bg-white text-[#7189A2] hover:text-[#294B73]"}`}>{label}</button>)}</div>
              </div>
              <div className="overflow-hidden rounded-[26px] border border-[#E3EAF3] bg-white">
                {filteredCalls.length ? filteredCalls.map((call, index) => (
                  <button key={call.id} onClick={() => setSelectedCall(call)} className={`flex w-full items-start gap-3 p-5 text-left transition hover:bg-[#F7F9FC] sm:gap-5 sm:p-6 ${index !== 0 ? "border-t border-[#EFF4FA]" : ""}`}>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EFF4FA] text-[#527391]"><PhoneIncoming size={21}/></div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 sm:justify-between"><h3 className="text-[14px] font-bold leading-6 text-[#294B73] sm:text-[15px]">{call.title}</h3><StatusChip tag={call.tag}/></div><p className="mt-2 line-clamp-2 text-[12px] leading-6 text-[#7189A2]">{call.summary}</p><p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#7189A2]"><span>{call.day}, {call.time}</span><span>{call.duration}</span><span>{call.cost} est.</span></p></div>
                    <ChevronRight size={19} className="mt-2 shrink-0 text-[#A8BBD0]"/>
                  </button>
                )) : <div className="p-12 text-center text-[14px] text-[#7189A2]">No sample calls match your search.</div>}
              </div>
            </div>
          )}

          {tab === "alerts" && (
            <div>
              <div className="mb-8"><p className="mb-3 text-[12px] font-medium text-[#7189A2]">Notifications</p><h1 className="text-[36px] font-bold tracking-[-0.065em] text-[#1F3A5F] sm:text-[46px]">Alerts</h1><p className="mt-3 text-[14px] leading-7 text-[#527391]">An organized view of situations that may deserve a little extra attention.</p></div>
              <div className="mb-7 flex items-center gap-4 rounded-[26px] border border-[#EFF4FA] bg-white p-5 sm:p-7"><div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#EFF4FA] text-[#527391]"><ShieldCheck size={24}/></div><div><h2 className="text-[16px] font-bold text-[#294B73]">{lostSession ? "Lost Mode preview in this browser" : "No active emergencies in this demo"}</h2><p className="mt-1 text-[12px] leading-6 text-[#7189A2]">{lostSession ? "A Parent Mode demo was started on this device; no SMS, calls or push alerts were delivered." : `${pendingAlerts} sample ${pendingAlerts === 1 ? "item needs" : "items need"} review. Real SMS, calls and push delivery are not yet connected.`}</p></div></div>
              {lostSession && <div className="mb-7 flex flex-col gap-4 rounded-[24px] border border-[#f1d8c3] bg-[#fff8ed] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-start gap-3"><MapPin className="mt-1 shrink-0 text-[#b47752]" size={23}/><div><p className="text-[15px] font-bold text-[#865f43]">Parent selected “I'm lost”</p><p className="mt-1 text-[12px] leading-6 text-[#947965]">Demo event only · {lostSession.status === "located" ? "Device position available in this tab" : "Location unavailable or pending"} · not delivered</p></div></div><button type="button" onClick={() => goTo("location")} className="min-h-[46px] shrink-0 rounded-2xl bg-[#e8d1bd] px-5 text-[13px] font-bold text-[#77553e]">View location preview <ArrowRight className="ml-1 inline" size={16}/></button></div>}
              <SectionHeading title="Alert history" eyebrow="Sample events" />
              <div className="space-y-4">
                {ALERTS.map((alert) => {
                  const reviewed = reviewedIds.includes(alert.id);
                  const Icon = alert.icon === "location" ? MapPin : MessageCircle;
                  return <article key={alert.id} className="rounded-[26px] border border-[#E3EAF3] bg-white p-6 sm:p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${reviewed ? "bg-[#EFF4FA] text-[#527391]" : "bg-[#FFF1D7] text-[#c28c59]"}`}><Icon size={22}/></div>
                    <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[16px] font-bold text-[#294B73]">{alert.label}</h3><span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${reviewed ? "bg-[#EFF4FA] text-[#527391]" : "bg-[#FFF1D7] text-[#ac7b36]"}`}>{reviewed ? "Reviewed" : "Needs review"}</span></div><p className="mt-1 text-[12px] text-[#7189A2]">{alert.when}</p><p className="mt-4 text-[13px] leading-7 text-[#527391]">{alert.details}</p>
                    <div className="mt-5 flex flex-wrap gap-3"><button onClick={() => setSelectedCall(CALLS.find((call) => call.id === alert.callId) ?? null)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#EFF4FA] px-4 text-[12px] font-bold text-[#527391]">View related call <ArrowUpRight size={15}/></button>{!reviewed && <button onClick={() => markReviewed(alert.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#1F3A5F] px-4 text-[12px] font-bold text-white hover:bg-[#1C3454]"><CheckCheck size={15}/> Mark reviewed</button>}</div>
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
                <form onSubmit={(event) => { event.preventDefault(); saveProfile(); }} className="rounded-[28px] border border-[#E3EAF3] bg-white p-6 sm:p-8">
                  <div className="mb-7 flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#EFF4FA] text-[26px] font-bold text-[#527391]">GK</div><div><p className="text-[18px] font-bold tracking-[-0.04em] text-[#1C3454]">{profile.name || "Sample parent"}</p><p className="mt-1 text-[12px] text-[#7189A2]">Parent profile · Demo data</p></div></div>
                  <div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-[12px] font-bold text-[#294B73]">Full name</span><input value={profile.name} onChange={(event) => { setProfile({ ...profile, name: event.target.value }); setProfileSaved(false); }} className="neul-input" /></label><label className="block"><span className="mb-2 block text-[12px] font-bold text-[#294B73]">What you call them</span><input value={profile.nickname} onChange={(event) => { setProfile({ ...profile, nickname: event.target.value }); setProfileSaved(false); }} className="neul-input" /></label></div>
                  <label className="mt-5 block"><span className="mb-2 block text-[12px] font-bold text-[#294B73]">Phone number (display only)</span><input value={profile.phone} onChange={(event) => { setProfile({ ...profile, phone: event.target.value }); setProfileSaved(false); }} className="neul-input" /></label>
                  <label className="mt-5 block"><span className="mb-2 block text-[12px] font-bold text-[#294B73]">Conversation preferences</span><textarea rows={4} value={profile.conversationNotes} onChange={(event) => { setProfile({ ...profile, conversationNotes: event.target.value }); setProfileSaved(false); }} className="neul-input min-h-[115px] resize-y" /></label>
                  <label className="mt-5 block"><span className="mb-2 block text-[12px] font-bold text-[#294B73]">Everyday routine</span><textarea rows={3} value={profile.everydayRoutine} onChange={(event) => { setProfile({ ...profile, everydayRoutine: event.target.value }); setProfileSaved(false); }} className="neul-input min-h-[90px] resize-y" /></label>
                  <div className="mt-7 flex flex-wrap items-center gap-3"><button type="submit" className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#1F3A5F] px-6 text-[13px] font-bold text-white hover:bg-[#1C3454]"><Check size={17}/> Save sample profile</button>{profileSaved && <span role="status" className="text-[12px] font-semibold text-[#527391]">Saved on this browser</span>}</div>
                </form>
                <div className="space-y-5"><div className="rounded-[28px] border border-[#E3EAF3] bg-white p-6 sm:p-7"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EFF4FA] text-[#527391]"><Users size={21}/></div><h2 className="text-[19px] font-bold tracking-[-0.04em]">Care circle</h2><p className="mt-2 text-[12px] leading-6 text-[#7189A2]">The people you want close when a moment matters.</p><div className="mt-5 space-y-3"><div className="flex items-center gap-3 rounded-2xl bg-[#F7F9FC] p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF4FA] text-[12px] font-bold text-[#527391]">AX</div><div><p className="text-[13px] font-bold">Alex · Primary caregiver</p><p className="mt-1 text-[11px] text-[#7189A2]">Sample contact</p></div><CircleCheck size={17} className="ml-auto text-[#7189A2]"/></div><div className="flex items-center gap-3 rounded-2xl bg-[#F7F9FC] p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2e7dc] text-[12px] font-bold text-[#a38666]">JK</div><div><p className="text-[13px] font-bold">Jordan · Backup contact</p><p className="mt-1 text-[11px] text-[#7189A2]">Sample contact</p></div></div></div></div><div className="rounded-[28px] bg-[#EAF0F7] p-6 sm:p-7"><ShieldCheck size={24} className="text-[#527391]"/><h2 className="mt-4 text-[16px] font-bold text-[#294B73]">Made to be personal, and private.</h2><p className="mt-2 text-[12px] leading-6 text-[#527391]">For now, edits are saved only in this browser. Supabase login, family permissions, and syncing are future integration steps.</p></div></div>
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

      {selectedCall && <CallDetailsModal call={selectedCall} onClose={() => setSelectedCall(null)} />}
    </div>
  );
}
