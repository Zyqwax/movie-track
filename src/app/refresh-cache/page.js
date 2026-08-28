"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { DEFAULT_LANGUAGE, translate } from "@/lib/i18n";
import RefreshCacheView from "@/components/pages/refresh-cache/RefreshCacheView";

// ── Controller ──────────────────────────────────────────────────────────────
export default function RefreshCachePage() {
  const [status, setStatus] = useState("Bekliyor...");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const t = (key, values) => translate(DEFAULT_LANGUAGE, key, values);

  const addLog = (msg) => setLogs((prev) => [...prev, msg]);

  const handleRefresh = async () => {
    setLoading(true);
    setStatus(t("refreshCache.starting"));
    try {
      const moviesRef = collection(db, "movies");
      const snap = await getDocs(moviesRef);
      addLog(`Toplam ${snap.size} film bulundu.`);

      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

      for (const movieDoc of snap.docs) {
        const id = movieDoc.id;
        addLog(t("refreshCache.fetching", { id }));

        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=tr-TR&append_to_response=videos,credits`,
        );
        if (!res.ok) {
          addLog(t("refreshCache.failed", { id }));
          continue;
        }
        const data = await res.json();

        const movieData = {
          id: data.id,
          contentLanguage: "tr-TR",
          contentRegion: "TR",
          title: data.title || data.original_title,
          overview: data.overview,
          posterPath: data.poster_path,
          backdropPath: data.backdrop_path,
          releaseDate: data.release_date,
          runtime: data.runtime,
          genres: data.genres?.map((g) => g.name) || [],
          voteAverage: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
          voteCount: data.vote_count || 0,
          trailer: data.videos?.results?.find((v) => v.type === "Trailer" && v.site === "YouTube")?.key || null,
          cast:
            data.credits?.cast
              ?.slice(0, 5)
              .map((c) => ({ name: c.name, character: c.character, profilePath: c.profile_path })) || [],
        };

        await setDoc(doc(db, "movies", id), movieData, { merge: true });
        addLog(t("refreshCache.success", { title: movieData.title }));
      }

      setStatus(t("refreshCache.completed"));
    } catch (err) {
      console.error(err);
      setStatus(`Hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return <RefreshCacheView status={status} logs={logs} loading={loading} onRefresh={handleRefresh} t={t} />;
}
