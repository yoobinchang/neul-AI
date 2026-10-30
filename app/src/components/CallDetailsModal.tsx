"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, ChevronUp, Clock3, X } from "lucide-react";

type Line = { speaker: "Mom" | "Neul"; text: string };
export type CallDetailsData = {
  id: string;
  day: string;
  time: string;
  duration: string;
  cost: string;
  title: string;
  summary: string;
  tag: "Routine" | "Follow-up" | "Flagged";
  transcript: Line[];
};

export default function CallDetailsModal({ call, onClose }: { call: CallDetailsData; onClose: () => void }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const lastFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    containerRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab" && containerRef.current) {
        const controls = Array.from(containerRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), [tabindex="0"]'));
        if (!controls.length) return;
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === containerRef.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      lastFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#102B49]/55 backdrop-blur-[4px] sm:items-center sm:px-6 sm:py-8" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="neul-call-title"
        aria-describedby="neul-call-summary"
        className="flex max-h-[94dvh] w-full max-w-[750px] flex-col overflow-hidden rounded-t-[26px] border border-[#E2EAF2] bg-white shadow-[0_35px_100px_-35px_rgba(9,31,58,.52)] outline-none sm:max-h-[88dvh] sm:rounded-[26px]"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[#EDF1F6] bg-white px-6 py-4 sm:px-9 sm:py-5">
          <span className="text-[14px] font-medium text-[#627C95]">Call summary</span>
          <button type="button" onClick={onClose} aria-label="Close call summary" className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#E2EAF2] text-[#254666] transition hover:bg-[#F3F7FA] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1F3A5F]">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-9 pt-7 sm:px-9 sm:pb-10 sm:pt-9">
          <div className="flex flex-wrap items-center gap-3 text-[13px] text-[#71879C]">
            <span className="inline-flex items-center gap-1.5"><CalendarDays size={15} />{call.day} · {call.time}</span>
            <span className="inline-flex items-center gap-1.5"><Clock3 size={15} />{call.duration}</span>
            <span className="rounded-lg bg-[#EDF2F7] px-2.5 py-1 text-[12px] font-medium text-[#526C86]">{call.tag}</span>
          </div>

          <h2 id="neul-call-title" className="mt-5 max-w-[590px] text-[clamp(2rem,3.7vw,3.1rem)] font-semibold leading-[1.07] tracking-[-.065em] text-[#183655]">{call.title}</h2>

          <div className="mt-8 border-t border-[#E7EDF3] pt-7">
            <h3 className="text-[14px] font-semibold text-[#183655]">What happened</h3>
            <p id="neul-call-summary" className="mt-3 max-w-[630px] text-[clamp(1.08rem,2vw,1.28rem)] leading-[1.8] text-[#385777]">{call.summary}</p>
          </div>

          <div className="mt-8 border-t border-[#E7EDF3] pt-6">
            <button type="button" onClick={() => setShowTranscript((value) => !value)} aria-expanded={showTranscript} aria-controls="neul-transcript" className="flex min-h-[52px] w-full items-center justify-between gap-4 text-left text-[15px] font-semibold text-[#183655]">
              <span>Full conversation <span className="ml-1 text-[13px] font-normal text-[#7E91A3]">({call.transcript.length} lines)</span></span>
              {showTranscript ? <ChevronUp size={19} /> : <ChevronDown size={19} />}
            </button>
            {showTranscript && (
              <div id="neul-transcript" className="mt-2 divide-y divide-[#E8EEF3] rounded-[18px] border border-[#E7EDF3] bg-[#F8FAFC] px-5 sm:px-6">
                {call.transcript.map((line, index) => (
                  <div key={`${call.id}-${index}`} className="grid gap-2 py-5 sm:grid-cols-[86px_minmax(0,1fr)] sm:gap-5">
                    <p className="text-[13px] font-semibold text-[#597590]">{line.speaker}</p>
                    <p className="text-[15px] leading-7 text-[#254665]">{line.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-[#E7EDF3] pt-5 text-[12px] leading-6 text-[#8194A6]">
            Prototype data · Illustrative transcript and estimated cost ({call.cost}). Not a real recorded call.
          </div>
        </div>
      </section>
    </div>
  );
}
