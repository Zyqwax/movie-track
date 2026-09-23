import { collection, deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export const DEFAULT_LISTS = {
  wishlist: { id: "wishlist", name: "Wishlist", type: "default", visibility: "public", showOnHome: true },
  watched: { id: "watched", name: "Watched", type: "default", visibility: "private", showOnHome: false },
};

export function listRef(uid, listId) {
  return doc(db, "users", uid, "lists", listId);
}

export function listMoviesRef(uid, listId) {
  return collection(db, "users", uid, "lists", listId, "movies");
}

export function listMovieRef(uid, listId, movieId) {
  return doc(db, "users", uid, "lists", listId, "movies", String(movieId));
}

export function watchLogRef(uid, movieId) {
  return doc(db, "users", uid, "watchLog", String(movieId));
}

export async function ensureDefaultLists(uid) {
  await Promise.all(Object.values(DEFAULT_LISTS).map((list) => setDoc(listRef(uid, list.id), list, { merge: true })));
}

export async function getUserMovieState(uid, movieId) {
  const [wishlistSnap, watchLogSnap] = await Promise.all([
    getDoc(listMovieRef(uid, "wishlist", movieId)),
    getDoc(watchLogRef(uid, movieId)),
  ]);
  const wishlist = wishlistSnap.exists() ? wishlistSnap.data() : null;
  const watchLog = watchLogSnap.exists() ? watchLogSnap.data() : null;
  if (!wishlist && !watchLog) return null;
  return {
    ...(wishlist || {}),
    ...(watchLog || {}),
    id: String(movieId),
    status: watchLog?.isWatched ? "watched" : "wishlist",
    isWatched: Boolean(watchLog?.isWatched),
  };
}

export function saveWishlistMovie(uid, movieId, data) {
  return setDoc(listMovieRef(uid, "wishlist", movieId), { movieId: String(movieId), ...data }, { merge: true });
}

export function saveWatchedMovie(uid, movieId, data) {
  return setDoc(listMovieRef(uid, "watched", movieId), { movieId: String(movieId), ...data }, { merge: true });
}

export function saveWatchLog(uid, movieId, data) {
  return setDoc(watchLogRef(uid, movieId), { movieId: String(movieId), ...data }, { merge: true });
}

export function removeWishlistMovie(uid, movieId) {
  return deleteDoc(listMovieRef(uid, "wishlist", movieId));
}
