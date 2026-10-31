"use client";

import { useState } from "react";
import { ArrowRight, ExternalLink, LockKeyhole, MapPin, Navigation2 } from "lucide-react";
import type { LostSession } from "./types";

type Props = { lostSession: LostSession | null; onParentMode: () => void };

function buildMapUrls(lat: number, lon: number, accuracy?: number) {
  const safeAccuracy = Number.isFinite(accuracy) ? Math.max(0, accuracy ?? 0) : 0;
  const latitudeRadius = Math.min(0.017, Math.max(0.0035, (safeAccuracy * 4) / 111_320));
  const cosine = Math.max(0.15, Math.abs(Math.cos((lat * Math.PI) / 180)));
  const longitudeRadius = Math.min(0.026, latitudeRadius / cosine);
  const left = Math.max(-180, lon - longitudeRadius);
  const right = Math.min(-180 + 360, lon + longitudeRadius);
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
  return `${Math.floor(elapsed / 3_600_000)} hr ago`;
}

export default function LocationPanel({ lostSession, onParentMode }: Props) {
  const [showMap, setShowMap] = useState(false);
  const hasCoordinates = typeof lostSession?.latitude === "number" && typeof lostSession?.longitude === "number";
  const mapUrls = hasCoordinates ? buildMapUrls(lostSession!.latitude!, lostSession!.longitude!, lostSession?.accuracy) : null;

  return (
    <div className="neul-demo-location-view mx-auto max-w-[1120px] px-0 py-3 text-[#173252]" data-neul-patch="neul-clarity-v07">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium text-[#6D8298]">Location support</p>
          <h1 className="mt-3 text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[0.98] tracking-[-0.07em] text-[#173252]">Find Mom faster.</h1>
          <p className="mt-4 max-w-[620px] text-[15px] leading-7 text-[#617B96]">One clean place to view the latest location event.</p>
        </div>
        <button type="button" onClick={onParentMode} className="inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-[#173252] px-5 text-[14px] font-semibold text-white shadow-[0_20px_45px_-30px_rgba(23,50,82,.4)] hover:bg-[#21436B]">
          Parent Mode <ArrowRight size={17} />
        </button>
      </div>

      {lostSession && (
        <div className="neul-demo-incident-banner neul-demo-location-incident mt-6" role="status">
          <span className="neul-demo-beacon-dot" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <strong className="block text-[15px]">Lost Mode preview active</strong>
            <span className="block text-[12px] leading-6">Location was shared from Parent Mode. No SMS or call notification was sent.</span>
          </div>
          <ArrowRight size={18} className="shrink-0" aria-hidden="true" />
        </div>
      )}
      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.55fr)_360px]">
        <section className={`neul-demo-map-stage overflow-hidden rounded-[28px] border border-[#E3EAF2] bg-white shadow-[0_20px_50px_-42px_rgba(19,45,83,.34)] ${lostSession ? "neul-demo-map-stage-lost" : ""}`}>
          {showMap && mapUrls ? (
            <div className="h-[460px] bg-[#E7EEF7]">
              <iframe title="OpenStreetMap preview" src={mapUrls.embedUrl} className="h-full w-full border-0" loading="lazy" referrerPolicy="no-referrer" />
            </div>
          ) : (
            <div className="relative flex min-h-[460px] flex-col items-center justify-center px-8 text-center">
              <div aria-hidden="true" className="absolute inset-0 opacity-60" style={{ backgroundImage: "radial-gradient(#B8C8D8 1px,transparent 1px)", backgroundSize: "24px 24px" }} />
              <div className={`neul-demo-map-main-marker relative flex h-24 w-24 items-center justify-center rounded-[28px] text-white shadow-[0_24px_50px_-35px_rgba(23,50,82,.45)] ${lostSession ? "bg-[#C83B49]" : "bg-[#173252]"}`}><MapPin size={46} /></div>
              <h2 className="relative mt-7 text-[clamp(1.9rem,4vw,2.8rem)] font-semibold tracking-[-0.055em] text-[#173252]">{hasCoordinates ? "Location ready" : "Waiting for location"}</h2>
              <p className="relative mt-3 max-w-[430px] text-[14px] leading-7 text-[#617B96]">
                {hasCoordinates
                  ? "Show the map when you&apos;re ready. The preview uses OpenStreetMap."
                  : "Open Parent Mode on the parent&apos;s phone and tap ‘I&apos;m lost’ to share a location."}
              </p>
              {hasCoordinates ? (
                <button type="button" onClick={() => setShowMap(true)} className="relative mt-7 inline-flex min-h-[52px] items-center gap-2 rounded-2xl bg-[#173252] px-5 text-[14px] font-semibold text-white">
                  Show map <ArrowRight size={17} />
                </button>
              ) : (
                <button type="button" onClick={onParentMode} className="relative mt-7 inline-flex min-h-[52px] items-center gap-2 rounded-2xl border border-[#DDE6EF] bg-white px-5 text-[14px] font-semibold text-[#173252]">
                  Open Parent Mode <ArrowRight size={17} />
                </button>
              )}
            </div>
          )}
        </section>

        <section className={`neul-demo-location-side rounded-[28px] border border-[#E3EAF2] bg-white p-6 shadow-[0_20px_50px_-42px_rgba(19,45,83,.34)] sm:p-7 ${lostSession ? "neul-demo-location-side-lost" : ""}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#EEF3F8] px-3.5 py-2 text-[12px] font-semibold text-[#23466A]">
              <span className={`h-2 w-2 rounded-full ${hasCoordinates ? "bg-[#4A8874]" : "bg-[#99A9B8]"}`} />
              {hasCoordinates ? "Location captured" : "No location yet"}
            </span>
            <Navigation2 size={20} className="text-[#8096AC]" />
          </div>

          <h2 className="mt-7 text-[30px] font-semibold leading-[1.02] tracking-[-0.05em] text-[#173252]">
            {lostSession ? "Latest update" : "Standing by"}
          </h2>
          <p className="mt-3 text-[14px] leading-7 text-[#617B96]">
            {lostSession ? "Latest location shared from Parent Mode." : "No Parent Mode location event has been created yet."}
          </p>

          <dl className="mt-7 grid gap-5">
            <div className="rounded-[20px] bg-[#F7FAFD] px-4 py-4">
              <dt className="text-[12px] font-medium text-[#6D8298]">Status</dt>
              <dd className="mt-1 text-[18px] font-semibold text-[#173252]">{lostSession?.status === "requesting" ? "Requesting location" : lostSession?.status === "unavailable" ? "Unavailable" : hasCoordinates ? "Received" : "Waiting"}</dd>
            </div>
            <div className="rounded-[20px] bg-[#F7FAFD] px-4 py-4">
              <dt className="text-[12px] font-medium text-[#6D8298]">Updated</dt>
              <dd className="mt-1 text-[18px] font-semibold text-[#173252]">{lostSession ? formatAge(lostSession.updatedAt) : "—"}</dd>
            </div>
            <div className="rounded-[20px] bg-[#F7FAFD] px-4 py-4">
              <dt className="text-[12px] font-medium text-[#6D8298]">Coordinates</dt>
              <dd className="mt-1 break-words font-mono text-[15px] font-semibold text-[#173252]">{hasCoordinates ? `${lostSession!.latitude!.toFixed(5)}, ${lostSession!.longitude!.toFixed(5)}` : "Not available"}</dd>
            </div>
            {lostSession?.clue && (
              <div className="rounded-[20px] bg-[#F7FAFD] px-4 py-4">
                <dt className="text-[12px] font-medium text-[#6D8298]">Landmark note</dt>
                <dd className="mt-1 text-[15px] leading-7 text-[#23466A]">{lostSession.clue}</dd>
              </div>
            )}
          </dl>

          {showMap && mapUrls && (
            <a href={mapUrls.fullUrl} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 text-[13px] font-semibold text-[#23466A]">
              Open full map <ExternalLink size={15} />
            </a>
          )}

          <div className="mt-8 flex items-start gap-3 text-[12px] leading-6 text-[#7A8EA2]">
            <LockKeyhole size={16} className="mt-1 shrink-0" />
            <p>Demo only. The latest position is shared through your family workspace; map tiles load from OpenStreetMap only after you choose to show the map.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
