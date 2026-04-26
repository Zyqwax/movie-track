"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { Star, Image as ImageIcon, Play, ArrowUpDown, ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import clsx from "clsx";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("tr");

const SORT_OPTIONS = {
  wishlist: [
    { label: "En Son Eklenen", value: "addedAt_desc" },
    { label: "En Eski Eklenen", value: "addedAt_asc" },
    { label: "İsme Göre (A→Z)", value: "title_asc" },
    { label: "İsme Göre (Z→A)", value: "title_desc" },
  ],
  watched: [
    { label: "En Son İzlenen", value: "watchedAt_desc" },
    { label: "En Eski İzlenen", value: "watchedAt_asc" },
    { label: "En Yüksek Puan", value: "rating_desc" },
    { label: "En Düşük Puan", value: "rating_asc" },
    { label: "İsme Göre (A→Z)", value: "title_asc" },
  ],
};

function sortMovies(movies, sortKey) {
  const sorted = [...movies];
  const [field, dir] = sortKey.split("_");
  sorted.sort((a, b) => {
    if (field === "title") {
      return dir === "asc"
        ? (a.title || "").localeCompare(b.title || "", "tr")
        : (b.title || "").localeCompare(a.title || "", "tr");
    }
    const aVal = a[field] || 0;
    const bVal = b[field] || 0;
    return dir === "asc" ? aVal - bVal : bVal - aVal;
  });
  return sorted;
}

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("wishlist");
  const [movies, setMovies] = useState(undefined);
  const [sortKey, setSortKey] = useState("addedAt_desc");
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  // Track which direction the tab switched for animation
  const prevTabRef = useRef("wishlist");

  useEffect(() => {
    if (user === null) {
      router.push("/login");
      return;
    }
    if (user) {
      const q = query(collection(db, "users", user.uid, "movies"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = [];
        snapshot.forEach((d) => data.push({ id: d.id, ...d.data() }));
        setMovies(data);
      });
      return () => unsubscribe();
    }
  }, [user, router]);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  const handleTabChange = (tab) => {
    prevTabRef.current = activeTab;
    setActiveTab(tab);
    // Reset to sensible default sort for each tab
    setSortKey(tab === "wishlist" ? "addedAt_desc" : "watchedAt_desc");
    setSortOpen(false);
  };

  const baseMovies = movies?.filter((m) => m.status === activeTab) || [];
  const filteredMovies = sortMovies(baseMovies, sortKey);
  const heroMovie = movies?.filter((m) => m.status === "wishlist")[0];
  const currentSortOptions = SORT_OPTIONS[activeTab];
  const currentSortLabel = currentSortOptions.find((o) => o.value === sortKey)?.label;

  const tabDirection = activeTab === "watched" && prevTabRef.current === "wishlist" ? 1 : -1;

  return (
    <div className="min-h-full flex flex-col bg-zinc-950">

      {/* Hero Section */}
      <div className="relative w-full h-[45vh] md:h-[52vh] bg-zinc-900 overflow-hidden flex items-end">
        {heroMovie ? (
          <>
            <Image
              src={`https://image.tmdb.org/t/p/original${heroMovie.posterPath}`}
              alt={heroMovie.title}
              fill
              className="object-cover opacity-40"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/60 via-transparent to-transparent hidden md:block" />
            {/* Hero content */}
            <div className="relative z-10 w-full max-w-6xl mx-auto px-4 md:px-8 pb-6 md:pb-10 flex items-end justify-between gap-8">
              <div className="flex-1 max-w-lg">
                <span className="px-2.5 py-1 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-md mb-3 inline-block">
                  Sıradaki Film
                </span>
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight drop-shadow-lg line-clamp-2">
                  {heroMovie.title}
                </h2>
                <Link
                  href={`/movie/${heroMovie.id}`}
                  className="inline-flex items-center gap-2 bg-white text-zinc-950 px-5 py-2.5 rounded-full font-semibold text-sm hover:bg-zinc-100 transition"
                >
                  <Play size={15} fill="currentColor" />
                  Detaylara Git
                </Link>
              </div>
              {/* Desktop: stats panel */}
              {movies !== undefined && (
                <div className="hidden md:flex gap-3 shrink-0">
                  {[
                    { label: "İzlenecek", count: movies.filter(m => m.status === "wishlist").length, color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
                    { label: "İzlendi", count: movies.filter(m => m.status === "watched").length, color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
                  ].map(s => (
                    <div key={s.label} className={`flex flex-col items-center justify-center w-24 h-20 rounded-2xl border backdrop-blur-sm ${s.bg}`}>
                      <span className={`text-2xl font-bold ${s.color}`}>{s.count}</span>
                      <span className="text-[11px] text-zinc-400 mt-0.5">{s.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ImageIcon size={36} className="text-zinc-700" />
            <p className="text-zinc-500 text-sm">İzlenecek listeniz boş</p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 pt-5">

        {/* Tab + Sort Row */}
        <div className="flex items-center gap-3 mb-5">

          {/* Tab Switcher — pill style */}
          <div className="flex gap-1.5 bg-zinc-900 border border-zinc-800 rounded-xl p-1 flex-1">
            {[
              { label: "İzlenecekler", value: "wishlist" },
              { label: "İzlenenler", value: "watched" },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => handleTabChange(tab.value)}
                className={clsx(
                  "relative flex-1 py-2 text-xs font-semibold rounded-lg transition-colors duration-200 z-10 flex items-center justify-center",
                  activeTab === tab.value
                    ? "text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {activeTab === tab.value && (
                  <motion.div
                    layoutId="tab-pill"
                    className="absolute inset-0 bg-zinc-700 rounded-lg"
                    style={{ zIndex: -1 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                {movies !== undefined && (
                  <span className={clsx(
                    "relative z-10 ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full",
                    activeTab === tab.value ? "bg-rose-500/20 text-rose-400" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {movies.filter((m) => m.status === tab.value).length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              onClick={() => setSortOpen((v) => !v)}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-colors",
                sortOpen
                  ? "bg-zinc-800 border-zinc-600 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700"
              )}
            >
              <ArrowUpDown size={13} />
              <span className="hidden sm:inline">{currentSortLabel}</span>
              <ChevronDown size={13} className={clsx("transition-transform", sortOpen && "rotate-180")} />
            </button>

            <AnimatePresence>
              {sortOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.97 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl shadow-black/40 overflow-hidden z-50"
                >
                  {currentSortOptions.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortKey(opt.value); setSortOpen(false); }}
                      className={clsx(
                        "w-full text-left px-4 py-3 text-xs transition-colors",
                        sortKey === opt.value
                          ? "text-white font-semibold bg-zinc-800"
                          : "text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200"
                      )}
                    >
                      {opt.value === sortKey && <span className="mr-1.5 text-rose-400">✓</span>}
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Movie Grid — no per-card entry animation on tab switch, just fade the whole grid */}
        {movies === undefined ? (
          <div className="flex justify-center my-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {filteredMovies.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-zinc-500 py-16">
                  <div className="w-16 h-16 mb-4 rounded-full bg-zinc-900 flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 opacity-50" />
                  </div>
                  <p className="text-sm">Bu listede henüz film yok.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2.5 pb-4">
                  {filteredMovies.map((movie) => (
                    <Link
                      key={movie.id}
                      href={`/movie/${movie.id}`}
                      className="relative group rounded-xl overflow-hidden aspect-[2/3] bg-zinc-800 block"
                    >
                      {movie.posterPath ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                          alt={movie.title}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                          <ImageIcon className="text-zinc-600 mb-1" size={20} />
                          <span className="text-[9px] text-zinc-500 leading-tight">{movie.title}</span>
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-[9px] sm:text-[10px] font-semibold text-white leading-tight line-clamp-2 mb-1">
                          {movie.title}
                        </p>
                        {activeTab === "watched" && movie.rating > 0 && (
                          <div className="flex items-center gap-0.5 text-amber-400 text-[8px] font-bold">
                            <Star size={8} className="fill-amber-400" /> {movie.rating}/10
                          </div>
                        )}
                        {activeTab === "watched" && movie.watchedAt && (
                          <p className="text-[8px] text-zinc-400 truncate hidden sm:block">
                            {dayjs(movie.watchedAt).fromNow()}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
