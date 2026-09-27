import Image from "next/image";
import Link from "next/link";
import { Check, Film, Search, X } from "lucide-react";

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
  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function watchedDate(value, language) {
  const date = dateValue(value);
  if (!date) return language === "tr" ? "Tarih belirtilmemiş" : "Date not available";
  return new Intl.DateTimeFormat(language === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ListMovieGrid({
  movies = [],
  language,
  watchedLabel,
  ownerWatchedLabel,
  viewerWatchedLabel,
  viewerListLabel,
  t,
  onRemove,
  isWatchedList = false,
}) {
  if (!movies.length) {
    return (
      <section
        className="flex min-h-[360px] flex-col items-center justify-center border-t border-border px-5 py-16 text-center"
        aria-label={t("home.emptyTitle")}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border text-muted">
          <Film size={28} aria-hidden="true" />
        </div>
        <h2 className="font-syne text-xl font-semibold text-text">
          {language === "tr" ? "Henüz film eklenmemiş" : "No films added yet"}
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{t("home.emptyText")}</p>
        <Link
          href="/search"
          className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] bg-accent px-4 text-sm font-semibold text-bg transition-[filter] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Search size={16} aria-hidden="true" />
          {t("search.title")}
        </Link>
      </section>
    );
  }

  const shouldGroupByMonth = isWatchedList;
  const groups = shouldGroupByMonth
    ? movies.reduce((result, movie) => {
        const date = dateValue(movie.watchedAt || movie.watchDate);
        const key = date ? `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}` : "undated";
        result[key] ||= { label: monthLabel(movie.watchedAt || movie.watchDate, language), movies: [] };
        result[key].movies.push(movie);
        return result;
      }, {})
    : { all: { label: null, movies } };

  const orderedGroups = Object.entries(groups)
    .sort(([a], [b]) => (a === "undated" ? 1 : b === "undated" ? -1 : b.localeCompare(a)))
    .map(([, group]) => ({
      ...group,
      movies: shouldGroupByMonth
        ? [...group.movies].sort(
            (a, b) =>
              (dateValue(b.watchedAt || b.watchDate)?.getTime() || 0) -
              (dateValue(a.watchedAt || a.watchDate)?.getTime() || 0),
          )
        : group.movies,
    }));

  return (
    <section aria-label={t("lists.title")} className="space-y-6">
      {orderedGroups.map((group) => (
        <div key={group.label || "all"}>
          {group.label && (
            <h2 className="mb-2 border-b border-border pb-2 text-sm font-medium capitalize text-muted">
              {group.label}
            </h2>
          )}
          <div className="divide-border overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface divide-y">
            {group.movies.map((movie) => {
              const path = posterPath(movie);
              const hasStatusBadge = movie.ownerWatched || movie.viewerWatched || movie.inViewerList || movie.isWatched;

              return (
                <article
                  key={movie.id}
                  className="group relative flex min-h-[72px] items-center gap-3 bg-surface px-3 py-3 transition-colors hover:bg-surface-2 sm:px-4"
                >
                  <Link
                    href={`/movie/${movie.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {/* Poster — compact */}
                    <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-1">
                      {path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${path}`}
                          alt={movie.title || "Movie poster"}
                          fill
                          sizes="44px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted">
                          <Film size={16} aria-hidden="true" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text">{movie.title}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                        {movie.releaseDate && (
                          <span className="text-xs text-muted">{movie.releaseDate.slice(0, 4)}</span>
                        )}
                        {isWatchedList && (
                          <span className="text-xs text-accent">
                            {watchedDate(movie.watchedAt || movie.watchDate, language)}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Status badges — right side */}
                  {hasStatusBadge && (
                    <div className="flex shrink-0 items-center gap-1.5">
                      {movie.isWatched && !movie.ownerWatched && !movie.viewerWatched && !movie.inViewerList && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border-success bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                          <Check size={11} aria-hidden="true" />
                          {watchedLabel}
                        </span>
                      )}
                      {movie.ownerWatched && ownerWatchedLabel && (
                        <span className="rounded-full bg-accent-alt px-2.5 py-1 text-[11px] font-medium text-bg">
                          {ownerWatchedLabel}
                        </span>
                      )}
                      {movie.viewerWatched && viewerWatchedLabel && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-border-success bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                          <Check size={11} aria-hidden="true" />
                          {viewerWatchedLabel}
                        </span>
                      )}
                      {movie.inViewerList && viewerListLabel && (
                        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-bg">
                          {viewerListLabel}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Remove button */}
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(movie)}
                      aria-label={t("movie.removeRecord")}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted opacity-0 transition-all hover:bg-danger/10 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                    >
                      <X size={15} aria-hidden="true" />
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
