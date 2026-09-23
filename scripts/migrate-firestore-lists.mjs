import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

try { process.loadEnvFile(".env"); } catch {}

const apply = process.argv.includes("--apply");
const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const projectArgument = process.argv.find((argument) => argument.startsWith("--project="))?.split("=")[1];

if (!projectId) throw new Error("Missing FIREBASE_PROJECT_ID or NEXT_PUBLIC_FIREBASE_PROJECT_ID.");
if (apply && projectArgument !== projectId) throw new Error(`Refusing to write. Use --project=${projectId} together with --apply.`);

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const credential = clientEmail && privateKey
  ? cert({ projectId, clientEmail, privateKey })
  : process.env.GOOGLE_APPLICATION_CREDENTIALS
    ? applicationDefault()
    : undefined;
const app = getApps().length ? getApps()[0] : initializeApp(credential ? { credential, projectId } : { projectId });
const db = getFirestore(app);

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function listMetadata(id, name, visibility, showOnHome) {
  return { id, name, type: "default", visibility, showOnHome, schemaVersion: 1, updatedAt: FieldValue.serverTimestamp() };
}

async function main() {
  const users = await db.collection("users").get();
  let oldMovieDocuments = 0;
  let memberships = 0;
  let watchedLogs = 0;

  for (const user of users.docs) {
    const oldMovies = await db.collection("users").doc(user.id).collection("movies").get();
    oldMovieDocuments += oldMovies.size;
    const writes = [
      [db.doc(`users/${user.id}/lists/wishlist`), listMetadata("wishlist", "Wishlist", "public", true)],
      [db.doc(`users/${user.id}/lists/watched`), listMetadata("watched", "Watched", "private", false)],
    ];

    for (const movieDoc of oldMovies.docs) {
      const movie = movieDoc.data();
      const movieId = movieDoc.id;
      const wishlistData = {
        movieId,
        title: movie.title || "",
        posterPath: movie.posterPath || null,
        addedAt: movie.addedAt || Date.now(),
        migratedFrom: "users/{uid}/movies",
      };
      writes.push([db.doc(`users/${user.id}/lists/wishlist/movies/${movieId}`), wishlistData]);
      memberships += 1;

      const hasWatchLog = movie.status === "watched" || (Array.isArray(movie.watchHistory) && movie.watchHistory.length > 0) || movie.watchedAt != null;
      if (hasWatchLog) {
        writes.push([db.doc(`users/${user.id}/lists/watched/movies/${movieId}`), { ...wishlistData, migratedFrom: "users/{uid}/movies" }]);
        writes.push([db.doc(`users/${user.id}/watchLog/${movieId}`), {
          movieId,
          title: movie.title || "",
          posterPath: movie.posterPath || null,
          watchHistory: movie.watchHistory || [],
          watchedAt: movie.watchedAt ?? null,
          rating: movie.rating || 0,
          review: movie.review || "",
          isWatched: true,
          migratedFrom: "users/{uid}/movies",
          updatedAt: FieldValue.serverTimestamp(),
        }]);
        watchedLogs += 1;
      }
    }

    if (!apply) continue;
    for (const writeChunk of chunks(writes, 450)) {
      const batch = db.batch();
      for (const [ref, data] of writeChunk) batch.set(ref, data, { merge: true });
      await batch.commit();
    }
  }

  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", projectId, users: users.size, oldMovieDocuments, wishlistMemberships: memberships, watchedLogs, deletes: 0 }, null, 2));
  if (!apply) console.log("Dry-run complete. No Firestore writes were made.");
  else console.log("List migration complete. Existing user movie documents were not deleted.");
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
