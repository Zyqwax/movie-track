import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function fetchAndCacheMovie(id, language = "tr-TR", region = "TR") {
  try {
    // 1. Check if the movie is already cached in our global 'movies' collection
    const movieRef = doc(db, "movies", String(id));
    const movieSnap = await getDoc(movieRef);

    if (movieSnap.exists()) {
      const cachedMovie = movieSnap.data();
      // Cached descriptions and titles are language-specific.
      if ((cachedMovie.contentLanguage || "tr-TR") === language && (cachedMovie.contentRegion || "TR") === region) {
        return cachedMovie;
      }
    }

    // 2. If not found or cached in another language, fetch from TMDB
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=${encodeURIComponent(language)}&region=${encodeURIComponent(region)}&append_to_response=videos,credits`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch movie from TMDB");
    }

    const data = await res.json();

    // Clean up and format the data before saving
    const movieData = {
      id: data.id,
      contentLanguage: language,
      contentRegion: region,
      title: data.title || data.original_title,
      overview: data.overview,
      posterPath: data.poster_path,
      backdropPath: data.backdrop_path,
      releaseDate: data.release_date,
      runtime: data.runtime,
      genres: data.genres?.map((g) => g.name) || [],
      voteAverage: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
      voteCount: data.vote_count || 0,
      // Cache max 1 trailer and 5 cast members to save DB space
      trailer: data.videos?.results?.find(v => v.type === "Trailer" && v.site === "YouTube")?.key || null,
      cast: data.credits?.cast?.slice(0, 5).map(c => ({ name: c.name, character: c.character, profilePath: c.profile_path })) || [],
    };

    // 3. Save to global 'movies' collection
    await setDoc(movieRef, movieData);

    return movieData;
  } catch (error) {
    console.error("fetchAndCacheMovie error:", error);
    return null;
  }
}

const providerTypes = ["flatrate", "free", "ads", "rent", "buy"];

function normalizeProviders(data, region) {
  const regionData = data?.results?.[region];
  if (!regionData) return null;

  const providers = {};
  for (const type of providerTypes) {
    providers[type] = (regionData[type] || []).map((provider) => ({
      id: provider.provider_id,
      name: provider.provider_name,
      logoPath: provider.logo_path || null,
      priority: provider.display_priority ?? null,
    }));
  }

  return {
    region,
    link: typeof regionData.link === "string" ? regionData.link : null,
    ...providers,
  };
}

export async function fetchWatchProviders(id, region = "TR") {
  try {
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${id}/watch/providers?api_key=${apiKey}`
    );
    if (!res.ok) throw new Error("Failed to fetch watch providers from TMDB");
    return normalizeProviders(await res.json(), region);
  } catch (error) {
    console.error("fetchWatchProviders error:", error);
    return null;
  }
}
