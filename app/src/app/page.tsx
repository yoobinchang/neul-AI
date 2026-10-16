"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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
  Leaf,
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

function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${light ? "bg-white/15" : "bg-[#dfece2]"}`}>
        <Leaf size={23} strokeWidth={2.5} className={light ? "text-white" : "text-[#326f50]"} />
      </div>
      <div>
        <div className={`text-[24px] font-extrabold tracking-[-0.075em] leading-[1.0] ${light ? "text-white" : "text-[#274936]"}`}>neul<span className="text-[#84ae82]">.</span></div>
        <div className={`mt-1 text-[10px] font-medium tracking-[0.11em] uppercase ${light ? "text-white/60" : "text-[#8c9b8e]"}`}>Caregiver space</div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.17em] text-[#84968b]">{eyebrow}</p>}
        <h2 className="text-[22px] font-bold tracking-[-0.055em] text-[#233b30] sm:text-[25px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

function StatusChip({ tag }: { tag: CallTag }) {
  const classes = tag === "Routine"
    ? "bg-[#eff6f0] text-[#44815f]"
    : tag === "Follow-up"
      ? "bg-[#fff2dc] text-[#a16e21]"
      : "bg-[#ffebe6] text-[#b45f4f]";
  return <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-bold ${classes}`}>{tag}</span>;
}

function DemoNotice() {
  return (
    <div className="mb-7 flex items-start gap-3 rounded-2xl border border-[#e9e5d7] bg-[#f9f6ed] px-4 py-3 text-[12px] leading-[1.65] text-[#807a65] sm:items-center">
      <Info size={16} className="mt-0.5 shrink-0 text-[#a89363] sm:mt-0" />
      <span><strong className="text-[#786d51]">Demo preview.</strong> Calls and alerts use sample data. Location permission, if granted in Parent Mode, stays in this browser tab. No remote monitoring or emergency notifications are active.</span>
    </div>
  );
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

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "parent") setMode("parent");
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

  const NavItem = ({ id, label, icon: Icon, mobile = false }: { id: Tab; label: string; icon: LucideIcon; mobile?: boolean }) => (
    <button
      type="button"
      aria-current={tab === id ? "page" : undefined}
      onClick={() => goTo(id)}
      className={mobile
        ? `relative flex min-h-[62px] flex-1 flex-col items-center justify-center gap-1 rounded-2xl text-[10px] font-semibold transition ${tab === id ? "text-[#377253]" : "text-[#8a998e]"}`
        : `flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left text-[14px] font-semibold transition ${tab === id ? "bg-[#e6f0e6] text-[#30684b]" : "text-[#83928a] hover:bg-[#f2f6f0] hover:text-[#365c48]"}`}
    >
      <Icon size={mobile ? 21 : 20} strokeWidth={tab === id ? 2.4 : 1.9} />
      <span>{label}</span>
      {id === "alerts" && pendingAlerts > 0 && (
        <span className={mobile ? "absolute right-[28%] top-2 h-2 w-2 rounded-full bg-[#d88967]" : "ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#e9a17e] px-1 text-[10px] font-bold text-white"}>
          {!mobile ? pendingAlerts : ""}
        </span>
      )}
    </button>
  );

  if (mode === "parent") {
    return <ParentMode parentName={profile.name.split(" ")[0] || profile.nickname} lostSession={lostSession} onLostUpdate={setLostSession} onCaregiverMode={returnToCaregiver} />;
  }

  return (
    <div className="min-h-screen bg-[#f7f8f4] text-[#2b4335]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[256px] flex-col border-r border-[#e7ebe3] bg-[#fdfefa] px-5 py-8 lg:flex">
        <div className="px-3"><Brand /></div>
        <div className="mt-14 mb-4 px-4 text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#a1aca2]">Your space</div>
        <nav aria-label="Desktop navigation" className="space-y-1.5">
          {NAV.map((item) => <NavItem key={item.id} {...item} />)}
        </nav>
        <div className="mt-auto rounded-[24px] bg-[#eaf2e8] px-5 py-6">
          <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/70 text-[#4d8667]"><Heart size={20} /></div>
          <p className="text-[15px] font-bold leading-6 tracking-[-0.03em] text-[#2e583e]">A gentler way<br />to stay connected.</p>
          <p className="mt-2 text-[11px] leading-5 text-[#7e9585]">Built for the little moments that matter.</p>
        </div>
        <button type="button" onClick={enterParentMode} className="mt-5 flex min-h-[49px] w-full items-center justify-between rounded-2xl border border-[#e2eae1] bg-white px-4 text-[13px] font-bold text-[#426e4e] hover:bg-[#f1f7ee]"><span className="inline-flex items-center gap-2"><ArrowLeftRight size={17}/> Parent Mode</span><ChevronRight size={17}/></button>
        <p className="mt-4 px-4 text-[11px] text-[#a3afa3]">Neul · Frontend prototype v0.2</p>
      </aside>

      <div className="lg:ml-[256px]">
        <header className="sticky top-0 z-10 border-b border-[#ebeee7] bg-[#f7f8f4]/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-4 sm:px-9 lg:px-12 lg:py-5">
            <div className="lg:hidden"><Brand /></div>
            <div className="hidden items-center gap-2 text-[13px] font-semibold text-[#8a9a8c] lg:flex"><span>Caregiver workspace</span><ChevronRight size={14} /><span className="text-[#365e46]">{NAV.find((n) => n.id === tab)?.label}</span></div>
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-2 rounded-full border border-[#e7eadf] bg-white px-3 py-2 text-[11px] font-semibold text-[#8a8c79] sm:inline-flex"><span className="h-2 w-2 rounded-full bg-[#e9b06a]" /> Sample data</span>
              <button type="button" onClick={enterParentMode} className="inline-flex min-h-[40px] items-center gap-1.5 rounded-full bg-[#e6f0e6] px-3 text-[11px] font-bold text-[#3f7854] transition hover:bg-[#d9e9d9] sm:px-4 sm:text-[12px]"><ArrowLeftRight size={15}/><span className="hidden min-[360px]:inline">Parent Mode</span><span className="min-[360px]:hidden">Parent</span></button>
              <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-[#e6d8c8] text-[12px] font-extrabold text-[#6a6555] sm:flex" aria-label="Demo caregiver Alex">AX</div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] px-5 pb-32 pt-7 sm:px-9 sm:pt-10 lg:px-12 lg:pb-16">
          <DemoNotice />

          {tab === "home" && (
            <div className="space-y-9">
              <div>
                <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7f9987]"><Sparkles size={14} /> Your daily peace of mind</div>
                <h1 className="max-w-[750px] text-[36px] font-bold leading-[1.13] tracking-[-0.065em] text-[#203e30] sm:text-[49px]">A little closer,<br /><span className="font-medium italic text-[#86a18a]">even from afar.</span></h1>
                <p className="mt-4 max-w-[580px] text-[14px] leading-7 text-[#849288] sm:text-[15px]">A thoughtful snapshot of {profile.nickname}&apos;s day, the conversations you missed, and moments worth checking in on.</p>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
                <section className="relative min-h-[300px] overflow-hidden rounded-[30px] bg-[#28533f] p-7 text-white shadow-[0_20px_55px_-35px_rgba(32,70,50,.7)] sm:p-9">
                  <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-20 h-[290px] w-[290px] rounded-full border-[42px] border-white/[0.055]" />
                  <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 right-12 h-[280px] w-[280px] rounded-full border-[35px] border-white/[0.06]" />
                  <div className="relative z-[1] flex h-full flex-col justify-between gap-10">
                    <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-white/15 px-3 py-2 text-[11px] font-bold tracking-wide text-[#e5f2e6]">{profile.nickname}&apos;s wellbeing</span><Heart size={24} className="text-[#c8e6ca]" /></div>
                    <div>
                      <div className="mb-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-[#cce8cf] text-[#39724f]"><Check size={26} strokeWidth={3} /></div>
                      <h2 className="text-[30px] font-bold leading-tight tracking-[-0.055em] sm:text-[36px]">{lostSession ? "Lost Mode demo in progress." : "All seems calm today."}</h2>
                      <p className="mt-3 max-w-[370px] text-[13px] leading-6 text-[#d3e5d8]">{lostSession ? "This is a local test only; no alert was sent. Open Location to preview the details." : "No unreviewed urgent Lost Mode events in this sample. One conversation follow-up is waiting for you."}</p>
                    </div>
                    <div className="flex items-center gap-2 border-t border-white/20 pt-5 text-[12px] text-[#d8e9db]"><Clock3 size={16} /> Last sample call · Today at 10:42 AM</div>
                  </div>
                </section>

                <section className="flex flex-col justify-between rounded-[30px] border border-[#e9eee6] bg-white p-7 sm:p-8">
                  <div className="flex items-center justify-between"><p className="text-[12px] font-bold uppercase tracking-[0.13em] text-[#84998b]">At a glance</p><Activity size={19} className="text-[#8cad91]" /></div>
                  <div className="mt-7 grid grid-cols-2 gap-4">
                    <div className="rounded-[22px] bg-[#f3f8f2] p-5"><p className="text-[34px] font-bold tracking-[-0.07em] text-[#315b40]">10</p><p className="mt-1 text-[12px] text-[#8a9b8d]">Sample calls</p></div>
                    <div className="rounded-[22px] bg-[#fff7eb] p-5"><p className="text-[34px] font-bold tracking-[-0.07em] text-[#aa7c3e]">{pendingAlerts}</p><p className="mt-1 text-[12px] text-[#a79a83]">To review</p></div>
                  </div>
                  <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#eaf0e9] p-4"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ecf6ee] text-[#5c9470]"><ShieldCheck size={20} /></div><div><p className="text-[13px] font-bold text-[#395642]">Family care, made simpler</p><p className="mt-1 text-[11px] text-[#9aa69b]">Your daily overview in one place</p></div></div>
                </section>
              </div>

              <div className="grid gap-8 xl:grid-cols-[1.55fr_1fr]">
                <section>
                  <SectionHeading eyebrow="Moments from the day" title="Recent conversations" action={<button onClick={() => goTo("calls")} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-[#548766] hover:text-[#255b3c]">View all <ArrowRight size={15} /></button>} />
                  <div className="overflow-hidden rounded-[26px] border border-[#e9eee6] bg-white">
                    {CALLS.slice(0, 3).map((call, index) => (
                      <button key={call.id} onClick={() => setSelectedCall(call)} className={`flex w-full items-start gap-4 p-5 text-left transition hover:bg-[#f9fbf8] sm:p-6 ${index !== 0 ? "border-t border-[#f0f2ed]" : ""}`}>
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${call.tag === "Flagged" ? "bg-[#fff1e9] text-[#b77459]" : "bg-[#edf4ed] text-[#609374]"}`}><MessageCircle size={21} /></div>
                        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[14px] font-bold text-[#375242]">{call.title}</h3><StatusChip tag={call.tag} /></div><p className="mt-2 line-clamp-2 text-[12px] leading-6 text-[#89978a]">{call.summary}</p><p className="mt-2.5 flex items-center gap-1.5 text-[11px] text-[#a0aaa0]"><Clock3 size={13} /> {call.day} · {call.time} · {call.duration}</p></div>
                        <ChevronRight size={17} className="mt-1 shrink-0 text-[#b0bbb0]" />
                      </button>
                    ))}
                  </div>
                </section>

                <section>
                  <SectionHeading eyebrow="A small nudge" title="Worth a check-in" />
                  <div className="rounded-[26px] border border-[#f1eadc] bg-[#fdf9f0] p-6 sm:p-7">
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5e8ca] text-[#a57e3d]"><Bell size={22} /></div>
                    <h3 className="text-[18px] font-bold tracking-[-0.045em] text-[#655c43]">A quick confirmation could help.</h3>
                    <p className="mt-3 text-[13px] leading-7 text-[#8b8069]">{profile.nickname} asked about an appointment earlier today. You might want to confirm the details together.</p>
                    <button onClick={() => setSelectedCall(CALLS[1])} className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-[#9b743c] hover:text-[#684d2b]">Read the conversation <ArrowUpRight size={17} /></button>
                  </div>
                </section>
              </div>
            </div>
          )}

          {tab === "calls" && (
            <div>
              <div className="mb-8"><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7f9987]">Conversations</p><h1 className="text-[36px] font-bold tracking-[-0.065em] text-[#203e30] sm:text-[46px]">Every little moment.</h1><p className="mt-3 text-[14px] leading-7 text-[#849288]">Browse ten sample call summaries and open a conversation to read the transcript, duration, and estimated cost.</p></div>
              <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-h-[50px] max-w-[440px] flex-1 items-center gap-3 rounded-2xl border border-[#e8eee5] bg-white px-4"><Search size={19} className="text-[#97a99a]"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="w-full border-0 bg-transparent py-3 text-[13px] text-[#375142] outline-none placeholder:text-[#a4b1a5]" /></div>
                <div aria-label="Filter calls" className="flex flex-wrap gap-2">{(["All", "Follow-up", "Flagged"] as const).map((label) => <button type="button" key={label} onClick={() => setFilter(label)} className={`rounded-full px-4 py-2.5 text-[12px] font-bold transition ${filter === label ? "bg-[#2d6448] text-white" : "border border-[#e5ebe1] bg-white text-[#8b9a8e] hover:text-[#426f51]"}`}>{label}</button>)}</div>
              </div>
              <div className="overflow-hidden rounded-[26px] border border-[#e9eee6] bg-white">
                {filteredCalls.length ? filteredCalls.map((call, index) => (
                  <button key={call.id} onClick={() => setSelectedCall(call)} className={`flex w-full items-start gap-3 p-5 text-left transition hover:bg-[#f8faf7] sm:gap-5 sm:p-6 ${index !== 0 ? "border-t border-[#eef1eb]" : ""}`}>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#eff5ed] text-[#649778]"><PhoneIncoming size={21}/></div>
                    <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2 sm:justify-between"><h3 className="text-[14px] font-bold leading-6 text-[#34513e] sm:text-[15px]">{call.title}</h3><StatusChip tag={call.tag}/></div><p className="mt-2 line-clamp-2 text-[12px] leading-6 text-[#88968a]">{call.summary}</p><p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#a0ab9f]"><span>{call.day}, {call.time}</span><span>{call.duration}</span><span>{call.cost} est.</span></p></div>
                    <ChevronRight size={19} className="mt-2 shrink-0 text-[#b4c0b4]"/>
                  </button>
                )) : <div className="p-12 text-center text-[14px] text-[#839688]">No sample calls match your search.</div>}
              </div>
            </div>
          )}

          {tab === "alerts" && (
            <div>
              <div className="mb-8"><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7f9987]">Your notifications</p><h1 className="text-[36px] font-bold tracking-[-0.065em] text-[#203e30] sm:text-[46px]">Here when it matters.</h1><p className="mt-3 text-[14px] leading-7 text-[#849288]">An organized view of situations that may deserve a little extra attention.</p></div>
              <div className="mb-7 flex items-center gap-4 rounded-[26px] border border-[#e4ebe3] bg-white p-5 sm:p-7"><div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-[#edf5e9] text-[#5f976d]"><ShieldCheck size={24}/></div><div><h2 className="text-[16px] font-bold text-[#35583f]">{lostSession ? "Lost Mode preview in this browser" : "No active emergencies in this demo"}</h2><p className="mt-1 text-[12px] leading-6 text-[#8a9c8c]">{lostSession ? "A Parent Mode demo was started on this device; no SMS, calls or push alerts were delivered." : `${pendingAlerts} sample ${pendingAlerts === 1 ? "item needs" : "items need"} review. Real SMS, calls and push delivery are not yet connected.`}</p></div></div>
              {lostSession && <div className="mb-7 flex flex-col gap-4 rounded-[24px] border border-[#f1d8c3] bg-[#fff8ed] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"><div className="flex items-start gap-3"><MapPin className="mt-1 shrink-0 text-[#b47752]" size={23}/><div><p className="text-[15px] font-bold text-[#865f43]">Parent selected “I'm lost”</p><p className="mt-1 text-[12px] leading-6 text-[#947965]">Demo event only · {lostSession.status === "located" ? "Device position available in this tab" : "Location unavailable or pending"} · not delivered</p></div></div><button type="button" onClick={() => goTo("location")} className="min-h-[46px] shrink-0 rounded-2xl bg-[#e8d1bd] px-5 text-[13px] font-bold text-[#77553e]">View location preview <ArrowRight className="ml-1 inline" size={16}/></button></div>}
              <SectionHeading title="Alert history" eyebrow="Sample events" />
              <div className="space-y-4">
                {ALERTS.map((alert) => {
                  const reviewed = reviewedIds.includes(alert.id);
                  const Icon = alert.icon === "location" ? MapPin : MessageCircle;
                  return <article key={alert.id} className="rounded-[26px] border border-[#e9eee6] bg-white p-6 sm:p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${reviewed ? "bg-[#eff5ed] text-[#70a080]" : "bg-[#fff2e5] text-[#c28c59]"}`}><Icon size={22}/></div>
                    <div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-[16px] font-bold text-[#385441]">{alert.label}</h3><span className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${reviewed ? "bg-[#edf5ec] text-[#648a68]" : "bg-[#fff1dd] text-[#ac7b36]"}`}>{reviewed ? "Reviewed" : "Needs review"}</span></div><p className="mt-1 text-[12px] text-[#a0ad9f]">{alert.when}</p><p className="mt-4 text-[13px] leading-7 text-[#839386]">{alert.details}</p>
                    <div className="mt-5 flex flex-wrap gap-3"><button onClick={() => setSelectedCall(CALLS.find((call) => call.id === alert.callId) ?? null)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#eff5ee] px-4 text-[12px] font-bold text-[#4d8060]">View related call <ArrowUpRight size={15}/></button>{!reviewed && <button onClick={() => markReviewed(alert.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#2f664a] px-4 text-[12px] font-bold text-white hover:bg-[#225539]"><CheckCheck size={15}/> Mark reviewed</button>}</div>
                    </div></div>
                  </article>;
                })}
              </div>
            </div>
          )}

          {tab === "location" && <LocationPanel lostSession={lostSession} onParentMode={enterParentMode} />}

          {tab === "profile" && (
            <div>
              <div className="mb-8"><p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7f9987]">People first</p><h1 className="text-[36px] font-bold tracking-[-0.065em] text-[#203e30] sm:text-[46px]">The person behind<br className="sm:hidden" /> every call.</h1><p className="mt-3 text-[14px] leading-7 text-[#849288]">Help Neul feel familiar by keeping a few personal details close at hand.</p></div>
              <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
                <form onSubmit={(event) => { event.preventDefault(); saveProfile(); }} className="rounded-[28px] border border-[#e8eee6] bg-white p-6 sm:p-8">
                  <div className="mb-7 flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#e4efe0] text-[26px] font-bold text-[#5b8e68]">GK</div><div><p className="text-[18px] font-bold tracking-[-0.04em] text-[#32513e]">{profile.name || "Sample parent"}</p><p className="mt-1 text-[12px] text-[#94a295]">Parent profile · Demo data</p></div></div>
                  <div className="grid gap-5 sm:grid-cols-2"><label className="block"><span className="mb-2 block text-[12px] font-bold text-[#536a58]">Full name</span><input value={profile.name} onChange={(event) => { setProfile({ ...profile, name: event.target.value }); setProfileSaved(false); }} className="neul-input" /></label><label className="block"><span className="mb-2 block text-[12px] font-bold text-[#536a58]">What you call them</span><input value={profile.nickname} onChange={(event) => { setProfile({ ...profile, nickname: event.target.value }); setProfileSaved(false); }} className="neul-input" /></label></div>
                  <label className="mt-5 block"><span className="mb-2 block text-[12px] font-bold text-[#536a58]">Phone number (display only)</span><input value={profile.phone} onChange={(event) => { setProfile({ ...profile, phone: event.target.value }); setProfileSaved(false); }} className="neul-input" /></label>
                  <label className="mt-5 block"><span className="mb-2 block text-[12px] font-bold text-[#536a58]">Conversation preferences</span><textarea rows={4} value={profile.conversationNotes} onChange={(event) => { setProfile({ ...profile, conversationNotes: event.target.value }); setProfileSaved(false); }} className="neul-input min-h-[115px] resize-y" /></label>
                  <label className="mt-5 block"><span className="mb-2 block text-[12px] font-bold text-[#536a58]">Everyday routine</span><textarea rows={3} value={profile.everydayRoutine} onChange={(event) => { setProfile({ ...profile, everydayRoutine: event.target.value }); setProfileSaved(false); }} className="neul-input min-h-[90px] resize-y" /></label>
                  <div className="mt-7 flex flex-wrap items-center gap-3"><button type="submit" className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-2xl bg-[#2e6549] px-6 text-[13px] font-bold text-white hover:bg-[#22573c]"><Check size={17}/> Save sample profile</button>{profileSaved && <span role="status" className="text-[12px] font-semibold text-[#548565]">Saved on this browser</span>}</div>
                </form>
                <div className="space-y-5"><div className="rounded-[28px] border border-[#e8eee6] bg-white p-6 sm:p-7"><div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf5e9] text-[#6b9871]"><Users size={21}/></div><h2 className="text-[19px] font-bold tracking-[-0.04em]">Care circle</h2><p className="mt-2 text-[12px] leading-6 text-[#91a093]">The people you want close when a moment matters.</p><div className="mt-5 space-y-3"><div className="flex items-center gap-3 rounded-2xl bg-[#f7f9f5] p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e0e8df] text-[12px] font-bold text-[#57755d]">AX</div><div><p className="text-[13px] font-bold">Alex · Primary caregiver</p><p className="mt-1 text-[11px] text-[#99a799]">Sample contact</p></div><CircleCheck size={17} className="ml-auto text-[#7cab87]"/></div><div className="flex items-center gap-3 rounded-2xl bg-[#f7f9f5] p-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f2e7dc] text-[12px] font-bold text-[#a38666]">JK</div><div><p className="text-[13px] font-bold">Jordan · Backup contact</p><p className="mt-1 text-[11px] text-[#99a799]">Sample contact</p></div></div></div></div><div className="rounded-[28px] bg-[#e9f2e8] p-6 sm:p-7"><ShieldCheck size={24} className="text-[#4f8b64]"/><h2 className="mt-4 text-[16px] font-bold text-[#396045]">Made to be personal, and private.</h2><p className="mt-2 text-[12px] leading-6 text-[#809886]">For now, edits are saved only in this browser. Supabase login, family permissions, and syncing are future integration steps.</p></div></div>
              </div>
            </div>
          )}
        </main>
      </div>

      <nav aria-label="Mobile navigation" className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e7ece4] bg-white/95 px-3 pb-[max(env(safe-area-inset-bottom),8px)] pt-2 shadow-[0_-10px_30px_rgba(36,68,47,.045)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-[520px] items-center justify-around">{NAV.map((item) => <NavItem key={item.id} {...item} mobile />)}</div>
      </nav>

      {selectedCall && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1b2f24]/55 p-0 backdrop-blur-[3px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedCall(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="call-dialog-title" className="max-h-[92dvh] w-full max-w-[660px] overflow-y-auto rounded-t-[30px] bg-[#fbfcf9] p-6 shadow-2xl sm:rounded-[30px] sm:p-9">
            <div className="mb-6 flex items-center justify-between"><span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7b9a83]"><Phone size={16}/> Call details</span><button autoFocus aria-label="Close call details" onClick={() => setSelectedCall(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf1e8] text-[#53765c] hover:bg-[#dceada]"><X size={19}/></button></div>
            <div className="flex flex-wrap items-start justify-between gap-3"><h2 id="call-dialog-title" className="max-w-[450px] text-[27px] font-bold leading-tight tracking-[-0.06em] text-[#2c4b38]">{selectedCall.title}</h2><StatusChip tag={selectedCall.tag}/></div>
            <div className="mt-5 flex flex-wrap gap-3 text-[11px] font-semibold text-[#91a192]"><span className="inline-flex items-center gap-1.5"><CalendarDays size={14}/>{selectedCall.day}, {selectedCall.time}</span><span className="inline-flex items-center gap-1.5"><Clock3 size={14}/>{selectedCall.duration}</span><span>{selectedCall.cost} est. cost</span></div>
            <div className="mt-7 rounded-[22px] bg-[#eaf3e9] p-5"><div className="mb-2 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[#608a68]"><Sparkles size={16}/> AI-generated sample summary</div><p className="text-[13px] leading-7 text-[#486d53]">{selectedCall.summary}</p></div>
            <h3 className="mt-8 mb-4 text-[16px] font-bold tracking-[-0.04em] text-[#38513d]">Conversation transcript</h3><div className="space-y-4">{selectedCall.transcript.map((line, index) => <div key={index} className={`flex gap-3 ${line.speaker === "Mom" ? "flex-row-reverse" : ""}`}><div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${line.speaker === "Mom" ? "bg-[#f2e6d8] text-[#a77e5d]" : "bg-[#e1efe2] text-[#5d8766]"}`}>{line.speaker === "Mom" ? "M" : "N"}</div><div className={`max-w-[80%] rounded-[19px] px-4 py-3 text-[12px] leading-6 ${line.speaker === "Mom" ? "bg-[#f6eee6] text-[#77675b]" : "bg-white text-[#607467] shadow-[0_2px_14px_rgba(20,50,30,.035)]"}`}><p className="mb-1 text-[10px] font-bold opacity-60">{line.speaker}</p>{line.text}</div></div>)}</div>
            <p className="mt-8 border-t border-[#e7ede4] pt-4 text-[11px] leading-5 text-[#a2ada0]">Illustrative transcript and pricing for prototype testing. Not a real recorded phone call.</p>
          </section>
        </div>
      )}
    </div>
  );
}
