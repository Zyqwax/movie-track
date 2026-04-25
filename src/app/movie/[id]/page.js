"use client";

import { useEffect, useState, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fetchAndCacheMovie } from "@/lib/tmdb";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { ArrowLeft, Star, Calendar, Clock, CheckCircle, PlusCircle, Trash2 } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("tr");

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

  useEffect(() => {
    if (user === null) {
      router.push("/login");
      return;
    }

    async function loadData() {
      // Fetch movie details
      const movieData = await fetchAndCacheMovie(movieId);
      setMovie(movieData);

      // Fetch user specific data
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

  const updateStatus = async (newStatus) => {
    setSaving(true);
    const userMovieRef = doc(db, "users", user.uid, "movies", movieId);
    const newData = {
      title: movie.title,
      posterPath: movie.posterPath,
      status: newStatus,
      watchedAt: newStatus === "watched" ? Date.now() : null,
      rating: userData?.rating || 0,
      review: review || "",
      addedAt: userData?.addedAt || Date.now()
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

  return (
    <div className="min-h-screen bg-zinc-950 pb-24">
      {/* Backdrop Header */}
      <div className="relative w-full h-64 md:h-80">
        {movie.backdropPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w780${movie.backdropPath}`}
            alt={movie.title}
            fill
            className="object-cover opacity-50"
            unoptimized
          />
        ) : (
          <div className="w-full h-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
        
        <Link href="/" className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white">
          <ArrowLeft size={24} />
        </Link>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-24 relative z-10">
        {/* Poster & Title Row */}
        <div className="flex gap-4 mb-6">
          <div className="w-28 h-40 md:w-32 md:h-48 rounded-xl overflow-hidden shrink-0 shadow-xl shadow-black/50 border border-zinc-800 relative bg-zinc-800">
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
            <h1 className="text-2xl md:text-3xl font-bold text-white leading-tight drop-shadow-md mb-2">
              {movie.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-zinc-300">
              {movie.releaseDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} /> {movie.releaseDate.split("-")[0]}
                </span>
              )}
              {movie.runtime > 0 && (
                <span className="flex items-center gap-1">
                  <Clock size={14} /> {movie.runtime} dk
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {movie.genres.map(g => (
                <span key={g} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded-full text-[10px]">
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mb-8 bg-zinc-900/50 p-2 rounded-2xl border border-zinc-800/50 backdrop-blur-sm">
          {!userData ? (
            <>
              <button
                onClick={() => updateStatus("wishlist")}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-zinc-800 text-white rounded-xl text-sm font-medium hover:bg-zinc-700 transition"
              >
                <PlusCircle size={18} /> İstek Listesine
              </button>
              <button
                onClick={() => updateStatus("watched")}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-500 transition"
              >
                <CheckCircle size={18} /> İzledim
              </button>
            </>
          ) : (
            <div className="w-full flex items-center justify-between px-2">
              <span className={clsx("text-sm font-medium flex items-center gap-2", userData.status === "watched" ? "text-emerald-500" : "text-amber-500")}>
                {userData.status === "watched" ? <CheckCircle size={18}/> : <PlusCircle size={18}/>}
                {userData.status === "watched" ? "İzlendi" : "İstek Listesinde"}
              </span>
              
              <div className="flex gap-2">
                {userData.status === "wishlist" && (
                  <button onClick={() => updateStatus("watched")} disabled={saving} className="p-2 bg-emerald-500/20 text-emerald-500 rounded-xl hover:bg-emerald-500/30 transition">
                    <CheckCircle size={18} />
                  </button>
                )}
                <button onClick={removeMovie} disabled={saving} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Interaction Section (Rating, Review, Date) */}
        {userData?.status === "watched" && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 mb-8">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">Değerlendirmeniz</h3>
            
            {userData.watchedAt && (
              <p className="text-xs text-zinc-500 mb-4">
                İzlenme: {dayjs(userData.watchedAt).format("D MMMM YYYY")} ({dayjs(userData.watchedAt).fromNow()})
              </p>
            )}

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
            {(review !== userData.review) && (
              <button onClick={saveReview} disabled={saving} className="w-full py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition">
                {saving ? "Kaydediliyor..." : "Notu Kaydet"}
              </button>
            )}
          </div>
        )}

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
              {movie.cast.map(actor => (
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
      </div>
    </div>
  );
}
