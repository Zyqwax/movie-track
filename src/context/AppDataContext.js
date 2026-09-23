"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { fetchAndCacheMovie } from "@/lib/tmdb";
import { getLanguageConfig } from "@/lib/i18n";
import { ensureDefaultLists } from "@/lib/user-lists";

const AppDataContext = createContext({
  movies: undefined,
  friends: [],
  moviesLoading: true,
  friendsLoading: true,
  lists: [],
  listMovies: {},
  watchedMovieIds: [],
});

export const useAppData = () => useContext(AppDataContext);

export const AppDataProvider = ({ children }) => {
  const { user, language, region } = useAuth();
  const [movies, setMovies] = useState(undefined);
  const [friends, setFriends] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [lists, setLists] = useState([]);
  const [listMovies, setListMovies] = useState({});
  const [watchedMovieIds, setWatchedMovieIds] = useState([]);

  // Keep refs to unsubscribe functions so we don't re-create listeners unnecessarily
  const unsubMoviesRef = useRef(null);
  const unsubFriendsRef = useRef(null);
  const currentSubscriptionRef = useRef(null);
  const listMovieUnsubsRef = useRef(new Map());
  const watchLogRef = useRef(new Map());

  useEffect(() => {
    // If no user (logged out), clear everything and unsubscribe
    if (!user) {
      if (unsubMoviesRef.current) {
        unsubMoviesRef.current();
        unsubMoviesRef.current = null;
      }
      if (unsubFriendsRef.current) {
        unsubFriendsRef.current();
        unsubFriendsRef.current = null;
      }
      listMovieUnsubsRef.current.forEach((unsubscribe) => unsubscribe());
      listMovieUnsubsRef.current.clear();
      watchLogRef.current = new Map();
      const timeoutId = setTimeout(() => {
        setMovies(undefined);
        setFriends([]);
        setMoviesLoading(true);
        setFriendsLoading(true);
        setLists([]);
        setListMovies({});
        setWatchedMovieIds([]);
      }, 0);
      currentSubscriptionRef.current = null;
      return () => clearTimeout(timeoutId);
    }

    // Re-subscribe when the locale changes so cached movie metadata is localized.
    const subscriptionKey = `${user.uid}:${language}:${region}`;
    if (subscriptionKey === currentSubscriptionRef.current) return;
    currentSubscriptionRef.current = subscriptionKey;

    // Clean up any previous listeners (e.g. after account switch)
    if (unsubMoviesRef.current) unsubMoviesRef.current();
    if (unsubFriendsRef.current) unsubFriendsRef.current();
    listMovieUnsubsRef.current.forEach((unsubscribe) => unsubscribe());
    listMovieUnsubsRef.current.clear();
    watchLogRef.current = new Map();

    ensureDefaultLists(user.uid).catch((error) => console.error("Default lists error:", error));

    // Wishlist membership and watch log are separate: watching never removes a wishlist item.
    const wishlistQ = query(collection(db, "users", user.uid, "lists", "wishlist", "movies"));
    const watchLogQ = query(collection(db, "users", user.uid, "watchLog"));
    let active = true;
    let savedMovies = [];
    let watchLog = new Map();
    const { tmdb } = getLanguageConfig(language);
    const refreshMovies = async () => {
      const localizedMovies = await Promise.all(savedMovies.map(async (savedMovie) => {
        const localizedMovie = await fetchAndCacheMovie(savedMovie.id, tmdb, region);
        const log = watchLog.get(savedMovie.id);
        const watchState = { ...(log || {}), status: "wishlist", isWatched: Boolean(log?.isWatched) };
        return localizedMovie ? { ...savedMovie, ...localizedMovie, ...watchState } : { ...savedMovie, ...watchState };
      }));
      if (!active) return;
      setMovies(localizedMovies);
      setMoviesLoading(false);
    };
    const unsubWishlist = onSnapshot(wishlistQ, (snapshot) => {
      savedMovies = snapshot.docs.map((movieDoc) => ({ id: movieDoc.id, ...movieDoc.data() }));
      refreshMovies();
    }, () => { if (active) setMoviesLoading(false); });
    const unsubWatchLog = onSnapshot(watchLogQ, (snapshot) => {
      watchLog = new Map(snapshot.docs.map((logDoc) => [logDoc.id, logDoc.data()]));
      watchLogRef.current = watchLog;
      const watchedIds = [...watchLog.entries()]
        .filter(([, log]) => log?.isWatched)
        .map(([movieId]) => movieId);
      setWatchedMovieIds(watchedIds);
      setListMovies((current) => Object.fromEntries(
        Object.entries(current).map(([listId, listItems]) => [
          listId,
          listItems.map((movie) => ({ ...movie, isWatched: watchedIds.includes(movie.id) })),
        ]),
      ));
      refreshMovies();
    });
    unsubMoviesRef.current = () => { unsubWishlist(); unsubWatchLog(); };

    const listsQ = query(collection(db, "users", user.uid, "lists"));
    const unsubLists = onSnapshot(listsQ, (snapshot) => {
      const nextLists = snapshot.docs.map((listDoc) => ({ id: listDoc.id, ...listDoc.data() }));
      setLists(nextLists);
      listMovieUnsubsRef.current.forEach((unsubscribe) => unsubscribe());
      listMovieUnsubsRef.current.clear();
      setListMovies({});
      nextLists.filter((list) => list.type === "custom").forEach((list) => {
        const moviesQ = query(collection(db, "users", user.uid, "lists", list.id, "movies"));
        const unsubscribe = onSnapshot(moviesQ, async (snapshot) => {
          const rawMovies = snapshot.docs.map((movieDoc) => ({ id: movieDoc.id, ...movieDoc.data() }));
          const localizedMovies = await Promise.all(rawMovies.map(async (savedMovie) => {
            const localizedMovie = await fetchAndCacheMovie(savedMovie.id, tmdb, region);
            const log = watchLogRef.current.get(savedMovie.id);
            return localizedMovie
              ? { ...savedMovie, ...localizedMovie, isWatched: Boolean(log?.isWatched) }
              : { ...savedMovie, isWatched: Boolean(log?.isWatched) };
          }));
          if (active) setListMovies((current) => ({ ...current, [list.id]: localizedMovies }));
        });
        listMovieUnsubsRef.current.set(list.id, unsubscribe);
      });
    });

    // Start listening to friends
    const friendsQ = query(collection(db, "users", user.uid, "friends"));
    unsubFriendsRef.current = onSnapshot(friendsQ, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setFriends(data);
      setFriendsLoading(false);
    }, () => {
      setFriendsLoading(false);
    });

    const listMovieUnsubs = listMovieUnsubsRef.current;
    return () => {
      active = false;
      unsubLists();
      listMovieUnsubs.forEach((unsubscribe) => unsubscribe());
      listMovieUnsubs.clear();
    };
  }, [user, language, region]);

  return (
    <AppDataContext.Provider value={{ movies, friends, moviesLoading, friendsLoading, lists, listMovies, watchedMovieIds }}>
      {children}
    </AppDataContext.Provider>
  );
};
