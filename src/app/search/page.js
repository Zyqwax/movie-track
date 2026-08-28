"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { getLanguageConfig, translate } from "@/lib/i18n";
import SearchView from "@/components/pages/search/SearchView";

const SEARCH_DEBOUNCE_MS = 800;

// ── Page controller ─────────────────────────────────────────────────────────
export default function SearchPage() {
  const { user, loading: authLoading, language, region } = useAuth();
  const t = (key, values) => translate(language, key, values);
  const searchCacheKey = `movieTracker_searchResults_${language}_${region}`;
  const trendingCacheKey = `movieTracker_trendingCache_${language}_${region}`;
  const { movies: localMovies } = useAppData();
  const router = useRouter();

  // ── Search state ──────────────────────────────────────────────────────────
  const [queryInput, setQueryInput] = useState(() => {
    if (typeof window !== "undefined") return sessionStorage.getItem("movieTracker_searchQuery") || "";
    return "";
  });
  const [results, setResults] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(searchCacheKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });
  const [trending, setTrending] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem(trendingCacheKey);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  // ── API effects ───────────────────────────────────────────────────────────
  const fetchTrending = useCallback(async () => {
    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo_key";
      const { tmdb } = getLanguageConfig(language);
      const res = await fetch(
        `https://api.themoviedb.org/3/trending/movie/day?api_key=${apiKey}&language=${encodeURIComponent(tmdb)}&region=${encodeURIComponent(region)}`,
      );
      if (res.ok) {
        const data = await res.json();
        const trendingData = data.results.slice(0, 12);
        setTrending(trendingData);
        if (typeof window !== "undefined")
          sessionStorage.setItem(trendingCacheKey, JSON.stringify(trendingData));
      }
    } catch (error) {
      console.error("Trending error:", error);
    }
  }, [language, region, trendingCacheKey]);

  useEffect(() => {
    if (!authLoading && user === null) {
      router.push("/login");
      return;
    }
    if (user) {
      const timeoutId = setTimeout(() => fetchTrending(), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [user, authLoading, router, fetchTrending]);

  const fetchResults = useCallback(
    async (q) => {
      setIsDebouncing(false);
      const searchQuery = q.trim();
      if (!searchQuery) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "demo_key";
        const { tmdb } = getLanguageConfig(language);
        const res = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(searchQuery)}&language=${encodeURIComponent(tmdb)}&region=${encodeURIComponent(region)}&page=1`,
        );
        if (res.ok) {
          const data = await res.json();
          const newResults = data.results || [];
          setResults(newResults);
          sessionStorage.setItem(searchCacheKey, JSON.stringify(newResults));
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    },
    [language, region, searchCacheKey],
  );

  // ── Interaction handlers ─────────────────────────────────────────────────
  const handleInputChange = (val) => {
    setQueryInput(val);
    sessionStorage.setItem("movieTracker_searchQuery", val);
    clearTimeout(debounceRef.current);
    if (!val.trim()) {
      setIsDebouncing(false);
      setResults([]);
      sessionStorage.setItem(searchCacheKey, JSON.stringify([]));
      return;
    }
    setIsDebouncing(true);
    debounceRef.current = setTimeout(() => fetchResults(val), SEARCH_DEBOUNCE_MS);
  };
  const handleClear = () => {
    setQueryInput("");
    setIsDebouncing(false);
    setResults([]);
    sessionStorage.setItem("movieTracker_searchQuery", "");
    sessionStorage.setItem(searchCacheKey, JSON.stringify([]));
    clearTimeout(debounceRef.current);
    inputRef.current?.focus();
  };
  const handleSearch = (e) => {
    e?.preventDefault();
    setIsDebouncing(false);
    clearTimeout(debounceRef.current);
    fetchResults(queryInput);
  };

  if (authLoading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-rose-500" />
      </div>
    );
  if (!user) return null;

  // ── Render ────────────────────────────────────────────────────────────────
  const displayMovies = queryInput.trim() ? results : trending;
  const isShowingTrending = !queryInput.trim();
  const labels = {
    title: t("search.title"),
    placeholder: t("search.placeholder"),
    trending: t("search.trending"),
    results: t("search.results"),
    noResults: t("search.noResults"),
    tryDifferent: t("search.tryDifferent"),
    watched: t("search.watched"),
    wishlist: t("search.wishlist"),
  };
  return (
    <SearchView
      queryInput={queryInput}
      loading={loading}
      isDebouncing={isDebouncing}
      inputRef={inputRef}
      displayMovies={displayMovies}
      localMovies={localMovies}
      isShowingTrending={isShowingTrending}
      resultsCount={results.length}
      labels={labels}
      onInputChange={handleInputChange}
      onClear={handleClear}
      onSearch={handleSearch}
    />
  );
}
