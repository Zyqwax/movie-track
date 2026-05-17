"use client";

import { useEffect, useState, useRef, use } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Send, Film, Check, CheckCheck } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);
dayjs.locale("tr");

/** Movie recommendation card inside chat */
function MovieCard({ msg, isMine }) {
  return (
    <Link
      href={`/movie/${msg.movieId}`}
      className={`block rounded-xl overflow-hidden transition max-w-[220px] ${
        isMine
          ? "bg-rose-700/40 hover:bg-rose-700/60"
          : "bg-zinc-700/40 hover:bg-zinc-700/60"
      }`}
    >
      <div className="flex gap-2.5 p-2">
        <div className="w-10 h-[58px] rounded-lg bg-zinc-700 overflow-hidden shrink-0 relative">
          {msg.moviePoster && (
            <Image
              src={`https://image.tmdb.org/t/p/w92${msg.moviePoster}`}
              alt={msg.movieTitle || "Film"}
              fill
              className="object-cover"
              unoptimized
            />
          )}
        </div>
        <div className="flex flex-col justify-center min-w-0">
          <div className="flex items-center gap-1 text-rose-300 mb-0.5">
            <Film size={10} />
            <span className="text-[8px] font-bold uppercase tracking-wider">
              Film Önerisi
            </span>
          </div>
          <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2">
            {msg.movieTitle || "Film"}
          </p>
        </div>
      </div>
    </Link>
  );
}

export default function ChatPage({ params }) {
  const unwrappedParams = use(params);
  const chatId = unwrappedParams.chatId;
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [chatData, setChatData] = useState(null);
  const [friendProfile, setFriendProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!authLoading && user === null) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Real-time listener for chatData
  useEffect(() => {
    if (!user || !chatId) return;

    const unsub = onSnapshot(doc(db, "chats", chatId), async (snap) => {
      if (!snap.exists()) {
        setLoading(false);
        return;
      }

      const data = snap.data();
      setChatData(data);

      if (!data.participants.includes(user.uid)) {
        router.push("/messages");
        return;
      }

      const friendUid = data.participants.find((p) => p !== user.uid);
      if (friendUid && !friendProfile) {
        const friendSnap = await getDoc(doc(db, "users", friendUid));
        if (friendSnap.exists()) {
          setFriendProfile(friendSnap.data());
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [user, chatId, router, friendProfile]);

  // Clear unread status of this user when entering the chat
  useEffect(() => {
    if (!user || !chatId || !chatData) return;
    if (chatData.unreadBy?.includes(user.uid)) {
      updateDoc(doc(db, "chats", chatId), {
        unreadBy: arrayRemove(user.uid),
      }).catch((err) => console.error("Error removing unreadBy:", err));
    }
  }, [user, chatId, chatData]);

  useEffect(() => {
    if (!user || !chatId) return;

    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = [];
      snapshot.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      setMessages(msgs);
      setTimeout(() => scrollToBottom("auto"), 80);
    });

    return () => unsub();
  }, [user, chatId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const text = newMessage.trim();
    setNewMessage("");

    try {
      const friendUid = chatData.participants.find((p) => p !== user.uid);

      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: user.uid,
        text,
        type: "text",
        createdAt: serverTimestamp(),
      });

      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        lastMessageSenderId: user.uid,
        unreadBy: arrayUnion(friendUid),
      });
    } catch (error) {
      console.error("Send message error:", error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-500" />
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 p-4">
        <p className="text-sm">Sohbet bulunamadı.</p>
        <Link
          href="/messages"
          className="mt-4 px-4 py-2 bg-zinc-800 rounded-xl text-white text-sm"
        >
          Geri Dön
        </Link>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = [];
  let lastDate = "";
  messages.forEach((msg) => {
    const msgDate = msg.createdAt
      ? dayjs(msg.createdAt.toDate?.() || msg.createdAt).format("YYYY-MM-DD")
      : "";
    if (msgDate && msgDate !== lastDate) {
      groupedMessages.push({ type: "date", date: msgDate });
      lastDate = msgDate;
    }
    groupedMessages.push({ type: "message", ...msg });
  });

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950">
      {/* Top Bar */}
      <div className="shrink-0 px-3 py-2.5 bg-zinc-950/95 backdrop-blur-xl border-b border-zinc-800/60 flex items-center gap-3 safe-top">
        <button
          onClick={() => router.push("/messages")}
          className="p-2 -ml-1 text-zinc-400 hover:text-white transition rounded-xl active:bg-zinc-800"
        >
          <ArrowLeft size={20} />
        </button>

        <Link href={chatData ? `/u/${chatData.participants.find(p => p !== user.uid)}` : "#"} className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shrink-0 overflow-hidden">
            {friendProfile?.photoURL ? (
              <Image
                src={friendProfile.photoURL}
                alt={friendProfile.displayName || ""}
                width={32}
                height={32}
                className="rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-white">
                {friendProfile?.displayName?.[0]?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-white truncate">
            {friendProfile?.displayName || "Kullanıcı"}
          </p>
        </Link>
      </div>

      {/* Messages Area */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600">
            <Film size={28} className="mb-2 opacity-30" />
            <p className="text-xs">Henüz mesaj yok</p>
            <p className="text-[10px] text-zinc-700 mt-0.5">
              Bir film önerisiyle sohbeti başlat!
            </p>
          </div>
        )}

        {groupedMessages.map((item, idx) => {
          if (item.type === "date") {
            return (
              <div key={`date-${item.date}`} className="flex justify-center py-2.5">
                <span className="text-[9px] text-zinc-500 bg-zinc-900/80 px-2.5 py-0.5 rounded-full">
                  {dayjs(item.date).format("D MMMM YYYY")}
                </span>
              </div>
            );
          }

          const isMine = item.senderId === user.uid;
          const isMovie = item.type === "movie_recommendation" || item.movieId;
          const isLastMessage = item.id && messages.length > 0 && messages[messages.length - 1].id === item.id;
          const friendUid = chatData?.participants?.find((p) => p !== user.uid);
          const isSeen = isMine && isLastMessage && chatData && (!chatData.unreadBy || !chatData.unreadBy.includes(friendUid));

          return (
            <div
              key={item.id || idx}
              className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}
            >
              <div
                className={`max-w-[75%] sm:max-w-[65%] ${
                  isMine
                    ? "bg-rose-600 text-white rounded-2xl rounded-br-sm"
                    : "bg-zinc-800/80 text-zinc-100 rounded-2xl rounded-bl-sm"
                } ${isMovie ? "p-1.5" : "px-3.5 py-2"}`}
              >
                {isMovie ? (
                  <div>
                    <MovieCard msg={item} isMine={isMine} />
                    {item.text && (
                      <p className="text-[11px] mt-1.5 px-1 leading-relaxed">{item.text}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-[13px] leading-relaxed">{item.text}</p>
                )}

                <div className={`flex items-center justify-end gap-1 mt-0.5 ${isMovie ? "px-1" : ""}`}>
                  <span className={`text-[8px] ${isMine ? "text-rose-200/50" : "text-zinc-500"}`}>
                    {item.createdAt
                      ? dayjs(item.createdAt.toDate?.() || item.createdAt).format("HH:mm")
                      : ""}
                  </span>
                  {isMine && isLastMessage && (
                    <span className="shrink-0" title={isSeen ? "Görüldü" : "İletildi"}>
                      {isSeen ? (
                        <CheckCheck size={10} className="text-emerald-400" strokeWidth={3} />
                      ) : (
                        <Check size={10} className="text-rose-200/40" strokeWidth={3} />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar — safe area bottom padding */}
      <div className="shrink-0 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/50 px-3 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,64px))]">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Mesaj yaz..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/40 transition"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center text-white hover:bg-rose-500 active:scale-95 transition disabled:opacity-30 shrink-0"
          >
            <Send size={16} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
