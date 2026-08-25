"use client";

import Image from "next/image";
import Link from "next/link";
import { Film, Play, Shuffle } from "lucide-react";

export function PerfStrip({ className = "" }) {
  return <div className={`perf-strip ${className}`} aria-hidden="true"><i /><i /><i /><i /><b /><i /><i /><i /><i /></div>;
}

export function TicketStub({ wishlist = 0, watched = 0 }) {
  return <div className="stub-row" aria-label={`${wishlist} listede, ${watched} izlendi`}>
    <div className="stub"><span className="n">{wishlist}</span><span className="l">Listede</span></div>
    <div className="stub"><span className="n">{watched}</span><span className="l">İzlendi</span></div>
  </div>;
}

export function ArchiveButton({ children, variant = "gold", className = "", ...props }) {
  return <button className={`btn btn-${variant} ${className}`} {...props}>{children}</button>;
}

function posterUrl(movie, size = "w342") {
  const path = movie?.posterPath || movie?.poster_path;
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function MovieCard({ movie, href, rating, status, subtitle, compact = false }) {
  const image = posterUrl(movie, compact ? "w185" : "w342");
  const score = rating ?? movie?.rating ?? movie?.vote_average;
  const year = movie?.releaseDate?.slice(0, 4) || movie?.release_date?.slice(0, 4);
  const genre = subtitle || movie?.genres?.[0] || "Film arşivi";
  return <Link href={href || `/movie/${movie.id}`} className={`card archive-card ${compact ? "compact" : ""}`}>
    <div className="poster">
      {image ? <Image src={image} alt={movie.title || "Film posteri"} fill sizes="(max-width: 768px) 45vw, (max-width: 1024px) 25vw, 220px" loading="lazy" className="poster-image" unoptimized /> : <div className="poster-fallback"><Film size={22} /><span>{movie.title}</span></div>}
      <div className="poster-shade" />
      {score > 0 && <span className="rating-reel">{Number(score).toFixed(1)}</span>}
      {status && <span className="card-status">{status}</span>}
      <span className="poster-caption">{movie.title}</span>
    </div>
    <div className="card-foot"><div className="card-title">{movie.title}</div><div className="card-sub">{year || "—"} · {genre}</div></div>
  </Link>;
}

export function EmptyArchive({ title = "Arşiv boş", text = "Keşfet bölümünden ilk filmi ekleyebilirsin." }) {
  return <div className="empty-archive"><Film size={28} /><strong>{title}</strong><span>{text}</span></div>;
}

export function HeroActions({ href, onShuffle }) {
  return <div className="hero-actions"><Link href={href} className="btn btn-gold"><Play size={16} fill="currentColor" /> Detayları Gör</Link><button className="btn btn-ghost icon-button" onClick={onShuffle} aria-label="Şanslı filmi değiştir"><Shuffle size={16} /></button></div>;
}
