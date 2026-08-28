"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { fetchAndCacheMovie } from "@/lib/tmdb";
import { getLanguageConfig } from "@/lib/i18n";

const AppDataContext = createContext({
  movies: undefined,
  friends: [],
  moviesLoading: true,
  friendsLoading: true,
});

export const useAppData = () => useContext(AppDataContext);

export const AppDataProvider = ({ children }) => {
  const { user, language, region } = useAuth();
  const [movies, setMovies] = useState(undefined);
  const [friends, setFriends] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Keep refs to unsubscribe functions so we don't re-create listeners unnecessarily
  const unsubMoviesRef = useRef(null);
  const unsubFriendsRef = useRef(null);
  const currentSubscriptionRef = useRef(null);

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
      const timeoutId = setTimeout(() => {
        setMovies(undefined);
        setFriends([]);
        setMoviesLoading(true);
        setFriendsLoading(true);
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

    // Start listening to movies
    const moviesQ = query(collection(db, "users", user.uid, "movies"));
    let active = true;
    const { tmdb } = getLanguageConfig(language);
    unsubMoviesRef.current = onSnapshot(moviesQ, async (snapshot) => {
      const savedMovies = [];
      snapshot.forEach((movieDoc) => savedMovies.push({ id: movieDoc.id, ...movieDoc.data() }));
      const localizedMovies = await Promise.all(
        savedMovies.map(async (savedMovie) => {
          const localizedMovie = await fetchAndCacheMovie(savedMovie.id, tmdb, region);
          return localizedMovie ? { ...savedMovie, ...localizedMovie } : savedMovie;
        }),
      );
      if (!active) return;
      setMovies(localizedMovies);
      setMoviesLoading(false);
    }, () => {
      if (active) setMoviesLoading(false);
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

    return () => {
      active = false;
      // The next subscription or provider teardown closes the listeners.
    };
  }, [user, language, region]);

  return (
    <AppDataContext.Provider value={{ movies, friends, moviesLoading, friendsLoading }}>
      {children}
    </AppDataContext.Provider>
  );
};
