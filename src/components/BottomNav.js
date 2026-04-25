"use client";

import { Home, Search, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Filmlerim", href: "/", icon: Home },
    { name: "Keşfet", href: "/search", icon: Search },
    { name: "Profil", href: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800/70 flex items-center justify-around z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors duration-200",
              isActive ? "text-rose-500" : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <item.icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
            <span className={clsx("text-[10px] font-semibold tracking-wide", isActive ? "text-rose-500" : "text-zinc-500")}>
              {item.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
