"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import Image from "next/image";
import { LogOut, Film, Eye, Clock, Star } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("tr");

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [movies, setMovies] = useState(undefined);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
      return;
    }

    if (user) {
      const q = query(collection(db, "users", user.uid, "movies"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        setMovies(data);
      });
      return () => unsubscribe();
    }
  }, [user, router]);

  if (!user) return null;

  const watched = movies?.filter((m) => m.status === "watched") || [];
  const wishlist = movies?.filter((m) => m.status === "wishlist") || [];
  const ratedMovies = watched.filter((m) => m.rating > 0);
  const avgRating = ratedMovies.length > 0
    ? (ratedMovies.reduce((sum, m) => sum + m.rating, 0) / ratedMovies.length).toFixed(1)
    : null;

  const recentlyWatched = [...watched]
    .sort((a, b) => b.watchedAt - a.watchedAt)
    .slice(0, 5);

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-50 pb-8">
      
      {/* Header */}
      <div className="px-4 pt-10 pb-6 flex items-center gap-4 border-b border-zinc-800/60">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-rose-500/20">
          {user.photoURL ? (
            <Image src={user.photoURL} alt={user.displayName || "User"} width={64} height={64} className="rounded-full" />
          ) : (
            <span className="text-2xl font-bold text-white">
              {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white truncate">
            {user.displayName || "Kullanıcı"}
          </h1>
          <p className="text-sm text-zinc-400 truncate">{user.email}</p>
          <p className="text-xs text-zinc-500 mt-0.5">
            {dayjs(user.metadata?.creationTime).format("MMMM YYYY")} tarihinden beri üye
          </p>
        </div>
        <button
          onClick={logout}
          className="shrink-0 p-2.5 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition border border-zinc-800"
        >
          <LogOut size={18} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 py-6">
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center mb-1">
            <Eye size={18} className="text-emerald-500" />
          </div>
          <span className="text-2xl font-bold text-white">
            {movies === undefined ? "—" : watched.length}
          </span>
          <span className="text-[10px] text-zinc-400 text-center">Film İzlendi</span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center mb-1">
            <Film size={18} className="text-rose-500" />
          </div>
          <span className="text-2xl font-bold text-white">
            {movies === undefined ? "—" : wishlist.length}
          </span>
          <span className="text-[10px] text-zinc-400 text-center">Listede Bekliyor</span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-2xl p-4 flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mb-1">
            <Star size={18} className="text-amber-400" />
          </div>
          <span className="text-2xl font-bold text-white">
            {movies === undefined ? "—" : (avgRating || "—")}
          </span>
          <span className="text-[10px] text-zinc-400 text-center">Ort. Puan</span>
        </div>
      </div>

      {/* Recently Watched */}
      {recentlyWatched.length > 0 && (
        <div className="px-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-zinc-400" />
            <h2 className="text-sm font-semibold text-zinc-300">Son İzlenenler</h2>
          </div>
          <div className="flex flex-col gap-2">
            {recentlyWatched.map((movie) => (
              <div key={movie.id} className="flex items-center gap-3 bg-zinc-900/40 border border-zinc-800/40 rounded-xl p-3">
                <div className="w-10 h-14 bg-zinc-800 rounded-lg overflow-hidden shrink-0 relative">
                  {movie.posterPath && (
                    <Image
                      src={`https://image.tmdb.org/t/p/w92${movie.posterPath}`}
                      alt={movie.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">{movie.title}</p>
                  {movie.watchedAt && (
                    <p className="text-xs text-zinc-500 mt-0.5">{dayjs(movie.watchedAt).fromNow()}</p>
                  )}
                </div>
                {movie.rating > 0 && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs font-bold text-amber-400">{movie.rating}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
