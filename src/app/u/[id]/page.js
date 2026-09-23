"use client";

import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  onSnapshot,
  setDoc,
  deleteDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import PublicProfileView, {
  PublicProfileLoading,
  PublicProfileNotFound,
} from "@/components/pages/public-profile/PublicProfileView";
import { fetchAndCacheMovie } from "@/lib/tmdb";
import { getLanguageConfig, translate } from "@/lib/i18n";

export default function PublicProfilePage(props) {
  const params = use(props.params);
  const targetUid = params.id;
  const { user, loading: authLoading, language, region } = useAuth();
  const { movies: myMovies } = useAppData();
  const router = useRouter();
  const [targetUser, setTargetUser] = useState(null);
  const [movies, setMovies] = useState(undefined);
  const [isFriend, setIsFriend] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("watched");
  const [publicLists, setPublicLists] = useState([]);
  const [publicListMovies, setPublicListMovies] = useState({});
  const [rawPublicListMovies, setRawPublicListMovies] = useState({});
  const [publicWatchedIds, setPublicWatchedIds] = useState([]);

  // ── Authentication and subscriptions ────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (user === null) {
      router.push("/login");
      return;
    }
    if (user && user.uid === targetUid) {
      router.replace("/profile");
      return;
    }
    if (user && targetUid) {
      const fetchUser = async () => {
        try {
          const userDoc = await getDoc(doc(db, "users", targetUid));
          setTargetUser(userDoc.exists() ? userDoc.data() : false);
        } catch (error) {
          console.error("Error fetching user:", error);
          setTargetUser(false);
        }
      };
      fetchUser();

      const moviesQ = query(collection(db, "users", targetUid, "movies"));
      const unsubscribeMovies = onSnapshot(moviesQ, (snapshot) => {
        const data = [];
        snapshot.forEach((movieDoc) =>
          data.push({ id: movieDoc.id, ...movieDoc.data() }),
        );
        setMovies(data);
      });
      const friendRef = doc(db, "users", user.uid, "friends", targetUid);
      const unsubscribeFriend = onSnapshot(friendRef, (docSnap) => {
        setIsFriend(docSnap.exists());
        setLoading(false);
      });
      const publicListsQ = query(
        collection(db, "users", targetUid, "lists"),
        where("visibility", "==", "public"),
      );
      const listMovieUnsubscribes = new Map();
      const unsubscribePublicLists = onSnapshot(publicListsQ, (snapshot) => {
        const nextLists = snapshot.docs.map((listDoc) => ({ id: listDoc.id, ...listDoc.data() }));
        setPublicLists(nextLists);
        listMovieUnsubscribes.forEach((unsubscribe) => unsubscribe());
        listMovieUnsubscribes.clear();
        nextLists.forEach((list) => {
          const unsubscribeMovies = onSnapshot(
            collection(db, "users", targetUid, "lists", list.id, "movies"),
            (movieSnapshot) => {
              setRawPublicListMovies((current) => ({
                ...current,
                [list.id]: movieSnapshot.docs.map((movieDoc) => ({ id: movieDoc.id, ...movieDoc.data() })),
              }));
            },
          );
          listMovieUnsubscribes.set(list.id, unsubscribeMovies);
        });
      });
      const unsubscribePublicWatchLog = onSnapshot(
        collection(db, "users", targetUid, "watchLog"),
        (snapshot) => setPublicWatchedIds(snapshot.docs.filter((item) => item.data()?.isWatched).map((item) => item.id)),
      );
      return () => {
        unsubscribeMovies();
        unsubscribeFriend();
        unsubscribePublicLists();
        unsubscribePublicWatchLog();
        listMovieUnsubscribes.forEach((unsubscribe) => unsubscribe());
      };
    }
  }, [user, authLoading, router, targetUid]);

  useEffect(() => {
    let active = true;
    const { tmdb } = getLanguageConfig(language);
    Promise.all(publicLists.map(async (list) => {
      const localizedMovies = await Promise.all((rawPublicListMovies[list.id] || []).map(async (savedMovie) => {
        const movieId = savedMovie.movieId || savedMovie.id;
        const localizedMovie = await fetchAndCacheMovie(movieId, tmdb, region);
        return localizedMovie
          ? { ...savedMovie, ...localizedMovie, id: String(movieId), isWatched: publicWatchedIds.includes(String(movieId)) }
          : { ...savedMovie, id: String(movieId), isWatched: publicWatchedIds.includes(String(movieId)) };
      }));
      return [list.id, localizedMovies];
    })).then((entries) => {
      if (active) setPublicListMovies(Object.fromEntries(entries));
    });
    return () => { active = false; };
  }, [language, publicLists, publicWatchedIds, rawPublicListMovies, region]);

  // ── Controller actions ─────────────────────────────────────────────────
  const handleToggleFriend = async () => {
    try {
      const friendRef = doc(db, "users", user.uid, "friends", targetUid);
      const reverseFriendRef = doc(db, "users", targetUid, "friends", user.uid);
      if (isFriend) {
        await deleteDoc(friendRef);
        await deleteDoc(reverseFriendRef);
      } else {
        await setDoc(friendRef, {
          uid: targetUid,
          displayName: targetUser.displayName || "",
          photoURL: targetUser.photoURL || "",
          addedAt: serverTimestamp(),
        });
        await setDoc(reverseFriendRef, {
          uid: user.uid,
          displayName: user.displayName || "",
          photoURL: user.photoURL || "",
          addedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("Error toggling friend:", error);
      alert("Bir hata oluştu.");
    }
  };

  const handleStartChat = async () => {
    try {
      const chatId = [user.uid, targetUid].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);
      if (!chatSnap.exists())
        await setDoc(chatRef, {
          participants: [user.uid, targetUid].sort(),
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          lastMessageSenderId: "",
        });
      router.push(`/messages/${chatId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Sohbet başlatılırken bir hata oluştu.");
    }
  };

  // ── Loading and not-found states ────────────────────────────────────────
  if (authLoading || !user || loading) return <PublicProfileLoading />;
  if (targetUser === false) return <PublicProfileNotFound />;
  if (!targetUser) return null;

  // ── Derived archive data ────────────────────────────────────────────────
  const watched = movies?.filter((movie) => movie.status === "watched") || [];
  const wishlist = movies?.filter((movie) => movie.status === "wishlist") || [];
  const ratedMovies = watched.filter((movie) => movie.rating > 0);
  const avgRating =
    ratedMovies.length > 0
      ? (
          ratedMovies.reduce((sum, movie) => sum + movie.rating, 0) /
          ratedMovies.length
        ).toFixed(1)
      : null;
  const displayMovies = activeTab === "watched" ? watched : wishlist;
  const sortedMovies = [...displayMovies].sort((a, b) => {
    if (activeTab === "watched") {
      const aHas = a.watchedAt != null && a.watchedAt !== 0;
      const bHas = b.watchedAt != null && b.watchedAt !== 0;
      if (aHas && !bHas) return -1;
      if (!aHas && bHas) return 1;
      if (!aHas && !bHas) return 0;
      return (b.watchedAt || 0) - (a.watchedAt || 0);
    }
    return (b.addedAt || 0) - (a.addedAt || 0);
  });
  const t = (key, values) => translate(language, key, values);

  // ── Presentational view ─────────────────────────────────────────────────
  return (
    <PublicProfileView
      targetUser={targetUser}
      isFriend={isFriend}
      movies={movies}
      watched={watched}
      wishlist={wishlist}
      avgRating={avgRating}
      activeTab={activeTab}
      onBack={() => router.back()}
      onToggleFriend={handleToggleFriend}
      onTabChange={setActiveTab}
      sortedMovies={sortedMovies}
      myMovies={myMovies}
      onStartChat={handleStartChat}
      t={t}
      publicLists={publicLists}
      publicListMovies={publicListMovies}
    />
  );
}
