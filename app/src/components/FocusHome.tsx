"use client";

import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Bell,
  Clock3,
  ExternalLink,
  MapPin,
  Navigation2,
  PhoneCall,
} from "lucide-react";
import type { LostSession } from "./types";

// Map tiles load only after the user asks to view the map. Showing the map sends
// the coordinates to OpenStreetMap.
function mapLinks(lat: number, lon: number, accuracy: number | undefined) {
  const radius = Math.min(0.017, Math.max(0.0035, ((accuracy ?? 0) * 4) / 111_320));
  const cos = Math.max(0.15, Math.abs(Math.cos((lat * Math.PI) / 180)));
  const lonRadius = Math.min(0.026, radius / cos);
  const bounds = [
    Math.max(-180, lon - lonRadius),
    Math.max(-90, lat - radius),
    Math.min(180, lon + lonRadius),
    Math.min(90, lat + radius),
  ].map((v) => v.toFixed(6)).join(",");
  const marker = `${lat.toFixed(6)},${lon.toFixed(6)}`;
  return {
    iframe: `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bounds)}&layer=mapnik&marker=${encodeURIComponent(marker)}`,
    external: `https://www.openstreetmap.org/?mlat=${lat.toFixed(6)}&mlon=${lon.toFixed(6)}#map=17/${lat.toFixed(6)}/${lon.toFixed(6)}`,
  };
}

export default function FocusHome({
  nickname,
  parentName,
  summary,
  title,
  callTime,
  pendingAlerts,
  isLost,
  lostSession,
  onOpenCall,
  onCategories,
  onLocation,
  onParentMode,
}: {
  nickname: string;
  parentName: string;
  summary: string;
  title: string;
  callTime: string;
  pendingAlerts: number;
  isLost: boolean;
  lostSession: LostSession | null;
  onOpenCall: () => void;
  onCategories: () => void;
  onLocation: () => void;
  onParentMode: () => void;
}) {
  // neul-dynamic-name-v10: take the person's name from editable Profile data.
  // English names use the first word (Grace Kim → Grace); Korean names stay intact.
  const sourceName = parentName.trim() || nickname.trim() || "Parent";
  const displayName = /[\uAC00-\uD7A3]/.test(sourceName)
    ? sourceName
    : sourceName.split(/\s+/)[0];
  const overviewTitle = /[\uAC00-\uD7A3]/.test(displayName)
    ? `${displayName} overview`
    : `${displayName}'s overview`;

  const [approvedLocationId, setApprovedLocationId] = useState<string | null>(null);
  const hasLocation =
    lostSession?.status === "located" &&
    typeof lostSession.latitude === "number" &&
    Number.isFinite(lostSession.latitude) &&
    typeof lostSession.longitude === "number" &&
    Number.isFinite(lostSession.longitude) &&
    Math.abs(lostSession.latitude) <= 90 &&
    Math.abs(lostSession.longitude) <= 180;

  // Demo: the location now updates live, so one "Show map" tap covers the whole
  // sharing session. It resets when the location goes away (e.g. "I'm safe now").
  const locationId = hasLocation ? "live" : null;
  const showMap = locationId !== null && approvedLocationId === locationId;

  const links = hasLocation ? mapLinks(lostSession!.latitude!, lostSession!.longitude!, lostSession?.accuracy) : null;
  const locationStatus = hasLocation
    ? "Device location available"
    : lostSession?.status === "requesting"
      ? "Waiting for location permission"
      : lostSession?.status === "unavailable"
        ? "Location unavailable"
        : "No location shared yet";

  return (
    <div className="neul-demo-home mx-auto max-w-[1180px] pb-4 text-[#1D3857]" data-neul-ui="summary-and-map-v09">
      <header className="neul-demo-appear mb-7 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
        <div>
          <p className="mb-2 text-[13px] font-medium text-[#70859B]">Caregiver home</p>
          <h1 className="max-w-full break-words text-[clamp(2.15rem,4.4vw,4rem)] font-semibold leading-[1.09] tracking-[-0.055em] [overflow-wrap:anywhere]">
            {overviewTitle}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-[#637A92]">Latest conversation and location, together.</p>
        </div>
        {pendingAlerts > 0 && (
          <button
            type="button"
            onClick={onCategories}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#E2EAF2] bg-white px-4 text-[13px] font-medium text-[#294969] transition hover:bg-[#F5F8FB]"
          >
            <Bell size={16} /> {pendingAlerts} to review <ArrowRight size={16} />
          </button>
        )}
      </header>

      {isLost && (
        <button type="button" onClick={onLocation} className="neul-demo-lost-banner mb-5 flex w-full items-center gap-4 text-left" aria-label="Review Lost Mode location preview">
          <span className="neul-demo-beacon-dot" aria-hidden="true" />
          <span className="min-w-0 flex-1"><strong className="block text-[14px] font-semibold">Lost Mode preview active</strong><small className="block text-[12px] leading-6">Location received from Parent Mode · no SMS or call was sent</small></span>
          <ArrowRight size={19} className="shrink-0" />
        </button>
      )}
      <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,.88fr)] lg:gap-6">
        <section className="neul-demo-summary-card neul-demo-appear flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#E2EAF2] bg-white p-6 shadow-[0_16px_55px_-40px_rgba(22,49,78,.22)] sm:p-8" aria-label="Latest call summary">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[13px] font-semibold text-[#24496D]"><PhoneCall size={17} /> Latest call</p>
            <span className="text-[12px] text-[#71859A]">Family workspace</span>
          </div>
          <div className="mt-7">
            <h2 className="max-w-[540px] text-[clamp(1.95rem,3vw,2.8rem)] font-semibold leading-[1.13] tracking-[-0.055em] text-[#173453]">
              {title}
            </h2>
            <p className="mt-4 max-w-[560px] text-[16px] leading-[1.8] text-[#45627E]">{summary}</p>
          </div>
          <div className="mt-auto pt-8">
            <div className="flex items-center gap-2 border-t border-[#EBEFF3] pt-5 text-[12px] text-[#73889B]">
              <Clock3 size={15} aria-hidden="true" /><span>{callTime}</span>
            </div>
            <button
              type="button"
              onClick={onOpenCall}
              className="mt-5 inline-flex min-h-[52px] items-center justify-center gap-3 rounded-[13px] bg-[#1F3A5F] px-5 text-[14px] font-semibold text-white transition hover:bg-[#2A4D76] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F3A5F]"
            >
              Read full summary <ArrowUpRight size={17} />
            </button>
          </div>
        </section>

        <section className="neul-demo-location-card neul-demo-appear flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-[#E2EAF2] bg-white shadow-[0_16px_55px_-40px_rgba(22,49,78,.22)]" data-lost={isLost ? "true" : "false"} aria-label="Parent location">
          <div className="flex items-start justify-between gap-3 px-6 pb-4 pt-6 sm:px-7 sm:pt-7">
            <div>
              <p className="flex items-center gap-2 text-[13px] font-semibold text-[#24496D]"><MapPin size={17} /> Parent location</p>
              <p className="mt-2 text-[13px] leading-6 text-[#6D8296]" role="status">{locationStatus}</p>
              {isLost && <p className="mt-2 inline-flex items-center gap-2 text-[12px] font-semibold text-[#C83B49]"><span className="neul-demo-beacon-dot" aria-hidden="true" /> Lost Mode preview</p>}
            </div>
            <button type="button" onClick={onLocation} aria-label="Open location details" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#E2EAF2] text-[#54718F] transition hover:bg-[#F5F8FB]"><ArrowUpRight size={19} /></button>
          </div>

          <div className="relative mx-5 flex min-h-[250px] flex-1 flex-col items-center justify-center overflow-hidden rounded-[18px] bg-[#EDF3F8] sm:mx-6 sm:min-h-[290px]">
            {showMap && links ? (
              <iframe
                key={links.iframe}
                title="Map of the device's captured position"
                src={links.iframe}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="absolute inset-0 h-full w-full border-0"
              />
            ) : (
              <>
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-65" style={{ backgroundImage: "linear-gradient(105deg, transparent 0 48%, #D9E5EF 48% 51%, transparent 51% 100%), linear-gradient(12deg, transparent 0 35%, #DCE6F0 35% 39%, transparent 39% 100%)", backgroundSize: "110px 130px, 180px 130px" }} />
                <div className={`neul-demo-map-marker relative z-10 grid h-[66px] w-[66px] place-items-center rounded-[22px] border border-[#E1E9F2] bg-white text-[#1F3A5F] shadow-[0_10px_35px_-20px_rgba(24,57,92,.27)] ${isLost ? "neul-demo-map-marker-lost" : ""}`}><Navigation2 size={28} /></div>
                <p className="relative z-10 mt-4 px-5 text-center text-[16px] font-semibold text-[#244665]">{hasLocation ? "Location ready to view" : "Waiting for location"}</p>
                <p className="relative z-10 mt-2 max-w-[280px] px-5 text-center text-[12px] leading-6 text-[#627D96]">
                  {hasLocation ? "OpenStreetMap loads after you choose to show it." : "Open Parent Mode on the parent&apos;s phone and say “I&apos;m lost” on a Neul call."}
                </p>
                {hasLocation && links && (
                  <button type="button" onClick={() => setApprovedLocationId(locationId)} className="relative z-10 mt-4 min-h-11 rounded-xl bg-white px-5 text-[13px] font-semibold text-[#244665] shadow-sm transition hover:bg-[#F8FAFC]">
                    Show map
                  </button>
                )}
              </>
            )}
          </div>

          <div className="px-6 pb-6 pt-5 sm:px-7">
            {hasLocation && lostSession ? (
              <p className="text-[12px] leading-6 text-[#71869B]">
                Updated {new Date(lostSession.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                {typeof lostSession.accuracy === "number" ? ` · ±${Math.round(lostSession.accuracy)} m` : ""}
              </p>
            ) : (
              <p className="text-[12px] leading-6 text-[#71869B]">Demo: location is shared through your family workspace.</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
              <button type="button" onClick={hasLocation ? onLocation : onParentMode} className="inline-flex min-h-11 items-center gap-2 text-[13px] font-semibold text-[#244665] hover:text-[#102D4B]">
                {hasLocation ? "Location details" : "Try Parent Mode"} <ArrowRight size={16} />
              </button>
              {showMap && links && <a href={links.external} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 text-[12px] font-medium text-[#627D96]">Open full map <ExternalLink size={14} /></a>}
            </div>
          </div>
        </section>
      </div>
      {isLost && <p className="mt-5 text-[13px] font-medium leading-6 text-[#657D94]">Lost Mode demo location received. No SMS or call notification has been sent.</p>}
    </div>
  );
}
