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
import { ArrowLeft, Send, CheckCheck, Check } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";
import calendar from "dayjs/plugin/calendar";
import clsx from "clsx";

dayjs.extend(relativeTime);
dayjs.extend(calendar);
dayjs.locale("tr");

/** Film öneri kartı — uygulama stilinde */
function MovieRecommendCard({ msg, isMine }) {
  return (
    <Link
      href={`/movie/${msg.movieId}`}
      className={clsx(
        "flex gap-3 rounded-2xl overflow-hidden border transition-all max-w-[260px] active:scale-[0.98]",
        isMine
          ? "bg-rose-950/40 border-rose-500/20 hover:border-rose-500/40"
          : "bg-zinc-800/60 border-zinc-700/50 hover:border-zinc-600"
      )}
    >
      {/* Poster */}
      {msg.moviePoster && (
        <div className="w-14 shrink-0 relative aspect-[2/3]">
          <Image
            src={`https://image.tmdb.org/t/p/w92${msg.moviePoster}`}
            alt={msg.movieTitle || "Film"}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}
      {/* Info */}
      <div className="flex-1 min-w-0 py-2.5 pr-3 flex flex-col justify-center gap-1">
        <span className="text-[9px] font-extrabold text-rose-400 uppercase tracking-widest">
          🎬 Film Önerisi
        </span>
        <p className="text-[12px] font-bold text-white leading-snug line-clamp-2">
          {msg.movieTitle || "Film"}
        </p>
        <span className="text-[10px] text-zinc-400">Detaylar →</span>
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
  const inputRef = useRef(null);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (!authLoading && user === null) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  /* Chat metadata & friend profile */
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

  /* Mark as read */
  useEffect(() => {
    if (!user || !chatId || !chatData) return;
    if (chatData.unreadBy?.includes(user.uid)) {
      updateDoc(doc(db, "chats", chatId), {
        unreadBy: arrayRemove(user.uid),
      }).catch((err) => console.error("Error removing unreadBy:", err));
    }
  }, [user, chatId, chatData]);

  /* Messages realtime */
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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 p-4 gap-4">
        <p className="text-sm">Sohbet bulunamadı.</p>
        <Link
          href="/messages"
          className="px-5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-white text-sm font-semibold hover:bg-zinc-800 transition"
        >
          Geri Dön
        </Link>
      </div>
    );
  }

  const friendUid = chatData?.participants?.find((p) => p !== user.uid);
  const isSeen = chatData && (!chatData.unreadBy || !chatData.unreadBy.includes(friendUid));

  /* Build grouped message list with date separators */
  const groupedMessages = [];
  let prevMsg = null;

  messages.forEach((msg) => {
    const msgDate = msg.createdAt
      ? dayjs(msg.createdAt.toDate?.() || msg.createdAt).format("YYYY-MM-DD")
      : "";
    const prevDate = prevMsg?.msgDate || "";

    if (msgDate && msgDate !== prevDate) {
      groupedMessages.push({ type: "date", date: msgDate });
    }

    const createdAtMs = msg.createdAt?.toDate?.()
      ? msg.createdAt.toDate().getTime()
      : msg.createdAt ? new Date(msg.createdAt).getTime() : 0;

    const prevCreatedAtMs = prevMsg?.createdAtMs || 0;
    const isMovie = msg.type === "movie_recommendation" || !!msg.movieId;
    const prevIsMovie = prevMsg?.isMovie;

    const isConsecutive =
      prevMsg &&
      prevMsg.senderId === msg.senderId &&
      msgDate === prevDate &&
      createdAtMs - prevCreatedAtMs < 3 * 60 * 1000 &&
      !isMovie &&
      !prevIsMovie;

    const item = {
      type: "message",
      isConsecutive,
      isMovie,
      msgDate,
      createdAtMs,
      senderId: msg.senderId,
      ...msg,
    };

    groupedMessages.push(item);
    prevMsg = item;
  });

  const formatTime = (ts) => {
    if (!ts) return "";
    return dayjs(ts.toDate?.() || ts).format("HH:mm");
  };

  const formatDate = (dateStr) => {
    const d = dayjs(dateStr);
    const today = dayjs();
    if (d.isSame(today, "day")) return "Bugün";
    if (d.isSame(today.subtract(1, "day"), "day")) return "Dün";
    return d.format("D MMMM YYYY");
  };

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col bg-zinc-950 relative">

      {/* ── Top Header ───────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 py-3 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-900/60 flex items-center gap-3 z-10 shadow-sm">
        {/* Back button */}
        <button
          onClick={() => router.push("/messages")}
          className="p-2 -ml-1 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-xl transition active:scale-90 shrink-0"
          aria-label="Geri"
        >
          <ArrowLeft size={20} className="stroke-[2.5]" />
        </button>

        {/* Friend info */}
        <Link
          href={`/u/${friendUid}`}
          className="flex items-center gap-3 flex-1 min-w-0 group"
        >
          <div className="relative w-9 h-9 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700/50 shrink-0 shadow-sm">
            {friendProfile?.photoURL ? (
              <Image
                src={friendProfile.photoURL}
                alt={friendProfile.displayName || ""}
                fill
                className="object-cover"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-rose-400 bg-rose-500/10">
                {friendProfile?.displayName?.[0]?.toUpperCase() || "?"}
              </span>
            )}
            {/* Online dot */}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-zinc-950" />
          </div>

          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate group-hover:text-rose-300 transition-colors">
              {friendProfile?.displayName || "Kullanıcı"}
            </p>
            <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              çevrimiçi
            </p>
          </div>
        </Link>
      </div>

      {/* ── Subtle background pattern ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none -z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/3 rounded-full blur-[100px]" />
      </div>

      {/* ── Messages Scroll Area ──────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0 relative z-10">
        <div className="px-3 sm:px-5 py-4 flex flex-col min-h-full justify-end">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center select-none">
              <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 shadow-sm">
                <span className="text-3xl">👋</span>
              </div>
              <p className="text-sm font-bold text-white">
                {friendProfile?.displayName || "Kullanıcı"} ile sohbet
              </p>
              <p className="text-xs text-zinc-500 mt-1.5 max-w-xs leading-relaxed">
                Bir şey yazarak sohbeti başlat!
              </p>
            </div>
          )}

          {/* Message items */}
          <div className="flex flex-col gap-0">
            {groupedMessages.map((item, idx) => {
              /* Date separator */
              if (item.type === "date") {
                return (
                  <div key={`date-${item.date}`} className="flex justify-center py-4 select-none">
                    <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-500 text-[10px] font-semibold rounded-full">
                      {formatDate(item.date)}
                    </span>
                  </div>
                );
              }

              /* Message bubble */
              const isMine = item.senderId === user.uid;
              const isLastMsg = messages.length > 0 && messages[messages.length - 1].id === item.id;
              const showTail = !item.isConsecutive;

              return (
                <div
                  key={item.id || idx}
                  className={clsx(
                    "flex",
                    isMine ? "justify-end" : "justify-start",
                    item.isConsecutive ? "mt-0.5" : "mt-2.5"
                  )}
                >
                  {/* Friend avatar — only for first in group */}
                  {!isMine && (
                    <div className="w-8 shrink-0 mr-1.5 flex items-end mb-1">
                      {!item.isConsecutive ? (
                        <div className="w-7 h-7 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center border border-zinc-700/50 shadow-sm shrink-0">
                          {friendProfile?.photoURL ? (
                            <Image
                              src={friendProfile.photoURL}
                              alt=""
                              width={28}
                              height={28}
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-black text-rose-400">
                              {friendProfile?.displayName?.[0]?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-7" />
                      )}
                    </div>
                  )}

                  {/* Movie card */}
                  {item.isMovie ? (
                    <div className="flex flex-col max-w-[260px]">
                      <MovieRecommendCard msg={item} isMine={isMine} />
                      {item.text && (
                        <div
                          className={clsx(
                            "px-3 py-2 mt-1 text-[13px] text-white leading-relaxed break-words whitespace-pre-wrap",
                            isMine
                              ? "bg-rose-950/60 rounded-[14px] rounded-tr-[4px]"
                              : "bg-zinc-800/80 rounded-[14px] rounded-tl-[4px]"
                          )}
                        >
                          {item.text}
                        </div>
                      )}
                      <div className={clsx("flex items-center gap-1 mt-1 select-none", isMine ? "justify-end" : "justify-start")}>
                        <span className="text-[10px] text-zinc-600 leading-none">
                          {formatTime(item.createdAt)}
                        </span>
                        {isMine && (
                          <span className="leading-none">
                            {isLastMsg && isSeen
                              ? <CheckCheck size={11} className="text-rose-400" />
                              : <Check size={11} className="text-zinc-600" />
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Regular text bubble */
                    <div className="max-w-[78%] sm:max-w-[60%]">
                      <div
                        className={clsx(
                          "px-3.5 py-2.5 shadow-sm",
                          isMine
                            ? clsx(
                                "bg-rose-600 text-white",
                                showTail
                                  ? "rounded-[18px] rounded-tr-[5px]"
                                  : "rounded-[18px]"
                              )
                            : clsx(
                                "bg-zinc-800 text-white",
                                showTail
                                  ? "rounded-[18px] rounded-tl-[5px]"
                                  : "rounded-[18px]"
                              )
                        )}
                      >
                        <p className="text-[13.5px] leading-relaxed break-words whitespace-pre-wrap select-text">
                          {item.text}
                        </p>
                        <div className="flex items-center gap-1 mt-1 select-none justify-end">
                          <span className={clsx(
                            "text-[10px] leading-none",
                            isMine ? "text-white/50" : "text-zinc-500"
                          )}>
                            {formatTime(item.createdAt)}
                          </span>
                          {isMine && (
                            <span className="leading-none">
                              {isLastMsg && isSeen
                                ? <CheckCheck size={12} className="text-white/70" />
                                : <Check size={12} className="text-white/40" />
                              }
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* ── Input Bar ─────────────────────────────────────────────────── */}
      <div
        className="shrink-0 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900/60 px-3 py-2.5 z-10"
        style={{ paddingBottom: "calc(0.625rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 max-w-3xl mx-auto"
        >
          {/* Text input */}
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center px-4 py-2.5 gap-2 focus-within:border-rose-500/40 focus-within:ring-1 focus-within:ring-rose-500/20 transition-all min-h-[44px]">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Mesaj yaz..."
              className="flex-1 bg-transparent border-none text-sm text-white placeholder-zinc-500 focus:outline-none min-w-0"
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className={clsx(
              "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-all active:scale-90 shadow-sm",
              newMessage.trim()
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25"
                : "bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed"
            )}
            aria-label="Gönder"
          >
            <Send size={17} className={clsx("stroke-[2.5]", newMessage.trim() && "translate-x-px")} />
          </button>
        </form>
      </div>
    </div>
  );
}
