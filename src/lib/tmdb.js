import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function fetchAndCacheMovie(id) {
  try {
    // 1. Check if the movie is already cached in our global 'movies' collection
    const movieRef = doc(db, "movies", String(id));
    const movieSnap = await getDoc(movieRef);

    if (movieSnap.exists()) {
      return movieSnap.data();
    }

    // 2. If not found, fetch from TMDB
    const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
    const res = await fetch(
      `https://api.themoviedb.org/3/movie/${id}?api_key=${apiKey}&language=tr-TR&append_to_response=videos,credits`
    );

    if (!res.ok) {
      throw new Error("Failed to fetch movie from TMDB");
    }

    const data = await res.json();

    // Clean up and format the data before saving
    const movieData = {
      id: data.id,
      title: data.title || data.original_title,
      overview: data.overview,
      posterPath: data.poster_path,
      backdropPath: data.backdrop_path,
      releaseDate: data.release_date,
      runtime: data.runtime,
      genres: data.genres?.map((g) => g.name) || [],
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
