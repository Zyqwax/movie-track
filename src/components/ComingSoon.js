"use client";

import Link from "next/link";
import { Film, ArrowLeft } from "lucide-react";
import { DEFAULT_LANGUAGE, translate } from "@/lib/i18n";

export default function ComingSoon() {
  const t = (key, values) => translate(DEFAULT_LANGUAGE, key, values);
  return (
    <section className="flex min-h-[calc(100vh-78px)] flex-col items-center justify-center px-7 py-7 text-center text-muted" aria-labelledby="coming-soon-title">
      <div className="relative grid h-[72px] w-24 place-items-center rounded-[10px] border border-dashed border-gold-dim bg-surface1 text-gold">
        <span className="absolute -right-4 -top-3 rotate-8 border border-oxblood-bright px-2 py-1.25 font-mono text-[10px] font-semibold text-oxblood-bright">SOON</span>
        <Film size={30} />
      </div>
      <p className="mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-gold">{t("comingSoon.eyebrow")}</p>
      <h1 id="coming-soon-title" className="my-3 max-w-[700px] font-display text-[clamp(34px,6vw,60px)] font-black uppercase leading-[0.95] text-ivory">{t("comingSoon.title")}</h1>
      <p className="mb-6 max-w-[420px] text-sm leading-[1.7]">{t("comingSoon.description")}</p>
      <Link href="/" className="flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-gold px-5.5 py-3 text-sm font-bold text-gold-ink transition hover:-translate-y-px hover:brightness-[1.08]"><ArrowLeft size={16} /> {t("comingSoon.home")}</Link>
    </section>
  );
}
