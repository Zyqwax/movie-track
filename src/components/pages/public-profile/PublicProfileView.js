import Link from "next/link";
import { ChevronLeft, Film, UserMinus, UserPlus } from "lucide-react";
import clsx from "clsx";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("tr");
import { UserAvatar } from "@/components/BottomNav";
import { MovieCard } from "@/components/ArchiveUI";

export function PublicProfileLoading() {
  return (
    <div className="min-h-full flex justify-center items-center bg-zinc-950">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
    </div>
  );
}

// ── Public profile header ─────────────────────────────────────────────────
function PublicHeader({ targetUser, isFriend, onBack, onToggleFriend }) {
  return (
    <>
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-gradient-to-br from-[#f43f5e]/15 to-[#5865f2]/10 rounded-full blur-[80px] pointer-events-none -z-10" />
      <div className="sticky top-0 z-20 px-4 py-3.5 bg-zinc-950/80 backdrop-blur-md flex items-center border-b border-zinc-900/60 select-none">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition shrink-0"
        >
          <ChevronLeft size={20} className="stroke-[2.5]" />
        </button>
        <h1 className="text-xs font-bold uppercase tracking-wider ml-2.5 text-zinc-400">
          Geri Dön
        </h1>
      </div>
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-r from-rose-950/30 via-zinc-900 to-indigo-950/20 border-b border-zinc-900">
        <div className="absolute inset-0 public-profile-banner-glow from-rose-500/10 via-transparent to-transparent opacity-60" />
      </div>
      <div className="px-5 -mt-12 relative flex flex-col items-center gap-3">
        <div className="h-[82px] w-[82px] rounded-full bg-surface1 p-[3px] shadow-[0_0_0_1px_var(--color-gold-dim)]">
          <UserAvatar user={targetUser} className="h-full w-full text-3xl" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
            {targetUser.displayName || "Kullanıcı"}
          </h2>
          <div className="flex items-center justify-center gap-1 mt-1.5 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse" />
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
              aktif
            </span>
          </div>
        </div>
        <div className="mt-3.5 w-full max-w-[220px] px-4 select-none">
          <button
            onClick={onToggleFriend}
            className={clsx(
              "w-full px-5 py-2.5 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95",
              isFriend
                ? "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/80"
                : "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-500/20",
            )}
          >
            {isFriend ? (
              <>
                <UserMinus size={14} strokeWidth={2.5} />
                Arkadaşlıktan Çıkar
              </>
            ) : (
              <>
                <UserPlus size={14} strokeWidth={2.5} />
                Arkadaş Ekle
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// ── Archive stats and tabs ────────────────────────────────────────────────
function PublicStats({ movies, watched, wishlist, avgRating }) {
  return (
    <div className="border-b border-white/9 px-4 py-[18px]">
      <div className="flex justify-around">
        {[
          [watched.length, "İzlendi"],
          [wishlist.length, "Listesinde"],
          [avgRating || "—", "Ort. Puan"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="flex-1 min-w-22 px-4 py-2.5 text-center font-mono [&+&]:border-l [&+&]:border-dashed [&+&]:border-white/16"
          >
            <span className="block font-display text-[26px] font-black leading-none text-gold">
              {movies === undefined ? "—" : value}
            </span>
            <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PublicProfileNotFound() {
  return (
    <div className="min-h-full flex flex-col justify-center items-center bg-zinc-950 text-zinc-400 p-8 select-none">
      <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
        <Film size={24} className="text-rose-500 opacity-60" />
      </div>
      <h1 className="text-lg font-bold text-white mb-2">
        Kullanıcı Bulunamadı
      </h1>
      <p className="text-center text-xs leading-relaxed max-w-xs text-zinc-500">
        Bu profile ulaşılamıyor. Profil linki yanlış veya hesap silinmiş
        olabilir.
      </p>
      <Link
        href="/search"
        className="mt-6 px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-300 font-semibold text-xs hover:text-white transition"
      >
        Keşfet&apos;e Dön
      </Link>
    </div>
  );
}

function MovieTabs({ activeTab, onTabChange }) {
  return (
    <div className="px-5 select-none">
      <div className="bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-900 flex gap-2">
        {[
          { id: "watched", label: "İzlediği Filmler" },
          { id: "wishlist", label: "İzleme Listesi" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "flex-1 py-2.5 text-xs font-bold rounded-lg transition-all active:scale-[0.98]",
              activeTab === tab.id
                ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/20"
                : "bg-transparent text-zinc-500 hover:text-zinc-300",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Movie archive ─────────────────────────────────────────────────────────
function MovieArchive({ movies, sortedMovies, activeTab, myMovies }) {
  if (movies !== undefined && sortedMovies.length === 0)
    return (
      <div className="py-16 flex flex-col items-center justify-center text-zinc-650 bg-zinc-900/15 border border-zinc-900 rounded-2xl select-none">
        <Film size={28} className="mb-2.5 opacity-40 text-rose-500" />
        <p className="text-xs font-bold text-zinc-500">Bu liste boş.</p>
      </div>
    );
  const datedMovies =
    activeTab === "watched"
      ? sortedMovies.filter(
          (movie) => movie.watchedAt != null && movie.watchedAt !== 0,
        )
      : sortedMovies;
  const undatedMovies =
    activeTab === "watched"
      ? sortedMovies.filter(
          (movie) => movie.watchedAt == null || movie.watchedAt === 0,
        )
      : [];
  const card = (movie) => {
    const myStatus = myMovies?.find((item) => item.id === movie.id)?.status;
    return (
      <MovieCard
        key={movie.id}
        movie={movie}
        rating={activeTab === "watched" ? movie.rating : undefined}
        status={
          myStatus === "watched"
            ? "İzlendi"
            : myStatus === "wishlist"
              ? "Listende"
              : undefined
        }
        subtitle={
          activeTab === "watched" && movie.watchedAt
            ? dayjs(movie.watchedAt).fromNow()
            : undefined
        }
      />
    );
  };
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {datedMovies.map(card)}
      </div>
      {undatedMovies.length > 0 && (
        <>
          <div className="flex items-center gap-3 my-6 select-none">
            <div className="flex-1 h-px bg-zinc-900" />
            <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider shrink-0">
              Tarih Belirtilmemiş
            </span>
            <div className="flex-1 h-px bg-zinc-900" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {undatedMovies.map(card)}
          </div>
        </>
      )}
    </div>
  );
}

export default function PublicProfileView({
  targetUser,
  isFriend,
  movies,
  watched,
  wishlist,
  avgRating,
  activeTab,
  onBack,
  onToggleFriend,
  onTabChange,
  sortedMovies,
  myMovies,
}) {
  return (
    <div className="min-h-full bg-zinc-950 text-zinc-150 pb-20 flex flex-col relative overflow-hidden">
      <PublicHeader
        targetUser={targetUser}
        isFriend={isFriend}
        onBack={onBack}
        onToggleFriend={onToggleFriend}
      />
      <PublicStats
        movies={movies}
        watched={watched}
        wishlist={wishlist}
        avgRating={avgRating}
      />
      <MovieTabs activeTab={activeTab} onTabChange={onTabChange} />
      <div className="flex-1 px-5 mt-6">
        <MovieArchive
          movies={movies}
          sortedMovies={sortedMovies}
          activeTab={activeTab}
          myMovies={myMovies}
        />
      </div>
    </div>
  );
}
