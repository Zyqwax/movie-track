import Image from "next/image";
import Link from "next/link";
import { Film, Search, X } from "lucide-react";

const posterPath = (movie) => movie?.posterPath || movie?.poster_path;

function dateValue(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (typeof value === "number") return new Date(value);
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthLabel(value, language) {
  const date = dateValue(value);
  if (!date) return language === "tr" ? "Tarih belirtilmemiş" : "Date not available";
  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { month: "long", year: "numeric" }).format(date);
}

function watchedDate(value, language) {
  const date = dateValue(value);
  if (!date) return language === "tr" ? "Tarih belirtilmemiş" : "Date not available";
  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export default function ListMovieGrid({ movies = [], language, watchedLabel, ownerWatchedLabel, viewerWatchedLabel, viewerListLabel, t, onRemove, isWatchedList = false }) {
  if (!movies.length) {
    return (
      <section className="flex min-h-[360px] flex-col items-center justify-center border-t border-border px-5 py-16 text-center" aria-label={t("home.emptyTitle")}>
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border text-muted"><Film size={28} aria-hidden="true" /></div>
        <h2 className="font-syne text-xl font-semibold text-text">{language === "tr" ? "Henüz film eklenmemiş" : "No films added yet"}</h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{t("home.emptyText")}</p>
        <Link href="/search" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 text-sm font-semibold text-bg transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Search size={16} aria-hidden="true" />{t("search.title")}</Link>
      </section>
    );
  }

  const groups = isWatchedList ? movies.reduce((result, movie) => {
    const date = dateValue(movie.watchedAt || movie.watchDate);
    const key = date ? `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}` : "undated";
    result[key] ||= { label: monthLabel(movie.watchedAt || movie.watchDate, language), movies: [] };
    result[key].movies.push(movie);
    return result;
  }, {}) : { all: { label: null, movies } };
  const orderedGroups = Object.entries(groups)
    .sort(([firstKey], [secondKey]) => (firstKey === "undated" ? 1 : secondKey === "undated" ? -1 : secondKey.localeCompare(firstKey)))
    .map(([, group]) => ({ ...group, movies: isWatchedList ? [...group.movies].sort((a, b) => (dateValue(b.watchedAt || b.watchDate)?.getTime() || 0) - (dateValue(a.watchedAt || a.watchDate)?.getTime() || 0)) : group.movies }));

  return (
    <section aria-label={t("lists.title")} className="space-y-8">
      {orderedGroups.map((group) => <div key={group.label || "all"} className="space-y-3">
        {group.label && <h2 className="border-b border-border pb-2 font-syne text-lg font-semibold capitalize text-text">{group.label}</h2>}
        <div className="divide-y divide-border overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface-2">
        {group.movies.map((movie) => {
          const path = posterPath(movie);
          return (
            <article key={movie.id} className="group relative flex min-h-28 items-center gap-4 p-3 sm:p-4">
              <Link href={`/movie/${movie.id}`} className="flex min-w-0 flex-1 items-center gap-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-2">
                  {path ? <Image src={`https://image.tmdb.org/t/p/w185${path}`} alt={movie.title || "Movie poster"} fill sizes="64px" className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized /> : <div className="flex h-full items-center justify-center text-muted"><Film size={20} aria-hidden="true" /></div>}
                  {(movie.ownerWatched || movie.viewerWatched || movie.inViewerList || movie.isWatched) && (
                    <div className="absolute left-1 top-1 flex max-w-[calc(100%-0.5rem)] flex-col items-start gap-1">
                      {!movie.ownerWatched && !movie.viewerWatched && !movie.inViewerList && movie.isWatched && <span className="rounded-full bg-success px-1.5 py-1 text-[9px] font-semibold text-bg">{watchedLabel}</span>}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-text sm:text-base">{movie.title}</h2>
                  {movie.releaseDate && <p className="mt-1 text-xs text-muted">{movie.releaseDate.slice(0, 4)}</p>}
                  {isWatchedList && <p className="mt-2 text-xs text-accent">{watchedDate(movie.watchedAt || movie.watchDate, language)}</p>}
                  {(movie.ownerWatched || movie.viewerWatched || movie.inViewerList) && <div className="mt-2 flex flex-wrap gap-1">
                    {movie.ownerWatched && ownerWatchedLabel && <span className="rounded-full bg-accent-alt px-2 py-1 text-[10px] font-semibold text-bg">{ownerWatchedLabel}</span>}
                    {movie.viewerWatched && viewerWatchedLabel && <span className="rounded-full bg-success px-2 py-1 text-[10px] font-semibold text-bg">{viewerWatchedLabel}</span>}
                    {movie.inViewerList && viewerListLabel && <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold text-text">{viewerListLabel}</span>}
                  </div>}
                </div>
              </Link>
              {onRemove && <button type="button" onClick={() => onRemove(movie)} aria-label={t("movie.removeRecord")} className="absolute right-2 top-2 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-bg/80 text-text opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"><X size={16} aria-hidden="true" /></button>}
            </article>
          );
        })}
        </div>
      </div>)}
    </section>
  );
}
