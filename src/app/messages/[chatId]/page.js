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
import { ArrowLeft, Send, Film, CheckCheck, Check, MoreVertical, Plus, Smile } from "lucide-react";
import dayjs from "dayjs";
import "dayjs/locale/tr";
import relativeTime from "dayjs/plugin/relativeTime";
import calendar from "dayjs/plugin/calendar";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import clsx from "clsx";

dayjs.extend(relativeTime);
dayjs.extend(calendar);
dayjs.locale("tr");

/** WhatsApp-style friendly movie recommendation card */
function MovieCard({ msg, isMine }) {
  return (
    <Link
      href={`/movie/${msg.movieId}`}
      className="mt-1 mb-1 flex gap-3 rounded-xl overflow-hidden border border-white/8 bg-black/20 hover:bg-black/30 transition-all max-w-[280px]"
    >
      {/* Poster */}
      {msg.moviePoster && (
        <div className="w-[56px] shrink-0 relative">
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
      <div className="flex-1 min-w-0 py-2.5 pr-2.5 flex flex-col justify-center gap-1.5">
        <span className="text-[9px] font-extrabold text-[#00a884] uppercase tracking-widest">🎬 Film Önerisi</span>
        <p className="text-[12.5px] font-bold text-white leading-snug line-clamp-2">
          {msg.movieTitle || "Film"}
        </p>
        <span className="text-[10px] text-white/45 font-medium">Detaylar için dokun →</span>
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
      <div className="min-h-screen bg-[#0b141a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884]"></div>
      </div>
    );
  }

  if (!chatData) {
    return (
      <div className="min-h-screen bg-[#0b141a] flex flex-col items-center justify-center text-zinc-400 p-4">
        <p className="text-sm">Sohbet bulunamadı.</p>
        <Link
          href="/messages"
          className="mt-4 px-5 py-2.5 bg-[#202c33] rounded-full text-white text-sm font-semibold hover:bg-[#2a3942] transition"
        >
          Geri Dön
        </Link>
      </div>
    );
  }

  const friendUid = chatData?.participants?.find((p) => p !== user.uid);
  const isSeen = chatData && (!chatData.unreadBy || !chatData.unreadBy.includes(friendUid));

  // Build grouped message list with date separators + consecutive bubble merging
  const groupedMessages = [];
  let prevMsg = null;

  messages.forEach((msg) => {
    const msgDate = msg.createdAt
      ? dayjs(msg.createdAt.toDate?.() || msg.createdAt).format("YYYY-MM-DD")
      : "";

    const prevDate = prevMsg?.msgDate || "";

    // Insert date divider
    if (msgDate && msgDate !== prevDate) {
      groupedMessages.push({ type: "date", date: msgDate });
    }

    const createdAtMs = msg.createdAt?.toDate?.()
      ? msg.createdAt.toDate().getTime()
      : msg.createdAt
        ? new Date(msg.createdAt).getTime()
        : 0;

    const prevCreatedAtMs = prevMsg?.createdAtMs || 0;

    // Consecutive grouping: same sender + same day + within 3 minutes + no movie card
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
    <div className="flex-1 h-full min-h-0 flex flex-col bg-[#0b141a] relative overflow-hidden">
      {/* ── WhatsApp-style Top Header ── */}
      <div className="shrink-0 px-4 py-3 bg-[#202c33] flex items-center justify-between border-b border-[#2a3942] z-10 shadow-sm safe-top">
        <div className="flex items-center gap-3 min-w-0">
          {/* Back button */}
          <button
            onClick={() => router.push("/messages")}
            className="p-1 text-[#8696a0] hover:text-white transition rounded-full active:bg-[#2a3942] shrink-0"
          >
            <ArrowLeft size={20} className="stroke-[2.5]" />
          </button>

          {/* Friend avatar + name */}
          <Link
            href={`/u/${friendUid}`}
            className="flex items-center gap-2.5 hover:opacity-90 active:opacity-70 transition min-w-0"
          >
            <div className="relative w-10 h-10 rounded-full bg-[#2a3942] overflow-hidden border border-white/5 shrink-0 shadow">
              {friendProfile?.photoURL ? (
                <Image
                  src={friendProfile.photoURL}
                  alt={friendProfile.displayName || ""}
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-[#00a884]">
                  {friendProfile?.displayName?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {friendProfile?.displayName || "Kullanıcı"}
              </p>
              <p className="text-[10px] text-[#8696a0] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] inline-block" />
                çevrimiçi
              </p>
            </div>
          </Link>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button className="p-2 text-[#8696a0] hover:text-white rounded-full hover:bg-[#2a3942] transition">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>



      {/* ── Messages Scroll Area ── */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto min-h-0 flex flex-col scroll-smooth relative z-10"
      >
        <div className="flex-1 px-3 sm:px-6 py-4 flex flex-col justify-end">
          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 select-none text-center">
              <div className="w-16 h-16 rounded-full bg-[#00a884]/10 border border-[#00a884]/20 flex items-center justify-center mb-4 shadow">
                <span className="text-3xl">👋</span>
              </div>
              <p className="text-sm font-bold text-white">
                {friendProfile?.displayName || "Kullanıcı"} ile sohbet
              </p>
              <p className="text-[11px] text-[#8696a0] mt-1.5 max-w-xs leading-relaxed">
                Bu, mesaj geçmişinizin başlangıcıdır. Bir şey yazarak sohbeti başlatın!
              </p>
            </div>
          )}

          {/* Message items */}
          <div className="flex flex-col gap-0">
            {groupedMessages.map((item, idx) => {
              // ── Date Separator ──
              if (item.type === "date") {
                return (
                  <div key={`date-${item.date}`} className="flex justify-center py-3 select-none">
                    <span className="px-3 py-1 bg-[#182229] border border-[#2a3942] text-[#8696a0] text-[11px] font-semibold rounded-full shadow-sm">
                      {formatDate(item.date)}
                    </span>
                  </div>
                );
              }

              // ── Message Bubble ──
              const isMine = item.senderId === user.uid;
              const isLastMsg = messages.length > 0 && messages[messages.length - 1].id === item.id;
              const showTail = !item.isConsecutive; // bubble tail only on first in group

              return (
                <div
                  key={item.id || idx}
                  className={clsx(
                    "flex",
                    isMine ? "justify-end" : "justify-start",
                    item.isConsecutive ? "mt-0.5" : "mt-2"
                  )}
                >
                  {/* Friend avatar placeholder on left, only for first in group */}
                  {!isMine && (
                    <div className="w-8 shrink-0 mr-1.5 flex items-end mb-1">
                      {!item.isConsecutive ? (
                        <div className="w-7 h-7 rounded-full bg-[#2a3942] overflow-hidden flex items-center justify-center border border-white/5 shrink-0 shadow-sm">
                          {friendProfile?.photoURL ? (
                            <Image
                              src={friendProfile.photoURL}
                              alt=""
                              width={28}
                              height={28}
                              className="object-cover"
                            />
                          ) : (
                            <span className="text-[10px] font-black text-[#00a884]">
                              {friendProfile?.displayName?.[0]?.toUpperCase() || "?"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="w-7" /> /* spacer to maintain alignment */
                      )}
                    </div>
                  )}

                  {/* ── Movie card: rendered WITHOUT a bubble ── */}
                  {item.isMovie ? (
                    <div className="flex flex-col max-w-[280px]">
                      <MovieCard msg={item} isMine={isMine} />
                      {/* Optional text below the card, in its own small bubble */}
                      {item.text && (
                        <div
                          className={clsx(
                            "px-3 py-2 mt-1 shadow-sm text-[13px] text-white leading-relaxed break-words whitespace-pre-wrap select-text",
                            isMine
                              ? "bg-[#005c4b] rounded-[14px] rounded-tr-[4px]"
                              : "bg-[#202c33] rounded-[14px] rounded-tl-[4px]"
                          )}
                        >
                          {item.text}
                        </div>
                      )}
                      {/* Timestamp pill below card */}
                      <div className={clsx("flex items-center gap-1 mt-1 select-none", isMine ? "justify-end" : "justify-start")}>
                        <span className="text-[10px] text-[#8696a0] leading-none">
                          {formatTime(item.createdAt)}
                        </span>
                        {isMine && (
                          <span className="leading-none">
                            {isLastMsg && isSeen ? (
                              <CheckCheck size={12} className="text-[#53bdeb]" />
                            ) : (
                              <Check size={12} className="text-[#8696a0]" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* ── Regular text bubble ── */
                    <div
                      className={clsx(
                        "max-w-[78%] sm:max-w-[60%] relative"
                      )}
                    >
                      <div
                        className={clsx(
                          "px-3 py-2 relative shadow-sm",
                          isMine
                            ? clsx("bg-[#005c4b] text-white", showTail ? "rounded-[14px] rounded-tr-[4px]" : "rounded-[14px]")
                            : clsx("bg-[#202c33] text-white", showTail ? "rounded-[14px] rounded-tl-[4px]" : "rounded-[14px]")
                        )}
                      >
                        <p className="text-[13px] leading-relaxed break-words whitespace-pre-wrap select-text">
                          {item.text}
                        </p>
                        <div className="flex items-center gap-1 mt-1 select-none justify-end">
                          <span className="text-[10px] text-white/40 leading-none">
                            {formatTime(item.createdAt)}
                          </span>
                          {isMine && (
                            <span className="leading-none">
                              {isLastMsg && isSeen ? (
                                <CheckCheck size={13} className="text-[#53bdeb]" />
                              ) : (
                                <Check size={13} className="text-white/40" />
                              )}
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

          <div ref={messagesEndRef} className="h-2" />
        </div>
      </div>

      {/* ── WhatsApp-style Input Bar ── */}
      <div className="shrink-0 bg-[#202c33] border-t border-[#2a3942] px-3 py-2 pb-[calc(0.6rem+env(safe-area-inset-bottom,12px))] z-10">
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2 max-w-5xl mx-auto"
        >
          {/* Message input field */}
          <div className="flex-1 bg-[#2a3942] rounded-full flex items-center px-4 py-2.5 gap-3 border border-transparent focus-within:border-[#00a884]/30 transition-all shadow-sm">
            <button
              type="button"
              className="text-[#8696a0] hover:text-[#00a884] transition shrink-0 select-none"
            >
              <Smile size={21} className="stroke-[1.8]" />
            </button>

            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Bir mesaj yazın"
              className="flex-1 bg-transparent border-none text-[13.5px] text-white placeholder-[#8696a0] focus:outline-none min-w-0"
            />

            <button
              type="button"
              className="text-[#8696a0] hover:text-[#00a884] transition shrink-0 select-none"
            >
              <Plus size={21} className="stroke-[1.8]" />
            </button>
          </div>

          {/* Send / Microphone button */}
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className={clsx(
              "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-all active:scale-90 shadow-md select-none",
              newMessage.trim()
                ? "bg-[#00a884] hover:bg-[#0ac994] text-white"
                : "bg-[#2a3942] text-[#8696a0] cursor-default"
            )}
          >
            <Send size={17} className="stroke-[2.5] translate-x-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
