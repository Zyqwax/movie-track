import { ArrowUpDown, ChevronDown, Image as ImageIcon } from "lucide-react";
import clsx from "clsx";
import dayjs from "dayjs";
import { MovieCard } from "@/components/ArchiveUI";

// ── Watched movie grouping ─────────────────────────────────────────────────
export function groupWatchedMoviesByMonth(movies, dayjsLocale, sortKey) {
  const groups = new Map();

  movies.forEach((movie) => {
    const hasDate = movie.watchedAt != null && movie.watchedAt !== 0;
    const key = hasDate ? dayjs(movie.watchedAt).format("YYYY-MM") : "undated";
    const group = groups.get(key) || { key, movies: [] };
    group.movies.push(movie);
    groups.set(key, group);
  });

  const monthDirection = sortKey === "watchedAt_asc" ? 1 : -1;

  return [...groups.values()]
    .sort((a, b) => {
      if (a.key === "undated") return 1;
      if (b.key === "undated") return -1;
      return monthDirection * a.key.localeCompare(b.key);
    })
    .map((group) => ({
      ...group,
      label:
        group.key === "undated"
          ? dayjsLocale === "tr"
            ? "Tarih Belirtilmemiş"
            : "Date Not Available"
          : dayjs(`${group.key}-01`).locale(dayjsLocale).format("MMMM YYYY"),
    }));
}

export default function HomeLibrarySection({
  activeTab,
  wishlist,
  watched,
  listed,
  options,
  sortKey,
  sortOpen,
  sortRef,
  dayjsLocale,
  onTabChange,
  onSortToggle,
  onSortChange,
}) {
  return (
    <section className="mt-9 border-2 p-7 rounded-[18px] border-white/16">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex gap-6">
          {[
            ["wishlist", "İzleme Listem", wishlist.length],
            ["watched", "İzlediklerim", watched.length],
          ].map(([id, label, count]) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              onClick={() => onTabChange(id)}
              className={clsx(
                "relative min-h-11 border-0 bg-transparent py-2 pb-2.5 font-display text-[15px] font-extrabold uppercase tracking-[0.04em]",
                activeTab === id
                  ? "text-ivory after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-gold"
                  : "text-muted",
              )}
            >
              {label}{" "}
              <small className="font-mono text-[10.5px] font-normal text-muted">
                {count}
              </small>
            </button>
          ))}
        </div>
        <div className="relative" ref={sortRef}>
          <button
            className="flex min-h-11 items-center gap-2 rounded-lg border border-white/16 bg-transparent px-3 py-2.25 text-xs text-muted"
            onClick={onSortToggle}
          >
            <ArrowUpDown size={14} />
            <span>
              {options.find((option) => option.value === sortKey)?.label}
            </span>
            <ChevronDown size={14} />
          </button>
          {sortOpen && (
            <div className="absolute right-0 top-12 z-10 flex min-w-[190px] flex-col overflow-hidden rounded-[10px] border border-white/16 bg-surface2 shadow-[0_14px_30px_#0008]">
              {options.map((option) => (
                <button
                  key={option.value}
                  className="border-0 bg-transparent p-3 text-left text-xs text-muted hover:bg-surface3 hover:text-ivory"
                  onClick={() => onSortChange(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {listed.length ? (
        sortKey.startsWith("watchedAt_") && activeTab === "watched" ? (
          <div className="space-y-7">
            {groupWatchedMoviesByMonth(listed, dayjsLocale, sortKey).map((group) => (
              <section key={group.key} aria-labelledby={`watched-${group.key}`}>
                <h3
                  id={`watched-${group.key}`}
                  className="mb-3 border-b border-white/10 pb-2 font-display text-sm font-extrabold uppercase tracking-[0.08em] text-gold"
                >
                  {group.label}
                </h3>
                <div className="grid grid-cols-2 gap-[18px] max-md:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {group.movies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      rating={movie.rating}
                      subtitle={
                        movie.watchedAt
                          ? dayjs(movie.watchedAt).locale(dayjsLocale).fromNow()
                          : undefined
                      }
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-[18px] max-md:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {listed.map((movie) => (
              <MovieCard
                key={movie.id}
                movie={movie}
                rating={activeTab === "watched" ? movie.rating : null}
              />
            ))}
          </div>
        )
      ) : (
        <div className="flex flex-col items-center gap-2.25 px-5 py-15 text-center text-muted">
          <ImageIcon size={28} />
          <strong className="font-display text-xl uppercase text-ivory">
            Bu liste boş
          </strong>
          <span className="text-[13px]">
            Keşfet bölümünden ilk filmi ekleyebilirsin.
          </span>
        </div>
      )}
    </section>
  );
}
