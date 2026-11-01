"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, Check, LocateFixed, MapPin, Phone, RefreshCcw, ShieldCheck, Radio } from "lucide-react";
import type { LostSession } from "./types";
import NeulBrand from "./NeulBrand";

type Props = {
  parentName: string;
  lostSession: LostSession | null;
  onLostUpdate: Dispatch<SetStateAction<LostSession | null>>;
  onCaregiverMode: () => void;
  // DEMO: called with every GPS fix so the page can share it with the family workspace.
  onPosition?: (point: { latitude: number; longitude: number; accuracy: number }) => void;
  onSafe?: () => void;
  syncNote?: string;
  // DEMO: goes up by one when the AI creates a lost alert on a call; starts sharing without a tap.
  autoLocate?: number;
};

export default function ParentMode({ parentName, lostSession, onLostUpdate, onCaregiverMode, onPosition, onSafe, syncNote, autoLocate = 0 }: Props) {
  const locationRequestId = useRef(0);
  const watchId = useRef<number | null>(null);
  const hasFix = useRef(false);
  const [locationError, setLocationError] = useState("");

  const locating = lostSession?.status === "requesting";
  const located = lostSession?.status === "located";
  const fromCall = lostSession?.source === "call";

  const stopWatching = useCallback(() => {
    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
  }, []);
  useEffect(() => stopWatching, [stopWatching]);

  function requestHelpLocation() {
    stopWatching();
    hasFix.current = false;
    const requestId = ++locationRequestId.current;
    setLocationError("");
    onLostUpdate((prev) => ({ status: "requesting", updatedAt: Date.now(), clue: prev?.clue, source: prev?.source ?? "tap" }));
    // Browsers only give location to https pages (and localhost on the same computer).
    const problem = !window.isSecureContext
      ? "Location only works on a secure (https) link. Open Neul from its https address, not an http:// or 192.168… address."
      : !("geolocation" in navigator) ? "This browser can't share location." : "";
    if (problem) {
      setLocationError(problem);
      onLostUpdate((prev) => ({ ...prev, status: "unavailable", updatedAt: Date.now() }));
      return;
    }
    // Keep watching while this screen is open so the caregiver's map follows the phone.
    watchId.current = navigator.geolocation.watchPosition(
      (position) => {
        if (locationRequestId.current !== requestId) return;
        hasFix.current = true;
        const { latitude, longitude, accuracy } = position.coords;
        onLostUpdate((prev) => ({ ...prev, status: "located", latitude, longitude, accuracy, updatedAt: Date.now() }));
        onPosition?.({ latitude, longitude, accuracy });
      },
      (error) => {
        if (locationRequestId.current !== requestId) return;
        // A single timeout after we already have a fix is not worth discarding it.
        if (hasFix.current && error.code !== error.PERMISSION_DENIED) return;
        stopWatching();
        setLocationError(error.code === error.PERMISSION_DENIED
          ? "Location permission is off for this site. Turn it on in the browser's site settings, then tap Try again."
          : "Couldn't get a location fix. Try again, ideally near a window or outside.");
        onLostUpdate((prev) => ({ ...prev, status: "unavailable", updatedAt: Date.now() }));
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  // Works without a tap only if location permission was already granted on this phone.
  useEffect(() => {
    if (autoLocate === 0) return;
    const timer = window.setTimeout(requestHelpLocation, 0);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLocate]);


  return (
    <div className="neul-demo-parent min-h-[100dvh] bg-[#F7FAFD] text-[#173252]" data-lost={lostSession ? "true" : "false"} data-neul-patch="neul-clarity-v07">
      <header className="border-b border-[#E8EEF5] bg-white/92 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[960px] items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <NeulBrand mode="parent" />
          <button type="button" onClick={onCaregiverMode} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-[#E4EBF2] bg-white px-4 text-[13px] font-semibold text-[#4F6780] hover:bg-[#F5F8FB]">
            <ArrowLeft size={16} /> Caregiver
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[960px] px-5 py-8 sm:px-8 sm:py-12">
        {!lostSession ? (
          <div className="mx-auto max-w-[720px]">
            <p className="text-center text-[13px] font-medium text-[#6C8196]">Parent Mode</p>
            <h1 className="mt-3 text-center text-[clamp(2.7rem,6vw,4.7rem)] font-semibold leading-[0.98] tracking-[-0.07em] text-[#173252]">
              Hello, {parentName || "Grace"}.
            </h1>
            <p className="mx-auto mt-4 max-w-[520px] text-center text-[17px] leading-8 text-[#607B96]">
              If you&apos;re lost, just call and say so. Keep this page open.
            </p>

            <div className="neul-demo-sos mt-8 flex min-h-[320px] w-full flex-col items-center justify-center rounded-[36px] px-8 text-center text-white sm:min-h-[380px]" role="note">
              <span className="neul-demo-sos-halo neul-demo-sos-halo-one" aria-hidden="true" />
              <span className="neul-demo-sos-halo neul-demo-sos-halo-two" aria-hidden="true" />
              <span className="neul-demo-sos-center flex h-24 w-24 items-center justify-center rounded-[30px] bg-white/15 ring-1 ring-white/25"><Phone size={50} strokeWidth={2.1} /></span>
              <span className="neul-demo-sos-title mt-7 text-[clamp(2.2rem,6vw,3.8rem)] font-semibold leading-none tracking-[-0.07em]">Call and say &ldquo;I&apos;m lost&rdquo;</span>
              <span className="neul-demo-sos-description mt-4 max-w-[400px] text-[18px] leading-8 text-white/90">Neul will tell your family, and this phone will share where you are.</span>
            </div>

            <button type="button" onClick={requestHelpLocation} className="mt-5 flex min-h-[56px] w-full items-center justify-center gap-2 rounded-[18px] bg-white px-5 text-[16px] font-semibold text-[#C83B49] ring-1 ring-[#F3CED0] hover:bg-[#FFF7F8]">
              <MapPin size={18} /> Can&apos;t talk? Tap to share your location
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-[760px] neul-demo-appear">
            <div className="neul-demo-incident-banner" role="status">
              <span className="neul-demo-beacon-dot" aria-hidden="true" />
              <Radio size={18} aria-hidden="true" />
              <span><strong>{fromCall ? "Neul told your family" : "Lost Mode preview active"}</strong><small>{fromCall ? "From your call · location shared with your family workspace" : "Location shared with your family workspace · no SMS or call sent"}</small></span>
            </div>
            <h1 className="text-[clamp(2.4rem,5vw,4rem)] font-semibold leading-[1] tracking-[-0.07em] text-[#173252]">Let’s find a safe place.</h1>
            <p className="mt-4 max-w-[560px] text-[17px] leading-8 text-[#607B96]">{fromCall ? "Your family has an alert from your call and can see this phone's location while this page is open." : "This is a demo. No alert has been sent. Please contact a trusted person directly if you need help."}</p>

            <section className="neul-demo-active-panel mt-7 rounded-[30px] border border-[#F3CED0] bg-white p-6 shadow-[0_24px_55px_-42px_rgba(158,37,48,.30)] sm:p-8">
              <div className="flex items-center gap-3">
                <span className="neul-demo-incident-icon relative flex h-14 w-14 items-center justify-center rounded-[18px] bg-[#FDE8EB] text-[#C83B49]"><ShieldCheck size={26} /></span>
                <div>
                  <p className="text-[12px] font-medium text-[#6C8196]">Current status</p>
                  <h2 className="text-[28px] font-semibold tracking-[-0.05em] text-[#173252]">{locating ? "Finding your location" : located ? "Location found" : "Location unavailable"}</h2>
                </div>
              </div>

              <ol className="mt-7 space-y-4">
                {["Stop somewhere safe, if you can.", "Look for a sign or landmark.", "Call a family member if you can."].map((step, index) => (
                  <li key={step} className="flex items-start gap-4 rounded-[20px] bg-[#F7FAFD] px-4 py-4 text-[17px] leading-7 text-[#23466A]">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[14px] font-semibold text-[#173252] ring-1 ring-[#E3EAF2]">{index + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 rounded-[20px] bg-[#F7FAFD] px-5 py-4 text-[14px] leading-7 text-[#607B96]">
                <div className="flex items-center gap-2 font-semibold text-[#173252]"><LocateFixed size={18} /> {located ? "Location found" : "Waiting for browser location"}</div>
                <p className="mt-2">{located ? `Accuracy: ± ${Math.round(lostSession?.accuracy ?? 0)} m.` : lostSession?.status === "unavailable" && locationError ? locationError : "If your browser asks for location permission, please allow it."}</p>
                {located && syncNote && <p className="mt-1 text-[13px]" role="status">{syncNote}</p>}
              </div>

              <label htmlFor="clue" className="mt-6 block text-[14px] font-semibold text-[#173252]">What do you see? (optional)</label>
              <input
                id="clue"
                value={lostSession?.clue ?? ""}
                onChange={(e) => onLostUpdate({ ...lostSession, clue: e.target.value })}
                placeholder="Blue bench, coffee shop, park entrance..."
                className="mt-3 w-full rounded-2xl border border-[#DDE6EF] bg-white px-4 py-4 text-[16px] text-[#173252] outline-none focus:border-[#7189A2]"
              />

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button type="button" onClick={requestHelpLocation} disabled={locating} className="flex min-h-[60px] items-center justify-center gap-2 rounded-2xl bg-[#C83B49] px-5 text-[16px] font-semibold text-white transition hover:bg-[#AB2D3B] disabled:opacity-60">
                  <RefreshCcw size={18} /> Try again
                </button>
                <button type="button" onClick={() => { locationRequestId.current += 1; stopWatching(); onLostUpdate(null); onSafe?.(); }} className="flex min-h-[60px] items-center justify-center gap-2 rounded-2xl border border-[#E3EAF2] bg-white px-5 text-[16px] font-semibold text-[#173252]">
                  <Check size={18} /> I&apos;m safe now
                </button>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
