"use client";

import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Film, Eye, Clock, Star, UserPlus, Users } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("tr");

export default function ProfilePage() {
  const { user, loading, logout } = useAuth();
  const { movies, friends } = useAppData();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user === null) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" /></div>;
  if (!user) return null;

  const watched = movies?.filter((m) => m.status === "watched") || [];
  const wishlist = movies?.filter((m) => m.status === "wishlist") || [];
  const ratedMovies = watched.filter((m) => m.rating > 0);
  const avgRating = ratedMovies.length > 0
    ? (ratedMovies.reduce((sum, m) => sum + m.rating, 0) / ratedMovies.length).toFixed(1)
    : null;

  const recentlyWatched = [...watched]
    .filter((m) => m.watchedAt != null && m.watchedAt !== 0)
    .sort((a, b) => b.watchedAt - a.watchedAt)
    .slice(0, 5);

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-50 pb-8 max-w-2xl mx-auto">
      
      {/* Header */}
      <div className="px-4 pt-10 pb-5 flex items-center gap-3.5">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-rose-500/15">
          {user.photoURL ? (
            <Image src={user.photoURL} alt={user.displayName || "User"} width={56} height={56} className="rounded-full" />
          ) : (
            <span className="text-xl font-bold text-white">
              {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-white truncate">
            {user.displayName || "Kullanıcı"}
          </h1>
          <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button
            onClick={() => {
              const url = `${window.location.origin}/u/${user.uid}`;
              if (navigator.share) {
                navigator.share({
                  title: 'Movie Tracker',
                  text: 'Beni Movie Tracker\'da arkadaş ekle!',
                  url: url,
                }).catch(() => {});
              } else {
                navigator.clipboard.writeText(url).then(() => {
                  alert("Profil linkiniz kopyalandı!");
                });
              }
            }}
            className="p-2 rounded-xl bg-zinc-900 text-rose-500 hover:bg-zinc-800 transition border border-zinc-800/60"
            title="Paylaş"
          >
            <UserPlus size={16} />
          </button>
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition border border-zinc-800/60"
            title="Çıkış Yap"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 py-4">
        <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-2xl p-3 flex flex-col items-center gap-0.5">
          <Eye size={15} className="text-emerald-500 mb-1" />
          <span className="text-xl font-bold text-white">
            {movies === undefined ? "—" : watched.length}
          </span>
          <span className="text-[9px] text-zinc-500">İzlendi</span>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-2xl p-3 flex flex-col items-center gap-0.5">
          <Film size={15} className="text-rose-500 mb-1" />
          <span className="text-xl font-bold text-white">
            {movies === undefined ? "—" : wishlist.length}
          </span>
          <span className="text-[9px] text-zinc-500">Listede</span>
        </div>
        <div className="bg-zinc-900/50 border border-zinc-800/40 rounded-2xl p-3 flex flex-col items-center gap-0.5">
          <Star size={15} className="text-amber-400 mb-1" />
          <span className="text-xl font-bold text-white">
            {movies === undefined ? "—" : (avgRating || "—")}
          </span>
          <span className="text-[9px] text-zinc-500">Ort. Puan</span>
        </div>
      </div>

      {/* Friends List */}
      <div className="px-4 mb-5">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Users size={14} className="text-zinc-500" />
          <h2 className="text-xs font-semibold text-zinc-400">Arkadaşlarım</h2>
          <span className="text-[9px] text-zinc-600 ml-auto">{friends.length}</span>
        </div>
        {friends.length > 0 ? (
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {friends.map((friend) => (
              <Link 
                key={friend.id} 
                href={`/u/${friend.uid}`}
                className="flex flex-col items-center gap-1.5 shrink-0 w-14"
              >
                <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border border-zinc-700/50">
                  {friend.photoURL ? (
                    <Image src={friend.photoURL} alt={friend.displayName || ""} width={48} height={48} className="object-cover" />
                  ) : (
                    <span className="text-lg font-bold text-zinc-500">{friend.displayName?.[0]?.toUpperCase() || "?"}</span>
                  )}
                </div>
                <span className="text-[9px] text-zinc-400 truncate w-full text-center">
                  {friend.displayName?.split(" ")[0]}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/30 border border-zinc-800/30 rounded-xl p-3 text-center">
            <p className="text-[11px] text-zinc-600">Profil linkini paylaşarak arkadaş ekle!</p>
          </div>
        )}
      </div>

      {/* Recently Watched */}
      {recentlyWatched.length > 0 && (
        <div className="px-4">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Clock size={14} className="text-zinc-500" />
            <h2 className="text-xs font-semibold text-zinc-400">Son İzlenenler</h2>
          </div>
          <div className="flex flex-col gap-1.5">
            {recentlyWatched.map((movie) => (
              <Link key={movie.id} href={`/movie/${movie.id}`} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-zinc-900/50 transition-colors">
                <div className="w-9 h-[50px] bg-zinc-800 rounded-lg overflow-hidden shrink-0 relative">
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
                  <p className="text-xs font-medium text-zinc-100 truncate">{movie.title}</p>
                  {movie.watchedAt && (
                    <p className="text-[10px] text-zinc-500 mt-0.5">{dayjs(movie.watchedAt).fromNow()}</p>
                  )}
                </div>
                {movie.rating > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Star size={10} className="fill-amber-400 text-amber-400" />
                    <span className="text-[10px] font-bold text-amber-400">{movie.rating}</span>
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TMDB Attribution */}
      <div className="mt-10 mb-6 px-4 flex flex-col items-center text-center gap-2">
        <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className="opacity-60 hover:opacity-100 transition-opacity">
          <img 
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" 
            alt="TMDB Logo" 
            width={100} 
            height={14} 
          />
        </a>
        <p className="text-[9px] text-zinc-600 max-w-[220px]">
          Bu uygulama TMDB API&apos;sini kullanmaktadır ancak TMDB tarafından onaylanmamıştır.
        </p>
      </div>
    </div>
  );
}
