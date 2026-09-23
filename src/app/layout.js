import "./globals.css";

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
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport = {
  themeColor: "#130D0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { AuthProvider } from "@/context/AuthContext";
import { AppDataProvider } from "@/context/AppDataContext";
import MainContentWrapper from "@/components/MainContentWrapper";
import LanguageSync from "@/components/LanguageSync";
import { NavigationProvider } from "@/context/NavigationContext";

export default function RootLayout({ children }) {
  return (
    <html lang="tr" className="h-full antialiased dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <ServiceWorkerRegister />
        <AuthProvider>
          <LanguageSync />
          <AppDataProvider>
            <NavigationProvider>
              <BottomNav />
              <MainContentWrapper>{children}</MainContentWrapper>
            </NavigationProvider>
          </AppDataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
