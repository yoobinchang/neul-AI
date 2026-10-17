"use client";

import { useState } from "react";
import {
  ArrowRight, ArrowUpRight, CheckCheck, Clock3, Compass, Copy, ExternalLink,
  HeartHandshake, LocateFixed, LockKeyhole, MapPin, Navigation2, RadioTower,
  ShieldCheck, Sparkles,
} from "lucide-react";
import type { LostSession } from "./types";

type Props = { lostSession: LostSession | null; onParentMode: () => void };

/** The browser position stays in React state in this prototype. The map is not
 * loaded until the user explicitly authorizes an external OpenStreetMap request. */
function buildMapUrls(lat: number, lon: number, accuracy?: number) {
  const safeAccuracy = Number.isFinite(accuracy) ? Math.max(0, accuracy ?? 0) : 0;
  const latitudeRadius = Math.min(0.017, Math.max(0.0035, (safeAccuracy * 4) / 111_320));
  const cosine = Math.max(0.15, Math.abs(Math.cos((lat * Math.PI) / 180)));
  const longitudeRadius = Math.min(0.026, latitudeRadius / cosine);
  const left = Math.max(-180, lon - longitudeRadius);
  const right = Math.min(180, lon + longitudeRadius);
  const bottom = Math.max(-90, lat - latitudeRadius);
  const top = Math.min(90, lat + latitudeRadius);
  const bounds = [left, bottom, right, top].map((value) => value.toFixed(6)).join(",");
  const marker = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  return {
    embedUrl: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bounds)}&layer=mapnik&marker=${encodeURIComponent(marker)}`,
    fullUrl: `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=17/${lat.toFixed(6)}/${lon.toFixed(6)}`,
  };
}

function formatAge(timestamp: number) {
  const elapsed = Math.max(0, Date.now() - timestamp);
  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)} min ago`;
  return new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export default function LocationPanel({ lostSession, onParentMode }: Props) {
  const [mapPermissionFor, setMapPermissionFor] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const hasCoordinates = lostSession?.status === "located" &&
    typeof lostSession.latitude === "number" &&
    typeof lostSession.longitude === "number" &&
    Number.isFinite(lostSession.latitude) && Number.isFinite(lostSession.longitude) &&
    Math.abs(lostSession.latitude) <= 90 && Math.abs(lostSession.longitude) <= 180;
  const latitude = hasCoordinates ? lostSession.latitude! : null;
  const longitude = hasCoordinates ? lostSession.longitude! : null;
  const accuracy = hasCoordinates ? lostSession.accuracy : undefined;
  const locationKey = hasCoordinates ? `${latitude?.toFixed(6)}/${longitude?.toFixed(6)}` : null;
  const mapUrls = hasCoordinates && latitude !== null && longitude !== null
    ? buildMapUrls(latitude, longitude, accuracy) : null;
  const showEmbeddedMap = Boolean(mapUrls && locationKey === mapPermissionFor);

  async function copyLocation() {
    if (!mapUrls) return;
    try {
      await navigator.clipboard.writeText(mapUrls.fullUrl);
      setCopyStatus("Map link copied. Share it only with someone you trust.");
    } catch {
      setCopyStatus("Couldn't copy automatically. Use ‘Open map’ and copy the address from your browser.");
    }
  }

  return (
    <div className="space-y-6 pb-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[.18em] text-[#6482A0]"><Compass size={16}/> NEUL LOCATION STUDIO</div>
          <h1 className="text-[clamp(2.35rem,5vw,3.45rem)] font-extrabold leading-[1.06] tracking-[-.075em] text-[#1F3A5F]">A familiar way <span className="font-medium italic text-[#76A7C1]">back.</span></h1>
          <p className="mt-4 max-w-[590px] text-[14px] leading-7 text-[#627890]">A clearer view of where help was requested — designed for calmer, faster check-ins.</p>
        </div>
        <button type="button" onClick={onParentMode} className="inline-flex min-h-[50px] shrink-0 items-center justify-center gap-2 self-start rounded-2xl bg-[#1F3A5F] px-5 text-[13px] font-bold text-white shadow-[0_10px_25px_-16px_rgba(31,58,95,.65)] transition hover:bg-[#294E77]">
          Test Parent Mode <ArrowUpRight size={17}/>
        </button>
      </div>

      <div role="status" className="flex items-start gap-3 rounded-[20px] border border-[#F2DFC4] bg-[#FFFAF1] p-4 text-[12px] leading-6 text-[#866D49] sm:px-5">
        <LockKeyhole className="mt-0.5 shrink-0 text-[#B58435]" size={19}/>
        <p><strong>Local prototype — not an emergency service.</strong> Parent Mode collects location only after browser permission. It is not sent to a caregiver or database. The map loads only with your permission.</p>
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.37fr)_minmax(300px,.83fr)]">
        <section className="relative flex min-h-[405px] flex-col overflow-hidden rounded-[31px] border border-[#DBE5F0] bg-[#E6EFF7] shadow-[0_20px_55px_-40px_rgba(31,58,95,.25)] sm:min-h-[505px]">
          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4 sm:p-6">
            <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-white/90 bg-white/95 px-3.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#244668] shadow-sm"><span className="h-2 w-2 rounded-full bg-[#F5A623]"/>{hasCoordinates ? "Device position available" : "Awaiting device position"}</div>
            <span className="rounded-full border border-white/85 bg-white/90 px-3 py-2 text-[10px] font-bold text-[#527391]">DEMO</span>
          </div>

          {showEmbeddedMap && mapUrls ? (
            <div className="absolute inset-0 bg-[#DFEAF5]">
              <iframe
                title="OpenStreetMap view of the coordinates captured in Parent Mode"
                className="h-full w-full border-0"
                src={mapUrls.embedUrl}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#112B49]/65 via-transparent to-transparent p-4 pt-16 text-right text-[11px] font-semibold text-white">Map data © OpenStreetMap contributors</div>
            </div>
          ) : (
            <div className="relative flex min-h-[405px] flex-1 flex-col items-center justify-center overflow-hidden px-7 pb-12 pt-24 text-center sm:min-h-[505px]">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(#A7BDD3 1px,transparent 1px)", backgroundSize: "23px 23px" }}/>
              <div aria-hidden="true" className="pointer-events-none absolute -left-24 bottom-[-140px] h-[350px] w-[350px] rounded-full border-[70px] border-white/50"/>
              <div aria-hidden="true" className="pointer-events-none absolute -right-24 top-[40px] h-[350px] w-[350px] rounded-full border-[65px] border-[#C9D8E9]/75"/>
              <div className="relative flex h-24 w-24 items-center justify-center rounded-[32px] border border-white/70 bg-white/90 shadow-[0_15px_45px_-20px_rgba(31,58,95,.3)]"><MapPin size={46} strokeWidth={1.7} className="text-[#1F3A5F]"/><span aria-hidden="true" className="absolute -right-2 -top-2 h-8 w-8 rounded-full border-[7px] border-[#E6EFF7] bg-[#F5A623]"/></div>
              <h2 className="relative mt-7 max-w-[440px] text-[clamp(1.55rem,3vw,2.15rem)] font-extrabold leading-tight tracking-[-.055em] text-[#1F3A5F]">{mapUrls ? "The location is ready." : lostSession?.status === "requesting" ? "Finding this device…" : "Every journey begins with a point."}</h2>
              <p className="relative mt-3 max-w-[395px] text-[13px] leading-7 text-[#526F89]">{mapUrls ? "Show the real map only when you're ready. Opening it shares these coordinates with OpenStreetMap." : lostSession?.status === "unavailable" ? "Location was unavailable or permission was declined. You can retry from Parent Mode." : "Switch to Parent Mode, tap ‘I'm lost,’ and allow location to preview a real map here."}</p>
              {mapUrls && locationKey && <button type="button" onClick={() => setMapPermissionFor(locationKey)} className="relative mt-7 flex min-h-[54px] items-center justify-center gap-2 rounded-2xl bg-[#1F3A5F] px-7 text-[14px] font-bold text-white shadow-[0_12px_25px_-15px_rgba(31,58,95,.55)] hover:bg-[#294E77]">Show real map <ArrowRight size={18}/></button>}
              {!mapUrls && <button type="button" onClick={onParentMode} className="relative mt-7 flex min-h-[51px] items-center justify-center gap-2 rounded-2xl bg-white px-6 text-[13px] font-bold text-[#1F3A5F] shadow-sm hover:bg-white/85">Start Lost Mode demo <ArrowRight size={17}/></button>}
            </div>
          )}
        </section>

        <section className="flex flex-col rounded-[31px] border border-[#DFE8F2] bg-white p-6 shadow-[0_15px_55px_-40px_rgba(31,58,95,.2)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#EAF2F9] px-3.5 py-2 text-[11px] font-extrabold text-[#294F75]"><span className={`h-2 w-2 rounded-full ${hasCoordinates ? "bg-[#438D79]" : "bg-[#E9B04F]"}`}/>{hasCoordinates ? "Coordinates captured" : "No location yet"}</span>
            <Navigation2 size={20} className="text-[#82A0BA]"/>
          </div>
          <h2 className="mt-7 text-[27px] font-extrabold leading-tight tracking-[-.06em] text-[#1F3A5F]">{lostSession ? "A request for help" : "Ready when needed"}</h2>
          <p className="mt-3 text-[13px] leading-7 text-[#6A829B]">{lostSession ? "This event was created in Parent Mode on this browser only. It has not been sent to the family." : "The map will appear after the parent-side location demo is completed."}</p>
          {lostSession?.clue && <div className="mt-5 rounded-[19px] border-l-4 border-[#F5A623] bg-[#FFF8EA] p-4 text-[13px] leading-6 text-[#795E3B]"><strong className="mb-1 block text-[10px] font-extrabold uppercase tracking-[.16em]">Landmark note · local demo</strong>{lostSession.clue}</div>}
          <div className="my-6 h-px w-full bg-[#EDF2F7]"/>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-6">
            <div><dt className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#8297AA]">Recorded</dt><dd className="mt-1.5 text-[13px] font-bold text-[#244568]">{lostSession ? new Date(lostSession.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—"}</dd></div>
            <div><dt className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#8297AA]">Status</dt><dd className="mt-1.5 text-[13px] font-bold text-[#244568]">{lostSession?.status === "requesting" ? "Requesting" : lostSession?.status === "unavailable" ? "Unavailable" : hasCoordinates ? "On-device" : "Waiting"}</dd></div>
            <div className="col-span-2"><dt className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#8297AA]">Coordinates</dt><dd className="mt-1.5 break-words font-mono text-[14px] font-semibold text-[#244568]">{hasCoordinates ? `${latitude?.toFixed(5)}, ${longitude?.toFixed(5)}` : "No coordinates collected"}</dd></div>
            <div><dt className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#8297AA]">Estimated accuracy</dt><dd className="mt-1.5 text-[13px] font-bold text-[#244568]">{hasCoordinates && Number.isFinite(accuracy) && typeof accuracy === "number" ? `± ${Math.round(accuracy)} m` : "Not available"}</dd></div>
            <div><dt className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#8297AA]">Updated</dt><dd className="mt-1.5 text-[13px] font-bold text-[#244568]">{lostSession ? formatAge(lostSession.updatedAt) : "—"}</dd></div>
          </dl>
          <div className="mt-auto space-y-3 pt-8">
            {mapUrls ? <>
              <a href={mapUrls.fullUrl} target="_blank" rel="noopener noreferrer" className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1F3A5F] px-4 text-[13px] font-bold text-white transition hover:bg-[#294F75]">Open map in new tab <ExternalLink size={17}/></a>
              <button type="button" onClick={copyLocation} className="flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl border border-[#DBE6F0] bg-[#F8FAFD] px-4 text-[13px] font-bold text-[#294F75] transition hover:bg-[#EFF4F8]"><Copy size={17}/> Copy location link</button>
              {copyStatus && <p role="status" className="rounded-xl bg-[#F0F5FA] px-3 py-2.5 text-[11px] leading-5 text-[#42627F]">{copyStatus}</p>}
            </> : <button type="button" onClick={onParentMode} className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#1F3A5F] px-4 text-[13px] font-bold text-white hover:bg-[#294F75]">Open Parent Mode <ArrowRight size={18}/></button>}
            <p className="text-[11px] leading-6 text-[#8195A7]">Copying a link does not send a notification. Sharing a map link reveals the coordinates to whoever opens it.</p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: LocateFixed, number: "01", title: "Request location", body: "Parent Mode asks for browser permission only after tapping the Lost button." },
          { icon: ShieldCheck, number: "02", title: "Check the details", body: "See the reported accuracy and nearby landmark note, if one was entered." },
          { icon: HeartHandshake, number: "03", title: "Coordinate support", body: "For this demo, contact family yourself. Automated alert delivery is not active." },
        ].map((item) => <div key={item.number} className="rounded-[25px] border border-[#E0E9F3] bg-white p-5 sm:p-6"><div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EDF3F9] text-[#294F75]"><item.icon size={21}/></span><span className="text-[12px] font-bold tracking-[.13em] text-[#B1C2D1]">{item.number}</span></div><h3 className="mt-4 text-[15px] font-extrabold text-[#1F3A5F]">{item.title}</h3><p className="mt-2 text-[12px] leading-6 text-[#7187A0]">{item.body}</p></div>)}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-[24px] bg-[#EAF1F8] px-5 py-5 text-[#345778] sm:px-7"><RadioTower size={20} className="shrink-0"/><p className="flex-1 text-[12px] leading-6"><strong>Next integration:</strong> secured Supabase records, caregiver permissions, verified device pairing, and real SMS/call escalation.</p><Sparkles size={17} className="hidden opacity-60 sm:block"/><Clock3 size={16} className="hidden opacity-60 sm:block"/><CheckCheck size={16} className="hidden opacity-60 sm:block"/></div>
    </div>
  );
}
