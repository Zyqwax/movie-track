"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Globe2, Lock, Film, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { fetchAndCacheMovie } from "@/lib/tmdb";
import { getLanguageConfig, translate } from "@/lib/i18n";
import { ShowcaseMovieCard } from "@/components/pages/home/HomeListShowcase";

export default function ListDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading, language, region } = useAuth();
  const t = (key, values) => translate(language, key, values);

  const [list, setList] = useState(null);
  const [rawMovies, setRawMovies] = useState([]);
  const [watchedIds, setWatchedIds] = useState([]);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user || !id) return undefined;
    const listUnsubscribe = onSnapshot(
      doc(db, "users", user.uid, "lists", id),
      (snapshot) => setList(snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null),
      () => setList(null),
    );
    const moviesUnsubscribe = onSnapshot(
      collection(db, "users", user.uid, "lists", id, "movies"),
      (snapshot) => setRawMovies(snapshot.docs.map((movieDoc) => ({ id: movieDoc.id, ...movieDoc.data() }))),
      () => setRawMovies([]),
    );
    const watchLogUnsubscribe = onSnapshot(collection(db, "users", user.uid, "watchLog"), (snapshot) => {
      setWatchedIds(snapshot.docs.filter((item) => item.data()?.isWatched).map((item) => item.id));
    });
    return () => {
      listUnsubscribe();
      moviesUnsubscribe();
      watchLogUnsubscribe();
    };
  }, [authLoading, id, router, user]);

  useEffect(() => {
    let active = true;
    const { tmdb } = getLanguageConfig(language);
    Promise.all(
      rawMovies.map(async (savedMovie) => {
        const movieId = savedMovie.movieId || savedMovie.id;
        const localizedMovie = await fetchAndCacheMovie(movieId, tmdb, region);
        return localizedMovie
          ? { ...savedMovie, ...localizedMovie, id: String(movieId) }
          : { ...savedMovie, id: String(movieId) };
      }),
    ).then((nextMovies) => {
      if (active) {
        setMovies(nextMovies);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [language, rawMovies, region]);

  if (authLoading || !user || loading) return <div className="min-h-dvh bg-void" />;

  if (!list) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-5 px-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10">
          <Film size={32} className="text-white/40" />
        </div>
        <h1 className="font-display text-3xl font-extrabold text-ivory tracking-tight">Liste bulunamadı</h1>
        <Link
          href="/lists"
          className="rounded-full bg-white/10 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
        >
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const watchedSet = new Set(watchedIds);
  const displayMovies = movies.map((movie) => ({ ...movie, isWatched: watchedSet.has(movie.id) }));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-8">
      <Link
        href="/lists"
        className="group mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/50 transition-colors hover:text-white"
      >
        <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
        {t("common.back")}
      </Link>

      {/* Hero Header Section */}
      <div className="relative mb-12 overflow-hidden rounded-3xl border border-white/10 bg-surface1 p-8 md:p-12">
        <div className="absolute inset-0 bg-linear-to-br from-gold/10 to-transparent opacity-50" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-gold/10 px-3 py-1 text-xs font-semibold tracking-widest text-gold uppercase">
              {t("lists.title")}
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-black text-white tracking-tight">{list.name}</h1>
            <div className="mt-4 flex items-center gap-4 text-sm font-medium text-white/60">
              <span className="flex items-center gap-1.5">
                {list.visibility === "private" ? (
                  <Lock size={16} className="text-white/40" />
                ) : (
                  <Globe2 size={16} className="text-white/40" />
                )}
                {list.visibility === "private" ? t("lists.private") : t("lists.public")}
              </span>
              <span className="h-1 w-1 rounded-full bg-white/30" />
              <span>{displayMovies.length} Film</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout for Detail Page */}
      {displayMovies.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {displayMovies.map((movie) => (
            <div key={movie.id} className="w-full">
              {/* Resetting the w-[280px] specifically for the grid context */}
              <ShowcaseMovieCard movie={movie} watchedLabel={t("profile.watched")} className="!w-full max-md:!w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-4 rounded-3xl border border-white/5 bg-white/[0.02] text-center">
          <Film size={48} className="text-white/10" />
          <p className="text-lg font-medium text-white/40">{t("home.emptyText")}</p>
        </div>
      )}
    </div>
  );
}
