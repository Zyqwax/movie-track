import { Dices, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import { PerfStrip, TicketStub } from "@/components/ArchiveUI";

const buttonBase =
  "flex min-h-11 items-center justify-center gap-2 rounded-[10px] px-5.5 py-3 text-sm font-bold transition-[transform,filter,background] duration-150";

export default function HomeHero({ hero, t, wishlist, watched, onShuffle }) {
  return (
    <section className="relative mb-1.5 overflow-hidden rounded-[18px] border-2 border-white/16 archive-hero-background px-10 pt-11 max-md:px-5 max-md:pt-7 py-7">
      {(hero?.backdropPath || hero?.posterPath || hero?.poster_path) && (
        <Image
          className="absolute inset-0 z-0 h-full w-full object-cover opacity-40"
          src={`https://image.tmdb.org/t/p/${hero?.backdropPath ? "original" : "w780"}${hero.backdropPath || hero.posterPath || hero.poster_path}`}
          alt=""
          fill
          priority
          sizes="100vw"
          unoptimized
        />
      )}
      <div className="pointer-events-none absolute inset-0 z-1 bg-linear-to-r from-void/90 via-void/56 via-45% to-void/82" />
      <div className="relative z-2">
        <PerfStrip className="relative mb-5 opacity-55" />
        {hero ? (
          <>
            <div className="mb-4 inline-flex items-center gap-1.75 rounded-full bg-oxblood px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.09em] text-[#fbdde0]">
              <Dices size={13} /> {t("home.lucky")}
            </div>
            <h1 className="mb-4 max-w-175 font-display text-[clamp(42px,6vw,72px)] font-black uppercase leading-[0.88] tracking-[-0.01em]">
              {hero.title}
            </h1>
            <div className="mb-6 flex flex-wrap items-center gap-2.5 font-mono text-[12.5px] text-muted">
              <span>{hero.releaseDate?.slice(0, 4) || "—"}</span>
              <b className="text-gold-dim">·</b>
              <span>
                {hero.runtime
                  ? `${hero.runtime} ${t("home.runtime")}`
                  : t("home.archiveRecord")}
              </span>
              <b className="text-gold-dim">·</b>
              <span className="rounded-full border border-white/16 px-2.75 py-1 text-[11px] uppercase text-ivory">
                {hero.genres?.[0] || t("home.film")}
              </span>
            </div>
            <div className="flex flex-wrap items-end justify-between gap-5 pb-6">
              <div className="flex w-full gap-3 sm:w-auto">
                <Link
                  href={`/movie/${hero.id}`}
                  className={clsx(
                    buttonBase,
                    "flex-1 bg-gold text-gold-ink hover:-translate-y-px hover:brightness-[1.08] sm:flex-none",
                  )}
                >
                  {t("home.details")}
                </Link>
                <button
                  className={clsx(
                    buttonBase,
                    "w-12 border border-white/16 bg-transparent px-3 text-ivory hover:-translate-y-px hover:bg-ivory/4",
                  )}
                  onClick={onShuffle}
                  aria-label={t("home.shuffle")}
                >
                  <Dices size={16} />
                </button>
              </div>
              <TicketStub
                wishlist={wishlist.length}
                watched={watched.length}
                t={t}
              />
            </div>
          </>
        ) : (
          <div className="flex min-h-50 items-center justify-center gap-2.5 text-muted">
            <ImageIcon size={28} />
            <span>{t("home.emptyWatchlist")}</span>
          </div>
        )}
        <PerfStrip className="pb-0" />
      </div>
    </section>
  );
}
