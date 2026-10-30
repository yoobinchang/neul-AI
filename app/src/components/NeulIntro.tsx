"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { ArrowRight, MoveUpRight, VolumeX } from "lucide-react";

const LighthouseScene = dynamic(() => import("./LighthouseScene"), {
  ssr: false,
  loading: () => <div className="neul-intro-scene-loader" aria-hidden="true" />,
});

export default function NeulIntro({ onEnter }: { onEnter: () => void }) {
  useEffect(() => {
    const timer = window.setTimeout(onEnter, 8200);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") onEnter();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => { clearTimeout(timer); document.removeEventListener("keydown", handleKeyDown); };
  }, [onEnter]);

  return (
    <main className="neul-intro" aria-label="Welcome to Neul">
      <div className="neul-intro-grain" aria-hidden="true" />
      <div className="neul-intro-grid" aria-hidden="true" />
      <header className="neul-intro-topbar">
        <div className="neul-intro-brand"><span className="neul-intro-brandmark" aria-hidden="true">✳</span><span>neul<span className="neul-intro-brand-dot">.</span></span></div>
        <span className="neul-intro-top-center">Welcome to Neul</span>
        <button className="neul-intro-skip" onClick={onEnter} type="button">Skip intro <MoveUpRight size={16} /></button>
      </header>

      <section className="neul-intro-layout">
        <div className="neul-intro-copy">
          <div className="neul-intro-eyebrow"><span className="neul-intro-eyebrow-line" /> Neul</div>
          <h1>Even from afar,<br />you&apos;re <em>always</em><br />there.</h1>
          <p>Every missed call is another chance to feel close. Neul brings comfort to your loved one — and clarity to you.</p>
          <button type="button" className="neul-intro-enter" onClick={onEnter}><span>Enter Neul</span><span className="neul-intro-enter-icon"><ArrowRight size={21} /></span></button>
          <div className="neul-intro-meta"><span className="neul-intro-meta-dot" /> Made for families</div>
        </div>
        <div className="neul-intro-art">
          <div className="neul-intro-art-halo" aria-hidden="true" />
          <LighthouseScene />
          <div className="neul-intro-art-caption"><span>Lighthouse</span><span>360° light</span></div>
          <div className="neul-intro-art-coordinate" aria-hidden="true">41°N / 73°W</div>
        </div>
      </section>
      <footer className="neul-intro-footer"><div className="neul-intro-progress"><span /></div><span>Neul</span><span className="neul-intro-sound"><VolumeX size={14} /> Sound off</span></footer>
    </main>
  );
}
