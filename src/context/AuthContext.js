"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { DEFAULT_LANGUAGE, DEFAULT_REGION, normalizeLanguage, normalizeRegion } from "@/lib/i18n";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [region, setRegion] = useState(DEFAULT_REGION);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setLanguage(DEFAULT_LANGUAGE);
      setRegion(DEFAULT_REGION);

      if (nextUser) {
        try {
          const userRef = doc(db, "users", nextUser.uid);
          const profileSnap = await getDoc(userRef);
          const profile = profileSnap.exists() ? profileSnap.data() : {};
          setLanguage(normalizeLanguage(profile.language));
          setRegion(normalizeRegion(profile.region));

          // Save basic profile info without replacing existing preferences.
          await setDoc(userRef, {
            uid: nextUser.uid,
            displayName: nextUser.displayName,
            photoURL: nextUser.photoURL,
            email: nextUser.email,
            lastSeen: serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error("Error loading user profile:", error);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google login failed", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const updatePreferences = async (preferences) => {
    if (!user) throw new Error("Not authenticated");

    const nextLanguage = normalizeLanguage(preferences.language ?? language);
    const nextRegion = normalizeRegion(preferences.region ?? region);
    const previous = { language, region };
    setLanguage(nextLanguage);
    setRegion(nextRegion);

    try {
      await setDoc(doc(db, "users", user.uid), {
        language: nextLanguage,
        region: nextRegion,
      }, { merge: true });
    } catch (error) {
      setLanguage(previous.language);
      setRegion(previous.region);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, language, region, updatePreferences }}>
      {children}
    </AuthContext.Provider>
  );
};
