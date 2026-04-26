"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fetchAndCacheMovie } from "@/lib/tmdb";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import {
  ArrowLeft, Star, Calendar, Clock, CheckCircle, PlusCircle,
  Trash2, History, CalendarDays, X, RotateCcw, TrendingUp
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("tr");

/** Modal — geçmiş tarih seçimi */
function PastDateModal({ onConfirm, onClose }) {
  const today = dayjs().format("YYYY-MM-DD");
  const [date, setDate] = useState(today);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-700 rounded-3xl p-6 shadow-2xl shadow-black/60">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-bold text-white">İzleme Tarihi Seç</h2>
          <button onClick={onClose} className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition">
            <X size={16} />
          </button>
        </div>

        <p className="text-xs text-zinc-500 mb-4">Filmi hangi tarihte izlediniz?</p>

        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => setDate(e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-white focus:ring-1 focus:ring-rose-500 focus:outline-none mb-5 [color-scheme:dark]"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700 transition"
          >
            İptal
          </button>
          <button
            onClick={() => onConfirm(date)}
            disabled={!date}
            className="flex-1 py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-500 transition disabled:opacity-50"
          >
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MovieDetailPage({ params }) {
  const unwrappedParams = use(params);
  const movieId = unwrappedParams.id;
  const { user } = useAuth();
  const router = useRouter();

  const [movie, setMovie] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPastModal, setShowPastModal] = useState(false);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
      return;
    }

    async function loadData() {
      const movieData = await fetchAndCacheMovie(movieId);
      setMovie(movieData);

      if (user && movieData) {
        const userMovieRef = doc(db, "users", user.uid, "movies", movieId);
        const userSnap = await getDoc(userMovieRef);
        if (userSnap.exists()) {
          setUserData(userSnap.data());
          setReview(userSnap.data().review || "");
        }
      }
      setLoading(false);
    }

    if (user) loadData();
  }, [user, movieId, router]);

  /** Firestore'a kaydet — watchHistory array'ine yeni giriş ekle */
  const addWatchEntry = async (timestampMs) => {
    setSaving(true);
    const userMovieRef = doc(db, "users", user.uid, "movies", movieId);

    const existingHistory = userData?.watchHistory || [];
    const newEntry = { ts: timestampMs };
    const newHistory = [newEntry, ...existingHistory];

    const newData = {
      title: movie.title,
      posterPath: movie.posterPath,
      status: "watched",
      watchedAt: timestampMs,          // en son izlenme (sıralama için)
      watchHistory: newHistory,
      rating: userData?.rating || 0,
      review: review || "",
      addedAt: userData?.addedAt || Date.now(),
    };

    await setDoc(userMovieRef, newData, { merge: true });
    setUserData(newData);
    setSaving(false);
  };

  /** Şu an izledim */
  const watchNow = () => addWatchEntry(Date.now());

  /** Geçmiş tarih seçildikten sonra */
  const handlePastDate = async (dateStr) => {
    setShowPastModal(false);
    // Seçilen günün sonunu (23:59:59) kullan
    const ts = dayjs(dateStr).endOf("day").valueOf();
    await addWatchEntry(ts);
  };

  /** İstek listesine ekle / durumu değiştir */
  const updateStatus = async (newStatus) => {
    setSaving(true);
    const userMovieRef = doc(db, "users", user.uid, "movies", movieId);
    const newData = {
      title: movie.title,
      posterPath: movie.posterPath,
      status: newStatus,
      watchedAt: newStatus === "watched" ? Date.now() : null,
      watchHistory: userData?.watchHistory || [],
      rating: userData?.rating || 0,
      review: review || "",
      addedAt: userData?.addedAt || Date.now(),
    };
    await setDoc(userMovieRef, newData, { merge: true });
    setUserData(newData);
    setSaving(false);
  };

  const removeMovie = async () => {
    setSaving(true);
    await deleteDoc(doc(db, "users", user.uid, "movies", movieId));
    setUserData(null);
    setSaving(false);
  };

  /** Geçmişten tek bir izleme kaydını sil */
  const removeWatchEntry = async (idx) => {
    const newHistory = (userData.watchHistory || []).filter((_, i) => i !== idx);
    const latestTs = newHistory.length > 0 ? newHistory[0].ts : null;
    const newData = {
      ...userData,
      watchHistory: newHistory,
      watchedAt: latestTs,
      status: newHistory.length > 0 ? "watched" : "wishlist",
    };
    await setDoc(doc(db, "users", user.uid, "movies", movieId), newData, { merge: true });
    setUserData(newData);
  };

  const updateRating = async (rating) => {
    if (!userData) return;
    const newData = { ...userData, rating };
    setUserData(newData);
    await setDoc(doc(db, "users", user.uid, "movies", movieId), newData, { merge: true });
  };

  const saveReview = async () => {
    setSaving(true);
    if (!userData) return;
    const newData = { ...userData, review };
    setUserData(newData);
    await setDoc(doc(db, "users", user.uid, "movies", movieId), newData, { merge: true });
    setSaving(false);
  };

  if (!user || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (!movie) {
    return <div className="p-4 text-center text-white mt-10">Film bulunamadı.</div>;
  }

  const watchHistory = userData?.watchHistory || [];

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {showPastModal && (
        <PastDateModal
          onConfirm={handlePastDate}
          onClose={() => setShowPastModal(false)}
        />
      )}

      {/* Backdrop Header */}
      <div className="relative w-full h-64 md:h-[55vh]">
        {movie.backdropPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/original${movie.backdropPath}`}
            alt={movie.title}
            fill
            className="object-cover opacity-40"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-transparent to-transparent hidden md:block" />

        <Link href="/" className="absolute top-5 left-5 p-2.5 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition">
          <ArrowLeft size={22} />
        </Link>

        {/* Desktop: title overlay on backdrop */}
        <div className="hidden md:flex absolute bottom-8 left-0 right-0 px-8 max-w-6xl mx-auto items-end gap-6">
          <div className="w-36 h-52 rounded-2xl overflow-hidden shrink-0 shadow-2xl shadow-black/70 border border-white/10 relative bg-zinc-800">
            {movie.posterPath && (
              <Image src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt={movie.title} fill className="object-cover" unoptimized />
            )}
          </div>
          <div className="pb-1">
            <h1 className="text-4xl font-bold text-white leading-tight drop-shadow-xl mb-3">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm font-medium text-zinc-300 mb-3">
              {movie.releaseDate && <span className="flex items-center gap-1.5"><Calendar size={15} />{movie.releaseDate.split("-")[0]}</span>}
              {movie.runtime > 0 && <span className="flex items-center gap-1.5"><Clock size={15} />{movie.runtime} dk</span>}
              {movie.voteAverage > 0 && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-400/15 text-amber-300 rounded-full border border-amber-400/20 text-xs font-bold">
                  <TrendingUp size={13} />{movie.voteAverage}/10
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {movie.genres.map((g) => (
                <span key={g} className="px-3 py-1 bg-white/10 backdrop-blur-sm text-zinc-200 rounded-full text-xs border border-white/10">{g}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop two-column / Mobile single-column */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 relative z-10">
        {/* Mobile: poster + title (hidden on desktop, shown in backdrop) */}
        <div className="flex gap-4 mb-6 -mt-20 md:hidden">
          <div className="w-28 h-40 rounded-xl overflow-hidden shrink-0 shadow-xl shadow-black/50 border border-zinc-800 relative bg-zinc-800">
            {movie.posterPath && (
              <Image src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`} alt={movie.title} fill className="object-cover" unoptimized />
            )}
          </div>
          <div className="flex flex-col justify-end pb-2">
            <h1 className="text-2xl font-bold text-white leading-tight drop-shadow-md mb-2">{movie.title}</h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-zinc-300">
              {movie.releaseDate && <span className="flex items-center gap-1"><Calendar size={14} />{movie.releaseDate.split("-")[0]}</span>}
              {movie.runtime > 0 && <span className="flex items-center gap-1"><Clock size={14} />{movie.runtime} dk</span>}
              {movie.voteAverage > 0 && (
                <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-400/15 text-amber-300 rounded-full text-[10px] font-bold border border-amber-400/20">
                  <TrendingUp size={10} />{movie.voteAverage}/10
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {movie.genres.map((g) => (
                <span key={g} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full text-[10px]">{g}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Desktop two-column layout wrapper */}
        <div className="md:grid md:grid-cols-[320px_1fr] md:gap-8 md:pt-6">

          {/* ── LEFT SIDEBAR (desktop) / full-width (mobile) ── */}
          <div className="md:sticky md:top-6 md:self-start space-y-3 mb-6 md:mb-0">
        {/* ─── Action Buttons ─── */}
        <div className="space-y-3">
          {/* İzleme butonları — 3 durum:
              1) İzlenmediyse (userData yok veya wishlist): "İzledim" + "Önceden İzledim"
              2) İzlendiyse (watched): "Tekrar İzledim" + "Önceden İzledim" */}
          <div className="flex gap-2">
            <button
              id="watch-now-btn"
              onClick={watchNow}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-600 text-white rounded-2xl text-sm font-semibold hover:bg-rose-500 active:scale-95 transition-all"
            >
              {userData?.status === "watched" ? (
                <><RotateCcw size={17} />Tekrar İzledim</>
              ) : (
                <><CheckCircle size={18} />İzledim</>
              )}
            </button>

            <button
              id="watch-past-btn"
              onClick={() => setShowPastModal(true)}
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 text-zinc-200 rounded-2xl text-sm font-semibold hover:bg-zinc-700 active:scale-95 transition-all border border-zinc-700"
            >
              <CalendarDays size={17} />
              {userData?.status === "watched" ? "Geçmiş Tarih Ekle" : "Önceden İzledim"}
            </button>
          </div>

          {/* İstek listesi / Durum / Kaldır */}
          <div className="flex gap-2 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
            {!userData ? (
              <button
                onClick={() => updateStatus("wishlist")}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-zinc-800 text-white rounded-xl text-sm font-medium hover:bg-zinc-700 transition"
              >
                <PlusCircle size={18} /> İstek Listesine Ekle
              </button>
            ) : (
              <div className="w-full flex items-center justify-between px-2">
                <span
                  className={clsx(
                    "text-sm font-medium flex items-center gap-2",
                    userData.status === "watched" ? "text-emerald-500" : "text-amber-500"
                  )}
                >
                  {userData.status === "watched" ? <CheckCircle size={18} /> : <PlusCircle size={18} />}
                  {userData.status === "watched" ? "İzlendi" : "İstek Listesinde"}
                </span>

                <div className="flex gap-2">
                  {userData.status === "watched" && (
                    <button
                      onClick={() => updateStatus("wishlist")}
                      disabled={saving}
                      className="p-2 bg-amber-500/20 text-amber-400 rounded-xl hover:bg-amber-500/30 transition text-xs font-medium px-3"
                    >
                      İstek Listesine Al
                    </button>
                  )}
                  {userData.status === "wishlist" && (
                    <button
                      onClick={() => updateStatus("watched")}
                      disabled={saving}
                      className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-500/30 transition"
                    >
                      <CheckCircle size={18} />
                    </button>
                  )}
                  <button
                    onClick={removeMovie}
                    disabled={saving}
                    className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Rating & Review (in sidebar on desktop) ─── */}
        {userData?.status === "watched" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-6">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Değerlendirmeniz</h3>

            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button key={star} onClick={() => updateRating(star)} className="focus:outline-none">
                  <Star
                    size={22}
                    className={clsx(
                      "transition-colors",
                      (userData.rating || 0) >= star ? "fill-amber-400 text-amber-400" : "text-zinc-700"
                    )}
                  />
                </button>
              ))}
            </div>

            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Film hakkında kişisel notlarınız veya incelemeniz..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-sm text-zinc-300 focus:ring-1 focus:ring-rose-500 focus:outline-none min-h-[100px] mb-2"
            />
            {review !== (userData.review || "") && (
              <button
                onClick={saveReview}
                disabled={saving}
                className="w-full py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition"
              >
                {saving ? "Kaydediliyor..." : "Notu Kaydet"}
              </button>
            )}
          </div>
        )}

        {/* ─── İzleme Geçmişi (in sidebar on desktop) ─── */}
        {watchHistory.length > 0 && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <History size={16} className="text-rose-400" />
              <h3 className="text-sm font-semibold text-white">İzleme Geçmişi</h3>
              <span className="ml-auto text-[10px] font-bold px-2 py-0.5 bg-rose-500/20 text-rose-400 rounded-full">
                {watchHistory.length}×
              </span>
            </div>

            <ul className="space-y-2">
              {watchHistory.map((entry, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between gap-3 bg-zinc-950 rounded-xl px-3 py-2.5 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                      <CalendarDays size={12} className="text-rose-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {dayjs(entry.ts).format("D MMMM YYYY")}
                      </p>
                      <p className="text-[10px] text-zinc-500">
                        {dayjs(entry.ts).fromNow()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeWatchEntry(idx)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                    title="Bu kaydı sil"
                  >
                    <X size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

          </div>{/* end left sidebar */}

          {/* ── RIGHT COLUMN ── */}
          <div className="min-w-0">

        {/* Overview */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-white mb-2">Özet</h3>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {movie.overview || "Bu film için Türkçe özet bulunmamaktadır."}
          </p>
        </div>

        {/* Cast */}
        {movie.cast?.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-3">Oyuncular</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
              {movie.cast.map((actor) => (
                <div key={actor.name} className="flex flex-col items-center shrink-0 w-20">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden mb-2 relative">
                    {actor.profilePath && (
                      <Image
                        src={`https://image.tmdb.org/t/p/w185${actor.profilePath}`}
                        alt={actor.name}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    )}
                  </div>
                  <span className="text-xs text-zinc-300 text-center line-clamp-1">{actor.name}</span>
                  <span className="text-[10px] text-zinc-500 text-center line-clamp-1">{actor.character}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trailer */}
        {movie.trailer && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-3">Fragman</h3>
            <div className="aspect-video w-full rounded-2xl overflow-hidden border border-zinc-800">
              <iframe
                src={`https://www.youtube.com/embed/${movie.trailer}`}
                title="Trailer"
                className="w-full h-full"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        )}

          </div>{/* end right column */}
        </div>{/* end desktop grid */}
      </div>
    </div>
  );
}
