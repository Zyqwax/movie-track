"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function MainContentWrapper({ children }) {
  const pathname = usePathname();
  const isFullScreen =
    pathname === "/login" || pathname.startsWith("/messages/");
  // The shared top navigation consumes no horizontal layout space.
  const desktopShift = "";

  return (
    <main
      className={clsx(
        "flex-1 min-w-0 w-full max-w-7xl mx-auto",
        desktopShift,
        // Mobile: reserve space for the fixed bottom tab bar.
        !isFullScreen && "pb-[calc(90px+env(safe-area-inset-bottom,0px))]",
        isFullScreen && "h-dvh flex flex-col",
      )}
    >
      {children}
    </main>
  );
}
