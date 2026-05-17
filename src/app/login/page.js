"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Film } from "lucide-react";

export default function LoginPage() {
  const { user, loading, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-zinc-950 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" /></div>;
  if (user) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-zinc-950">
      {/* Subtle gradient glow behind logo */}
      <div className="relative mb-10">
        <div className="absolute inset-0 w-24 h-24 bg-rose-500/20 rounded-full blur-2xl" />
        <div className="relative w-20 h-20 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-rose-500/25 rotate-3">
          <Film className="w-9 h-9 text-white -rotate-3" />
        </div>
      </div>

      <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Movie Tracker</h1>
      <p className="text-zinc-500 mb-12 text-center max-w-[260px] text-sm leading-relaxed">
        İzlediğin ve izleyeceğin filmleri keşfet, takip et, arkadaşlarınla paylaş.
      </p>
      
      <button
        onClick={loginWithGoogle}
        className="flex items-center gap-3 bg-white text-zinc-900 px-7 py-3.5 rounded-full font-semibold text-sm hover:bg-zinc-100 transition-all active:scale-95 shadow-lg shadow-white/10"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.549L20.0303 3.125C17.9503 1.19 15.2353 0 12.0003 0C7.31028 0 3.25528 2.69 1.28027 6.609L5.27027 9.704C6.21527 6.86 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
          <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
          <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
          <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.87037 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.31037 24.0001 12.0004 24.0001Z" fill="#34A853" />
        </svg>
        Google ile Giriş Yap
      </button>

      <p className="text-[10px] text-zinc-700 mt-8 text-center max-w-[200px]">
        Giriş yaparak film verileriniz güvenli bir şekilde bulutta saklanır.
      </p>
    </div>
  );
}
