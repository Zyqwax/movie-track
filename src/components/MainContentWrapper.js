"use client";

import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useNavigation } from "@/context/NavigationContext";

export default function MainContentWrapper({ children }) {
  const pathname = usePathname();
  const isFullScreen =
    pathname === "/login" || pathname.startsWith("/messages/");
  const { sidebarOpen } = useNavigation();

  return (
    <main
      className={clsx(
        "min-w-0 w-full max-w-7xl flex-1 mx-auto transition-[margin] duration-200",
        !isFullScreen && sidebarOpen && "md:ml-64 md:max-w-[calc(100%-16rem)]",
        isFullScreen && "h-dvh flex flex-col",
      )}
    >
      {children}
    </main>
  );
}
