"use client";

import { useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { getLanguageConfig } from "@/lib/i18n";
import HomeView from "@/components/pages/home/HomeView";

dayjs.extend(relativeTime);

// ── Sort configuration ──────────────────────────────────────────────────────
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
  const [field, dir] = sortKey.split("_");
  return [...movies].sort((a, b) => {
    if (field === "title")
      return dir === "asc"
        ? (a.title || "").localeCompare(b.title || "", "tr")
        : (b.title || "").localeCompare(a.title || "", "tr");
    const av = a[field] || 0;
    const bv = b[field] || 0;
    return dir === "asc" ? av - bv : bv - av;
  });
}

// ── Page controller ─────────────────────────────────────────────────────────
export default function Home() {
  const { user, loading, language } = useAuth();
  const { movies } = useAppData();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("movieTracker_homeTab") || "wishlist"
      : "wishlist",
  );
  const [sortKey, setSortKey] = useState(() =>
    typeof window !== "undefined"
      ? sessionStorage.getItem("movieTracker_homeSortKey") || "addedAt_desc"
      : "addedAt_desc",
  );
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  const [heroMovieId, setHeroMovieId] = useState(null);

  useEffect(() => {
    if (!movies || heroMovieId) return;
    const list = movies.filter((m) => m.status === "wishlist");
    if (!list.length) return;
    const timeoutId = setTimeout(
      () => setHeroMovieId(list[Math.floor(Math.random() * list.length)].id),
      0,
    );
    return () => clearTimeout(timeoutId);
  }, [movies, heroMovieId]);
  useEffect(() => {
    if (!loading && user === null) router.push("/login");
  }, [user, loading, router]);
  useEffect(() => {
    const close = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target))
        setSortOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  if (loading) return <div className="min-h-screen bg-void" />;
  if (!user) return null;

  // ── Derived view data ─────────────────────────────────────────────────────
  const wishlist = movies?.filter((m) => m.status === "wishlist") || [];
  const watched = movies?.filter((m) => m.status === "watched") || [];
  const hero = wishlist.find((m) => m.id === heroMovieId) || wishlist[0];
  const listed = sortMovies(
    movies?.filter((m) => m.status === activeTab) || [],
    sortKey,
  );
  const options = SORT_OPTIONS[activeTab];
  const changeTab = (tab) => {
    const nextSort = tab === "wishlist" ? "addedAt_desc" : "watchedAt_desc";
    setActiveTab(tab);
    setSortKey(nextSort);
    sessionStorage.setItem("movieTracker_homeTab", tab);
    sessionStorage.setItem("movieTracker_homeSortKey", nextSort);
  };
  const shuffle = () => {
    if (wishlist.length)
      setHeroMovieId(wishlist[Math.floor(Math.random() * wishlist.length)].id);
  };
  const changeSort = (value) => {
    setSortKey(value);
    sessionStorage.setItem("movieTracker_homeSortKey", value);
    setSortOpen(false);
  };

  return (
    <HomeView
      hero={hero}
      wishlist={wishlist}
      watched={watched}
      activeTab={activeTab}
      listed={listed}
      options={options}
      sortKey={sortKey}
      sortOpen={sortOpen}
      sortRef={sortRef}
      dayjsLocale={getLanguageConfig(language).dayjs}
      onShuffle={shuffle}
      onTabChange={changeTab}
      onSortToggle={() => setSortOpen((open) => !open)}
      onSortChange={changeSort}
    />
  );
}
