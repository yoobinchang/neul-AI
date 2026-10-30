import Image from "next/image";

/** Official lighthouse + wordmark, deliberately shown without the embedded slogan. */
export default function NeulBrand({ mode = "caregiver" }: { mode?: "caregiver" | "parent" }) {
  return (
    <div className="neul-brand" aria-label={`Neul ${mode} mode`}>
      <Image src="/brand/neul-lighthouse.png" alt="" width={121} height={183} className="neul-brand-lighthouse" priority />
      <span className="neul-brand-wordmark-window" aria-hidden="true">
        <Image src="/brand/neul-wordmark.png" alt="" width={257} height={142} className="neul-brand-wordmark" priority />
      </span>
      <span className="sr-only">Neul</span>
    </div>
  );
}
