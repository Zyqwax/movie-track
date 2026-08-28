"use client";

import { Home, Search, User, MessageCircle } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const navItems = [
  { name: "Ana Sayfa", href: "/", icon: Home },
  { name: "Keşfet", href: "/search", icon: Search },
  { name: "Mesajlar", href: "/messages", icon: MessageCircle },
];

function getInitials(user) {
  const name = user?.displayName?.trim();
  if (name)
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
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
      aria-label={user?.displayName || "Kullanıcı"}
    >
      {user?.photoURL ? (
        <img
          src={user.photoURL}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(user)
      )}
    </span>
  );
}

function isActive(pathname, href) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

const unreadClass =
  "absolute right-2 top-1.75 h-1.5 w-1.5 rounded-full bg-oxblood-bright shadow-[0_0_0_2px_var(--color-void)]";

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    const chatsQuery = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
    );
    return onSnapshot(chatsQuery, (snapshot) => {
      setHasUnread(
        snapshot.docs.some((chat) => chat.data().unreadBy?.includes(user.uid)),
      );
    });
  }, [user]);

  if (!user || pathname === "/login" || pathname.startsWith("/messages/"))
    return null;

  return (
    <>
      <header className="sticky top-0 z-40 flex items-center gap-7 border-b border-white/9 bg-void/94 px-10 py-3.5 backdrop-blur-[10px] max-lg:gap-4 max-lg:px-6 max-md:gap-3.5 max-md:px-4 max-md:pt-[calc(10px+env(safe-area-inset-top))]">
        <Link
          className="flex shrink-0 items-center gap-2.5 text-ivory no-underline"
          href="/"
          aria-label="Movie Tracker ana sayfa"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-gold brand-mark-stripes font-mono text-[9px] font-extrabold text-gold-ink">
            MT
          </span>
          <span className="font-display text-base font-extrabold tracking-[0.04em] max-md:text-sm">
            MOVIE TRACKER
          </span>
        </Link>
        <nav
          className="flex flex-1 items-center gap-1 max-md:hidden"
          aria-label="Ana navigasyon"
        >
          {navItems.map(({ name, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "relative flex min-h-11 items-center gap-1.75 rounded-lg px-3.5 py-2.25 text-sm font-semibold no-underline transition-[color,background] duration-150",
                isActive(pathname, href)
                  ? "bg-gold/8 text-gold"
                  : "text-muted hover:bg-ivory/3 hover:text-ivory",
              )}
            >
              <Icon aria-hidden="true" />
              {name}
              {href === "/messages" && hasUnread && (
                <i className={unreadClass} aria-label="Okunmamış mesaj" />
              )}
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-3.5 max-md:flex-1">
          <Link
            className="flex min-h-10 w-55 items-center gap-2 rounded-full border border-white/9 bg-surface1 px-3.5 py-2 text-[13px] text-muted no-underline max-lg:w-[170px] max-md:w-auto max-md:flex-1"
            href="/search"
          >
            <Search aria-hidden="true" size={16} />
            <span>Film ara...</span>
          </Link>
          <Link href="/profile" aria-label="Profil">
            <UserAvatar user={user} />
          </Link>
        </div>
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-50 hidden border-t border-white/16 bg-surface1/97 px-2 py-2 backdrop-blur-[10px] max-md:flex max-md:pb-[calc(8px+env(safe-area-inset-bottom))]"
        aria-label="Mobil navigasyon"
      >
        {[...navItems, { name: "Profil", href: "/profile", icon: User }].map(
          ({ name, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={clsx(
                "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[10px] font-semibold no-underline",
                isActive(pathname, href) ? "text-gold" : "text-muted",
              )}
            >
              <span className="relative flex">
                <Icon size={20} aria-hidden="true" />
                {href === "/messages" && hasUnread && (
                  <i className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-oxblood-bright shadow-[0_0_0_2px_var(--color-surface1)]" />
                )}
              </span>
              <span>{name}</span>
            </Link>
          ),
        )}
      </nav>
    </>
  );
}

export { getInitials, UserAvatar };
