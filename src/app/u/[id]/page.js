"use client";

import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, onSnapshot, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { Film, Eye, Star, UserPlus, UserMinus, ChevronLeft, Check, Bookmark, MessageCircle } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";
import clsx from "clsx";

dayjs.extend(relativeTime);
dayjs.locale("tr");

export default function PublicProfilePage(props) {
  const params = use(props.params);
  const targetUid = params.id;
  
  const { user, loading: authLoading } = useAuth();
  const { movies: myMovies } = useAppData();
  const router = useRouter();
  
  const [targetUser, setTargetUser] = useState(null);
  const [movies, setMovies] = useState(undefined);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("watched"); // "watched" or "wishlist"

  useEffect(() => {
    if (authLoading) return;

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
  }, [user, authLoading, router, targetUid]);

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-full flex justify-center items-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  if (targetUser === false) {
    return (
      <div className="min-h-full flex flex-col justify-center items-center bg-zinc-950 text-zinc-400 p-8 select-none">
        <div className="w-14 h-14 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
          <Film size={24} className="text-rose-500 opacity-60" />
        </div>
        <h1 className="text-lg font-bold text-white mb-2">Kullanıcı Bulunamadı</h1>
        <p className="text-center text-xs leading-relaxed max-w-xs text-zinc-500">
          Bu profile ulaşılamıyor. Profil linki yanlış veya hesap silinmiş olabilir.
        </p>
        <Link 
          href="/search" 
          className="mt-6 px-6 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-300 font-semibold text-xs hover:text-white transition"
        >
          Keşfet'e Dön
        </Link>
      </div>
    );
  }

  if (!targetUser) return null; // Still loading user doc

  const handleToggleFriend = async () => {
    try {
      const friendRef = doc(db, "users", user.uid, "friends", targetUid);
      const reverseFriendRef = doc(db, "users", targetUid, "friends", user.uid);
      
      if (isFriend) {
        await deleteDoc(friendRef);
        await deleteDoc(reverseFriendRef);
      } else {
        await setDoc(friendRef, {
          uid: targetUid,
          displayName: targetUser.displayName || "",
          photoURL: targetUser.photoURL || "",
          addedAt: serverTimestamp()
        });
        await setDoc(reverseFriendRef, {
          uid: user.uid,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          addedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error toggling friend:", error);
      alert("Bir hata oluştu.");
    }
  };

  const handleStartChat = async () => {
    try {
      const chatId = [user.uid, targetUid].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [user.uid, targetUid].sort(),
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          lastMessageSenderId: "",
        });
      }

      router.push(`/messages/${chatId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Sohbet başlatılırken bir hata oluştu.");
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
    if (activeTab === "watched") {
      const aHas = a.watchedAt != null && a.watchedAt !== 0;
      const bHas = b.watchedAt != null && b.watchedAt !== 0;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (!aHas && !bHas) return 0;
      return (b.watchedAt || 0) - (a.watchedAt || 0);
    }
    return (b.addedAt || 0) - (a.addedAt || 0);
  });

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-150 pb-20 flex flex-col relative overflow-hidden">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-gradient-to-br from-[#f43f5e]/15 to-[#5865f2]/10 rounded-full blur-[80px] pointer-events-none -z-10" />

      {/* Sticky Glass Navigation Bar */}
      <div className="sticky top-0 z-20 px-4 py-3.5 bg-zinc-950/80 backdrop-blur-md flex items-center border-b border-zinc-900/60 select-none">
        <button 
          onClick={() => router.back()} 
          className="p-1.5 -ml-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-900 transition shrink-0"
        >
          <ChevronLeft size={20} className="stroke-[2.5]" />
        </button>
        <h1 className="text-xs font-bold uppercase tracking-wider ml-2.5 text-zinc-400">Geri Dön</h1>
      </div>

      {/* Hero Cover Banner */}
      <div className="relative h-24 w-full overflow-hidden bg-gradient-to-r from-rose-950/30 via-zinc-900 to-indigo-950/20 border-b border-zinc-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-rose-500/10 via-transparent to-transparent opacity-60" />
      </div>

      {/* Header Info */}
      <div className="px-5 -mt-12 relative flex flex-col items-center gap-3">
        {/* Avatar with glowing ring border */}
        <div className="relative group shrink-0 select-none">
          <div className="absolute -inset-0.5 bg-gradient-to-br from-rose-500 to-indigo-600 rounded-full blur opacity-45 transition duration-300" />
          <div className="relative w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden ring-4 ring-zinc-950 shadow-2xl">
            {targetUser.photoURL ? (
              <Image 
                src={targetUser.photoURL} 
                alt={targetUser.displayName || "User"} 
                width={96} 
                height={96} 
                className="rounded-full object-cover" 
              />
            ) : (
              <span className="text-4xl font-extrabold text-white bg-gradient-to-br from-[#5865f2] to-indigo-600 w-full h-full flex items-center justify-center">
                {targetUser.displayName?.[0]?.toUpperCase() || targetUser.email?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
        </div>

        {/* User name & Active Badge */}
        <div className="text-center">
          <h2 className="text-xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
            {targetUser.displayName || "Kullanıcı"}
          </h2>
          <div className="flex items-center justify-center gap-1 mt-1.5 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-[#23a55a] animate-pulse"></span>
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">aktif</span>
          </div>
        </div>
        
        {/* Functional Friendship Action */}
        <div className="mt-3.5 w-full max-w-[220px] px-4 select-none">
          <button
            onClick={handleToggleFriend}
            className={clsx(
              "w-full px-5 py-2.5 rounded-full font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95",
              isFriend 
                ? "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800/80"
                : "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-500/20"
            )}
          >
            {isFriend ? (
              <>
                <UserMinus size={14} strokeWidth={2.5} />
                Arkadaşlıktan Çıkar
              </>
            ) : (
              <>
                <UserPlus size={14} strokeWidth={2.5} />
                Arkadaş Ekle
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-3 gap-3 px-5 py-6 select-none mt-2">
        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-900 rounded-2xl p-3.5 flex flex-col items-center gap-1 shadow-sm group">
          <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center mb-1">
            <Eye size={14} className="text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">
            {movies === undefined ? "—" : watched.length}
          </span>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">İzlendi</span>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-900 rounded-2xl p-3.5 flex flex-col items-center gap-1 shadow-sm group">
          <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center mb-1">
            <Film size={13} className="text-rose-400" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">
            {movies === undefined ? "—" : wishlist.length}
          </span>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Listesinde</span>
        </div>

        <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-900 rounded-2xl p-3.5 flex flex-col items-center gap-1 shadow-sm group">
          <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center mb-1">
            <Star size={13} className="text-amber-400" />
          </div>
          <span className="text-2xl font-black text-white tracking-tight">
            {movies === undefined ? "—" : (avgRating || "—")}
          </span>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider">Ort. Puan</span>
        </div>
      </div>

      {/* Tabs / Sliding Pill Control */}
      <div className="px-5 select-none">
        <div className="bg-zinc-900/80 p-1.5 rounded-xl border border-zinc-900 flex gap-2">
          {[
            { id: "watched", label: "İzlediği Filmler" },
            { id: "wishlist", label: "İzleme Listesi" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex-1 py-2.5 text-xs font-bold rounded-lg transition-all active:scale-[0.98]",
                activeTab === tab.id 
                  ? "bg-zinc-800 text-white shadow-sm border border-zinc-700/20" 
                  : "bg-transparent text-zinc-500 hover:text-zinc-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Movie Grid Section */}
      <div className="flex-1 px-5 mt-6">
        {movies !== undefined && sortedMovies.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-zinc-650 bg-zinc-900/15 border border-zinc-900 rounded-2xl select-none">
            <Film size={28} className="mb-2.5 opacity-40 text-rose-500" />
            <p className="text-xs font-bold text-zinc-500">Bu liste boş.</p>
          </div>
        ) : (
          (() => {
            const isByDate = activeTab === "watched";
            const datedMovies = isByDate ? sortedMovies.filter(m => m.watchedAt != null && m.watchedAt !== 0) : sortedMovies;
            const undatedMovies = isByDate ? sortedMovies.filter(m => m.watchedAt == null || m.watchedAt === 0) : [];

            const MovieCard = ({ movie }) => {
              const myEntry = myMovies?.find((m) => m.id === movie.id);
              const myStatus = myEntry?.status;

              return (
                <Link
                  key={movie.id}
                  href={`/movie/${movie.id}`}
                  className="relative group rounded-xl overflow-hidden aspect-[2/3] bg-zinc-900 block border border-zinc-900/60 shadow-sm hover:shadow-md transition-all duration-300 select-none"
                >
                  {movie.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${movie.posterPath}`}
                      alt={movie.title}
                      fill
                      className="object-cover group-hover:scale-105 transition duration-500"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-zinc-700">
                      <Film size={14} />
                    </div>
                  )}
                  {/* Subtle dark gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent opacity-95 group-hover:opacity-100 transition-opacity" />

                  {/* High fidelity Status Badge */}
                  {myStatus === "watched" && (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-emerald-500/90 backdrop-blur-sm text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow z-10">
                      <Check size={7} strokeWidth={4} />
                      İzledim
                    </div>
                  )}
                  {myStatus === "wishlist" && (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-sky-500/90 backdrop-blur-sm text-white text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow z-10">
                      <Bookmark size={7} strokeWidth={4} />
                      Listende
                    </div>
                  )}

                  {/* Footer details card */}
                  <div className="absolute bottom-0 left-0 right-0 p-1.5 flex flex-col gap-0.5">
                    <p className="text-[9px] font-extrabold text-white leading-tight line-clamp-1 group-hover:text-rose-400 transition">
                      {movie.title}
                    </p>
                    
                    {/* Bottom Details Row */}
                    <div className="flex items-center justify-between mt-0.5">
                      {activeTab === "watched" && movie.rating > 0 ? (
                        <div className="flex items-center gap-0.5 text-amber-400 text-[7.5px] font-black">
                          <Star size={7} className="fill-amber-400" /> 
                          <span>{movie.rating}</span>
                        </div>
                      ) : <div />}

                      {activeTab === "watched" && movie.watchedAt && (
                        <span className="text-[7px] font-bold text-zinc-500 truncate select-none">
                          {dayjs(movie.watchedAt).fromNow()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            };

            return (
              <div className="flex flex-col">
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                  {datedMovies.map((movie) => (
                    <MovieCard key={movie.id} movie={movie} />
                  ))}
                </div>

                {undatedMovies.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 my-6 select-none">
                      <div className="flex-1 h-px bg-zinc-900" />
                      <span className="text-[9px] text-zinc-500 font-extrabold uppercase tracking-wider shrink-0">Tarih Belirtilmemiş</span>
                      <div className="flex-1 h-px bg-zinc-900" />
                    </div>
                    
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5">
                      {undatedMovies.map((movie) => (
                        <MovieCard key={movie.id} movie={movie} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
