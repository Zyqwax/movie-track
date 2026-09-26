"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { fetchAndCacheMovie } from "@/lib/tmdb";
import { getLanguageConfig, translate } from "@/lib/i18n";
import ListHeader from "@/components/pages/list-detail/ListHeader";
import ListMovieGrid from "@/components/pages/list-detail/ListMovieGrid";
import PageLoading from "@/components/ui/PageLoading";

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

  if (authLoading || !user || loading) return <PageLoading />;

  if (!list) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-4xl flex-col items-center justify-center gap-5 px-5 text-center text-text">
        <h1 className="font-syne text-3xl font-bold">Liste bulunamadı</h1>
        <Link
          href="/lists"
          className="inline-flex min-h-11 items-center rounded-[var(--radius-md)] border border-border px-5 text-sm font-medium text-text transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const watchedSet = new Set(watchedIds);
  const displayMovies = movies.map((movie) => ({ ...movie, isWatched: watchedSet.has(movie.id) }));

  return (
    <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 md:px-8 md:pt-12">
      <ListHeader list={list} count={displayMovies.length} language={language} t={t} onEdit={() => router.push("/lists")} />
      <ListMovieGrid movies={displayMovies} language={language} watchedLabel={t("profile.watched")} t={t} />
    </div>
  );
}
