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
import { MessageCircle, Plus, X, UserPlus, Compass, Check, CheckCheck } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";
import clsx from "clsx";

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

  // WhatsApp-style natural date formatter
  const formatChatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = dayjs(timestamp.toDate?.() || timestamp);
    const now = dayjs();
    if (date.isSame(now, "day")) {
      return date.format("HH:mm");
    } else if (date.isSame(now.subtract(1, "day"), "day")) {
      return "Dün";
    } else {
      return date.format("D MMM");
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22c55e]" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-950 text-zinc-150 pb-20 relative overflow-hidden">
      {/* Decorative WhatsApp Teal-Green Glow background */}
      <div className="absolute top-[-100px] right-[-50px] w-[350px] h-[350px] bg-gradient-to-br from-[#22c55e]/10 to-transparent rounded-full blur-[90px] pointer-events-none -z-10" />

      {/* Header bar with cozy WhatsApp layout */}
      <div className="px-6 pt-12 pb-5 flex items-end justify-between select-none">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Sohbetler
          </h1>
          <p className="text-[11px] font-semibold text-zinc-500 mt-1">
            Arkadaşlarınla film tartış ve mesajlaş
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[#22c55e] hover:bg-[#1ebd5b] active:scale-95 text-zinc-950 text-[11px] font-black transition shadow-lg shadow-[#22c55e]/15"
        >
          <Plus size={15} className="stroke-[3]" />
          <span>Yeni Sohbet</span>
        </button>
      </div>

      {/* Chat List area */}
      <div className="px-4 mt-3">
        {loading ? (
          <div className="flex justify-center py-20 select-none">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22c55e]" />
          </div>
        ) : chats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-zinc-500 bg-zinc-900/10 border border-zinc-900/60 rounded-3xl select-none mx-2">
            <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800/40 flex items-center justify-center mb-4">
              <MessageCircle className="w-7 h-7 opacity-50 text-[#22c55e]" />
            </div>
            <p className="text-sm font-bold text-zinc-400">Henüz sohbetiniz yok</p>
            <p className="text-[11px] text-zinc-550 text-center max-w-[220px] leading-relaxed mt-2">
              Üst köşedeki *"Yeni Sohbet"* butonuyla arkadaş listenizden biriyle hemen yazışmaya başlayın!
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
                  className="flex items-center gap-4 px-3 py-3.5 rounded-2xl hover:bg-zinc-900/40 active:bg-zinc-900/70 transition-all duration-150 group border-b border-zinc-900/40 last:border-0 pb-4 mb-1"
                >
                  {/* WhatsApp-style large Avatar */}
                  <div className="relative shrink-0 select-none">
                    <div className="w-13 h-13 rounded-full bg-zinc-900 overflow-hidden flex items-center justify-center border-2 border-zinc-800 group-hover:border-[#22c55e] transition duration-200 shadow-md">
                      {friend?.photoURL ? (
                        <Image
                          src={friend.photoURL}
                          alt={friend.displayName || ""}
                          width={52}
                          height={52}
                          className="object-cover h-full w-full"
                        />
                      ) : (
                        <span className="text-lg font-black text-[#22c55e] bg-[#22c55e]/5 w-full h-full flex items-center justify-center">
                          {friend?.displayName?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    {/* Active/Status green indicator dot */}
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#23a55a] rounded-full border-2 border-zinc-950 shadow" />
                  </div>

                  {/* Middle Content: Large Name and snippet text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={clsx(
                        "text-[14px] truncate transition-colors group-hover:text-white", 
                        isUnread ? "font-black text-white" : "font-bold text-zinc-200"
                      )}>
                        {friend?.displayName || "Kullanıcı"}
                      </p>
                      
                      {/* Formatted Date on the right */}
                      {chat.lastMessageAt && (
                        <span className={clsx(
                          "text-[10px] font-bold shrink-0 select-none",
                          isUnread ? "text-[#22c55e]" : "text-zinc-550"
                        )}>
                          {formatChatTime(chat.lastMessageAt)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 mt-1.5">
                      {/* Checkmarks if last message is sent by me */}
                      {chat.lastMessageSenderId === user.uid && (
                        <span className="text-zinc-600 shrink-0">
                          <CheckCheck size={13} className="text-sky-500" />
                        </span>
                      )}
                      
                      <p className={clsx(
                        "text-[11.5px] truncate flex-1 leading-normal", 
                        isUnread ? "font-bold text-[#f2f3f5]" : "text-zinc-500"
                      )}>
                        {chat.lastMessage || "Sohbet başlatıldı"}
                      </p>

                      {/* WhatsApp unread badge capsule */}
                      {isUnread && (
                        <span className="shrink-0 w-5 h-5 bg-[#22c55e] text-zinc-950 text-[10px] font-black rounded-full flex items-center justify-center shadow shadow-[#22c55e]/10 select-none">
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

      {/* "Yeni Sohbet" Glassmorphic Dialog Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 select-none animate-fade-in">
          {/* Backdrop layer */}
          <div 
            onClick={() => !modalLoading && setIsModalOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Modal Card Panel */}
          <div className="relative w-full max-w-xs bg-zinc-950/95 border border-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[70vh] z-10 animate-scale-up">
            {/* Cover Banner */}
            <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-r from-emerald-950/30 via-zinc-900 to-indigo-950/20 -z-10" />

            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-zinc-900/60 flex items-center justify-between relative">
              <span className="text-[11px] font-extrabold text-[#22c55e] uppercase tracking-wider">Yeni Sohbet Başlat</span>
              <button 
                onClick={() => setIsModalOpen(false)}
                disabled={modalLoading}
                className="p-1 text-zinc-500 hover:text-white hover:bg-zinc-900 rounded-full transition disabled:opacity-50"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            {/* Friends Selector List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5 max-h-[45vh]">
              {friends.length === 0 ? (
                <div className="py-12 px-4 text-center flex flex-col items-center justify-center">
                  <UserPlus size={24} className="text-zinc-650 mb-2 opacity-50" />
                  <p className="text-[10px] font-bold text-zinc-500 leading-relaxed">
                    Sohbet başlatmak için kayıtlı bir arkadaşınız olması gerekir.
                  </p>
                  <Link
                    href="/search"
                    onClick={() => setIsModalOpen(false)}
                    className="mt-4 px-4 py-2 bg-[#22c55e]/10 hover:bg-[#22c55e]/20 border border-[#22c55e]/15 rounded-full text-[#22c55e] text-[10px] font-bold transition flex items-center gap-1"
                  >
                    <Compass size={11} strokeWidth={2.5} />
                    <span>Arkadaş Keşfet</span>
                  </Link>
                </div>
              ) : (
                friends.map((friend) => (
                  <button
                    key={friend.id}
                    disabled={modalLoading}
                    onClick={() => handleStartChatWithFriend(friend.uid)}
                    className="flex items-center gap-3.5 w-full p-2.5 rounded-2xl hover:bg-zinc-900/60 active:bg-zinc-900 text-left transition duration-200 outline-none border border-transparent hover:border-zinc-800/40"
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-850 overflow-hidden flex items-center justify-center border border-zinc-800 shrink-0">
                      {friend.photoURL ? (
                        <Image
                          src={friend.photoURL}
                          alt={friend.displayName || ""}
                          width={40}
                          height={40}
                          className="object-cover h-full w-full"
                        />
                      ) : (
                        <span className="text-sm font-black text-[#22c55e] bg-[#22c55e]/5 w-full h-full flex items-center justify-center">
                          {friend.displayName?.[0]?.toUpperCase() || "?"}
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-zinc-300 hover:text-white truncate">
                      {friend.displayName || "Kullanıcı"}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Spinner indicator when loading */}
            {modalLoading && (
              <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-20">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-[#22c55e]" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
