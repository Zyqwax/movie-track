"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

const AppDataContext = createContext({
  movies: undefined,
  friends: [],
  moviesLoading: true,
  friendsLoading: true,
});

export const useAppData = () => useContext(AppDataContext);

export const AppDataProvider = ({ children }) => {
  const { user } = useAuth();
  const [movies, setMovies] = useState(undefined);
  const [friends, setFriends] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [friendsLoading, setFriendsLoading] = useState(true);

  // Keep refs to unsubscribe functions so we don't re-create listeners unnecessarily
  const unsubMoviesRef = useRef(null);
  const unsubFriendsRef = useRef(null);
  const currentUidRef = useRef(null);

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
      setMovies(undefined);
      setFriends([]);
      setMoviesLoading(true);
      setFriendsLoading(true);
      currentUidRef.current = null;
      return;
    }

    // If it's the same user already listening, do nothing
    if (user.uid === currentUidRef.current) return;
    currentUidRef.current = user.uid;

    // Clean up any previous listeners (e.g. after account switch)
    if (unsubMoviesRef.current) unsubMoviesRef.current();
    if (unsubFriendsRef.current) unsubFriendsRef.current();

    // Start listening to movies
    const moviesQ = query(collection(db, "users", user.uid, "movies"));
    unsubMoviesRef.current = onSnapshot(moviesQ, (snapshot) => {
      const data = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() }));
      setMovies(data);
      setMoviesLoading(false);
    }, () => {
      setMoviesLoading(false);
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
      // Don't unsubscribe on every render — only on unmount (provider tear-down)
      // The ref-based guard above prevents duplicate listeners
    };
  }, [user]);

  return (
    <AppDataContext.Provider value={{ movies, friends, moviesLoading, friendsLoading }}>
      {children}
    </AppDataContext.Provider>
  );
};
