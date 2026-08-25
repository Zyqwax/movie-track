"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useAppData } from "@/context/AppDataContext";
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
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { MessageCircle, Plus, X, UserPlus, CheckCheck, Search } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";
import clsx from "clsx";
import ComingSoon from "@/components/ComingSoon";

dayjs.extend(relativeTime);
dayjs.locale("tr");

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const { friends } = useAppData();
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [chatUsers, setChatUsers] = useState({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && user === null) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchUserProfiles = useCallback(
    async (chatList, existingUsers) => {
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
    },
    [user]
  );

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatList = [];
      snapshot.forEach((d) => chatList.push({ id: d.id, ...d.data() }));
      setChats(chatList);

      const profiles = await fetchUserProfiles(chatList, chatUsers);
      setChatUsers(profiles);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, fetchUserProfiles]);

  const handleStartChatWithFriend = async (friendUid) => {
    if (modalLoading) return;
    setModalLoading(true);
    try {
      const chatId = [user.uid, friendUid].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [user.uid, friendUid].sort(),
          lastMessage: "",
          lastMessageAt: serverTimestamp(),
          lastMessageSenderId: "",
        });
      }

      setIsModalOpen(false);
      router.push(`/messages/${chatId}`);
    } catch (error) {
      console.error("Error starting chat:", error);
      alert("Sohbet başlatılırken bir hata oluştu.");
    } finally {
      setModalLoading(false);
    }
  };

  const formatChatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = dayjs(timestamp.toDate?.() || timestamp);
    const now = dayjs();
    if (date.isSame(now, "day")) return date.format("HH:mm");
    if (date.isSame(now.subtract(1, "day"), "day")) return "Dün";
    return date.format("D MMM");
  };

  const filteredFriends = friends.filter((f) =>
    f.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  }

  return <ComingSoon />;

  return (
    <div className="min-h-full bg-zinc-950 flex flex-col">

      {/* ── Sticky Header ────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-900/60 px-4 pt-5 pb-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Sohbetler</h1>
            <p className="text-[11px] text-zinc-500 mt-0.5">Arkadaşlarınla mesajlaş</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white text-xs font-bold transition-all shadow-lg shadow-rose-600/20"
          >
            <Plus size={14} className="stroke-[2.5]" />
            <span>Yeni</span>
          </button>
        </div>
      </div>

      {/* ── Chat List ────────────────────────────────────────────────── */}
      <div className="flex-1">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-rose-500" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 px-6 text-zinc-500">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 text-rose-500 opacity-70" />
            </div>
            <p className="text-sm font-semibold text-zinc-400 mb-1">Henüz sohbet yok</p>
            <p className="text-[11px] text-zinc-600 text-center max-w-[220px] leading-relaxed">
              Sağ üstteki &quot;Yeni&quot; butonuna basarak arkadaşlarınla konuşmaya başla!
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-5 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-md shadow-rose-600/20"
            >
              Sohbet Başlat
            </button>
          </div>
        ) : (
          <div className="flex flex-col pt-1">
            {chats.map((chat) => {
              const friendUid = chat.participants.find((p) => p !== user.uid);
              const friend = chatUsers[friendUid];
              const isUnread = chat.unreadBy?.includes(user.uid);
              const isMySent = chat.lastMessageSenderId === user.uid;

              return (
                <Link
                  key={chat.id}
                  href={`/messages/${chat.id}`}
                  className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-zinc-900/50 active:bg-zinc-900/70 transition-colors border-b border-zinc-900/40 last:border-0"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border border-zinc-700/50 shadow-sm">
                      {friend?.photoURL ? (
                        <Image
                          src={friend.photoURL}
                          alt={friend.displayName || ""}
                          width={48}
                          height={48}
                          className="object-cover h-full w-full"
                        />
                      ) : (
                        <span className="text-lg font-black text-rose-400 bg-rose-500/10 w-full h-full flex items-center justify-center">
                          {friend?.displayName?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    {/* Online dot */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className={clsx(
                        "text-sm truncate",
                        isUnread ? "font-bold text-white" : "font-semibold text-zinc-200"
                      )}>
                        {friend?.displayName || "Kullanıcı"}
                      </p>
                      {chat.lastMessageAt && (
                        <span className={clsx(
                          "text-[10px] font-semibold shrink-0",
                          isUnread ? "text-rose-400" : "text-zinc-600"
                        )}>
                          {formatChatTime(chat.lastMessageAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isMySent && (
                        <CheckCheck size={12} className="text-rose-400/70 shrink-0" />
                      )}
                      <p className={clsx(
                        "text-xs truncate flex-1 leading-normal",
                        isUnread ? "font-semibold text-zinc-200" : "text-zinc-500"
                      )}>
                        {chat.lastMessage || "Sohbet başlatıldı"}
                      </p>
                      {isUnread && (
                        <span className="shrink-0 w-5 h-5 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                          1
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* ── New Chat Modal ────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget && !modalLoading) setIsModalOpen(false); }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => !modalLoading && setIsModalOpen(false)}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-sm bg-zinc-950 border border-zinc-800/60 rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/50 overflow-hidden z-10 flex flex-col max-h-[75vh]">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 sm:hidden">
              <div className="w-10 h-1 bg-zinc-700 rounded-full" />
            </div>

            {/* Header */}
            <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-white">Yeni Sohbet</h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">Arkadaş listenden seç</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                disabled={modalLoading}
                className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition disabled:opacity-50"
              >
                <X size={15} />
              </button>
            </div>

            {/* Search within friends */}
            {friends.length > 3 && (
              <div className="px-4 py-2.5 border-b border-zinc-800/40">
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Arkadaş ara..."
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/40"
                  />
                </div>
              </div>
            )}

            {/* Friends list */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
              {friends.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                    <UserPlus size={20} className="text-zinc-600" />
                  </div>
                  <p className="text-xs text-zinc-500 leading-relaxed">
                    Sohbet başlatmak için arkadaşın olması gerekiyor.
                  </p>
                  <Link
                    href="/profile"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-rose-600/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-semibold transition hover:bg-rose-600/20"
                  >
                    Profil Linkini Paylaş
                  </Link>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  Sonuç bulunamadı
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    disabled={modalLoading}
                    onClick={() => handleStartChatWithFriend(friend.uid)}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-zinc-900/70 active:bg-zinc-900 text-left transition-colors outline-none border border-transparent hover:border-zinc-800/50 disabled:opacity-50"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border border-zinc-700/50 shrink-0">
                      {friend.photoURL ? (
                        <Image
                          src={friend.photoURL}
                          alt={friend.displayName || ""}
                          width={40}
                          height={40}
                          className="object-cover h-full w-full"
                        />
                      ) : (
                        <span className="text-sm font-black text-rose-400 bg-rose-500/10 w-full h-full flex items-center justify-center">
                          {friend.displayName?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-100 truncate">
                        {friend.displayName || "Kullanıcı"}
                      </p>
                    </div>
                    <div className="shrink-0 w-6 h-6 rounded-full border border-zinc-700 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-rose-500 opacity-0 group-hover:opacity-100" />
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Loading overlay */}
            {modalLoading && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-20">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-rose-500" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
