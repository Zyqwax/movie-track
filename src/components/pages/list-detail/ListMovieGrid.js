import Image from "next/image";
import Link from "next/link";
import { Film, Search, X } from "lucide-react";

const posterPath = (movie) => movie?.posterPath || movie?.poster_path;

export default function ListMovieGrid({ movies = [], language, watchedLabel, ownerWatchedLabel, viewerWatchedLabel, viewerListLabel, t, onRemove }) {
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

  return (
    <section aria-label={t("lists.title")}>
      <div className="grid grid-cols-2 gap-x-2 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
        {movies.map((movie) => {
          const path = posterPath(movie);
          return (
            <article key={movie.id} className="group relative min-w-0">
              <Link href={`/movie/${movie.id}`} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <div className="relative aspect-[2/3] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-2">
                  {path ? <Image src={`https://image.tmdb.org/t/p/w342${path}`} alt={movie.title || "Movie poster"} fill sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 150px" className="object-cover transition-transform duration-300 group-hover:scale-105" unoptimized /> : <div className="flex h-full items-center justify-center text-muted"><Film size={24} aria-hidden="true" /></div>}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/90 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  <span className="absolute bottom-3 left-3 right-3 truncate text-sm font-semibold text-text opacity-0 transition-opacity duration-200 group-hover:opacity-100">{movie.title}</span>
                  {(movie.ownerWatched || movie.viewerWatched || movie.inViewerList || movie.isWatched) && (
                    <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1">
                      {movie.ownerWatched && <span className="rounded-full bg-accent-alt px-2 py-1 text-[10px] font-semibold text-bg">{ownerWatchedLabel}</span>}
                      {movie.viewerWatched && <span className="rounded-full bg-success px-2 py-1 text-[10px] font-semibold text-bg">{viewerWatchedLabel}</span>}
                      {movie.inViewerList && <span className="rounded-full bg-accent px-2 py-1 text-[10px] font-semibold text-text">{viewerListLabel}</span>}
                      {!movie.ownerWatched && !movie.viewerWatched && !movie.inViewerList && movie.isWatched && <span className="rounded-full bg-success px-2 py-1 text-[10px] font-semibold text-bg">{watchedLabel}</span>}
                    </div>
                  )}
                </div>
                <h2 className="mt-3 truncate text-sm font-semibold text-text">{movie.title}</h2>
                {movie.releaseDate && <p className="mt-1 text-xs text-muted">{movie.releaseDate.slice(0, 4)}</p>}
              </Link>
              {onRemove && <button type="button" onClick={() => onRemove(movie)} aria-label={t("movie.removeRecord")} className="absolute right-2 top-2 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-bg/80 text-text opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"><X size={16} aria-hidden="true" /></button>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
