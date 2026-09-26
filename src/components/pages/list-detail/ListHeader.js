"use client";

import dayjs from "dayjs";
import { ArrowLeft, Globe2, Lock, Pencil, Share2 } from "lucide-react";
import Link from "next/link";
import Badge from "@/components/ui/Badge";
import { getLanguageConfig } from "@/lib/i18n";

function listTitle(list, t) {
  if (list.id === "wishlist") return t("home.wishlist");
  if (list.id === "watched") return t("home.watched");
  return list.name;
}

function createdDate(value, language) {
  if (!value) return null;
  const date = typeof value?.toDate === "function" ? value.toDate() : value;
  return dayjs(date).locale(getLanguageConfig(language).dayjs).format("D MMM YYYY");
}

export default function ListHeader({ list, count, language, t, onEdit }) {
  const isPrivate = list.visibility === "private";
  const title = listTitle(list, t);
  const date = createdDate(list.createdAt, language);
  const VisibilityIcon = isPrivate ? Lock : Globe2;

  const handleShare = async () => {
    const shareData = { title, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error?.name !== "AbortError") console.error("Share list error:", error);
      }
      return;
    }
    await navigator.clipboard?.writeText(window.location.href);
  };

  return (
    <header className="mb-8 border-b border-border pb-6">
      <Link href="/lists" className="mb-8 inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <ArrowLeft size={16} aria-hidden="true" />
        {t("common.back")}
      </Link>
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="mb-2 text-sm font-medium text-accent">{t("lists.title")}</p>
          <h1 className="truncate font-syne text-2xl font-bold text-text md:text-3xl">{title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
            <span>{count} {t("common.film")}</span>
            <span className="inline-flex items-center gap-1.5"><VisibilityIcon size={14} aria-hidden="true" />{isPrivate ? t("lists.private") : t("lists.public")}</span>
            {date && <span>{date}</span>}
            <Badge tone={isPrivate ? "muted" : "accent"}>{isPrivate ? t("lists.private") : t("lists.public")}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-md)] border border-border px-3 text-sm font-medium text-muted transition-colors hover:border-accent hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Pencil size={16} aria-hidden="true" />{t("lists.rename")}</button>
          <button type="button" onClick={handleShare} aria-label={t("profile.share")} className="flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-md)] border border-border text-muted transition-colors hover:border-accent hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"><Share2 size={17} aria-hidden="true" /></button>
        </div>
      </div>
    </header>
  );
}
