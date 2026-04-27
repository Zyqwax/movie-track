"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { Film, Eye, Star, UserPlus, UserMinus, ChevronLeft } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";
import clsx from "clsx";

dayjs.extend(relativeTime);
dayjs.locale("tr");

export default function PublicProfilePage(props) {
  // Use React.use() to unwrap params in Next.js 15+ if needed, or just props.params
  // Assuming Next.js app router, params is a promise in recent Next.js versions. We use React.use.
  const params = use(props.params);
  const targetUid = params.id;
  
  const { user } = useAuth();
  const router = useRouter();
  
  const [targetUser, setTargetUser] = useState(null);
  const [movies, setMovies] = useState(undefined);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("watched"); // "watched" or "wishlist"

  useEffect(() => {
    if (user === null) {
      router.push("/login");
      return;
    }
    
    if (user && user.uid === targetUid) {
      // If viewing own public profile, redirect to personal profile
      router.replace("/profile");
      return;
    }

    if (user && targetUid) {
      // Fetch target user profile info
      const fetchUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", targetUid));
          if (userDoc.exists()) {
            setTargetUser(userDoc.data());
          } else {
            setTargetUser(false); // not found
          }
        } catch (error) {
          console.error("Error fetching user:", error);
          setTargetUser(false);
        }
      };
      
      fetchUser();

      // Listen to target user's movies
      const moviesQ = query(collection(db, "users", targetUid, "movies"));
      const unsubscribeMovies = onSnapshot(moviesQ, (snapshot) => {
        const data = [];
        snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
        setMovies(data);
      });

      // Check if already friends
      const friendRef = doc(db, "users", user.uid, "friends", targetUid);
      const unsubscribeFriend = onSnapshot(friendRef, (docSnap) => {
        setIsFriend(docSnap.exists());
        setLoading(false);
      });

      return () => {
        unsubscribeMovies();
        unsubscribeFriend();
      };
    }
  }, [user, router, targetUid]);

  if (!user || loading) {
    return (
      <div className="min-h-full flex justify-center items-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (targetUser === false) {
    return (
      <div className="min-h-full flex flex-col justify-center items-center bg-zinc-950 text-zinc-400 p-4">
        <h1 className="text-xl font-bold text-white mb-2">Kullanıcı Bulunamadı</h1>
        <p className="text-center">Bu profile ulaşılamıyor. Link yanlış veya hesap silinmiş olabilir.</p>
        <Link href="/search" className="mt-6 px-4 py-2 bg-zinc-800 rounded-xl text-white">
          Geri Dön
        </Link>
      </div>
    );
  }

  if (!targetUser) return null; // Still loading user doc

  const handleToggleFriend = async () => {
    try {
      const friendRef = doc(db, "users", user.uid, "friends", targetUid);
      if (isFriend) {
        await deleteDoc(friendRef);
      } else {
        await setDoc(friendRef, {
          uid: targetUid,
          displayName: targetUser.displayName || "",
          photoURL: targetUser.photoURL || "",
          addedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error toggling friend:", error);
      alert("Bir hata oluştu.");
    }
  };

  const watched = movies?.filter((m) => m.status === "watched") || [];
  const wishlist = movies?.filter((m) => m.status === "wishlist") || [];
  const ratedMovies = watched.filter((m) => m.rating > 0);
  const avgRating = ratedMovies.length > 0
    ? (ratedMovies.reduce((sum, m) => sum + m.rating, 0) / ratedMovies.length).toFixed(1)
    : null;

  const displayMovies = activeTab === "watched" ? watched : wishlist;
  
  // Sort movies by date descending
  const sortedMovies = [...displayMovies].sort((a, b) => {
    if (activeTab === "watched") return (b.watchedAt || 0) - (a.watchedAt || 0);
    return (b.addedAt || 0) - (a.addedAt || 0);
  });

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-50 pb-8 flex flex-col">
      {/* Top Bar */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-zinc-950/80 backdrop-blur-md flex items-center border-b border-zinc-800/60">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-zinc-400 hover:text-white transition">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-sm font-semibold ml-2 text-zinc-200">Kullanıcı Profili</h1>
      </div>

      {/* Header */}
      <div className="px-4 pt-6 pb-6 flex flex-col items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-rose-500/20">
          {targetUser.photoURL ? (
            <Image src={targetUser.photoURL} alt={targetUser.displayName || "User"} width={96} height={96} className="rounded-full" />
          ) : (
            <span className="text-3xl font-bold text-white">
              {targetUser.displayName?.[0]?.toUpperCase() || targetUser.email?.[0]?.toUpperCase() || "?"}
            </span>
          )}
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white">
            {targetUser.displayName || "Kullanıcı"}
          </h2>
        </div>
        
        <button
          onClick={handleToggleFriend}
          className={clsx(
            "mt-2 px-6 py-2.5 rounded-full font-semibold text-sm flex items-center gap-2 transition-all shadow-lg",
            isFriend 
              ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
              : "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-500/20"
          )}
        >
          {isFriend ? (
            <>
              <UserMinus size={16} />
              Takipten Çık
            </>
          ) : (
            <>
              <UserPlus size={16} />
              Takip Et
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 px-4 py-4 border-t border-zinc-800/60">
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-bold text-white">
            {movies === undefined ? "—" : watched.length}
          </span>
          <span className="text-[10px] text-zinc-400 text-center flex items-center gap-1"><Eye size={12}/> İzlendi</span>
        </div>
        <div className="flex flex-col items-center gap-1 border-l border-r border-zinc-800/60">
          <span className="text-xl font-bold text-white">
            {movies === undefined ? "—" : wishlist.length}
          </span>
          <span className="text-[10px] text-zinc-400 text-center flex items-center gap-1"><Film size={12}/> Listede</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xl font-bold text-white">
            {movies === undefined ? "—" : (avgRating || "—")}
          </span>
          <span className="text-[10px] text-zinc-400 text-center flex items-center gap-1"><Star size={12}/> Ort. Puan</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mt-4">
        {[
          { id: "watched", label: "İzledikleri" },
          { id: "wishlist", label: "İzleyecekleri" }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex-1 py-2 text-xs font-semibold rounded-lg transition-all",
              activeTab === tab.id 
                ? "bg-zinc-800 text-white" 
                : "bg-transparent text-zinc-500 hover:text-zinc-300 border border-zinc-800"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Movie Grid */}
      <div className="flex-1 px-4 mt-4">
        {movies !== undefined && sortedMovies.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-zinc-600">
            <Film size={32} className="mb-2 opacity-50" />
            <p className="text-sm">Bu liste boş.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {sortedMovies.map((movie) => (
              <Link
                key={movie.id}
                href={`/movie/${movie.id}`}
                className="relative group rounded-xl overflow-hidden aspect-[2/3] bg-zinc-800 block"
              >
                {movie.posterPath && (
                  <Image
                    src={`https://image.tmdb.org/t/p/w342${movie.posterPath}`}
                    alt={movie.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-[10px] font-semibold text-white leading-tight line-clamp-2">
                    {movie.title}
                  </p>
                  {activeTab === "watched" && movie.rating > 0 && (
                    <div className="flex items-center gap-0.5 mt-0.5 text-amber-400 text-[9px] font-bold">
                      <Star size={9} className="fill-amber-400" /> {movie.rating}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      
    </div>
  );
}
