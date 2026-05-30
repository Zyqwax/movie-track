"use client";

import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Film, Eye, Clock, Star, UserPlus, Users, Share2 } from "lucide-react";
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

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f43f5e]" />
      </div>
    );
  }
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

  const handleShareProfile = () => {
    const url = `${window.location.origin}/u/${user.uid}`;
    if (navigator.share) {
      navigator.share({
        title: "Movie Tracker",
        text: "Beni Movie Tracker'da arkadaş ekle!",
        url: url,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert("Profil linkiniz kopyalandı! 🚀");
      });
    }
  };

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-150 pb-20 relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-gradient-to-br from-[#f43f5e]/15 to-[#5865f2]/10 rounded-full blur-[80px] pointer-events-none -z-10" />

      {/* Hero Banner Area */}
      <div className="relative h-28 w-full overflow-hidden bg-gradient-to-r from-rose-950/30 via-zinc-900 to-indigo-950/20 border-b border-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent opacity-60" />
      </div>

      {/* Header Info */}
      <div className="px-5 -mt-10 relative flex flex-col sm:flex-row items-center sm:items-end gap-4 pb-6 border-b border-zinc-900/60">
        {/* Avatar with dynamic ring glow */}
        <div className="relative group shrink-0 select-none">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-[#f43f5e] to-[#5865f2] rounded-full blur opacity-45 group-hover:opacity-75 transition duration-300" />
          <div className="relative w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden ring-4 ring-zinc-950 shadow-2xl">
            {user.photoURL ? (
              <Image 
                src={user.photoURL} 
                alt={user.displayName || "User"} 
                width={80} 
                height={80} 
                className="rounded-full object-cover" 
              />
            ) : (
              <span className="text-3xl font-extrabold text-white bg-gradient-to-br from-rose-400 to-rose-600 w-full h-full flex items-center justify-center">
                {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
        </div>

        {/* User text names */}
        <div className="flex-1 text-center sm:text-left min-w-0">
          <h1 className="text-xl font-black text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
            {user.displayName || "Kullanıcı"}
          </h1>
          <p className="text-xs text-zinc-500 mt-1 truncate">{user.email}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 shrink-0 select-none mt-2 sm:mt-0">
          <button
            onClick={handleShareProfile}
            className="px-4 py-2 rounded-xl bg-zinc-900/90 text-rose-400 hover:text-rose-300 hover:bg-zinc-800/80 active:scale-95 transition border border-zinc-800/60 shadow-lg flex items-center gap-1.5 text-xs font-semibold"
            title="Profili Paylaş"
          >
            <Share2 size={13} strokeWidth={2.5} />
            <span>Paylaş</span>
          </button>
          
          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800/80 active:scale-95 transition border border-zinc-800/60"
            title="Çıkış Yap"
          >
            <LogOut size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-3 gap-3 px-5 py-6 select-none">
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-900 rounded-2xl p-3.5 flex flex-col items-center gap-1 shadow-sm hover:border-zinc-800/60 hover:shadow-md transition-all duration-300 group">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-1 group-hover:scale-110 transition duration-200">
            <Eye size={15} className="text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">
            {movies === undefined ? "—" : watched.length}
          </span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">İzlendi</span>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-900 rounded-2xl p-3.5 flex flex-col items-center gap-1 shadow-sm hover:border-zinc-800/60 hover:shadow-md transition-all duration-300 group">
          <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center mb-1 group-hover:scale-110 transition duration-200">
            <Film size={14} className="text-rose-400" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">
            {movies === undefined ? "—" : wishlist.length}
          </span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">İzlenecek</span>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-900 rounded-2xl p-3.5 flex flex-col items-center gap-1 shadow-sm hover:border-zinc-800/60 hover:shadow-md transition-all duration-300 group">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center mb-1 group-hover:scale-110 transition duration-200">
            <Star size={14} className="text-amber-400 fill-amber-400/10" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">
            {movies === undefined ? "—" : (avgRating || "—")}
          </span>
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Ort. Puan</span>
        </div>
      </div>

      {/* Friends Horizontal Scroll Section */}
      <div className="px-5 mb-8">
        <div className="flex items-center gap-2 mb-3.5 select-none">
          <Users size={14} className="text-[#5865f2] stroke-[2.2]" />
          <h2 className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">Arkadaşlarım</h2>
          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-zinc-900 text-zinc-500 ml-1">
            {friends.length}
          </span>
        </div>

        {friends.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-1.5 scrollbar-thin select-none">
            {friends.map((friend) => (
              <Link 
                key={friend.id} 
                href={`/u/${friend.uid}`}
                className="flex flex-col items-center gap-2 shrink-0 w-16 group"
              >
                <div className="relative">
                  <div className="w-13 h-13 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border-2 border-zinc-850 group-hover:border-[#5865f2] group-hover:scale-[1.05] transition-all duration-300 shadow-md">
                    {friend.photoURL ? (
                      <Image 
                        src={friend.photoURL} 
                        alt={friend.displayName || ""} 
                        width={52} 
                        height={52} 
                        className="object-cover h-full w-full" 
                      />
                    ) : (
                      <span className="text-lg font-black text-[#5865f2] bg-[#5865f2]/10 w-full h-full flex items-center justify-center">
                        {friend.displayName?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  {/* Subtle active status indicator */}
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#23a55a] border-2 border-zinc-950"></span>
                </div>
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-white truncate w-full text-center transition">
                  {friend.displayName?.split(" ")[0]}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/20 border border-zinc-900 rounded-2xl p-4 text-center select-none shadow-inner">
            <p className="text-[11px] text-zinc-500 font-medium leading-relaxed">
              Arkadaş listeniz boş. <br />
              <button 
                onClick={handleShareProfile} 
                className="text-rose-400 hover:text-rose-300 font-bold underline mt-1.5 focus:outline-none transition inline-flex items-center gap-0.5"
              >
                Profil linkini kopyalayarak
              </button> arkadaş ekleyin!
            </p>
          </div>
        )}
      </div>


      {/* Recently Watched Grid Cards */}
      {recentlyWatched.length > 0 && (
        <div className="px-5">
          <div className="flex items-center gap-2 mb-3.5 select-none">
            <Clock size={14} className="text-rose-400 stroke-[2.2]" />
            <h2 className="text-[11px] font-extrabold text-zinc-400 uppercase tracking-wider">Son İzlenen Filmler</h2>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
            {recentlyWatched.map((movie) => (
              <Link 
                key={movie.id} 
                href={`/movie/${movie.id}`} 
                className="relative group rounded-xl overflow-hidden aspect-[2/3] bg-zinc-900 border border-zinc-900/60 shadow-sm hover:shadow-md transition-all duration-300 select-none"
              >
                {movie.posterPath ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`}
                    alt={movie.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-500"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-700">
                    <Film size={14} />
                  </div>
                )}
                {/* Subtle dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-95 group-hover:opacity-100 transition-opacity" />

                {/* Compact Rating Badge */}
                {movie.rating > 0 && (
                  <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-amber-500/90 backdrop-blur-sm text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow z-10">
                    <Star size={7} className="fill-amber-400 text-amber-400" /> 
                    <span>{movie.rating}</span>
                  </div>
                )}

                {/* Compact Footer details */}
                <div className="absolute bottom-0 left-0 right-0 p-1.5 flex flex-col gap-0.5">
                  <p className="text-[9px] font-extrabold text-white leading-tight line-clamp-1 group-hover:text-rose-400 transition">
                    {movie.title}
                  </p>
                  {movie.watchedAt && (
                    <span className="text-[7.5px] font-bold text-zinc-500 select-none">
                      {dayjs(movie.watchedAt).fromNow()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* TMDB Attribution */}
      <div className="mt-12 mb-6 px-5 flex flex-col items-center text-center gap-2.5 select-none">
        <a 
          href="https://www.themoviedb.org/" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="opacity-45 hover:opacity-80 transition duration-200"
        >
          <img 
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" 
            alt="TMDB Logo" 
            width={90} 
            height={13} 
          />
        </a>
        <p className="text-[9px] font-semibold text-zinc-600 max-w-[240px] leading-relaxed">
          Bu uygulama TMDB API&apos;sini kullanmaktadır ancak TMDB tarafından onaylanmamıştır.
        </p>
      </div>
    </div>
  );
}
