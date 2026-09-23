"use client";

import { Film, Home, Menu, MessageCircle, Search, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import { getLanguageConfig, translate } from "@/lib/i18n";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { useRouter } from "next/navigation";

const navItems = [
  { key: "home", href: "/", icon: Home },
  { key: "discover", href: "/search", icon: Search },
  { key: "messages", href: "/messages", icon: MessageCircle },
];

function getInitials(user) {
  const name = user?.displayName?.trim();
  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  }
  return (user?.email?.[0] || "?").toUpperCase();
}

function UserAvatar({ user, size = "default", className = "" }) {
  return (
    <span
      className={twMerge(
        clsx(
          "flex h-9.5 w-9.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-oxblood-bright to-oxblood font-display text-base font-extrabold text-ivory shadow-[0_0_0_2px_var(--color-surface1),0_0_0_3px_rgb(231_178_63_/_55%)]",
          size === "small" && "h-8.5 w-8.5 text-sm",
          className,
        ),
      )}
      aria-label={user?.displayName || "User"}
    >
      {user?.photoURL ? <img src={user.photoURL} alt="" className="h-full w-full object-cover" /> : getInitials(user)}
    </span>
  );
}

function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLink({ item, pathname, hasUnread, label, onNavigate }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={clsx(
        "relative flex min-h-11 items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold no-underline transition-[color,background] duration-150",
        active ? "bg-gold/10 text-gold" : "text-muted hover:bg-ivory/5 hover:text-ivory",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      {item.href === "/messages" && hasUnread && <i className="ml-auto h-1.5 w-1.5 rounded-full bg-oxblood-bright" aria-label="Unread messages" />}
    </Link>
  );
}

function Sidebar({ pathname, user, language, hasUnread, sidebarOpen, mobileMenuOpen, onClose }) {
  const t = (key, values) => translate(language, key, values);
  return (
    <>
      {mobileMenuOpen && (
        <button type="button" className="fixed inset-0 z-[55] bg-black/65 md:hidden" onClick={onClose} aria-label={t("nav.closeMenu")} />
      )}
      <aside
        id="movie-tracker-sidebar"
        className={clsx(
          "fixed z-[60] flex w-72 flex-col border-r border-white/9 bg-surface1 px-4 pb-5 pt-5 shadow-2xl shadow-black/30 transition-transform duration-200 md:inset-y-0 md:left-0 md:top-16 md:w-64 md:shadow-none",
          mobileMenuOpen ? "inset-y-0 left-0 translate-x-0" : "inset-y-0 left-0 -translate-x-full",
          sidebarOpen ? "md:translate-x-0" : "md:-translate-x-full",
        )}
        aria-label={t("nav.sidebar")}
      >
        <div className="mb-5 flex items-center justify-between border-b border-white/8 px-2 pb-4 md:hidden">
          <span className="font-display text-lg font-extrabold tracking-[0.04em] text-ivory">MOVIE TRACKER</span>
          <button type="button" onClick={onClose} className="grid min-h-11 min-w-11 place-items-center rounded-xl text-muted hover:bg-ivory/5 hover:text-ivory" aria-label={t("nav.closeMenu")}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav className="space-y-1" aria-label={t("nav.main")}>
          {navItems.map((item) => (
            <NavigationLink key={item.href} item={item} pathname={pathname} hasUnread={hasUnread} label={t(`nav.${item.key}`)} onNavigate={onClose} />
          ))}
        </nav>
        <div className="mt-auto border-t border-white/8 pt-4">
          <Link href="/profile" onClick={onClose} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-ivory no-underline hover:bg-ivory/5">
            <UserAvatar user={user} size="small" />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{user.displayName || user.email || t("nav.profile")}</span>
            <User size={16} className="text-muted" aria-hidden="true" />
          </Link>
        </div>
      </aside>
    </>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const { user, language } = useAuth();
  const { sidebarOpen, setSidebarOpen, mobileMenuOpen, setMobileMenuOpen } = useNavigation();
  const [hasUnread, setHasUnread] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchRef = useRef(null);
  const router = useRouter();
  const t = (key, values) => translate(language, key, values);
  const hidden = !user || pathname === "/login" || pathname.startsWith("/messages/");

  useEffect(() => {
    if (!user) return undefined;
    const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
    return onSnapshot(chatsQuery, (snapshot) => {
      setHasUnread(snapshot.docs.some((chat) => chat.data().unreadBy?.includes(user.uid)));
    });
  }, [user]);

  useEffect(() => {
    const queryInput = searchInput.trim();
    if (!queryInput) {
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        const { tmdb } = getLanguageConfig(language);
        const response = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(queryInput)}&language=${encodeURIComponent(tmdb)}&region=TR&page=1`,
          { signal: controller.signal },
        );
        if (!response.ok) return;
        const data = await response.json();
        setSuggestions((data.results || []).filter((movie) => movie.title || movie.original_title).slice(0, 5));
      } catch (error) {
        if (error.name !== "AbortError") console.error("Header search suggestions error:", error);
      }
    }, 250);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [language, searchInput]);

  useEffect(() => {
    if (!suggestionsOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSuggestionsOpen(false);
    };
    const closeOnOutsidePointer = (event) => {
      if (!searchRef.current?.contains(event.target)) setSuggestionsOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
    };
  }, [suggestionsOpen]);

  const openMovieSuggestion = (movie) => {
    if (!movie?.id) return;
    setSuggestionsOpen(false);
    router.push(`/movie/${movie.id}`);
  };

  if (hidden) return null;

  return (
    <>
      <header className="sticky top-0 z-50 flex min-h-16 items-center gap-3 border-b border-white/9 bg-void/94 px-5 backdrop-blur-[10px] max-md:px-3">
        <button
          type="button"
          className="grid min-h-11 min-w-11 place-items-center rounded-xl text-muted hover:bg-ivory/5 hover:text-ivory max-md:hidden"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? t("nav.closeSidebar") : t("nav.openSidebar")}
          aria-controls="movie-tracker-sidebar"
          aria-expanded={sidebarOpen}
          title={sidebarOpen ? t("nav.closeSidebar") : t("nav.openSidebar")}
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="grid min-h-11 min-w-11 place-items-center rounded-xl text-muted hover:bg-ivory/5 hover:text-ivory md:hidden"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t("nav.openMenu")}
          aria-controls="movie-tracker-sidebar"
          aria-expanded={mobileMenuOpen}
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <Link className="flex shrink-0 items-center gap-2.5 text-ivory no-underline" href="/" aria-label="Movie Tracker home">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gold brand-mark-stripes font-mono text-[9px] font-extrabold text-gold-ink">MT</span>
          <span className="font-display text-base font-extrabold tracking-[0.04em] max-sm:hidden">MOVIE TRACKER</span>
        </Link>
        <div className="relative ml-auto flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <form ref={searchRef} className="relative flex min-h-10 w-full max-w-3xl items-center gap-2 rounded-full border border-white/9 bg-surface1 px-3.5 text-muted focus-within:border-gold-dim focus-within:shadow-[0_0_0_3px_rgb(231_178_63_/_10%)]" onSubmit={(event) => { event.preventDefault(); openMovieSuggestion(suggestions[0]); }}>
            <Search aria-hidden="true" size={16} />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => { setSearchInput(event.target.value); setSuggestions([]); setSuggestionsOpen(true); }}
              onFocus={() => setSuggestionsOpen(true)}
              placeholder={t("nav.search")}
              aria-label={t("nav.search")}
              aria-autocomplete="list"
              aria-controls="header-search-suggestions"
              className="h-10 min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ivory outline-none placeholder:text-muted"
            />
            {suggestionsOpen && searchInput.trim() && suggestions.length > 0 && (
              <div id="header-search-suggestions" role="listbox" className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-[70] overflow-hidden rounded-2xl border border-white/10 bg-surface2 p-1.5 shadow-2xl shadow-black/40">
                {suggestions.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-ivory hover:bg-ivory/6"
                    onClick={() => openMovieSuggestion(movie)}
                  >
                    <span
                      className="grid h-11 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-surface3 text-gold"
                      aria-hidden="true"
                      style={movie.poster_path ? { backgroundImage: `url(https://image.tmdb.org/t/p/w92${movie.poster_path})`, backgroundPosition: "center", backgroundSize: "cover" } : undefined}
                    >
                      {!movie.poster_path && <Film size={14} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{movie.title || movie.original_title}</span>
                    {movie.release_date && <span className="shrink-0 text-xs text-muted">{movie.release_date.slice(0, 4)}</span>}
                  </button>
                ))}
              </div>
            )}
          </form>
          {pathname !== "/" && (
            <Link href="/profile" aria-label={t("nav.profileLabel")}>
              <UserAvatar user={user} />
            </Link>
          )}
        </div>
      </header>
      <Sidebar pathname={pathname} user={user} language={language} hasUnread={hasUnread} sidebarOpen={sidebarOpen} mobileMenuOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
    </>
  );
}

export { getInitials, UserAvatar };
