"use client";

import { Home, List, MessageCircle, Search, User } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { translate } from "@/lib/i18n";

const mobileNavItems = [
  { key: "home", href: "/", icon: Home },
  { key: "discover", href: "/search", icon: Search },
  { key: "lists", href: "/lists", icon: List },
  { key: "messages", href: "/messages", icon: MessageCircle },
  { key: "profile", href: "/profile", icon: User },
];

function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export default function MobileBottomBar({ pathname, language, hasUnread }) {
  const t = (key, values) => translate(language, key, values);
  return (
    <nav aria-label={t("nav.mobile")} className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      {mobileNavItems.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 text-[10px] font-semibold no-underline transition-colors duration-200 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active ? "text-accent" : "text-muted hover:text-text",
            )}
          >
            <Icon size={19} strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
            <span>{t(`nav.${item.key}`)}</span>
            {active && <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-accent" aria-hidden="true" />}
            {item.href === "/messages" && hasUnread && <span className="absolute right-1/4 top-1.5 h-1.5 w-1.5 rounded-full bg-accent-alt" aria-label={t("nav.unread")} />}
          </Link>
        );
      })}
    </nav>
  );
}
