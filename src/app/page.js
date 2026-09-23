"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { getLanguageConfig, translate } from "@/lib/i18n";
import HomeView from "@/components/pages/home/HomeView";

dayjs.extend(relativeTime);

const SORT_VALUES = {
  wishlist: ["addedAt_desc", "addedAt_asc", "title_asc", "title_desc"],
};

function sortMovies(movies, sortKey, locale) {
  const [field, dir] = sortKey.split("_");
  return [...movies].sort((a, b) => {
    if (field === "title") {
      return dir === "asc"
        ? (a.title || "").localeCompare(b.title || "", locale)
        : (b.title || "").localeCompare(a.title || "", locale);
    }
    const av = a[field] || 0;
    const bv = b[field] || 0;
    return dir === "asc" ? av - bv : bv - av;
  });
}

export default function Home() {
  const { user, loading, language } = useAuth();
  const t = (key, values) => translate(language, key, values);
  const { movies, lists, listMovies, watchedMovieIds } = useAppData();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(() =>
    typeof window !== "undefined" ? sessionStorage.getItem("movieTracker_homeTab") || "wishlist" : "wishlist",
  );

  const [sortKey, setSortKey] = useState(() =>
    typeof window !== "undefined"
      ? SORT_VALUES.wishlist.includes(sessionStorage.getItem("movieTracker_homeSortKey"))
        ? sessionStorage.getItem("movieTracker_homeSortKey")
        : "addedAt_desc"
      : "addedAt_desc",
  );

  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef(null);
  const [heroMovieId, setHeroMovieId] = useState(null);

  // Wishlist ve Watched türetilen verileri
  const wishlist = useMemo(() => movies?.filter((m) => m.status === "wishlist") || [], [movies]);
  const watched = useMemo(() => movies?.filter((m) => m.isWatched) || [], [movies]);

  useEffect(() => {
    if (!loading && user === null) router.push("/login");
  }, [user, loading, router]);

  // Dropdown dışı tıklama kontrolü
  useEffect(() => {
    const close = (event) => {
      if (sortRef.current && !sortRef.current.contains(event.target)) {
        setSortOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  if (loading) return <div className="min-h-screen bg-void" />;
  if (!user) return null;

  const hero = wishlist.find((m) => m.id === heroMovieId) || wishlist[0];
  const listed = sortMovies(wishlist, sortKey, language);

  const sortLabels = {
    addedAt_desc: t("home.sortAddedDesc"),
    addedAt_asc: t("home.sortAddedAsc"),
    watchedAt_desc: t("home.sortWatchedDesc"),
    watchedAt_asc: t("home.sortWatchedAsc"),
    rating_desc: t("home.sortRatingDesc"),
    rating_asc: t("home.sortRatingAsc"),
    title_asc: t("home.sortTitleAsc"),
    title_desc: t("home.sortTitleDesc"),
  };

  const options = SORT_VALUES.wishlist.map((value) => ({
    value,
    label: sortLabels[value] || value,
  }));

  const changeTab = (tab) => {
    setActiveTab(tab);
    sessionStorage.setItem("movieTracker_homeTab", tab);
  };

  const shuffle = () => {
    if (wishlist.length) {
      const nextList = wishlist.filter((m) => m.id !== heroMovieId);
      const target = nextList.length ? nextList : wishlist;
      setHeroMovieId(target[Math.floor(Math.random() * target.length)].id);
    }
  };

  const changeSort = (value) => {
    setSortKey(value);
    sessionStorage.setItem("movieTracker_homeSortKey", value);
    setSortOpen(false);
  };

  return (
    <HomeView
      hero={hero}
      t={t}
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
      lists={lists}
      listMovies={listMovies}
      watchedMovieIds={watchedMovieIds}
    />
  );
}
