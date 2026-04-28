"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SearchIcon, Image as ImageIcon, TrendingUp, X, Clock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";

const DEBOUNCE_MS = 400;
const SUGGESTION_COUNT = 6;

export default function SearchPage() {
  const { user } = useAuth();
  const { movies: localMovies } = useAppData();
  const router = useRouter();

  const [queryInput, setQueryInput] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("movieTracker_searchQuery") || "";
    }
    return "";
  });
  const [results, setResults] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("movieTracker_searchResults");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });
  const [trending, setTrending] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("movieTracker_trendingCache");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  // Suggestions dropdown
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    if (user === null) {
      router.push("/login");
      return;
    }
    if (user) {
      fetchTrending();
    }
  }, [user, router]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchTrending = async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo_key";
      const res = await fetch(`https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&language=tr-TR`);
      if (res.ok) {
        const data = await res.json();
        const trendingData = data.results.slice(0, 12);
        setTrending(trendingData);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("movieTracker_trendingCache", JSON.stringify(trendingData));
        }
      }
    } catch (error) {
      console.error("Trending error:", error);
    }
  };

  const fetchSuggestions = useCallback(async (q) => {
    if (!q.trim() || q.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setSuggestionsLoading(true);
    setShowSuggestions(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo_key";
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(q)}&language=tr-TR&page=1`
      );
      if (res.ok) {
        const data = await res.json();
        setSuggestions((data.results || []).slice(0, SUGGESTION_COUNT));
        // Also update main results so pressing enter or clicking away shows them
        const allResults = data.results || [];
        setResults(allResults);
        sessionStorage.setItem("movieTracker_searchResults", JSON.stringify(allResults));
      }
    } catch (error) {
      console.error("Suggestion error:", error);
    } finally {
      setSuggestionsLoading(false);
    }
  }, []);

  const handleInputChange = (val) => {
    setQueryInput(val);
    sessionStorage.setItem("movieTracker_searchQuery", val);

    if (!val.trim()) {
      setResults([]);
      setSuggestions([]);
      setShowSuggestions(false);
      sessionStorage.setItem("movieTracker_searchResults", JSON.stringify([]));
      clearTimeout(debounceRef.current);
      return;
    }

    // Debounce the suggestion fetch
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(val);
    }, DEBOUNCE_MS);
  };

  const handleClear = () => {
    setQueryInput("");
    setResults([]);
    setSuggestions([]);
    setShowSuggestions(false);
    sessionStorage.setItem("movieTracker_searchQuery", "");
    sessionStorage.setItem("movieTracker_searchResults", JSON.stringify([]));
    clearTimeout(debounceRef.current);
    inputRef.current?.focus();
  };

  const handleSelectSuggestion = (movie) => {
    setShowSuggestions(false);
    router.push(`/movie/${movie.id}`);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (!queryInput.trim()) {
      setResults([]);
      return;
    }
    // Results already updated by debounce; trigger a fresh fetch on submit too
    clearTimeout(debounceRef.current);
    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo_key";
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(queryInput)}&language=tr-TR&page=1`
      );
      if (res.ok) {
        const data = await res.json();
        const newResults = data.results || [];
        setResults(newResults);
        sessionStorage.setItem("movieTracker_searchResults", JSON.stringify(newResults));
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const displayMovies = queryInput.trim() ? results : trending;
  const isShowingTrending = !queryInput.trim();

  return (
    <div className="p-4 pt-8 max-w-lg mx-auto min-h-full bg-zinc-950">
      <h1 className="text-3xl font-bold mb-6 tracking-tight text-white/90">
        Film Keşfet
      </h1>

      {/* Search form with suggestion dropdown */}
      <div className="relative mb-8">
        <form onSubmit={handleSearch} className="relative group">
          <input
            ref={inputRef}
            type="text"
            value={queryInput}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
            placeholder="İzlemek istediğiniz filmi yazın..."
            autoComplete="off"
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-12 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all duration-300"
          />
          {/* Search icon / loading spinner */}
          {suggestionsLoading ? (
            <span className="absolute left-4 top-1/2 -translate-y-1/2">
              <span className="block w-5 h-5 rounded-full border-2 border-zinc-600 border-t-rose-500 animate-spin" />
            </span>
          ) : (
            <SearchIcon
              className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-rose-500 transition-colors"
              size={20}
            />
          )}
          {queryInput && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </form>

        {/* Suggestions Dropdown */}
        {showSuggestions && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            {suggestionsLoading && suggestions.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-3 text-zinc-500 text-sm">
                <span className="block w-4 h-4 rounded-full border-2 border-zinc-600 border-t-rose-500 animate-spin shrink-0" />
                Aranıyor...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="px-4 py-3 text-zinc-500 text-sm">Sonuç bulunamadı.</div>
            ) : (
              <ul>
                {suggestions.map((movie, i) => {
                  const inList = localMovies?.find((m) => m.id === String(movie.id));
                  return (
                    <li key={movie.id}>
                      <button
                        type="button"
                        onMouseDown={() => handleSelectSuggestion(movie)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/70 transition-colors text-left group/item"
                      >
                        {/* Mini poster */}
                        <div className="w-9 h-[52px] rounded-lg bg-zinc-800 overflow-hidden shrink-0 relative border border-zinc-700/40">
                          {movie.poster_path ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt={movie.title}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon size={14} className="text-zinc-600" />
                            </div>
                          )}
                        </div>

                        {/* Title & year */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-100 truncate leading-tight">
                            {movie.title}
                          </p>
                          {movie.release_date && (
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                              {movie.release_date.slice(0, 4)}
                            </p>
                          )}
                        </div>

                        {/* Already in list badge */}
                        {inList && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 shrink-0">
                            {inList.status === "watched" ? "👀" : "📌"}
                          </span>
                        )}
                      </button>
                      {i < suggestions.length - 1 && (
                        <div className="mx-4 h-px bg-zinc-800/60" />
                      )}
                    </li>
                  );
                })}
                {/* "Tümünü gör" footer */}
                <li>
                  <div className="mx-4 h-px bg-zinc-800/60" />
                  <button
                    type="button"
                    onMouseDown={handleSearch}
                    className="w-full flex items-center gap-2 px-4 py-3 text-rose-400 hover:text-rose-300 text-xs font-semibold hover:bg-zinc-800/50 transition-colors"
                  >
                    <SearchIcon size={13} />
                    &ldquo;{queryInput}&rdquo; için tüm sonuçları gör
                  </button>
                </li>
              </ul>
            )}
          </div>
        )}
      </div>

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
          {displayMovies.map((movie, index) => {
            const localData = localMovies?.find((m) => m.id === String(movie.id));
            return (
              <div
                key={movie.id}
                className="relative group rounded-xl overflow-hidden aspect-[2/3] bg-zinc-800 animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
