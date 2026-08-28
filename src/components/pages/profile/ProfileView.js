import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  LogOut,
  Settings,
  Share2,
  Users,
} from "lucide-react";
import {
  LANGUAGES,
  REGIONS,
  getLanguageConfig,
  getRegionLabel,
} from "@/lib/i18n";
import { UserAvatar } from "@/components/BottomNav";
import { MovieCard } from "@/components/ArchiveUI";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export function ProfileLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
    </div>
  );
}

// ── Profile header ───────────────────────────────────────────────────────
function ProfileHeader({ user, onShare, onLogout, t }) {
  return (
    <div className="relative overflow-hidden profile-header-background rounded-xl">
      <div className="relative border-b border-zinc-900/60 px-4 pb-4 pt-12">
        <div className="flex items-end gap-4 -mt-8 mb-4">
          <div className="h-20.5 w-20.5 rounded-full bg-surface1 p-0.75 shadow-[0_0_0_1px_var(--color-gold-dim)]">
            <UserAvatar user={user} className="h-full w-full text-3xl" />
          </div>
          <div className="flex-1 flex justify-end gap-2 pb-1">
            <button
              onClick={onShare}
              className="flex min-h-11 items-center justify-center gap-2.25 rounded-[10px] border border-white/16 bg-transparent px-4 py-3 font-body text-sm font-bold text-ivory transition hover:-translate-y-px hover:bg-ivory/4"
              title={t("profile.share")}
            >
              <Share2 size={13} strokeWidth={2.5} />
              <span>{t("profile.share")}</span>
            </button>
            <button
              onClick={onLogout}
              className="flex min-h-11 items-center justify-center gap-2.25 rounded-[10px] border border-white/16 bg-transparent px-4 py-3 font-body text-sm font-bold text-ivory transition hover:-translate-y-px hover:bg-ivory/4"
              title={t("profile.logout")}
            >
              <LogOut size={13} strokeWidth={2.5} />
              <span>{t("profile.logout")}</span>
            </button>
          </div>
        </div>
        <div>
          <h1 className="text-lg font-black text-white tracking-tight">
            {user.displayName || "Kullanıcı"}
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">{user.email}</p>
        </div>
      </div>
    </div>
  );
}

// ── Preferences ──────────────────────────────────────────────────────────
function PreferencesSection({ language, region, onChange, status, t }) {
  return (
    <section
      className="border-b border-zinc-900/40 px-4 py-5"
      aria-labelledby="settings-title"
    >
      <div className="mb-4 flex items-center gap-2">
        <Settings size={15} className="text-gold" />
        <h2 id="settings-title" className="text-sm font-bold text-white">
          {t("settings.title")}
        </h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
          {t("settings.language")}
          <select
            value={language}
            onChange={(event) => onChange("language", event.target.value)}
            className="min-h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-gold"
          >
            {LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
          <span className="font-normal text-[10px] text-zinc-600">
            {t("settings.languageHelp")}
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-zinc-400">
          {t("settings.region")}
          <select
            value={region}
            onChange={(event) => onChange("region", event.target.value)}
            className="min-h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-white outline-none focus:border-gold"
          >
            {REGIONS.map((item) => (
              <option key={item.code} value={item.code}>
                {getRegionLabel(item.code, language)}
              </option>
            ))}
          </select>
          <span className="font-normal text-[10px] text-zinc-600">
            {t("settings.regionHelp")}
          </span>
        </label>
      </div>
      {status !== "idle" && (
        <p
          className={
            status === "error"
              ? "mt-3 text-xs text-rose-400"
              : "mt-3 text-xs text-gold"
          }
          role="status"
        >
          {status === "saving"
            ? t("common.saving")
            : status === "saved"
              ? t("settings.saved")
              : t("settings.error")}
        </p>
      )}
    </section>
  );
}

// ── Archive sections ─────────────────────────────────────────────────────
function ProfileStats({ movies, watchedCount, wishlistCount, average, t }) {
  return (
    <div className="border-b border-white/9 px-4 py-4.5">
      <div className="flex justify-around">
        {[
          [watchedCount, "profile.watched"],
          [wishlistCount, "profile.wishlist"],
          [average || "—", "profile.average"],
        ].map(([value, label]) => (
          <div
            key={label}
            className="flex-1 min-w-22 px-4 py-2.5 text-center font-mono [&+&]:border-l [&+&]:border-dashed [&+&]:border-white/16"
          >
            <span className="block font-display text-[26px] font-black leading-none text-gold">
              {movies === undefined ? "—" : value}
            </span>
            <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-muted">
              {t(label)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FriendsSection({ friends, onShare, t }) {
  return (
    <div className="px-4 py-5 border-b border-zinc-900/40">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users size={14} className="text-[#5865f2]" />
          <h2 className="text-sm font-bold text-white">{t("profile.friends")}</h2>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
            {friends.length}
          </span>
        </div>
        <button
          onClick={onShare}
          className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-0.5 transition-colors"
        >
          {t("profile.addFriend")}
        </button>
      </div>
      {friends.length > 0 ? (
        <div
          className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1 pt-1"
          style={{ scrollbarWidth: "none" }}
        >
          {friends.map((friend) => (
            <Link
              key={friend.id}
              href={`/u/${friend.uid}`}
              className="flex flex-col items-center gap-2 shrink-0 w-16 group"
            >
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border-2 border-zinc-800 group-hover:border-[#5865f2] group-hover:scale-105 transition-all duration-200 shadow-md">
                  {friend.photoURL ? (
                    <Image
                      src={friend.photoURL}
                      alt={friend.displayName || ""}
                      width={64}
                      height={64}
                      className="object-cover h-full w-full"
                    />
                  ) : (
                    <span className="text-lg font-black text-[#5865f2] bg-[#5865f2]/10 w-full h-full flex items-center justify-center">
                      {friend.displayName?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
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
              onClick={onShare}
              className="text-rose-400 hover:text-rose-300 font-bold transition-colors"
            >
              Profil linkini paylaşarak
            </button>{" "}
            arkadaş ekleyin!
          </p>
        </div>
      )}
    </div>
  );
}

function RecentlyWatched({ movies, language, t }) {
  if (!movies.length) return null;
  return (
    <div className="px-4 py-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-rose-400" />
          <h2 className="text-sm font-bold text-white">{t("profile.recentlyWatched")}</h2>
        </div>
        <Link
          href="/?tab=watched"
          className="text-[11px] text-zinc-500 hover:text-zinc-300 font-semibold flex items-center gap-0.5 transition-colors"
        >
          {t("profile.all")} <ChevronRight size={12} />
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {movies.map((movie) => (
          <MovieCard
            key={movie.id}
            movie={movie}
            rating={movie.rating}
            subtitle={
              movie.watchedAt
                ? dayjs(movie.watchedAt)
                    .locale(getLanguageConfig(language).dayjs)
                    .fromNow()
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

// ── Attribution ──────────────────────────────────────────────────────────
function Attribution() {
  return (
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
        Bu uygulama TMDB API&apos;sini kullanmaktadır ancak TMDB tarafından
        onaylanmamıştır.
      </p>
    </div>
  );
}

export default function ProfileView({
  user,
  language,
  region,
  movies,
  friends,
  watched,
  wishlist,
  avgRating,
  recentlyWatched,
  preferenceStatus,
  onPreferenceChange,
  onShare,
  onLogout,
  t,
}) {
  return (
    <div className="min-h-full bg-zinc-950 text-zinc-100 overflow-hidden p-4">
      <ProfileHeader user={user} onShare={onShare} onLogout={onLogout} t={t} />
      <PreferencesSection
        language={language}
        region={region}
        onChange={onPreferenceChange}
        status={preferenceStatus}
        t={t}
      />
      <ProfileStats
        movies={movies}
        watchedCount={watched.length}
        wishlistCount={wishlist.length}
        average={avgRating}
        t={t}
      />
      <FriendsSection friends={friends} onShare={onShare} t={t} />
      <RecentlyWatched movies={recentlyWatched} language={language} t={t} />
      <Attribution />
    </div>
  );
}
