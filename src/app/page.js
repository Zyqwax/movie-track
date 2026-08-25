"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, ChevronDown, Dices, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { MovieCard, PerfStrip, TicketStub } from "@/components/ArchiveUI";

dayjs.extend(relativeTime); dayjs.locale("tr");

const SORT_OPTIONS = {
  wishlist: [{ label: "En Son Eklenen", value: "addedAt_desc" }, { label: "En Eski Eklenen", value: "addedAt_asc" }, { label: "İsme Göre (A→Z)", value: "title_asc" }, { label: "İsme Göre (Z→A)", value: "title_desc" }],
  watched: [{ label: "En Son İzlenen", value: "watchedAt_desc" }, { label: "En Eski İzlenen", value: "watchedAt_asc" }, { label: "En Yüksek Puan", value: "rating_desc" }, { label: "En Düşük Puan", value: "rating_asc" }, { label: "İsme Göre (A→Z)", value: "title_asc" }],
};
function sortMovies(movies, sortKey) {
  const [field, dir] = sortKey.split("_");
  return [...movies].sort((a, b) => {
    if (field === "title") return dir === "asc" ? (a.title || "").localeCompare(b.title || "", "tr") : (b.title || "").localeCompare(a.title || "", "tr");
    const av = a[field] || 0; const bv = b[field] || 0;
    return dir === "asc" ? av - bv : bv - av;
  });
}

export default function Home() {
  const { user, loading } = useAuth(); const { movies } = useAppData(); const router = useRouter();
  const [activeTab, setActiveTab] = useState(() => typeof window !== "undefined" ? sessionStorage.getItem("movieTracker_homeTab") || "wishlist" : "wishlist");
  const [sortKey, setSortKey] = useState(() => typeof window !== "undefined" ? sessionStorage.getItem("movieTracker_homeSortKey") || "addedAt_desc" : "addedAt_desc");
  const [sortOpen, setSortOpen] = useState(false); const sortRef = useRef(null); const [heroMovieId, setHeroMovieId] = useState(null);
  useEffect(() => {
    if (!movies || heroMovieId) return;
    const list = movies.filter((m) => m.status === "wishlist");
    if (!list.length) return;
    const timeoutId = setTimeout(() => {
      setHeroMovieId(list[Math.floor(Math.random() * list.length)].id);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [movies, heroMovieId]);
  useEffect(() => { if (!loading && user === null) router.push("/login"); }, [user, loading, router]);
  useEffect(() => { const close = (event) => { if (sortRef.current && !sortRef.current.contains(event.target)) setSortOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  if (loading) return <div className="loading-screen" />; if (!user) return null;

  const wishlist = movies?.filter((m) => m.status === "wishlist") || []; const watched = movies?.filter((m) => m.status === "watched") || [];
  const hero = wishlist.find((m) => m.id === heroMovieId) || wishlist[0]; const listed = sortMovies(movies?.filter((m) => m.status === activeTab) || [], sortKey); const options = SORT_OPTIONS[activeTab];
  const changeTab = (tab) => { const nextSort = tab === "wishlist" ? "addedAt_desc" : "watchedAt_desc"; setActiveTab(tab); setSortKey(nextSort); sessionStorage.setItem("movieTracker_homeTab", tab); sessionStorage.setItem("movieTracker_homeSortKey", nextSort); };
  const shuffle = () => { if (wishlist.length) setHeroMovieId(wishlist[Math.floor(Math.random() * wishlist.length)].id); };

  return <div className="archive-page home-page">
    <section className="hero-archive">
      {(hero?.backdropPath || hero?.posterPath || hero?.poster_path) && <Image className="hero-backdrop" src={`https://image.tmdb.org/t/p/${hero?.backdropPath ? "original" : "w780"}${hero.backdropPath || hero.posterPath || hero.poster_path}`} alt="" fill priority sizes="100vw" unoptimized />}
      <PerfStrip className="top" />
      {hero ? <>
        <div className="lucky-badge"><Dices size={13} /> ŞANSLI FİLM</div>
        <h1 className="hero-title">{hero.title}</h1>
        <div className="hero-meta"><span>{hero.releaseDate?.slice(0, 4) || "—"}</span><b>·</b><span>{hero.runtime ? `${hero.runtime} dk` : "Arşiv kaydı"}</span><b>·</b><span className="hero-pill">{hero.genres?.[0] || "Film"}</span></div>
        <div className="hero-bottom"><div className="hero-actions"><Link href={`/movie/${hero.id}`} className="btn btn-gold">Detayları Gör</Link><button className="btn btn-ghost icon-button" onClick={shuffle} aria-label="Şanslı filmi değiştir"><Dices size={16} /></button></div><TicketStub wishlist={wishlist.length} watched={watched.length} /></div>
      </> : <div className="hero-empty"><ImageIcon size={28} /><span>İzleme listeniz boş</span></div>}
      <PerfStrip className="bottom" />
    </section>
    <section className="archive-section">
      <div className="tabs-row"><div className="tabs" role="tablist">{[["wishlist", "İzleme Listem", wishlist.length], ["watched", "İzlediklerim", watched.length]].map(([id, label, count]) => <button key={id} role="tab" aria-selected={activeTab === id} onClick={() => changeTab(id)} className={clsx("tab", activeTab === id && "active")}>{label} <small>{count}</small></button>)}</div>
        <div className="sort-wrap" ref={sortRef}><button className="sort-button" onClick={() => setSortOpen((open) => !open)}><ArrowUpDown size={14} /><span>{options.find((option) => option.value === sortKey)?.label}</span><ChevronDown size={14} /></button>{sortOpen && <div className="sort-menu">{options.map((option) => <button key={option.value} onClick={() => { setSortKey(option.value); sessionStorage.setItem("movieTracker_homeSortKey", option.value); setSortOpen(false); }}>{option.label}</button>)}</div>}</div>
      </div>
      {listed.length ? <div className="archive-grid">{listed.map((movie) => <MovieCard key={movie.id} movie={movie} rating={activeTab === "watched" ? movie.rating : null} subtitle={activeTab === "watched" && movie.watchedAt ? dayjs(movie.watchedAt).fromNow() : undefined} />)}</div> : <div className="empty-archive"><ImageIcon size={28} /><strong>Bu liste boş</strong><span>Keşfet bölümünden ilk filmi ekleyebilirsin.</span></div>}
    </section>
  </div>;
}
