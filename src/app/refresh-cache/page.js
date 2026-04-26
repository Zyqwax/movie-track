"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";

export default function RefreshCachePage() {
  const [status, setStatus] = useState("Bekliyor...");
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg) => setLogs((prev) => [...prev, msg]);

  const handleRefresh = async () => {
    setLoading(true);
    setStatus("Başlıyor...");
    try {
      const moviesRef = collection(db, "movies");
      const snap = await getDocs(moviesRef);
      addLog(`Toplam ${snap.size} film bulundu.`);

      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;

      for (const movieDoc of snap.docs) {
        const id = movieDoc.id;
        addLog(`ID ${id} için TMDB'den veri çekiliyor...`);
        
        const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=tr-TR&append_to_response=videos,credits`);
        if (!res.ok) {
          addLog(`HATA: ${id} için TMDB isteği başarısız.`);
          continue;
        }
        const data = await res.json();
        
        const movieData = {
          id: data.id,
          title: data.title || data.original_title,
          overview: data.overview,
          posterPath: data.poster_path,
          backdropPath: data.backdrop_path,
          releaseDate: data.release_date,
          runtime: data.runtime,
          genres: data.genres?.map((g) => g.name) || [],
          voteAverage: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
          voteCount: data.vote_count || 0,
          trailer: data.videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube")?.key || null,
          cast: data.credits?.cast?.slice(0, 5).map(c => ({ name: c.name, character: c.character, profilePath: c.profile_path })) || [],
        };

        await setDoc(doc(db, "movies", id), movieData);
        addLog(`BAŞARILI: ${movieData.title} güncellendi.`);
      }

      setStatus("Tamamlandı!");
    } catch (err) {
      console.error(err);
      setStatus(`Hata: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-white font-mono">
      <h1 className="text-2xl mb-4 text-rose-500 font-bold">TMDB Cache Yenileme Aracı</h1>
      
      <button 
        onClick={handleRefresh} 
        disabled={loading}
        className="px-6 py-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-50 mb-6"
      >
        {loading ? "İşleniyor..." : "Tüm Cache'i Yenile"}
      </button>

      <div className="mb-4">
        <span className="text-zinc-500">Durum: </span> 
        <span className="font-bold text-amber-400">{status}</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg h-[400px] overflow-y-auto">
        {logs.map((l, i) => (
          <div key={i} className="text-sm text-zinc-300 mb-1 border-b border-zinc-800/50 pb-1">{l}</div>
        ))}
        {logs.length === 0 && <div className="text-zinc-600">İşlem bekleniyor...</div>}
      </div>
    </div>
  );
}
