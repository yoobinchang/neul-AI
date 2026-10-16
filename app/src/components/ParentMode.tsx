"use client";

import { useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  CircleHelp,
  Heart,
  Leaf,
  LocateFixed,
  MapPin,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type { LostSession } from "./types";

type Props = {
  parentName: string;
  lostSession: LostSession | null;
  onLostUpdate: (next: LostSession | null) => void;
  onCaregiverMode: () => void;
};

const DEMO_PAIR_CODE = "482915";

export default function ParentMode({ parentName, lostSession, onLostUpdate, onCaregiverMode }: Props) {
  const locationRequestId = useRef(0);
  const [showPairing, setShowPairing] = useState(false);
  const [pairCode, setPairCode] = useState("");
  const [pairMessage, setPairMessage] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [showClueHelp, setShowClueHelp] = useState(false);
  const isLost = lostSession !== null;
  const located = lostSession?.status === "located";
  const locating = lostSession?.status === "requesting";

  function requestHelpLocation() {
    const requestId = ++locationRequestId.current;
    onLostUpdate({ status: "requesting", updatedAt: Date.now(), clue: lostSession?.clue });
    setMessage(null);
    if (!("geolocation" in navigator)) {
      onLostUpdate({ status: "unavailable", updatedAt: Date.now(), clue: lostSession?.clue });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestId.current !== requestId) return;
        onLostUpdate({
          status: "located",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          updatedAt: Date.now(),
          clue: lostSession?.clue,
        });
      },
      () => { if (locationRequestId.current === requestId) onLostUpdate({ status: "unavailable", updatedAt: Date.now(), clue: lostSession?.clue }); },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  function submitPairing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pairCode === DEMO_PAIR_CODE) {
      setPairMessage("Pairing demo complete. No real devices or accounts have been linked.");
    } else {
      setPairMessage("That isn't the sample code. Try 482915 for this demo.");
    }
  }

  return (
    <div className="parent-surface min-h-[100dvh] overflow-hidden text-[#2c4b3c]">
      <header className="relative z-10 border-b border-[#eaece1] bg-[#fbfcf8]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-3 px-5 py-5 sm:px-10 sm:py-6">
          <div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dcebdc] text-[#3b855b]"><Leaf size={23} strokeWidth={2.5}/></span><div><p className="text-[25px] font-extrabold leading-none tracking-[-.075em] text-[#284b36]">neul<span className="text-[#83ae8a]">.</span></p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.13em] text-[#8b9e8e]">Parent space</p></div></div>
          <button type="button" onClick={onCaregiverMode} className="inline-flex min-h-[45px] items-center gap-2 rounded-full border border-[#e3eade] bg-white px-4 text-[12px] font-bold text-[#64806a] transition hover:bg-[#edf4eb]"><ArrowLeft size={16}/> <span className="hidden min-[370px]:inline">Caregiver</span> view</button>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1180px] px-5 pb-14 pt-8 sm:px-10 sm:pb-20 sm:pt-12">
        <div className="mb-7 flex max-w-full items-center gap-2 rounded-2xl border border-[#ebdfca] bg-[#fff9ed] px-4 py-3 text-[12px] font-semibold leading-5 text-[#886e46] sm:max-w-fit"><span className="h-2 w-2 shrink-0 rounded-full bg-[#e8af72]"/><span>Interactive demo only — no real alerts, calls or family pairing</span></div>

        <div className="grid gap-7 lg:grid-cols-[1.32fr_.78fr] lg:gap-9">
          <div>
            <div className="mb-7 sm:mb-9"><div className="mb-4 flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[.17em] text-[#7b9986]"><Sparkles size={17}/> A little peace of mind</div>
              <h1 className="max-w-[710px] text-[clamp(2.75rem,6.3vw,5rem)] font-bold leading-[1.06] tracking-[-.075em] text-[#254332]">{isLost ? <>You&apos;re not <span className="font-medium italic text-[#799d86]">alone.</span></> : <>Hello, <span className="font-medium italic text-[#7b9f85]">{parentName || "Grace"}.</span></>}</h1>
              <p className="mt-5 max-w-[580px] text-[17px] leading-8 text-[#778f80] sm:text-[19px]">{isLost ? "Find a safe place to stop. Take your time. You can ask someone nearby for help." : "It's good to see you. We're here whenever you need a little help."}</p>
            </div>

            {!isLost ? (
              <button type="button" onClick={requestHelpLocation} className="parent-lost-button group relative flex min-h-[335px] w-full flex-col items-center justify-center overflow-hidden rounded-[38px] px-6 py-12 text-center text-white shadow-[0_24px_55px_-28px_rgba(157,89,65,.55)] transition-transform hover:-translate-y-1 active:translate-y-0 sm:min-h-[420px] sm:rounded-[45px]" aria-label="I'm lost. Open guidance and request this device's location permission">
                <span aria-hidden="true" className="pointer-events-none absolute -right-16 -top-28 h-64 w-64 rounded-full border-[44px] border-white/10"/><span aria-hidden="true" className="pointer-events-none absolute -bottom-36 -left-20 h-[340px] w-[340px] rounded-full border-[52px] border-white/10"/>
                <span className="relative flex h-[104px] w-[104px] items-center justify-center rounded-[35px] bg-white/20 ring-1 ring-white/30 transition group-hover:scale-105"><MapPin size={58} strokeWidth={2.2}/></span>
                <span className="relative mt-7 text-[clamp(2.6rem,6vw,4.3rem)] font-extrabold leading-tight tracking-[-.07em]">I&apos;m lost</span>
                <span className="relative mt-3 max-w-[390px] text-[17px] font-medium leading-7 text-white/90">Tap here if you need help finding your way.</span>
                <span className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-white/20 px-6 py-3 text-[15px] font-bold">Get support <ArrowRight size={18}/></span>
              </button>
            ) : (
              <section className="rounded-[37px] border border-[#ebded0] bg-white p-6 shadow-[0_24px_60px_-35px_rgba(100,70,40,.15)] sm:p-9" aria-live="polite">
                <div className="flex items-center gap-3"><span className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#f8e8dc] text-[#bc7656]"><Heart size={29}/></span><div><p className="text-[13px] font-extrabold uppercase tracking-[.14em] text-[#b38870]">One step at a time</p><h2 className="mt-1 text-[26px] font-bold tracking-[-.05em]">Stay somewhere safe.</h2></div></div>
                <ol className="mt-8 space-y-5">{[
                  "Stop walking if it's safe to do so.",
                  "Look for a street name, shop or landmark.",
                  "Call a trusted person directly using your phone.",
                ].map((step, index) => <li key={step} className="flex items-start gap-4 text-[17px] font-semibold leading-7 text-[#55705e]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf3e7] text-[14px] font-extrabold text-[#457d56]">{index + 1}</span><span className="pt-0.5">{step}</span></li>)}</ol>
                <div className="mt-8 rounded-[22px] bg-[#fbf2e8] p-5 text-[#9b6548]" role="status"><p className="flex items-center gap-2 text-[14px] font-bold"><LocateFixed size={18}/>{locating ? "Asking for location permission…" : located ? "Location found on this device" : "Location not available"}</p><p className="mt-2 text-[13px] leading-6">{locating ? "Your browser may ask whether to share location. This stays in your current browser tab." : located ? `GPS estimate: ± ${Math.round(lostSession?.accuracy ?? 0)} meters. This has NOT been sent to anyone.` : "You can still call a trusted person and describe nearby landmarks."}</p></div>
                <button type="button" onClick={() => setShowClueHelp(!showClueHelp)} className="mt-5 flex min-h-[50px] w-full items-center justify-between rounded-2xl border border-[#dce8dc] bg-[#f5faf4] px-5 text-left text-[15px] font-bold text-[#42684e]">I can describe what I see <ChevronRight className={showClueHelp ? "rotate-90" : ""} size={18}/></button>
                {showClueHelp && <div className="mt-3 rounded-2xl bg-[#f5faf4] p-4"><label htmlFor="parent-clue" className="block text-[14px] font-bold text-[#46674e]">Nearby landmark (for this browser only)</label><textarea id="parent-clue" rows={3} value={lostSession?.clue ?? ""} onChange={(e) => { if (lostSession) onLostUpdate({ ...lostSession, clue: e.target.value }); }} placeholder="A blue bench, a store sign, a park…" className="mt-2 w-full rounded-xl border border-[#d4e2d3] bg-white p-4 text-[16px] leading-6 text-[#3a5542] outline-none focus:border-[#73aa81]"/><p className="mt-2 text-[12px] leading-5 text-[#7a9580]">This note is not transmitted or saved to a database.</p></div>}
                <div className="mt-6 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={requestHelpLocation} disabled={locating} className="flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#2c6849] px-4 text-[15px] font-bold text-white disabled:opacity-60"><RefreshCcw size={18}/> Try location again</button><button type="button" onClick={() => { locationRequestId.current += 1; onLostUpdate(null); setShowClueHelp(false); }} className="flex min-h-[54px] flex-1 items-center justify-center gap-2 rounded-2xl border border-[#dce7da] bg-white px-4 text-[15px] font-bold text-[#5a7b63]"><Check size={19}/> I&apos;m safe now</button></div>
              </section>
            )}

            {isLost && <div className="mt-5 rounded-2xl border border-[#efdbc8] bg-[#fff8ef] p-5 text-[13px] font-semibold leading-6 text-[#946d4d]"><strong className="block text-[15px]">No alert has been delivered.</strong>This is a UI demonstration. To get real help, call your caregiver directly. If you are in immediate danger, contact local emergency services.</div>}
          </div>

          <aside className="flex flex-col gap-5 lg:pt-[18px]">
            <div className="rounded-[34px] border border-[#e3ece0] bg-white p-6 sm:p-8"><div className="flex items-center justify-between"><span className="text-[12px] font-extrabold uppercase tracking-[.15em] text-[#94a696]">Your people</span><Heart size={19} className="text-[#80a486]"/></div>
              <div className="mt-7 flex items-center gap-4"><span className="flex h-16 w-16 items-center justify-center rounded-[23px] bg-[#dbe7d8] text-[20px] font-bold text-[#5a7d60]">AX</span><div><p className="text-[22px] font-bold tracking-[-.055em] text-[#314d38]">Alex</p><p className="mt-1 text-[13px] text-[#8b9e8e]">Primary caregiver · sample</p></div></div>
              <p className="mt-6 text-[14px] leading-7 text-[#839585]">Someone you trust can help you feel at home again.</p>
              <button type="button" onClick={() => setMessage("Phone calling is not connected yet. Please use your phone to call a real contact.")} className="mt-6 flex min-h-[68px] w-full items-center justify-center gap-3 rounded-[21px] bg-[#e8f3e8] px-4 text-[18px] font-bold text-[#356a48] transition hover:bg-[#d9eddd]"><Phone size={23}/> Call Alex <ArrowRight size={19}/></button>
              <p className="mt-3 text-center text-[12px] leading-5 text-[#a2afa2]">Demo button · no call will be placed</p>
              {message && <div role="status" className="mt-3 rounded-xl bg-[#fff4e8] px-4 py-3 text-[13px] leading-6 text-[#885e3d]">{message}</div>}
            </div>

            <div className="rounded-[34px] bg-[#e7f0e4] p-6 sm:p-8"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-[#5b9370]"><ShieldCheck size={25}/></div><h3 className="mt-5 text-[22px] font-bold tracking-[-.05em] text-[#35583f]">Made for easier moments.</h3><p className="mt-3 text-[14px] leading-7 text-[#728f77]">Big buttons, gentle instructions and familiar names — without the clutter.</p></div>

            <button type="button" onClick={() => { setShowPairing(true); setPairCode(""); setPairMessage(""); }} className="flex min-h-[56px] items-center justify-between rounded-[23px] border border-[#e3eae0] bg-white px-5 text-left text-[14px] font-bold text-[#53745b] transition hover:bg-[#f3f8f2]"><span className="inline-flex items-center gap-2"><CircleHelp size={19}/> Preview device pairing</span><ChevronRight size={18}/></button>
          </aside>
        </div>
        <footer className="mt-12 border-t border-[#e8ede3] pt-6 text-center text-[12px] leading-6 text-[#9ba99c]">Neul · Parent Mode UI prototype. Not a substitute for emergency services.</footer>
      </main>

      {showPairing && <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#1c3526]/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPairing(false); }}><section role="dialog" aria-modal="true" aria-labelledby="pair-demo-title" className="w-full max-w-[470px] rounded-t-[32px] bg-[#fdfefa] p-6 shadow-2xl sm:rounded-[32px] sm:p-9"><div className="flex justify-end"><button type="button" aria-label="Close pairing demo" onClick={() => setShowPairing(false)} className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf4ed] text-[#55775e]"><X size={20}/></button></div><div className="mb-5 flex h-16 w-16 items-center justify-center rounded-[23px] bg-[#e4f1e3] text-[#48855e]"><ShieldCheck size={29}/></div><h2 id="pair-demo-title" className="text-[30px] font-bold tracking-[-.06em] text-[#294633]">Pairing preview</h2><p className="mt-3 text-[14px] leading-7 text-[#7e9182]">Enter the six-digit sample code to preview the setup flow. This does not securely connect any devices.</p><form onSubmit={submitPairing} className="mt-6"><label htmlFor="pair-demo-code" className="text-[13px] font-bold text-[#48684f]">Demo pairing code</label><input id="pair-demo-code" value={pairCode} onChange={(e) => { setPairCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setPairMessage(""); }} placeholder="482915" autoComplete="off" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required className="mt-2 w-full rounded-2xl border border-[#dce8da] bg-white px-5 py-4 text-center text-[28px] font-bold tracking-[.25em] text-[#3f6b4d] outline-none focus:border-[#6ba87b]"/><button type="submit" className="mt-4 flex min-h-[54px] w-full items-center justify-center rounded-2xl bg-[#316a4a] text-[15px] font-bold text-white">Try pairing <ArrowRight size={17} className="ml-2"/></button></form><p className="mt-4 text-[12px] leading-6 text-[#9caa9e]">Sample code: <strong className="text-[#658d6b]">482915</strong> · Real codes require server-side expiry and authentication.</p>{pairMessage && <p className="mt-4 rounded-2xl bg-[#eaf4e8] p-4 text-[13px] leading-6 text-[#43754f]" role="status">{pairMessage}</p>}</section></div>}
    </div>
  );
}
