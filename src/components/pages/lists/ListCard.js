"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Globe2, Lock, MoreHorizontal, Pencil } from "lucide-react";
import Badge from "@/components/ui/Badge";

const posterPath = (movie) => movie?.posterPath || movie?.poster_path;

function Visibility({ list, t }) {
  const isPrivate = list.visibility === "private";
  const Icon = isPrivate ? Lock : Globe2;
  return <span className="inline-flex items-center gap-1.5 text-xs text-muted"><Icon size={14} aria-hidden="true" />{isPrivate ? t("lists.private") : t("lists.public")}</span>;
}

function DefaultPreview({ movies }) {
  return (
    <div className="grid h-full w-28 shrink-0 grid-cols-2 overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface md:w-36">
      {Array.from({ length: 4 }, (_, index) => {
        const movie = movies[index];
        const path = posterPath(movie);
        return <div key={movie?.id || index} className="relative min-h-12 bg-[linear-gradient(145deg,var(--color-surface-2),var(--color-bg))]">{path && <Image src={`https://image.tmdb.org/t/p/w185${path}`} alt="" fill sizes="72px" className="object-cover" unoptimized />}</div>;
      })}
    </div>
  );
}

export default function ListCard({ list, movies = [], t, editingId, editingName, onEditStart, onEditingNameChange, onSave, onVisibilityChange, onDelete }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isDefault = list.id === "wishlist" || list.id === "watched";
  const title = list.id === "wishlist" ? t("home.wishlist") : list.id === "watched" ? t("home.watched") : list.name;
  const count = list.movieCount ?? list.count ?? movies.length;
  const firstPoster = posterPath(movies[0]);

  if (isDefault) {
    return (
      <article className="group flex min-h-32 items-center gap-4 rounded-[var(--radius-lg)] border border-border bg-surface-2 p-3 transition-transform duration-200 hover:scale-[1.01] md:p-4">
        <Link href={`/lists/${list.id}`} className="flex min-h-24 min-w-0 flex-1 items-center gap-4 text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          <DefaultPreview movies={movies} />
          <div className="min-w-0">
            <h2 className="truncate font-syne text-xl font-semibold text-text">{title}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2"><Badge tone="muted">{count}</Badge><span className="text-xs text-muted">{t("common.film")}</span></div>
            <div className="mt-3"><Visibility list={list} t={t} /></div>
          </div>
        </Link>
      </article>
    );
  }

  const isEditing = editingId === list.id;
  return (
    <article className="group relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface-2 transition-transform duration-200 hover:scale-[1.01]">
      {firstPoster ? <Image src={`https://image.tmdb.org/t/p/w780${firstPoster}`} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" className="scale-110 object-cover opacity-35 blur-md transition-opacity duration-200 group-hover:opacity-45" unoptimized /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-accent-glow),var(--color-surface-2)_50%,var(--color-bg))]" />}
      <div className="absolute inset-0 bg-gradient-to-b from-bg/35 via-bg/45 to-bg" />
      <Link href={`/lists/${list.id}`} className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" aria-label={title} />
      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            {isEditing ? <input autoFocus value={editingName} onChange={(event) => onEditingNameChange(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSave(list)} className="min-h-11 w-full rounded-[var(--radius-md)] border border-accent bg-bg/80 px-3 text-sm text-text outline-none focus-visible:ring-2 focus-visible:ring-accent" /> : <h2 className="truncate font-syne text-xl font-semibold text-text">{title}</h2>}
            <div className="mt-2 flex items-center gap-2"><Badge tone="muted">{count}</Badge><span className="text-xs text-muted">{t("common.film")}</span></div>
          </div>
          <div className="relative">
            <button type="button" onClick={() => setMenuOpen((open) => !open)} aria-label={t("lists.rename")} aria-expanded={menuOpen} className="relative z-20 flex min-h-11 min-w-11 items-center justify-center rounded-full text-text transition-colors hover:bg-bg/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><MoreHorizontal size={19} aria-hidden="true" /></button>
            {menuOpen && (
              <div className="absolute right-0 top-12 z-30 min-w-40 rounded-[var(--radius-md)] border border-border bg-surface p-1 shadow-xl shadow-black/30">
                {isEditing ? <button type="button" onClick={() => { onSave(list); setMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-xs text-text hover:bg-surface-2"><Check size={15} aria-hidden="true" />{t("lists.save")}</button> : <button type="button" onClick={() => { onEditStart(list); setMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-xs text-text hover:bg-surface-2"><Pencil size={15} aria-hidden="true" />{t("lists.rename")}</button>}
                <button type="button" onClick={() => { onVisibilityChange(list, list.visibility === "private" ? "public" : "private"); setMenuOpen(false); }} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-xs text-text hover:bg-surface-2"><Visibility list={list} t={t} /></button>
                {onDelete && <button type="button" onClick={() => onDelete(list)} className="flex min-h-11 w-full items-center gap-2 rounded-md px-3 text-left text-xs text-danger hover:bg-danger/10">{t("common.delete") || "Delete"}</button>}
              </div>
            )}
          </div>
        </div>
        <div className="relative z-10 flex items-end justify-between gap-3"><Visibility list={list} t={t} /><Link href={`/lists/${list.id}`} className="min-h-11 px-2 py-3 text-xs font-semibold text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t("common.details")}</Link></div>
      </div>
    </article>
  );
}
