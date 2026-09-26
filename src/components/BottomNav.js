"use client";

import { Film, Home, List, Menu, MessageCircle, Search, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useNavigation } from "@/context/NavigationContext";
import { db } from "@/lib/firebase";
import { getLanguageConfig, translate } from "@/lib/i18n";
import Avatar from "@/components/ui/Avatar";
import MobileBottomBar from "@/components/ui/MobileBottomBar";

const primaryNavItems = [
  { key: "home", href: "/", icon: Home },
  { key: "discover", href: "/search", icon: Search },
  { key: "lists", href: "/lists", icon: List },
  { key: "messages", href: "/messages", icon: MessageCircle },
];

function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function UserAvatar({ user, size = "default", className = "" }) {
  const dimension = className.includes("h-full") ? "100%" : size === "small" ? 34 : 40;
  return (
    <Avatar
      user={user}
      size={dimension}
      className={twMerge(
        clsx(
          "bg-linear-to-br from-accent-alt to-accent font-inter text-text shadow-[0_0_0_2px_var(--color-surface),0_0_0_3px_var(--color-accent-glow)]",
          size === "small" && "text-sm",
          className,
        ),
      )}
    />
  );
}

function NavigationLink({ item, pathname, hasUnread, label, onNavigate }) {
  const Icon = item.icon;
  const active = isActive(pathname, item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "relative flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-3.5 py-2.5 text-sm font-semibold no-underline transition-[background-color,color] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        active ? "bg-accent/10 text-accent" : "text-muted hover:bg-surface-2 hover:text-text",
      )}
    >
      <Icon size={18} aria-hidden="true" />
      <span>{label}</span>
      {item.href === "/messages" && hasUnread && (
        <i className="ml-auto h-1.5 w-1.5 rounded-full bg-accent-alt" aria-label="Unread messages" />
      )}
    </Link>
  );
}

function Sidebar({ pathname, user, language, hasUnread, sidebarOpen, mobileMenuOpen, onClose }) {
  const t = (key, values) => translate(language, key, values);
  return (
    <>
      {(mobileMenuOpen || sidebarOpen) && (
        <button
          type="button"
          className="fixed inset-0 top-16 z-[55] bg-transparent max-md:top-0 max-md:bg-bg/70 focus-visible:ring-2 focus-visible:ring-accent"
          onClick={onClose}
          aria-label={t("nav.closeMenu")}
        />
      )}
      <aside
        id="movie-tracker-sidebar"
        aria-label={t("nav.sidebar")}
        className={clsx(
          "fixed z-[60] flex w-72 flex-col border-r border-border bg-surface px-4 pb-5 pt-5 shadow-2xl shadow-black/30 transition-transform duration-200 md:bottom-0 md:left-0 md:top-16 md:w-64 md:shadow-none",
          mobileMenuOpen ? "inset-y-0 left-0 translate-x-0" : "inset-y-0 left-0 -translate-x-full",
          sidebarOpen ? "md:translate-x-0" : "md:-translate-x-full",
        )}
      >
        <div className="mb-5 flex items-center justify-between border-b border-border px-2 pb-4 md:hidden">
          <span className="font-syne text-lg font-extrabold tracking-[0.04em] text-text">Movie Tracker</span>
          <button
            type="button"
            onClick={onClose}
            className="grid min-h-11 min-w-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={t("nav.closeMenu")}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <nav className="space-y-1" aria-label={t("nav.main")}>
          {primaryNavItems.map((item) => (
            <NavigationLink key={item.href} item={item} pathname={pathname} hasUnread={hasUnread} label={t(`nav.${item.key}`)} onNavigate={onClose} />
          ))}
        </nav>
        <div className="mt-auto border-t border-border pt-4">
          <Link
            href="/profile"
            onClick={onClose}
            className="flex min-h-11 items-center gap-3 rounded-[var(--radius-md)] px-2.5 py-2.5 text-text no-underline hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
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
  const router = useRouter();
  const { user, language } = useAuth();
  const { sidebarOpen, setSidebarOpen, mobileMenuOpen, setMobileMenuOpen } = useNavigation();
  const [hasUnread, setHasUnread] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchRef = useRef(null);
  const t = (key, values) => translate(language, key, values);
  const hidden = !user || pathname === "/login";
  const desktopShellHidden = pathname.startsWith("/messages/");

  useEffect(() => {
    if (!user) return undefined;
    const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
    return onSnapshot(chatsQuery, (snapshot) => {
      setHasUnread(snapshot.docs.some((chat) => chat.data().unreadBy?.includes(user.uid)));
    });
  }, [user]);

  useEffect(() => {
    const queryInput = searchInput.trim();
    if (!queryInput) return undefined;

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

  const closeMenus = () => {
    setSidebarOpen(false);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className={clsx("sticky top-0 z-50 flex min-h-16 items-center gap-3 border-b border-border bg-bg/90 px-5 backdrop-blur-md max-md:px-3", desktopShellHidden && "hidden")}>
        <button
          type="button"
          className="grid min-h-11 min-w-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text max-md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? t("nav.closeSidebar") : t("nav.openSidebar")}
          aria-controls="movie-tracker-sidebar"
          aria-expanded={sidebarOpen}
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="grid min-h-11 min-w-11 place-items-center rounded-full text-muted hover:bg-surface-2 hover:text-text md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          onClick={() => setMobileMenuOpen(true)}
          aria-label={t("nav.openMenu")}
          aria-controls="movie-tracker-sidebar"
          aria-expanded={mobileMenuOpen}
        >
          <Menu size={21} aria-hidden="true" />
        </button>
        <Link className="flex shrink-0 items-center gap-2.5 text-text no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" href="/" aria-label={t("nav.homeLink")}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[var(--radius-sm)] bg-accent brand-mark-stripes font-syne text-[10px] font-extrabold text-bg">MT</span>
          <span className="font-syne text-base font-extrabold tracking-[0.04em] max-sm:hidden">Movie Tracker</span>
        </Link>
        <div className="relative ml-auto flex min-w-0 flex-1 items-center justify-end gap-2.5">
          <form
            ref={searchRef}
            className="relative flex min-h-11 w-full max-w-3xl items-center gap-2 rounded-full border border-border bg-surface px-3.5 text-muted focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--color-accent-glow)]"
            onSubmit={(event) => { event.preventDefault(); openMovieSuggestion(suggestions[0]); }}
          >
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
              className="h-10 min-w-0 flex-1 bg-transparent text-sm font-medium text-text outline-none placeholder:text-muted"
            />
            {suggestionsOpen && searchInput.trim() && suggestions.length > 0 && (
              <div id="header-search-suggestions" role="listbox" className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-[70] overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-2 p-1.5 shadow-2xl shadow-black/40">
                {suggestions.map((movie) => (
                  <button
                    key={movie.id}
                    type="button"
                    role="option"
                    aria-selected="false"
                    className="flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-sm text-text hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    onClick={() => openMovieSuggestion(movie)}
                  >
                    <span
                      className="grid h-11 w-8 shrink-0 place-items-center overflow-hidden rounded-[var(--radius-sm)] bg-surface text-accent"
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
          {pathname !== "/" && <Link href="/profile" aria-label={t("nav.profileLabel")} className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><UserAvatar user={user} /></Link>}
        </div>
      </header>
      {!desktopShellHidden && <Sidebar pathname={pathname} user={user} language={language} hasUnread={hasUnread} sidebarOpen={sidebarOpen} mobileMenuOpen={mobileMenuOpen} onClose={closeMenus} />}
      <MobileBottomBar pathname={pathname} language={language} hasUnread={hasUnread} />
    </>
  );
}

export { getInitials } from "@/components/ui/Avatar";
export { UserAvatar };
