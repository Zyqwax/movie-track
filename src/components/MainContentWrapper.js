"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function MainContentWrapper({ children }) {
  const pathname = usePathname();
  const isFullScreen =
    pathname === "/login" || pathname.startsWith("/messages/");
  return (
    <main
      className={clsx(
        "min-w-0 w-full max-w-7xl flex-1 mx-auto transition-[margin] duration-200",
        isFullScreen && "h-dvh flex flex-col",
      )}
    >
      {children}
    </main>
  );
}
