"use client";

import { useState } from "react";
import { ArrowUpRight, Compass, ExternalLink, LocateFixed, MapPin, Navigation2, ShieldAlert, Sparkles } from "lucide-react";
import type { LostSession } from "./types";

type Props = { lostSession: LostSession | null; onParentMode: () => void };

export default function LocationPanel({ lostSession, onParentMode }: Props) {
  const [callFeedback, setCallFeedback] = useState(false);
  const hasDevicePosition = lostSession?.status === "located" &&
    Number.isFinite(lostSession.latitude) && Number.isFinite(lostSession.longitude);
  const lat = hasDevicePosition ? lostSession!.latitude! : null;
  const lon = hasDevicePosition ? lostSession!.longitude! : null;
  const mapUrl = hasDevicePosition
    ? `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.17em] text-[#809d88]"><Compass size={16} /> Lost Mode · Location preview</div>
          <h1 className="text-[36px] font-bold leading-[1.12] tracking-[-.064em] text-[#244332] sm:text-[47px]">Help is closer<br className="sm:hidden" /> than it feels.</h1>
          <p className="mt-3 max-w-[590px] text-[14px] leading-7 text-[#809385]">A calm, readable view of the location and landmarks you would receive when the backend is connected.</p>
        </div>
        <button type="button" onClick={onParentMode} className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 self-start rounded-2xl bg-[#2e654a] px-5 text-[13px] font-bold text-white transition hover:bg-[#22543c]">
          Try Parent Mode <ArrowUpRight size={17} />
        </button>
      </div>

      <div role="status" className="flex items-start gap-3 rounded-[20px] border border-[#f0dfc8] bg-[#fff8eb] px-4 py-3 text-[12px] leading-6 text-[#8b7248]">
        <ShieldAlert size={18} className="mt-0.5 shrink-0" />
        <p><strong>Prototype — no emergency response.</strong> This view does not receive remote alerts, send messages or monitor anyone. Device location is visible only in this browser tab.</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_.85fr]">
        <div className="relative min-h-[340px] overflow-hidden rounded-[30px] border border-[#dfe9df] bg-[#e6eee6] sm:min-h-[440px]" aria-label="Illustrative map graphic; this is not a real navigational map">
          {/* All map geometry is decorative and does not correspond to the device's coordinates. */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 760 520" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration of parkland and intersecting roads">
            <rect width="760" height="520" fill="#e8f0e5" />
            <path d="M-20 70Q120 38 198 130T435 134T790 97V-20H-20Z" fill="#d7e6d6" />
            <path d="M-20 418Q125 352 214 408T470 408T790 360V560H-20Z" fill="#d2e4d4" />
            <path d="M465 30C550 82 552 155 623 200S730 308 785 340" fill="none" stroke="#bfdcdb" strokeWidth="54" opacity=".85" />
            <path d="M465 30C550 82 552 155 623 200S730 308 785 340" fill="none" stroke="#d6edeb" strokeWidth="38" />
            <g fill="none" strokeLinecap="round"><path d="M-15 215C200 260 340 194 775 250" stroke="#fffdf8" strokeWidth="39"/><path d="M-15 215C200 260 340 194 775 250" stroke="#d9ddcf" strokeWidth="1.5"/><path d="M210-30C230 110 230 310 188 565" stroke="#fffdf8" strokeWidth="34"/><path d="M210-30C230 110 230 310 188 565" stroke="#d9ddcf" strokeWidth="1.5"/><path d="M425-20C382 125 425 340 484 550" stroke="#fffdf8" strokeWidth="28"/><path d="M425-20C382 125 425 340 484 550" stroke="#d9ddcf" strokeWidth="1.5"/><path d="M8 465C197 480 378 382 765 425" stroke="#fffdf8" strokeWidth="30"/><path d="M8 465C197 480 378 382 765 425" stroke="#d9ddcf" strokeWidth="1.5" /></g>
            <g opacity=".65" fill="#aecbad"><circle cx="63" cy="66" r="20"/><circle cx="100" cy="78" r="27"/><circle cx="126" cy="44" r="18"/><circle cx="295" cy="367" r="29"/><circle cx="330" cy="390" r="20"/><circle cx="672" cy="58" r="24"/><circle cx="702" cy="90" r="21"/><circle cx="621" cy="485" r="23"/></g>
            <g fontFamily="Arial, sans-serif" fontSize="13" fill="#76917c" fontWeight="700" letterSpacing="1.7"><text x="49" y="163" transform="rotate(-7 49 163)">MAPLE PARK</text><text x="259" y="296" transform="rotate(-5 259 296)">PARK AVE</text><text x="534" y="409" transform="rotate(-12 534 409)">RIVER WALK</text></g>
          </svg>
          <div className="absolute left-4 top-4 rounded-full border border-white/90 bg-white/90 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.11em] text-[#547760] shadow-sm sm:left-6 sm:top-6">Illustrative map · not live</div>
          <div className="absolute left-1/2 top-[51%] -translate-x-1/2 -translate-y-1/2">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[#3f9068]/15"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3f9068]/15"><div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-[#367f59] text-white shadow-[0_12px_30px_rgba(31,93,55,.24)]"><MapPin size={24} strokeWidth={2.8} /></div></div></div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2 rounded-2xl bg-white/95 px-4 py-3 text-[11px] font-semibold text-[#64806c] shadow-[0_6px_28px_rgba(35,70,45,.07)] sm:bottom-6 sm:left-6 sm:right-auto sm:min-w-[268px]"><span className="inline-flex items-center gap-2"><LocateFixed size={17} className="text-[#44885b]"/> {hasDevicePosition ? "Device location captured" : "Sample location marker"}</span><span className="text-[#a3b4a6]">Preview</span></div>
        </div>

        <section className="flex flex-col rounded-[30px] border border-[#e7eee5] bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-[#edf5ed] px-3 py-2 text-[11px] font-extrabold text-[#507b5c]"><span className="h-2 w-2 rounded-full bg-[#70a781]" /> {lostSession ? "Local demo event" : "Saved sample event"}</span><Navigation2 size={20} className="text-[#8aa78f]"/></div>
          <h2 className="mt-6 text-[26px] font-bold leading-tight tracking-[-.06em] text-[#284835]">{lostSession ? "Parent requested help" : "Near the park"}</h2>
          <p className="mt-3 text-[13px] leading-7 text-[#87998a]">{lostSession ? "A test of the ‘I'm lost’ flow on this browser. No caregiver notification was delivered." : "Sample transcript clue: “I can see a blue bench beside a little park.”"}</p>
          {lostSession?.clue && <div className="mt-5 rounded-2xl bg-[#f0f5eb] p-4 text-[13px] leading-6 text-[#50775b]"><strong className="block text-[11px] uppercase tracking-[.1em]">Landmark note · same browser</strong>{lostSession.clue}</div>}
          <div className="my-6 h-px bg-[#edf0e9]" />
          <dl className="space-y-5">
            <div><dt className="text-[11px] font-bold uppercase tracking-[.12em] text-[#a0aea2]">Recorded</dt><dd className="mt-1 text-[13px] font-semibold text-[#46644d]">{lostSession ? new Date(lostSession.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Yesterday at 6:28 PM · sample"}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase tracking-[.12em] text-[#a0aea2]">Coordinates</dt><dd className="mt-1 break-words text-[13px] font-semibold text-[#46644d]">{hasDevicePosition ? `${lat!.toFixed(5)}, ${lon!.toFixed(5)}` : lostSession ? "Location not available on this device" : "Not available · illustrative only"}</dd></div>
            <div><dt className="text-[11px] font-bold uppercase tracking-[.12em] text-[#a0aea2]">Accuracy</dt><dd className="mt-1 text-[13px] font-semibold text-[#46644d]">{hasDevicePosition && lostSession?.accuracy !== undefined ? `± ${Math.round(lostSession.accuracy)} m (device estimate)` : "Unavailable"}</dd></div>
          </dl>
          <div className="mt-auto pt-8">
            {mapUrl ? <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#2d6448] px-4 text-[13px] font-bold text-white transition hover:bg-[#25563e]">Open actual map <ExternalLink size={17}/></a> : <button type="button" onClick={onParentMode} className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#eaf2e9] px-4 text-[13px] font-bold text-[#38644b] transition hover:bg-[#deebdd]">Try location permission <ArrowUpRight size={17}/></button>}
            <button type="button" onClick={() => setCallFeedback(true)} className="mt-3 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-[#dfe9dd] text-[13px] font-bold text-[#4c7458]">Call Mom <span className="text-[11px] font-normal">(demo only)</span></button>
            {callFeedback && <p role="status" className="mt-2 rounded-xl bg-[#fff4e8] p-3 text-[12px] leading-5 text-[#8b674e]">Calling is not connected. Use your phone to contact your family member directly.</p>}
            <p className="mt-3 text-[11px] leading-5 text-[#9caa9e]">{mapUrl ? "Opening the map shares these coordinates with OpenStreetMap. Only open it if you choose to." : "The map artwork is decorative, not a representation of GPS coordinates."}</p>
          </div>
        </section>
      </div>
      <div className="flex items-start gap-3 rounded-[23px] bg-[#edf4e9] px-5 py-5 text-[#51735a]"><Sparkles size={21} className="mt-1 shrink-0"/><p className="text-[12px] leading-6"><strong className="text-[#355c40]">Next integration:</strong> Supabase authenticated location records + secure pairing + alert delivery. This prototype deliberately does not simulate a successful emergency response.</p></div>
    </div>
  );
}
