"use client";

import Link from "next/link";
import { Film, ArrowLeft } from "lucide-react";

export default function ComingSoon() {
  return (
    <section className="coming-soon" aria-labelledby="coming-soon-title">
      <div className="coming-ticket">
        <span className="coming-stamp">SOON</span>
        <Film size={30} aria-hidden="true" />
      </div>
      <p className="archive-kicker">PERDE ARKASI</p>
      <h1 id="coming-soon-title">Mesajlar yakında</h1>
      <p>Mesajlaşma alanını daha iyi bir deneyim için hazırlıyoruz. Çok yakında burada buluşacağız.</p>
      <Link href="/" className="btn btn-gold"><ArrowLeft size={16} /> Ana sayfaya dön</Link>
    </section>
  );
}
