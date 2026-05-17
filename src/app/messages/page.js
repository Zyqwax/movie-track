"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("tr");

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [chatUsers, setChatUsers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user === null) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchUserProfiles = useCallback(async (chatList, existingUsers) => {
    const uids = new Set();
    chatList.forEach((c) =>
      c.participants.forEach((p) => {
        if (p !== user.uid) uids.add(p);
      })
    );

    const newUsers = { ...existingUsers };
    const fetchPromises = [];
    uids.forEach((uid) => {
      if (!newUsers[uid]) {
        fetchPromises.push(
          getDoc(doc(db, "users", uid)).then((snap) => {
            if (snap.exists()) newUsers[uid] = snap.data();
          })
        );
      }
    });
    if (fetchPromises.length > 0) {
      await Promise.all(fetchPromises);
    }
    return newUsers;
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const chatList = [];
      snapshot.forEach((d) => chatList.push({ id: d.id, ...d.data() }));
      setChats(chatList);

      const profiles = await fetchUserProfiles(chatList, chatUsers);
      setChatUsers(profiles);
      setLoading(false);
    });

    return () => unsub();
  }, [user, fetchUserProfiles]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-50 max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-4 pt-10 pb-3">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Mesajlar
        </h1>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          Arkadaşlarınla film öner ve sohbet et
        </p>
      </div>

      {/* Chat List */}
      <div className="px-2">
        {loading ? (
          <div className="flex justify-center my-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-500">
            <div className="w-14 h-14 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
              <MessageCircle className="w-7 h-7 opacity-40" />
            </div>
            <p className="text-sm font-medium mb-0.5">Henüz mesajın yok</p>
            <p className="text-[11px] text-zinc-600 text-center max-w-[220px]">
              Bir arkadaşının profilinden veya film sayfasından sohbet başlat
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            {chats.map((chat) => {
              const friendUid = chat.participants.find((p) => p !== user.uid);
              const friend = chatUsers[friendUid];
              const isUnread = chat.unreadBy?.includes(user.uid);

              return (
                <Link
                  key={chat.id}
                  href={`/messages/${chat.id}`}
                  className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-zinc-900/60 active:bg-zinc-900 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0 overflow-hidden">
                    {friend?.photoURL ? (
                      <Image
                        src={friend.photoURL}
                        alt={friend.displayName || ""}
                        width={44}
                        height={44}
                        className="rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-base font-bold text-white">
                        {friend?.displayName?.[0]?.toUpperCase() || "?"}
                      </span>
                    )}
                    {isUnread && (
                      <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 border-2 border-zinc-950 rounded-full animate-pulse" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${isUnread ? "font-bold text-white" : "font-medium text-zinc-200"}`}>
                        {friend?.displayName || "Kullanıcı"}
                      </p>
                      {chat.lastMessageAt && (
                        <span className="text-[10px] text-zinc-600 shrink-0">
                          {dayjs(chat.lastMessageAt.toDate?.() || chat.lastMessageAt).fromNow()}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isUnread ? "text-zinc-300" : "text-zinc-500"}`}>
                      {chat.lastMessage || "Sohbet başlatıldı"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
