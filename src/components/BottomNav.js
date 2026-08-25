"use client";

import { Home, Search, User, MessageCircle, Activity } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import clsx from "clsx";

const navItems = [
  { name: "Ana Sayfa", href: "/", icon: Home },
  { name: "Keşfet", href: "/search", icon: Search },
  { name: "Mesajlar", href: "/messages", icon: MessageCircle },
];

function getInitials(user) {
  const name = user?.displayName?.trim();
  if (name) return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return (user?.email?.[0] || "?").toUpperCase();
}

function UserAvatar({ user, size = "default" }) {
  return <span className={clsx("user-avatar", size === "small" && "user-avatar-small")} aria-label={user?.displayName || "Kullanıcı"}>
    {user?.photoURL ? <img src={user.photoURL} alt="" /> : getInitials(user)}
  </span>;
}

function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return undefined;
    const chatsQuery = query(collection(db, "chats"), where("participants", "array-contains", user.uid));
    return onSnapshot(chatsQuery, (snapshot) => {
      setHasUnread(snapshot.docs.some((chat) => chat.data().unreadBy?.includes(user.uid)));
    });
  }, [user]);

  if (!user || pathname === "/login" || pathname.startsWith("/messages/")) return null;

  return (
    <>
      <header className="topnav">
        <Link className="brand" href="/" aria-label="Movie Tracker ana sayfa">
          <span className="brand-mark">MT</span>
          <span className="brand-name">MOVIE TRACKER</span>
        </Link>
        <nav className="topnav-links" aria-label="Ana navigasyon">
          {navItems.map(({ name, href, icon: Icon }) => (
            <Link key={href} href={href} className={clsx("nav-item", isActive(pathname, href) && "active")}>
              <Icon aria-hidden="true" />{name}
              {href === "/messages" && hasUnread && <i className="nav-unread" aria-label="Okunmamış mesaj" />}
            </Link>
          ))}
        </nav>
        <div className="topnav-right">
          <Link className="nav-search" href="/search"><Search aria-hidden="true" size={16} /><span>Film ara...</span></Link>
          <Link href="/profile" aria-label="Profil"><UserAvatar user={user} /></Link>
        </div>
      </header>
      <nav className="bottom-nav" aria-label="Mobil navigasyon">
        {[...navItems, { name: "Profil", href: "/profile", icon: User }].map(({ name, href, icon: Icon }) => (
          <Link key={href} href={href} className={clsx("bn-item", isActive(pathname, href) && "active")}>
            <span className="bn-icon"><Icon size={20} aria-hidden="true" />{href === "/messages" && hasUnread && <i className="nav-unread" />}</span>
            <span>{name}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}

export { getInitials, UserAvatar };
