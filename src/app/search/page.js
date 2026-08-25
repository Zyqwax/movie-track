"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { SearchIcon, Image as ImageIcon, TrendingUp, X, Flame } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { MovieCard } from "@/components/ArchiveUI";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";

const DEBOUNCE_MS = 400;
const SUGGESTION_COUNT = 6;

export default function SearchPage() {
  const { user, loading: authLoading } = useAuth();
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
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debounceRef = useRef(null);
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

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

  async function fetchTrending() {
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
  }

  useEffect(() => {
    if (!authLoading && user === null) {
      router.push("/login");
      return;
    }
    if (user) {
      const timeoutId = setTimeout(() => fetchTrending(), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [user, authLoading, router]);

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
    e?.preventDefault();
    setShowSuggestions(false);
    if (!queryInput.trim()) {
      setResults([]);
      return;
    }
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

  if (authLoading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
    </div>
  );
  if (!user) return null;

  const displayMovies = queryInput.trim() ? results : trending;
  const isShowingTrending = !queryInput.trim();

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">

      {/* ── Sticky Search Header ──────────────────────────────────────── */}
      <div className="sticky top-0 z-30 backdrop-blur-md border-b border-zinc-900/60 px-4 pt-5 pb-3">
        <h1 className="text-xl font-bold text-white tracking-tight mb-3">
          Film Keşfet
        </h1>

        {/* Search form with suggestion dropdown */}
        <div className="relative">
          <form onSubmit={handleSearch} className="search-field relative group">
            <input
              ref={inputRef}
              type="text"
              value={queryInput}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              placeholder="Film ara..."
              autoComplete="off"
              className="search-input"
            />
            {/* Search icon / loading spinner */}
            {suggestionsLoading ? (
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2">
                <span className="block w-4.5 h-4.5 rounded-full border-2 border-zinc-600 border-t-rose-500 animate-spin" />
              </span>
            ) : (
              <SearchIcon
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-rose-400 transition-colors"
                size={18}
              />
            )}
            {queryInput && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white active:scale-90 transition-all p-0.5"
              >
                <X size={17} />
              </button>
            )}
          </form>

          {/* Suggestions Dropdown */}
          {showSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 left-0 right-0 top-full mt-2 bg-zinc-900 border border-zinc-700/60 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-fade-in"
            >
              {suggestionsLoading && suggestions.length === 0 ? (
                <div className="flex items-center gap-3 px-4 py-3.5 text-zinc-500 text-sm">
                  <span className="block w-4 h-4 rounded-full border-2 border-zinc-600 border-t-rose-500 animate-spin shrink-0" />
                  Aranıyor...
                </div>
              ) : suggestions.length === 0 ? (
                <div className="px-4 py-3.5 text-zinc-500 text-sm">Sonuç bulunamadı.</div>
              ) : (
                <ul>
                  {suggestions.map((movie, i) => {
                    const inList = localMovies?.find((m) => m.id === String(movie.id));
                    return (
                      <li key={movie.id}>
                        <button
                          type="button"
                          onMouseDown={() => handleSelectSuggestion(movie)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/70 active:bg-zinc-800 transition-colors text-left group/item"
                        >
                          {/* Mini poster */}
                          <div className="w-9 h-13 rounded-lg bg-zinc-800 overflow-hidden shrink-0 relative border border-zinc-700/40">
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
      </div>

      {/* ── Content Area ─────────────────────────────────────────────── */}
      <div className="flex-1 px-3 md:px-6 pt-4 pb-4">
        {/* Section label */}
        {isShowingTrending && trending.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-rose-500" />
            <h2 className="text-sm font-bold text-zinc-300">Günün Trendleri</h2>
          </div>
        )}
        {!isShowingTrending && results.length > 0 && (
          <div className="flex items-center gap-2 mb-4">
            <SearchIcon size={14} className="text-zinc-500" />
            <span className="text-sm text-zinc-400">
              <span className="font-bold text-white">{results.length}</span> sonuç
            </span>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
          </div>
        ) : displayMovies.length === 0 && queryInput.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
              <SearchIcon className="w-6 h-6 opacity-40" />
            </div>
            <p className="text-sm font-medium">Sonuç bulunamadı</p>
            <p className="text-xs text-zinc-600 mt-1">Farklı bir arama deneyin</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3">
            {displayMovies.map((movie, index) => {
              const localData = localMovies?.find((m) => m.id === String(movie.id));
              return <div key={movie.id} className="animate-fade-in" style={{ animationDelay: `${index * 25}ms` }}>
                <MovieCard movie={movie} rating={movie.vote_average} status={localData ? (localData.status === "watched" ? "İzlendi" : "Listende") : undefined} />
              </div>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
