"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { Activity, Eye, Bookmark, Star, Film, RefreshCw, Users } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("tr");

function getActivityText(activity) {
  switch (activity.type) {
    case "watched":
      return (
        <>
          <span className="font-semibold text-white">{activity.movieTitle}</span>{" "}
          filmini izledi
        </>
      );
    case "wishlist":
      return (
        <>
          <span className="font-semibold text-white">{activity.movieTitle}</span>{" "}
          filmini listesine ekledi
        </>
      );
    case "rated":
      return (
        <>
          <span className="font-semibold text-white">{activity.movieTitle}</span>{" "}
          filmine{" "}
          <span className="text-amber-400 font-bold">{activity.rating}/10</span>{" "}
          puan verdi
        </>
      );
    default:
      return null;
  }
}

function getActivityIcon(type) {
  switch (type) {
    case "watched":
      return <Eye size={11} className="text-emerald-400" />;
    case "wishlist":
      return <Bookmark size={11} className="text-sky-400" />;
    case "rated":
      return <Star size={11} className="text-amber-400 fill-amber-400" />;
    default:
      return <Film size={11} className="text-zinc-400" />;
  }
}

function getActivityIconBg(type) {
  switch (type) {
    case "watched":
      return "bg-emerald-500/20 border-emerald-500/30";
    case "wishlist":
      return "bg-sky-500/20 border-sky-500/30";
    case "rated":
      return "bg-amber-500/20 border-amber-500/30";
    default:
      return "bg-zinc-800 border-zinc-700";
  }
}

export default function ActivityPage() {
  const { user, loading: authLoading } = useAuth();
  const { friends } = useAppData();
  const router = useRouter();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [friendProfiles, setFriendProfiles] = useState({});

  useEffect(() => {
    if (!authLoading && user === null) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchActivities = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const profiles = {};
    const profilePromises = friends.map(async (f) => {
      const uid = f.uid || f.id;
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) profiles[uid] = snap.data();
      } catch (e) {
        console.error("Profile fetch error:", e);
      }
    });
    await Promise.all(profilePromises);
    setFriendProfiles(profiles);

    const allActivities = [];
    const activityPromises = friends.map(async (f) => {
      const uid = f.uid || f.id;
      try {
        const q = query(
          collection(db, "users", uid, "activities"),
          orderBy("createdAt", "desc"),
          limit(20)
        );
        const snap = await getDocs(q);
        snap.forEach((d) => {
          allActivities.push({
            id: d.id,
            friendUid: uid,
            ...d.data(),
          });
        });
      } catch (e) {
        console.error("Activity fetch error:", e);
      }
    });

    await Promise.all(activityPromises);

    allActivities.sort((a, b) => {
      const aTime = a.createdAt?.toDate?.()
        ? a.createdAt.toDate().getTime()
        : a.createdAt || 0;
      const bTime = b.createdAt?.toDate?.()
        ? b.createdAt.toDate().getTime()
        : b.createdAt || 0;
      return bTime - aTime;
    });

    setActivities(allActivities.slice(0, 50));
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    if (!user || friends.length === 0) {
      setLoading(false);
      return;
    }
    fetchActivities();
  }, [user, friends]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-50 flex flex-col">

      {/* ── Sticky Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-900/60 px-4 pt-5 pb-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Activity size={20} className="text-rose-500" />
              Etkinlik Akışı
            </h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Arkadaşlarının son hareketleri
            </p>
          </div>
          {activities.length > 0 && (
            <button
              onClick={() => fetchActivities(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800/80 transition-all active:scale-90 disabled:opacity-40 border border-zinc-800/50"
              title="Yenile"
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          )}
        </div>
      </div>

      {/* ── Activity Feed ─────────────────────────────────────────────── */}
      <div className="flex-1 px-3 py-3">
        {loading ? (
          <div className="flex justify-center my-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500 px-6">
            <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center mb-4 border border-zinc-800">
              {friends.length === 0 ? (
                <Users className="w-7 h-7 opacity-50" />
              ) : (
                <Activity className="w-7 h-7 opacity-40" />
              )}
            </div>
            <p className="text-sm font-semibold text-zinc-400 mb-1 text-center">
              {friends.length === 0 ? "Henüz arkadaşın yok" : "Henüz etkinlik yok"}
            </p>
            <p className="text-[11px] text-zinc-600 text-center max-w-[240px] leading-relaxed">
              {friends.length === 0
                ? "Arkadaş ekleyerek onların film hareketlerini burada görebilirsin!"
                : "Arkadaşların film izledikçe burada görünecek."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5">
            {activities.map((activity, idx) => {
              const friend = friendProfiles[activity.friendUid];
              const time = activity.createdAt?.toDate?.()
                ? dayjs(activity.createdAt.toDate())
                : activity.createdAt
                  ? dayjs(activity.createdAt)
                  : null;

              return (
                <div
                  key={activity.id || idx}
                  className="flex gap-3 px-3 py-3 rounded-2xl hover:bg-zinc-900/50 active:bg-zinc-900 transition-colors animate-fade-in"
                  style={{ animationDelay: `${Math.min(idx * 20, 300)}ms` }}
                >
                  {/* Friend Avatar */}
                  <Link href={`/u/${activity.friendUid}`} className="shrink-0 mt-0.5">
                    <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center overflow-hidden shadow-sm">
                      {friend?.photoURL ? (
                        <Image
                          src={friend.photoURL}
                          alt={friend.displayName || ""}
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-bold text-white">
                          {friend?.displayName?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                      {/* Activity type badge */}
                      <div
                        className={`absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full border flex items-center justify-center ${getActivityIconBg(activity.type)}`}
                      >
                        {getActivityIcon(activity.type)}
                      </div>
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-[12px] text-zinc-300 leading-snug">
                      <Link
                        href={`/u/${activity.friendUid}`}
                        className="font-bold text-white hover:text-rose-400 transition-colors"
                      >
                        {friend?.displayName?.split(" ")[0] || "Kullanıcı"}
                      </Link>{" "}
                      {getActivityText(activity)}
                    </p>
                    {time && (
                      <p className="text-[10px] text-zinc-600 mt-1">
                        {time.fromNow()}
                      </p>
                    )}
                  </div>

                  {/* Movie Poster Thumbnail */}
                  {activity.moviePoster && activity.movieId && (
                    <Link href={`/movie/${activity.movieId}`} className="shrink-0">
                      <div className="w-9 h-[52px] rounded-lg bg-zinc-800 overflow-hidden relative border border-zinc-700/50 hover:border-zinc-600 transition-colors shadow-sm">
                        <Image
                          src={`https://image.tmdb.org/t/p/w92${activity.moviePoster}`}
                          alt={activity.movieTitle || ""}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
