"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LoginView from "@/components/pages/login/LoginView";

// ── Controller ──────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { user, loading, loginWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading)
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  if (user) return null;

  return <LoginView onLogin={loginWithGoogle} />;
}
