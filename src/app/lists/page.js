"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Lock, Globe2, Pencil, Check, ArrowRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ensureDefaultLists } from "@/lib/user-lists";
import { translate } from "@/lib/i18n";

export default function ListsPage() {
  const { user, loading: authLoading, language } = useAuth();
  const router = useRouter();
  const t = (key, values) => translate(language, key, values);
  const [lists, setLists] = useState([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!user) return undefined;
    ensureDefaultLists(user.uid).catch((error) => console.error("Default lists error:", error));
    return onSnapshot(collection(db, "users", user.uid, "lists"), (snapshot) => {
      setLists(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })).sort((a, b) => (a.id === "wishlist" ? -1 : b.id === "wishlist" ? 1 : a.id === "watched" ? -1 : b.id === "watched" ? 1 : (a.name || "").localeCompare(b.name || ""))));
    });
  }, [user]);

  const createList = async (event) => {
    event.preventDefault();
    const listName = name.trim();
    if (!listName || !user) return;
    setCreating(true);
    const id = `list-${crypto.randomUUID()}`;
    await setDoc(doc(db, "users", user.uid, "lists", id), { id, name: listName, type: "custom", visibility: "public", showOnHome: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(), schemaVersion: 1 });
    setName("");
    setCreating(false);
  };

  const saveList = async (list) => {
    if (!editingName.trim()) return;
    await updateDoc(doc(db, "users", user.uid, "lists", list.id), { name: editingName.trim(), updatedAt: serverTimestamp() });
    setEditingId(null);
  };

  const changeVisibility = (list, visibility) => updateDoc(doc(db, "users", user.uid, "lists", list.id), { visibility, updatedAt: serverTimestamp() });

  if (authLoading || !user) return <div className="min-h-dvh bg-void" />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-8">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div><p className="font-mono text-xs uppercase tracking-[0.15em] text-gold">{t("lists.eyebrow")}</p><h1 className="mt-1 text-3xl font-black text-ivory">{t("lists.title")}</h1></div>
      </div>
      <form onSubmit={createList} className="mb-6 flex gap-2 rounded-2xl border border-white/10 bg-surface1 p-3">
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder={t("lists.namePlaceholder")} className="min-w-0 flex-1 bg-transparent px-2 text-sm text-ivory outline-none placeholder:text-muted" />
        <button type="submit" disabled={creating || !name.trim()} className="flex min-h-11 items-center gap-2 rounded-xl bg-gold px-4 text-sm font-bold text-gold-ink disabled:opacity-50"><Plus size={17} />{t("lists.create")}</button>
      </form>
      <div className="grid gap-3 sm:grid-cols-2">
        {lists.map((list) => (
          <article key={list.id} className="rounded-2xl border border-white/10 bg-surface1 p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {editingId === list.id ? <input autoFocus value={editingName} onChange={(event) => setEditingName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && saveList(list)} className="w-full rounded-lg border border-gold/50 bg-surface2 px-2 py-1 text-sm text-ivory outline-none" /> : <h2 className="truncate font-display text-xl font-extrabold text-ivory">{list.name}</h2>}
                <p className="mt-1 text-xs text-muted">{list.id === "watched" ? t("lists.watchedHelp") : list.id === "wishlist" ? t("lists.wishlistHelp") : t("lists.customHelp")}</p>
              </div>
              {list.type === "custom" && (editingId === list.id ? <button type="button" onClick={() => saveList(list)} className="grid min-h-10 min-w-10 place-items-center rounded-xl text-gold hover:bg-gold/10" aria-label={t("lists.save")}><Check size={17} /></button> : <button type="button" onClick={() => { setEditingId(list.id); setEditingName(list.name); }} className="grid min-h-10 min-w-10 place-items-center rounded-xl text-muted hover:bg-ivory/5 hover:text-ivory" aria-label={t("lists.rename")}><Pencil size={16} /></button>)}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/8 pt-3">
              <span className="flex items-center gap-1.5 text-xs text-muted">{list.visibility === "private" ? <Lock size={13} /> : <Globe2 size={13} />}{list.visibility === "private" ? t("lists.private") : t("lists.public")}</span>
              <div className="flex items-center gap-2">
                <Link href={`/lists/${list.id}`} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-gold no-underline hover:bg-gold/10">
                  {t("common.details")} <ArrowRight size={13} />
                </Link>
                {list.type === "custom" && <select value={list.visibility || "public"} onChange={(event) => changeVisibility(list, event.target.value)} className="rounded-lg border border-white/10 bg-surface2 px-2 py-1.5 text-xs text-ivory"><option value="public">{t("lists.public")}</option><option value="private">{t("lists.private")}</option></select>}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
