import Image from "next/image";

/** Brand artwork is extracted from the official Neul lighthouse logo supplied by the team. */
export default function NeulBrand({ mode = "caregiver" }: { mode?: "caregiver" | "parent" }) {
  return (
    <div className="neul-brand" aria-label={`Neul ${mode} space`}>
      <Image
        src="/brand/neul-logo.png"
        alt="Neul — always there to answer"
        width={438}
        height={188}
        className="neul-brand-image h-auto w-[144px] min-[380px]:w-[158px] sm:w-[184px] lg:w-[192px]"
        priority
      />
      <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#E8EDF4] bg-white px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-[#5B7392]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#F5A623]" aria-hidden="true" />
        {mode === "parent" ? "Parent space" : "Caregiver space"}
      </div>
    </div>
  );
}
