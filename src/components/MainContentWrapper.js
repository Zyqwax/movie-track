"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function MainContentWrapper({ children }) {
  const pathname = usePathname();
  const isFullScreen = pathname === "/login" || pathname.startsWith("/messages/");
  // On desktop, always shift right by sidebar width. On chat/login pages: no sidebar shift.
  const desktopShift = !isFullScreen ? "lg:pl-[260px]" : "";

  return (
    <main
      className={clsx(
        "flex-1 min-w-0",
        desktopShift,
        // Mobile: extra bottom padding for the bottom tab bar + safe area
        !isFullScreen && "pb-[calc(68px+env(safe-area-inset-bottom,0px))] lg:pb-0",
        isFullScreen && "h-[100dvh] flex flex-col"
      )}
    >
      {children}
    </main>
  );
}
