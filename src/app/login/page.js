"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Film } from "lucide-react";

export default function LoginPage() {
  const { user, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/");
    }
  }, [user, router]);

  if (user) return null; // Wait for redirect

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-zinc-950">
      <div className="w-20 h-20 bg-rose-500 rounded-full flex items-center justify-center mb-8 shadow-lg shadow-rose-500/20">
        <Film className="w-10 h-10 text-white" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Movie Tracker</h1>
      <p className="text-zinc-400 mb-10 text-center max-w-xs">
        İzlediğiniz ve izleyeceğiniz filmleri bulutta güvenle saklayın.
      </p>
      
      <button
        onClick={loginWithGoogle}
        className="flex items-center gap-3 bg-white text-zinc-900 px-6 py-3 rounded-full font-medium hover:bg-zinc-100 transition-colors active:scale-95"
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
          <path d="M12.0003 4.75C13.7703 4.75 15.3553 5.36 16.6053 6.549L20.0303 3.125C17.9503 1.19 15.2353 0 12.0003 0C7.31028 0 3.25528 2.69 1.28027 6.609L5.27027 9.704C6.21527 6.86 8.87028 4.75 12.0003 4.75Z" fill="#EA4335" />
          <path d="M23.49 12.275C23.49 11.49 23.415 10.73 23.3 10H12V14.51H18.47C18.18 15.99 17.34 17.25 16.08 18.1L19.945 21.1C22.2 19.01 23.49 15.92 23.49 12.275Z" fill="#4285F4" />
          <path d="M5.26498 14.2949C5.02498 13.5699 4.88501 12.7999 4.88501 11.9999C4.88501 11.1999 5.01998 10.4299 5.26498 9.7049L1.275 6.60986C0.46 8.22986 0 10.0599 0 11.9999C0 13.9399 0.46 15.7699 1.28 17.3899L5.26498 14.2949Z" fill="#FBBC05" />
          <path d="M12.0004 24.0001C15.2404 24.0001 17.9654 22.935 19.9454 21.095L16.0804 18.095C15.0054 18.82 13.6204 19.245 12.0004 19.245C8.87037 19.245 6.21537 17.135 5.26538 14.29L1.27539 17.385C3.25539 21.31 7.31037 24.0001 12.0004 24.0001Z" fill="#34A853" />
        </svg>
        Google ile Giriş Yap
      </button>
    </div>
  );
}
