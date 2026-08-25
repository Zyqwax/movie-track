"use client";

import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { LogOut, Film, Eye, Clock, Star, Users, Share2, ChevronRight } from "lucide-react";
import { UserAvatar } from "@/components/BottomNav";
import { MovieCard } from "@/components/ArchiveUI";
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
        <div className="profile-banner">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,var(--tw-gradient-stops))] from-rose-500/20 via-transparent to-transparent" />
        </div>

        {/* Avatar + Info overlay */}
        <div className="px-4 pb-4 pt-12 border-b border-zinc-900/60">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            {/* Initials badge: personal archive mark, never a photo */}
            <div className="profile-avatar-large"><UserAvatar user={user} /></div>

            {/* Action buttons - top right area */}
            <div className="flex-1 flex justify-end gap-2 pb-1">
              <button
                onClick={handleShareProfile}
                className="btn btn-ghost"
                title="Profili Paylaş"
              >
                <Share2 size={13} strokeWidth={2.5} />
                <span>Paylaş</span>
              </button>
              <button
                onClick={logout}
                className="btn btn-ghost"
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

      {/* ── Ticket stub stats ───────────────────────────────────────── */}
      <div className="profile-stats"><div className="stub-row">
        <div className="stub"><span className="n">{movies === undefined ? "—" : watched.length}</span><span className="l">İzlendi</span></div>
        <div className="stub"><span className="n">{movies === undefined ? "—" : wishlist.length}</span><span className="l">Listede</span></div>
        <div className="stub"><span className="n">{movies === undefined ? "—" : (avgRating || "—")}</span><span className="l">Ort. Puan</span></div>
      </div></div>

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

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {recentlyWatched.map((movie) => <MovieCard key={movie.id} movie={movie} rating={movie.rating} subtitle={movie.watchedAt ? dayjs(movie.watchedAt).fromNow() : undefined} />)}
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
        <p className="text-[9px] font-medium text-zinc-700 max-w-55 leading-relaxed">
          Bu uygulama TMDB API&apos;sini kullanmaktadır ancak TMDB tarafından onaylanmamıştır.
        </p>
      </div>
    </div>
  );
}
