"use client";

import { useState, useEffect } from "react";
import { SearchIcon, Image as ImageIcon, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function SearchPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [queryInput, setQueryInput] = useState("");
  const [results, setResults] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);
  const [localMovies, setLocalMovies] = useState([]);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
      return;
    }

    if (user) {
      const q = query(collection(db, "users", user.uid, "movies"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const moviesData = [];
        snapshot.forEach((doc) => {
          moviesData.push({ id: doc.id, ...doc.data() });
        });
        setLocalMovies(moviesData);
      });
      
      // Fetch trending movies
      fetchTrending();
      
      return () => unsubscribe();
    }
  }, [user, router]);

  const fetchTrending = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo_key"; 
      const res = await fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&language=tr-TR`);
      if (res.ok) {
        const data = await res.json();
        setTrending(data.results.slice(0, 12));
      }
    } catch (error) {
      console.error("Trending error:", error);
    }
  };

  if (!user) return null;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!queryInput.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo_key"; 
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(queryInput)}&language=tr-TR&page=1`
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  const displayMovies = queryInput.trim() ? results : trending;
  const isShowingTrending = !queryInput.trim();

  return (
    <div className="p-4 pt-8 max-w-lg mx-auto min-h-full bg-zinc-950">
      <h1 className="text-3xl font-bold mb-6 tracking-tight text-white/90">
        Film Keşfet
      </h1>

      <form onSubmit={handleSearch} className="relative mb-8 group">
        <input
          type="text"
          value={queryInput}
          onChange={(e) => {
            setQueryInput(e.target.value);
            if (!e.target.value.trim()) setResults([]);
          }}
          placeholder="İzlemek istediğiniz filmi yazın..."
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all duration-300"
        />
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-rose-500 transition-colors" size={20} />
      </form>

      {isShowingTrending && trending.length > 0 && (
        <div className="flex items-center gap-2 mb-4 text-zinc-400 font-medium">
          <TrendingUp size={18} className="text-rose-500" />
          <h2>Günün Trendleri</h2>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 md:gap-4">
          <AnimatePresence>
            {displayMovies.map((movie, index) => {
              // Check if user has this movie in their list
              const localData = localMovies.find(m => m.id === String(movie.id));
              
              return (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03 }}
                  key={movie.id}
                  className="relative group rounded-xl overflow-hidden aspect-[2/3] bg-zinc-800"
                >
                  <Link href={`/movie/${movie.id}`}>
                    {movie.poster_path ? (
                      <Image
                        src={`https://image.tmdb.org/t/p/w342${movie.poster_path}`}
                        alt={movie.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-zinc-800">
                        <ImageIcon className="text-zinc-600 mb-2" />
                        <span className="text-[10px] text-zinc-400 leading-tight">{movie.title}</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                    
                    <div className="absolute bottom-0 left-0 right-0 p-2">
                      <p className="text-[10px] font-semibold text-white leading-tight line-clamp-2 mb-1">
                        {movie.title}
                      </p>
                      {localData && (
                        <div>
                          <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-bold bg-zinc-800/80 border border-zinc-700">
                            {localData.status === "watched" ? "👀 İzledin" : "📌 Listende"}
                          </span>
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
