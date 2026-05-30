"use client";

import { Home, Search, User, MessageCircle, Activity, Menu, X, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import Image from "next/image";
import clsx from "clsx";

export default function BottomNav() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [hasUnread, setHasUnread] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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
        if (data.unreadBy?.includes(user.uid)) unread = true;
      });
      setHasUnread(unread);
    });

    return () => unsub();
  }, [user]);

  if (pathname === "/login" || pathname.startsWith("/messages/")) return null;
  if (!user) return null;

  const navItems = [
    { name: "Ana Sayfa", href: "/", icon: Home },
    { name: "Keşfet", href: "/search", icon: Search },
    { name: "Sohbetler", href: "/messages", icon: MessageCircle, badge: hasUnread },
    { name: "Aktivite Akışı", href: "/activity", icon: Activity },
    { name: "Profilim", href: "/profile", icon: User },
  ];

  /* ─── Shared Sidebar Content ─────────────────────────────────────────── */
  const SidebarContent = ({ onLinkClick }) => (
    <div className="flex flex-col h-full">
      {/* Profile Header */}
      <div className="relative pt-10 pb-6 px-5 border-b border-zinc-900/60 overflow-hidden flex flex-col items-center">
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-rose-950/30 via-zinc-900 to-indigo-950/20 -z-10" />
        <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent opacity-60 -z-10" />

        <div className="relative group shrink-0 mb-3">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-rose-500 to-[#5865f2] rounded-full blur opacity-45 group-hover:opacity-70 transition duration-300" />
          <div className="relative w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden ring-4 ring-zinc-950 shadow-lg">
            {user.photoURL ? (
              <Image src={user.photoURL} alt={user.displayName || "User"} width={64} height={64} className="rounded-full object-cover" />
            ) : (
              <span className="text-2xl font-black text-white bg-gradient-to-br from-rose-400 to-rose-600 w-full h-full flex items-center justify-center">
                {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
        </div>

        <h3 className="text-sm font-bold text-white tracking-tight">{user.displayName || "Kullanıcı"}</h3>
        <p className="text-[10px] text-zinc-500 truncate w-full text-center mt-0.5">{user.email}</p>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-5 px-3 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onLinkClick}
              className={clsx(
                "flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 group relative select-none",
                isActive
                  ? "bg-rose-500/10 text-rose-400 font-bold border-l-4 border-rose-500 pl-3"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900/60 font-medium"
              )}
            >
              <div className="relative flex items-center justify-center shrink-0">
                <item.icon
                  size={18}
                  className={clsx("transition-transform group-hover:scale-105", isActive ? "stroke-[2.5]" : "stroke-[2]")}
                />
                {item.badge && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse border border-zinc-950" />
                )}
              </div>
              <span className="text-xs">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-zinc-900/60">
        <button
          onClick={() => { onLinkClick?.(); logout(); }}
          className="flex items-center gap-3 w-full px-4 py-3 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/5 rounded-xl transition-all duration-200 text-xs font-semibold select-none"
        >
          <LogOut size={16} strokeWidth={2.2} />
          <span>Çıkış Yap</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* ── DESKTOP: Always-visible fixed left sidebar (lg+) ─────────────── */}
      <aside className="hidden lg:flex fixed top-0 left-0 h-full w-[260px] bg-zinc-950/95 backdrop-blur-2xl border-r border-zinc-900/60 z-40 flex-col shadow-xl">
        {/* App Logo / Brand */}
        <div className="px-5 pt-6 pb-4 flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-[#5865f2] flex items-center justify-center shadow-lg shrink-0">
            <span className="text-white text-xs font-black">MT</span>
          </div>
          <span className="text-sm font-black text-white tracking-tight">Movie Tracker</span>
        </div>

        <SidebarContent onLinkClick={undefined} />
      </aside>

      {/* ── MOBILE: Floating Action Button (< lg) ────────────────────────── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "lg:hidden fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-rose-500 to-[#5865f2] text-white flex items-center justify-center shadow-xl shadow-rose-500/20 active:scale-90 transition-all duration-300 outline-none select-none hover:scale-105",
          isOpen && "rotate-90"
        )}
      >
        <div className="relative">
          {isOpen ? <X size={24} className="stroke-[2.5]" /> : <Menu size={24} className="stroke-[2.5]" />}
          {hasUnread && !isOpen && (
            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-zinc-950 animate-pulse" />
          )}
        </div>
      </button>

      {/* ── MOBILE: Backdrop overlay ──────────────────────────────────────── */}
      <div
        onClick={() => setIsOpen(false)}
        className={clsx(
          "lg:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300 select-none",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />

      {/* ── MOBILE: Slide-out drawer ──────────────────────────────────────── */}
      <aside
        className={clsx(
          "lg:hidden fixed top-0 right-0 h-full w-[280px] bg-zinc-950/95 backdrop-blur-2xl border-l border-zinc-900/60 z-40 transition-transform duration-300 ease-out shadow-2xl flex flex-col select-none",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <SidebarContent onLinkClick={() => setIsOpen(false)} />
      </aside>
    </>
  );
}
