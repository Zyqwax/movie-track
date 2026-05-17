"use client";

import { Home, Search, User, MessageCircle, Activity } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import clsx from "clsx";

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      let unread = false;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.unreadBy?.includes(user.uid)) {
          unread = true;
        }
      });
      setHasUnread(unread);
    });

    return () => unsub();
  }, [user]);

  // Hide on login, chat detail pages
  if (pathname === "/login" || pathname.startsWith("/messages/")) return null;
  if (!user) return null;

  const navItems = [
    { name: "Film", href: "/", icon: Home },
    { name: "Keşfet", href: "/search", icon: Search },
    { name: "Mesaj", href: "/messages", icon: MessageCircle, badge: hasUnread },
    { name: "Akış", href: "/activity", icon: Activity },
    { name: "Profil", href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/50 flex items-center justify-around z-50 pb-[env(safe-area-inset-bottom,0px)]" style={{ height: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}>
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors duration-150",
              isActive ? "text-rose-500" : "text-zinc-500 active:text-zinc-300"
            )}
          >
            <div className="relative">
              <item.icon className="w-[18px] h-[18px]" strokeWidth={isActive ? 2.5 : 1.8} />
              {item.badge && (
                <div className="absolute -top-0.5 -right-1 w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
              )}
            </div>
            <span className={clsx("text-[9px] font-medium", isActive && "font-semibold")}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
