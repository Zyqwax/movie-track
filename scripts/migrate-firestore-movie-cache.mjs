import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

try {
  process.loadEnvFile(".env");
} catch {
  // Environment variables may already be provided by the shell or CI.
}

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const projectArgument = process.argv.find((argument) => argument.startsWith("--project="))?.split("=")[1];
const languages = valueFor("--languages", "tr-TR,en-US").split(",").map((value) => value.trim()).filter(Boolean);
const regions = valueFor("--regions", "").split(",").map((value) => value.trim()).filter(Boolean);
const tmdbApiKey = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;

function valueFor(name, fallback) {
  return process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1) || fallback;
}

function requireProjectConfirmation(projectId) {
  if (!apply) return;
  if (!projectArgument || projectArgument !== projectId) {
    throw new Error(`Refusing to write. Use --project=${projectId} together with --apply.`);
  }
}

function createAdminApp() {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Missing FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.");

  requireProjectConfirmation(projectId);

  if (getApps().length > 0) return { app: getApps()[0], projectId };

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const credential = clientEmail && privateKey
    ? cert({ projectId, clientEmail, privateKey })
    : process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? applicationDefault()
      : undefined;

  return {
    app: initializeApp(credential ? { credential } : { projectId }),
    projectId,
  };
}

function canonicalMovie(data) {
  return {
    id: data.id,
    originalTitle: data.original_title || null,
    originalLanguage: data.original_language || null,
    posterPath: data.poster_path || null,
    backdropPath: data.backdrop_path || null,
    releaseDate: data.release_date || null,
    runtime: data.runtime ?? null,
    voteAverage: data.vote_average ? Math.round(data.vote_average * 10) / 10 : null,
    voteCount: data.vote_count || 0,
    schemaVersion: 2,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function localizedMovie(data, locale) {
  return {
    locale,
    title: data.title || data.original_title || "",
    overview: data.overview || "",
    tagline: data.tagline || "",
    genres: data.genres?.map((genre) => genre.name) || [],
    trailer: data.videos?.results?.find((video) => video.type === "Trailer" && video.site === "YouTube")?.key || null,
    cast:
      data.credits?.cast?.slice(0, 5).map((castMember) => ({
        name: castMember.name,
        character: castMember.character,
        profilePath: castMember.profile_path,
      })) || [],
    updatedAt: FieldValue.serverTimestamp(),
  };
}

function normalizedProviders(data, region) {
  const regionData = data?.results?.[region];
  if (!regionData) return null;
  const providerTypes = ["flatrate", "free", "ads", "rent", "buy"];
  const result = { region, link: regionData.link || null };
  for (const type of providerTypes) {
    result[type] = (regionData[type] || []).map((provider) => ({
      id: provider.provider_id,
      name: provider.provider_name,
      logoPath: provider.logo_path || null,
      priority: provider.display_priority ?? null,
    }));
  }
  return { ...result, updatedAt: FieldValue.serverTimestamp() };
}

async function fetchTmdb(path) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(`https://api.themoviedb.org/3${path}${path.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(tmdbApiKey)}`);
      if (!response.ok) {
        const error = new Error(`TMDB ${response.status} for ${path}`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    } catch (error) {
      if (error.status === 404 || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

async function collectMovieIds(firestore) {
  const ids = new Set();
  const rootMovies = await firestore.collection("movies").get();
  rootMovies.forEach((snapshot) => ids.add(snapshot.id));

  const userMovies = await firestore.collectionGroup("movies").get();
  userMovies.forEach((snapshot) => ids.add(snapshot.id));

  return { ids, rootCount: rootMovies.size, userMovieCount: userMovies.size };
}

async function main() {
  const { app, projectId } = createAdminApp();
  const firestore = getFirestore(app);
  const inventory = await collectMovieIds(firestore);

  console.log(JSON.stringify({
    mode: apply ? "apply" : "dry-run",
    projectId,
    rootMovieDocuments: inventory.rootCount,
    userMovieDocuments: inventory.userMovieCount,
    uniqueMovieIds: inventory.ids.size,
    languages,
    regions,
    deletes: 0,
  }, null, 2));

  if (!apply) {
    console.log("Dry-run complete. No Firestore writes were made.");
    return;
  }
  if (!tmdbApiKey) throw new Error("Missing TMDB_API_KEY or NEXT_PUBLIC_TMDB_API_KEY.");

  let processed = 0;
  let skipped = 0;
  for (const id of inventory.ids) {
    try {
      const localized = [];
      for (const language of languages) {
        try {
          const data = await fetchTmdb(`/movie/${encodeURIComponent(id)}?language=${encodeURIComponent(language)}&region=TR&append_to_response=videos,credits`);
          localized.push({ language, data });
        } catch (error) {
          if (error.status === 404) {
            console.log(`Skipped ${id}: TMDB returned 404.`);
            break;
          }
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 120));
      }

      if (localized.length === 0 || localized.length !== languages.length) {
        skipped += 1;
        continue;
      }

      const batch = firestore.batch();
      const movieRef = firestore.doc(`movies/${id}`);
      batch.set(movieRef, canonicalMovie(localized[0].data), { merge: true });
      for (const item of localized) {
        batch.set(firestore.doc(`movies/${id}/localizations/${item.language}`), localizedMovie(item.data, item.language), { merge: true });
      }

      for (const region of regions) {
        const providerData = await fetchTmdb(`/movie/${encodeURIComponent(id)}/watch/providers`);
        const providers = normalizedProviders(providerData, region);
        if (providers) batch.set(firestore.doc(`movies/${id}/providers/${region}`), providers, { merge: true });
      }

      await batch.commit();
      processed += 1;
      console.log(`Migrated ${processed}/${inventory.ids.size}: ${id}`);
    } catch (error) {
      skipped += 1;
      console.log(`Skipped ${id}: ${error.message}`);
    }
  }

  console.log(`Migration complete. ${processed} movie records rewritten, ${skipped} skipped. Existing user data and legacy documents were not deleted.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
