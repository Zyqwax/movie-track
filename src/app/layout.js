import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Movie Tracker",
  description: "İzlediğiniz ve izleyeceğiniz filmleri takip edin.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Movie Tracker",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png",  sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport = {
  themeColor: "#e11d48",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { AuthProvider } from "@/context/AuthContext";
import { AppDataProvider } from "@/context/AppDataContext";

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-zinc-950 text-zinc-50">
        <ServiceWorkerRegister />
        <AuthProvider>
          <AppDataProvider>
            <main className="flex-1 pb-16">
              {children}
            </main>
            <BottomNav />
          </AppDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
