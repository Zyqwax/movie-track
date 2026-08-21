"use client";

import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Film, Eye, Clock, Star, Users, Share2, ChevronRight } from "lucide-react";
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
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
    .slice(0, 6);

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
    <div className="min-h-full bg-zinc-950 text-zinc-100 overflow-hidden">

      {/* ── Profile Header ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Banner gradient */}
        <div className="h-24 w-full bg-gradient-to-br from-rose-950/50 via-zinc-900 to-indigo-950/30 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-rose-500/20 via-transparent to-transparent" />
        </div>

        {/* Avatar + Info overlay */}
        <div className="px-4 pb-4 border-b border-zinc-900/60">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            {/* Avatar */}
            <div className="relative shrink-0 group">
              <div className="absolute -inset-1 bg-gradient-to-br from-rose-500 to-[#5865f2] rounded-full blur opacity-50 group-hover:opacity-80 transition duration-300" />
              <div className="relative w-20 h-20 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden ring-3 ring-zinc-950 shadow-2xl">
                {user.photoURL ? (
                  <Image
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    width={80}
                    height={80}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-extrabold bg-gradient-to-br from-rose-400 to-rose-600 w-full h-full flex items-center justify-center text-white">
                    {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
              </div>
            </div>

            {/* Action buttons - top right area */}
            <div className="flex-1 flex justify-end gap-2 pb-1">
              <button
                onClick={handleShareProfile}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700 active:scale-95 transition-all text-xs font-semibold"
                title="Profili Paylaş"
              >
                <Share2 size={13} strokeWidth={2.5} />
                <span>Paylaş</span>
              </button>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:border-rose-500/40 active:scale-95 transition-all text-xs font-semibold"
                title="Çıkış Yap"
              >
                <LogOut size={13} strokeWidth={2.5} />
                <span>Çıkış</span>
              </button>
            </div>
          </div>

          {/* User info */}
          <div>
            <h1 className="text-lg font-black text-white tracking-tight">
              {user.displayName || "Kullanıcı"}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">{user.email}</p>
          </div>
        </div>
      </div>

      {/* ── Stats Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 px-4 py-5 border-b border-zinc-900/40">
        {[
          {
            icon: <Eye size={16} className="text-emerald-400" />,
            bg: "bg-emerald-500/10",
            value: movies === undefined ? "—" : watched.length,
            label: "İzlendi",
            color: "text-emerald-400",
          },
          {
            icon: <Film size={15} className="text-rose-400" />,
            bg: "bg-rose-500/10",
            value: movies === undefined ? "—" : wishlist.length,
            label: "Listede",
            color: "text-rose-400",
          },
          {
            icon: <Star size={14} className="text-amber-400 fill-amber-400/20" />,
            bg: "bg-amber-500/10",
            value: movies === undefined ? "—" : (avgRating || "—"),
            label: "Ort. Puan",
            color: "text-amber-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-zinc-900/50 border border-zinc-800/60 rounded-2xl p-3.5 flex flex-col items-center gap-1.5 hover:border-zinc-700/60 transition-colors"
          >
            <div className={`w-8 h-8 rounded-full ${stat.bg} flex items-center justify-center`}>
              {stat.icon}
            </div>
            <span className={`text-xl font-black tracking-tight ${stat.color}`}>{stat.value}</span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wide">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* ── Friends Section ──────────────────────────────────────────── */}
      <div className="px-4 py-5 border-b border-zinc-900/40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[#5865f2]" />
            <h2 className="text-sm font-bold text-white">Arkadaşlarım</h2>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
              {friends.length}
            </span>
          </div>
          <button
            onClick={handleShareProfile}
            className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-0.5 transition-colors"
          >
            + Arkadaş Ekle
          </button>
        </div>

        {friends.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
            {friends.map((friend) => (
              <Link
                key={friend.id}
                href={`/u/${friend.uid}`}
                className="flex flex-col items-center gap-2 shrink-0 w-16 group"
              >
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border-2 border-zinc-800 group-hover:border-[#5865f2] group-hover:scale-105 transition-all duration-200 shadow-md">
                    {friend.photoURL ? (
                      <Image
                        src={friend.photoURL}
                        alt={friend.displayName || ""}
                        width={56}
                        height={56}
                        className="object-cover h-full w-full"
                      />
                    ) : (
                      <span className="text-lg font-black text-[#5865f2] bg-[#5865f2]/10 w-full h-full flex items-center justify-center">
                        {friend.displayName?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-[#23a55a] border-2 border-zinc-950" />
                </div>
                <span className="text-[10px] font-semibold text-zinc-400 group-hover:text-white truncate w-full text-center transition-colors">
                  {friend.displayName?.split(" ")[0]}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-2xl p-5 text-center">
            <Users size={24} className="text-zinc-700 mx-auto mb-2" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              Arkadaş listeniz boş.{" "}
              <button
                onClick={handleShareProfile}
                className="text-rose-400 hover:text-rose-300 font-bold transition-colors"
              >
                Profil linkini paylaşarak
              </button>{" "}
              arkadaş ekleyin!
            </p>
          </div>
        )}
      </div>

      {/* ── Recently Watched ─────────────────────────────────────────── */}
      {recentlyWatched.length > 0 && (
        <div className="px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-rose-400" />
              <h2 className="text-sm font-bold text-white">Son İzlenenler</h2>
            </div>
            <Link
              href="/?tab=watched"
              className="text-[11px] text-zinc-500 hover:text-zinc-300 font-semibold flex items-center gap-0.5 transition-colors"
            >
              Tümü <ChevronRight size={12} />
            </Link>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
            {recentlyWatched.map((movie) => (
              <Link
                key={movie.id}
                href={`/movie/${movie.id}`}
                className="relative group rounded-xl overflow-hidden aspect-[2/3] bg-zinc-900 border border-zinc-900/60 shadow-sm hover:shadow-md transition-all duration-200"
              >
                {movie.posterPath ? (
                  <Image
                    src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`}
                    alt={movie.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-400"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-700">
                    <Film size={16} />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                {movie.rating > 0 && (
                  <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-amber-500/90 backdrop-blur-sm text-white text-[7px] font-black px-1.5 py-0.5 rounded-full shadow z-10">
                    <Star size={6} className="fill-white" />
                    <span>{movie.rating}</span>
                  </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-1.5">
                  <p className="text-[9px] font-bold text-white leading-tight line-clamp-1">
                    {movie.title}
                  </p>
                  {movie.watchedAt && (
                    <span className="text-[7.5px] font-medium text-zinc-500">
                      {dayjs(movie.watchedAt).fromNow()}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── TMDB Attribution ─────────────────────────────────────────── */}
      <div className="mt-6 mb-4 px-4 flex flex-col items-center text-center gap-2">
        <a
          href="https://www.themoviedb.org/"
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-40 hover:opacity-70 transition duration-200"
        >
          <img
            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg"
            alt="TMDB Logo"
            width={80}
            height={11}
          />
        </a>
        <p className="text-[9px] font-medium text-zinc-700 max-w-[220px] leading-relaxed">
          Bu uygulama TMDB API&apos;sini kullanmaktadır ancak TMDB tarafından onaylanmamıştır.
        </p>
      </div>
    </div>
  );
}
