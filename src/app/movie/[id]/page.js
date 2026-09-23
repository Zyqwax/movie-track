"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fetchAndCacheMovie, fetchWatchProviders } from "@/lib/tmdb";
import { getLanguageConfig, getRegionLabel, translate } from "@/lib/i18n";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { Calendar, Clock, TrendingUp } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import "dayjs/locale/en";
import relativeTime from "dayjs/plugin/relativeTime";
import PastDateModal from "@/components/pages/movie-detail/PastDateModal";
import MovieBackdropHeader from "@/components/pages/movie-detail/MovieBackdropHeader";
import MovieActions from "@/components/pages/movie-detail/MovieActions";
import MovieRatingReview from "@/components/pages/movie-detail/MovieRatingReview";
import WatchHistory from "@/components/pages/movie-detail/WatchHistory";
import MovieProviders from "@/components/pages/movie-detail/MovieProviders";
import MovieRecommendation from "@/components/pages/movie-detail/MovieRecommendation";
import { MovieOverview, MovieCast, MovieTrailer } from "@/components/pages/movie-detail/MovieSections";
import { getUserMovieState, removeWishlistMovie, saveWatchLog, saveWishlistMovie, saveWatchedMovie } from "@/lib/user-lists";

dayjs.extend(relativeTime);

export default function MovieDetailPage({ params }) {
  const unwrappedParams = use(params);
  const movieId = unwrappedParams.id;
  const { user, loading: authLoading, language, region } = useAuth();
  const t = (key, values) => translate(language, key, values);
  const { friends } = useAppData();
  const router = useRouter();

  const [movie, setMovie] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPastModal, setShowPastModal] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [providers, setProviders] = useState(null);
  const [providersLoading, setProvidersLoading] = useState(true);
  const [providersError, setProvidersError] = useState(false);
  const [customLists, setCustomLists] = useState([]);

  // ─── Data loading ───
  useEffect(() => {
    if (!authLoading && user === null) {
      router.push("/login");
      return;
    }
    let cancelled = false;
    async function loadData() {
      setLoading(true);
      setProvidersLoading(true);
      setProvidersError(false);
      const languageConfig = getLanguageConfig(language);
      const [movieData, providerData] = await Promise.all([
        fetchAndCacheMovie(movieId, languageConfig.tmdb, region),
        fetchWatchProviders(movieId, region),
      ]);
      if (cancelled) return;
      setMovie(movieData);
      setProviders(providerData);
      setProvidersError(providerData === null);
      if (user && movieData) {
        const currentState = await getUserMovieState(user.uid, movieId);
        if (currentState) {
          setUserData(currentState);
          setReview(currentState.review || "");
        }
        const listsSnapshot = await getDocs(collection(db, "users", user.uid, "lists"));
        setCustomLists(listsSnapshot.docs.map((listDoc) => ({ id: listDoc.id, ...listDoc.data() })).filter((list) => list.type === "custom"));
      }
      setLoading(false);
      setProvidersLoading(false);
    }
    if (user) loadData();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, movieId, router, language, region]);

  // ─── Watch history and status CRUD ───
  const addWatchEntry = async (timestampMs) => {
    setSaving(true);
    const existingHistory = userData?.watchHistory || [];
    const newData = {
      title: movie.title,
      posterPath: movie.posterPath,
      status: "watched",
      watchedAt: timestampMs,
      watchHistory: [{ ts: timestampMs }, ...existingHistory],
      rating: userData?.rating || 0,
      review: review || "",
      addedAt: userData?.addedAt || Date.now(),
      isWatched: true,
    };
    await Promise.all([
      saveWishlistMovie(user.uid, movieId, { title: movie.title, posterPath: movie.posterPath, addedAt: newData.addedAt }),
      saveWatchedMovie(user.uid, movieId, { title: movie.title, posterPath: movie.posterPath, addedAt: newData.addedAt }),
      saveWatchLog(user.uid, movieId, newData),
    ]);
    setUserData({ ...newData, status: "watched" });
    setSaving(false);
  };

  const addWatchEntryNoDate = async () => {
    setSaving(true);
    const existingHistory = userData?.watchHistory || [];
    const newData = {
      title: movie.title,
      posterPath: movie.posterPath,
      status: "watched",
      watchedAt: null,
      watchHistory: [{ ts: null }, ...existingHistory],
      rating: userData?.rating || 0,
      review: review || "",
      addedAt: userData?.addedAt || Date.now(),
      isWatched: true,
    };
    await Promise.all([
      saveWishlistMovie(user.uid, movieId, { title: movie.title, posterPath: movie.posterPath, addedAt: newData.addedAt }),
      saveWatchedMovie(user.uid, movieId, { title: movie.title, posterPath: movie.posterPath, addedAt: newData.addedAt }),
      saveWatchLog(user.uid, movieId, newData),
    ]);
    setUserData({ ...newData, status: "watched" });
    setSaving(false);
  };

  const watchNow = () => addWatchEntry(Date.now());
  const handlePastDate = async (dateStr) => {
    setShowPastModal(false);
    await addWatchEntry(dayjs(dateStr).endOf("day").valueOf());
  };

  const updateStatus = async (newStatus) => {
    setSaving(true);
    if (newStatus === "wishlist") {
      const wishlistData = { title: movie.title, posterPath: movie.posterPath, status: "wishlist", addedAt: userData?.addedAt || Date.now() };
      await saveWishlistMovie(user.uid, movieId, wishlistData);
      setUserData({ ...userData, ...wishlistData, status: "wishlist", isWatched: Boolean(userData?.isWatched) });
      setSaving(false);
      return;
    }
    const newData = {
      title: movie.title,
      posterPath: movie.posterPath,
      status: newStatus,
      watchedAt: newStatus === "watched" ? Date.now() : null,
      watchHistory: userData?.watchHistory || [],
      rating: userData?.rating || 0,
      review: review || "",
      addedAt: userData?.addedAt || Date.now(),
      isWatched: true,
    };
    await saveWatchLog(user.uid, movieId, newData);
    setUserData({ ...newData, status: "watched" });
    setSaving(false);
  };

  const removeMovie = async () => {
    setSaving(true);
    await removeWishlistMovie(user.uid, movieId);
    setUserData(null);
    setSaving(false);
  };
  const removeWatchEntry = async (idx) => {
    const newHistory = (userData.watchHistory || []).filter((_, i) => i !== idx);
    const newData = {
      ...userData,
      watchHistory: newHistory,
      watchedAt: newHistory.length > 0 ? newHistory[0].ts : null,
      status: newHistory.length > 0 ? "watched" : "wishlist",
    };
    await saveWatchLog(user.uid, movieId, { ...newData, isWatched: newHistory.length > 0 });
    setUserData(newData);
  };

  // ─── Rating and review CRUD ───
  const updateRating = async (rating) => {
    if (!userData) return;
    const newData = { ...userData, rating };
    setUserData(newData);
    await saveWatchLog(user.uid, movieId, newData);
  };
  const saveReview = async () => {
    setSaving(true);
    if (!userData) return;
    const newData = { ...userData, review };
    setUserData(newData);
    await saveWatchLog(user.uid, movieId, newData);
    setSaving(false);
  };

  // ─── Recommendation CRUD ───
  const recommendMovie = async (friendUid) => {
    const chatId = [user.uid, friendUid].sort().join("_");
    const chatRef = doc(db, "chats", chatId);
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists())
      await setDoc(chatRef, {
        participants: [user.uid, friendUid].sort(),
        lastMessage: `🎬 ${movie.title}`,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        unreadBy: [friendUid],
      });
    else
      await updateDoc(chatRef, {
        lastMessage: `🎬 ${movie.title}`,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        unreadBy: arrayUnion(friendUid),
      });
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: user.uid,
      text: "",
      type: "movie_recommendation",
      movieId,
      movieTitle: movie.title,
      moviePoster: movie.posterPath,
      createdAt: serverTimestamp(),
    });
    setShowRecommendModal(false);
    router.push(`/messages/${chatId}`);
  };

  const addToCustomList = async (listId) => {
    await setDoc(doc(db, "users", user.uid, "lists", listId, "movies", movieId), {
      movieId,
      title: movie.title,
      posterPath: movie.posterPath,
      addedAt: Date.now(),
    }, { merge: true });
  };

  if (authLoading || !user || loading)
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  if (!movie) return <div className="p-4 text-center text-white mt-10">{t("movie.notFound")}</div>;
  const watchHistory = userData?.watchHistory || [];

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* ─── Overlays ─── */}
      {showPastModal && <PastDateModal onConfirm={handlePastDate} onClose={() => setShowPastModal(false)} t={t} />}
      <MovieRecommendation
        open={showRecommendModal}
        friends={friends}
        movieTitle={movie.title}
        onClose={() => setShowRecommendModal(false)}
        onSelect={recommendMovie}
        t={t}
      />

      {/* ─── Backdrop and mobile header ─── */}
      <MovieBackdropHeader movie={movie} onBack={() => router.back()} />
      <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10">
        <div className="flex gap-4 mb-6 -mt-20 md:hidden">
          <div className="w-28 h-40 rounded-xl overflow-hidden shrink-0 shadow-xl shadow-black/50 border border-zinc-800 relative bg-zinc-800">
            {movie.posterPath && (
              <Image
                src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                alt={movie.title}
                fill
                className="object-cover"
                unoptimized
              />
            )}
          </div>
          <div className="flex flex-col justify-end pb-2">
            <h1 className="text-2xl font-bold text-white leading-tight drop-shadow-md mb-2">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-zinc-300">
              {movie.releaseDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {movie.releaseDate.split("-")[0]}
                </span>
              )}
              {movie.runtime > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {movie.runtime} dk
                </span>
              )}
              {movie.voteAverage > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-400/15 text-amber-300 rounded-full text-[10px] font-bold border border-amber-400/20">
                  <TrendingUp size={10} />
                  {movie.voteAverage}/10
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {movie.genres.map((g) => (
                <span key={g} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full text-[10px]">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Main two-column layout ─── */}
        <div className="md:grid md:grid-cols-[320px_1fr] md:gap-8 md:pt-6">
          {/* ─── Sidebar: actions, rating, history ─── */}
          <div className="md:sticky md:top-6 md:self-start space-y-3 mb-6 md:mb-0">
            <MovieActions
              userData={userData}
              saving={saving}
              onWatchNow={watchNow}
              onWatchPast={() => setShowPastModal(true)}
              onWatchNoDate={addWatchEntryNoDate}
              onUpdateStatus={updateStatus}
              onRemove={removeMovie}
              onRecommend={() => setShowRecommendModal(true)}
              customLists={customLists}
              onAddToCustomList={addToCustomList}
              t={t}
            />
            <MovieRatingReview
              userData={userData}
              review={review}
              saving={saving}
              onRating={updateRating}
              onReviewChange={setReview}
              onSaveReview={saveReview}
              t={t}
            />
            <WatchHistory history={watchHistory} language={language} onRemove={removeWatchEntry} t={t} />
          </div>

          {/* ─── Content: providers and movie details ─── */}
          <div className="min-w-0">
            <MovieProviders
              providers={providers}
              loading={providersLoading}
              error={providersError}
              regionLabel={getRegionLabel(region, language)}
              t={t}
            />
            <MovieOverview overview={movie.overview} t={t} />
            <MovieCast cast={movie.cast} t={t} />
            <MovieTrailer trailer={movie.trailer} t={t} />
          </div>
        </div>
      </div>
    </div>
  );
}
