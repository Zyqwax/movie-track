# Movie Track — Tam Site Yeniden Tasarım Prompt Dökümanı

Bu döküman, Movie Track projesinin tüm sayfalarını sıfırdan redesign etmek için agent'a verilecek adım adım talimatlardır.  
Her adım ayrı bir agent oturumunda verilebilir ya da sırayla tek bir oturumda işlenebilir.

---

## BÖLÜM 0 — DEĞİŞMEZ KURALLAR (tüm adımlarda geçerli)

Bu kurallar hiçbir adımda ihlal edilemez. Agent her adımın sonunda bu listeye dönüp kontrol etmelidir.

### 0.1 Teknoloji kısıtları

- **Framework:** Next.js App Router, client component'lar (`"use client"`)
- **Stil:** Yalnızca **Tailwind CSS 4.x** — harici UI kütüphanesi (shadcn, MUI, Chakra vb.) yasaktır
- **İkonlar:** Yalnızca `lucide-react` — başka ikon paketi eklenmez
- **Animasyon:** Yalnızca Tailwind `transition-*` ve `animate-*` sınıfları; GSAP/Framer Motion eklenmez
- **Font:** Google Fonts üzerinden yüklenir; `next/font/google` ile import edilir; font dosyası bundle'a katılmaz
- **Görsel:** `next/image` kullanılır; `<img>` etiketi yasaktır
- **Tip:** Proje JavaScript'tir; TypeScript interface veya type eklenmez
- **Yeni bağımlılık:** Hiçbir `npm install` / `pnpm add` komutu verilmez; mevcut paketler yeterlidir

### 0.2 Mevcut mantık dokunulmazlığı

- Firebase, Firestore, TMDB çağrıları, auth akışı ve tüm context hook'ları (`useAuth`, `useAppData`) değiştirilemez
- Firestore path'leri (`users/{uid}/lists/...`, `watchLog/{movieId}` vb.) değiştirilemez
- `src/lib/` ve `src/context/` altındaki dosyalar **yalnızca okunabilir** — yazılamaz
- Route dosyaları (`page.js`) içindeki state/data mantığı korunur; yalnızca JSX return bloğu yeniden yazılabilir
- `src/app/layout.js` içindeki provider sırası korunur; yalnızca global font ve CSS değişkenleri eklenebilir

### 0.3 Komponent mimarisi

- Her sayfa için presentation bileşenleri `src/components/pages/<sayfa-adı>/` altına yazılır
- `src/components/ui/` altında paylaşılan atomik bileşenler oluşturulur (Button, Badge, Card, Modal, Skeleton vb.)
- `page.js` dosyaları sadece veri ve state taşır; JSX mümkün olan en az satırda olur
- Bileşen dosyaları 300 satırı geçmemelidir; geçiyorsa alt bileşenlere bölünür

### 0.4 Mobil öncelik

- Her bileşen **önce mobile** yazılır, sonra `md:` ve `lg:` breakpoint'leriyle genişletilir
- Dokunma hedefleri minimum **44×44 px** olmalıdır
- Yatay kaydırma (overflow-x) ana layout'ta kesinlikle oluşmamalıdır
- `BottomNav` mobilde her zaman görünür kalmalı; desktop'ta sidebar açılabilir

### 0.5 Tasarım sistemi — değişmez token'lar

Aşağıdaki CSS değişkenleri `src/app/globals.css` içinde tanımlanır ve tüm tasarım bunları kullanır.  
Hex değerler ve değişken isimleri sabittir; agent değiştiremez.

```css
:root {
  /* Zemin */
  --color-bg: #0a0a0f; /* Ana arka plan — derin lacivert-siyah */
  --color-surface: #12121a; /* Kart, panel yüzeyi */
  --color-surface-2: #1c1c28; /* Hover ve ikincil yüzey */
  --color-border: #ffffff12; /* Çok saydam beyaz çizgiler */

  /* Metin */
  --color-text: #f0f0f5; /* Ana metin */
  --color-text-muted: #8888a0; /* İkincil / metadata metin */
  --color-text-faint: #44445a; /* Placeholder, devre dışı */

  /* Vurgu */
  --color-accent: #6c63ff; /* Primary CTA — mor-ultraviyole */
  --color-accent-glow: #6c63ff33; /* Accent'in glow/shadow hali */
  --color-accent-alt: #ff6584; /* İkincil vurgu — pembe; rating, favori */

  /* Özel */
  --color-success: #34d399;
  --color-warning: #fbbf24;
  --color-danger: #f87171;

  /* Boyutlar */
  --radius-sm: 6px;
  --radius-md: 12px;
  --radius-lg: 20px;
  --radius-full: 9999px;
}
```

### 0.6 Tipografi

- **Display / Heading:** `Syne` (Google Fonts) — `700`, `800`
- **Body / UI:** `Inter` (Google Fonts) — `400`, `500`, `600`
- Başlıklar `font-syne`, gövde metni `font-inter` Tailwind sınıfıyla uygulanır
- Tailwind config'e bu iki font ailesi eklenir

### 0.7 Yasak tasarım kalıpları

Bunların hiçbiri kullanılmaz:

- Tüm büyük harf (ALL CAPS) etiketler
- Orta nokta ile ayrılmış meta string'ler (`A · B · C`)
- `→` veya `↗` ok ikonları link sonlarında
- `01 / 02 / 03` numaralı section başlıkları (içerik gerçek bir sıra değilse)
- Her kart ve her bölümde aynı border-radius + soft-shadow kombinasyonu
- Terracotta / krem / warm-cream arka planlar
- Her section'da fade-and-slide-up entrance animasyonu

### 0.8 Erişilebilirlik minimumları

- Tüm interaktif elementlerin `aria-label` veya görünür metin etiketi olmalı
- Focus halkası (`focus-visible:ring-2`) her buton ve linkte aktif olmalı
- `prefers-reduced-motion` media query; animasyonlar buna saygı göstermeli
- Renk kontrastı WCAG AA (4.5:1) minimum

---

## BÖLÜM 1 — ADIM 1: Global Tasarım Sistemi & Shell

**Hedef dosyalar:**

- `src/app/globals.css`
- `tailwind.config.js`
- `src/app/layout.js` (yalnızca font import ve body sınıfı)
- `src/components/ui/` (Button, Badge, Skeleton, Modal, Avatar)
- `src/components/BottomNav.js`

### Ne yapılacak

**1a. globals.css**  
Bölüm 0.5'teki CSS değişkenlerini ekle. Tailwind base stillerini koru. Body'e `bg-[--color-bg] text-[--color-text] font-inter antialiased` uygula.

**1b. tailwind.config.js**  
`fontFamily` extend bloğuna şunu ekle:

```js
syne: ['Syne', 'sans-serif'],
inter: ['Inter', 'sans-serif'],
```

`colors` extend bloğuna CSS değişkenlerini referans eden Tailwind renk token'ları ekle:

```js
bg:         'var(--color-bg)',
surface:    'var(--color-surface)',
'surface-2':'var(--color-surface-2)',
border:     'var(--color-border)',
accent:     'var(--color-accent)',
'accent-alt':'var(--color-accent-alt)',
muted:      'var(--color-text-muted)',
```

**1c. layout.js**  
`next/font/google`'dan `Inter` ve `Syne`'yi import et. `<html>` etiketine font CSS değişkenlerini `className` ile ver.

**1d. Atomik bileşenler — `src/components/ui/`**

| Bileşen       | Davranış                                                                             |
| ------------- | ------------------------------------------------------------------------------------ |
| `Button.js`   | variant: `primary`, `ghost`, `danger`; size: `sm`, `md`, `lg`; loading spinner state |
| `Badge.js`    | Küçük pill; renk: `accent`, `muted`, `success`, `warning`, `danger`                  |
| `Skeleton.js` | `animate-pulse` ile gri blok; width/height prop'u                                    |
| `Avatar.js`   | `next/image` ile dairesel; fallback baş harf                                         |
| `Modal.js`    | Overlay + içerik paneli; Escape ile kapat; `prefers-reduced-motion`                  |

**1e. BottomNav yeniden tasarımı**

- Mobil: ekranın altında `backdrop-blur-md bg-surface/80` cam efektli bar
- 5 ikon + etiket (Ana Sayfa, Keşfet, Listeler, Mesajlar, Profil)
- Aktif sekme: ikon ve etiket `text-accent`; altında 2px `bg-accent` çizgi
- Dokunma hedefi her sekme için min 48px yükseklik
- Desktop (`lg:`): gizlenir; yerine sidebar kullanılır (mevcut NavigationProvider davranışı korunur)
- Safe area padding: `pb-[env(safe-area-inset-bottom)]`

**Kontrol:** Bu adım tamamlandığında tüm sayfalar kırılmadan açılmalı (stil değişir, mantık değişmez).

---

## BÖLÜM 2 — ADIM 2: Ana Sayfa (/)

**Hedef:** Netflix/Mubi benzeri dark streaming platformu hissi.  
**Hedef dosyalar:**

- `src/app/page.js` (yalnızca JSX return bölümü)
- `src/components/pages/home/HeroBanner.js`
- `src/components/pages/home/MovieRow.js`
- `src/components/pages/home/MovieCard.js`
- `src/components/pages/home/SectionHeader.js`

### Sayfa düzeni (mobil → desktop)

```
┌─────────────────────────────┐
│  HeroBanner                 │  ← tam ekran backdrop, gradient overlay
│  (seçili film / son eklenen)│
├─────────────────────────────┤
│  SectionHeader "İzlenecekler"│
│  ← yatay kaydırmalı MovieRow→│
├─────────────────────────────┤
│  SectionHeader "İzlediklerim"│
│  ← yatay kaydırmalı MovieRow→│
├─────────────────────────────┤
│  [Özel listeler varsa]      │
│  SectionHeader + MovieRow   │
├─────────────────────────────┤
│  BottomNav                  │
└─────────────────────────────┘
```

### HeroBanner

- Wishlist'teki son eklenen filmin backdrop görselini `next/image` ile tam genişlikte göster
- Üzerine aşağıdan yukarıya `linear-gradient(to top, var(--color-bg) 0%, transparent 60%)` overlay
- Sol alt köşede: film adı (`text-3xl font-syne font-bold`), yıl + tür badge'leri, 2 buton: **"Detay"** ve **"Listeye Eklendi"** (mevcut wishlist durumuna göre)
- Sağ alt köşede: film puanı varsa yıldız ikonuyla göster
- Mobilde yükseklik `60vh`; desktop `75vh`
- Hero filmi olmadığında (liste boşsa) boş state: davetkar metin + "Film Keşfet" butonu

### MovieRow

- `overflow-x-auto scrollbar-hide` ile yatay kaydırmalı şerit
- Her `MovieCard` için `snap-start` scroll snap davranışı
- Mobil: kartlar `w-32` (128px); Desktop: `w-40` (160px)
- `-mx-4 px-4` ile kenar kanaması; ilk kart sol kenara hizalı

### MovieCard

- Dikey poster; `aspect-[2/3]`; `rounded-[--radius-md]`
- Üzerine hover'da `bg-surface-2/80 backdrop-blur-sm` overlay; film adı ve iki ikon (kalp/silme) belirir
- `isWatched` ise sol üst köşede küçük `✓` badge (`bg-success`)
- `rating` varsa sağ alt köşede `★ {puan}` pill (`bg-black/60`)
- Tıklandığında `/movie/{id}` yönlendirmesi
- Skeleton hali: aynı boyut + `animate-pulse bg-surface-2`

### SectionHeader

- Sol: section adı `text-lg font-syne font-semibold`; film sayısı muted badge
- Sağ: "Tümünü Gör" `text-sm text-accent` link
- Alt çizgi yok; basit flex row

---

## BÖLÜM 3 — ADIM 3: Film Detay Sayfası (/movie/[id])

**Hedef:** Letterboxd'un film sayfasına yakın; sinematik, editorial his.  
**Hedef dosyalar:**

- `src/app/movie/[id]/page.js` (yalnızca JSX return)
- `src/components/pages/movie/MovieHero.js`
- `src/components/pages/movie/MovieActions.js`
- `src/components/pages/movie/MovieMeta.js`
- `src/components/pages/movie/CastRow.js`
- `src/components/pages/movie/TrailerButton.js`
- `src/components/pages/movie/ProviderList.js`
- `src/components/pages/movie/RatingReview.js`
- `src/components/pages/movie/WatchHistory.js`

### Sayfa düzeni

```
┌─────────────────────────────┐
│  Backdrop (blurred, fixed)  │  ← sayfa boyunca arka planda
├────────┬────────────────────┤
│ Poster │ Başlık             │  ← sol: poster; sağ: meta
│  (3/4) │ Yıl · Süre · Tür  │
│        │ Ozet (clamp 3 satır│
│        │ "daha fazla" link) │
│        │ ★★★★☆ Ortalama puan│
├────────┴────────────────────┤
│  MovieActions (buton grubu) │
├─────────────────────────────┤
│  Sağlayıcılar               │
├─────────────────────────────┤
│  Oyuncu Şeridi              │
├─────────────────────────────┤
│  Trailer butonu             │
├─────────────────────────────┤
│  Kişisel Puan & Yorum       │
├─────────────────────────────┤
│  İzleme Geçmişi             │
└─────────────────────────────┘
```

### MovieHero

- `backdropPath` görselini `next/image fill` ile tüm container'a uygula
- `blur-[2px] opacity-30 scale-110` — silik, karanlık sinema arka planı efekti
- Bu blur overlay, sticky olarak scroll boyunca arkada kalır (`fixed inset-0 -z-10`)
- Poster: `w-28 md:w-40`; `rounded-[--radius-md]`; `shadow-2xl`; yoksa placeholder gradient

### MovieActions

Butonlar yatay sıralanır; mobilde 2 kolona düşer:

| Buton                     | Durum             | Renk                |
| ------------------------- | ----------------- | ------------------- |
| ✓ İzledim / + İzleyeceğim | toggle            | `primary` / `ghost` |
| ★ Puan Ver                | tıklanabilir      | `ghost`             |
| ♡ Listeye Ekle            | dropdown tetikler | `ghost`             |
| ↗ Arkadaşa Öner           | modal açar        | `ghost`             |

- Butonlar `gap-2 flex-wrap`
- Aktif durum (izlendi / wishlist'te) dolu, pasif durum outline stil

### RatingReview

- 10 yıldız (veya 5 çift yıldız) tıklanabilir puan seçici
- Yıldızlar hover'da soldan sağa dolduruluyor (`text-accent-alt`)
- Yorum için `<textarea>` — `bg-surface border border-[--color-border] rounded-[--radius-md] p-3`
- Kaydet butonu

### ProviderList

- Sağlayıcı logoları `next/image` ile küçük yuvarlak kutucuklarda
- Gruplar: Flatrate (abone), Rent, Buy — her grup ayrı satır
- Sağlayıcı yoksa "Bu bölgede mevcut değil" muted metin

### CastRow

- 5 oyuncu; yatay kaydırmalı
- Her oyuncu: profil fotoğrafı (`next/image`, `rounded-full`) + isim + karakter

---

## BÖLÜM 4 — ADIM 4: Arama Sayfası (/search)

**Hedef:** JustWatch benzeri — arama + grid keşif.  
**Hedef dosyalar:**

- `src/app/search/page.js` (yalnızca JSX return)
- `src/components/pages/search/SearchBar.js`
- `src/components/pages/search/TrendGrid.js`
- `src/components/pages/search/SearchResultGrid.js`

### SearchBar

- Sayfanın üstünde büyük, odaklanmış arama çubuğu
- `bg-surface border border-[--color-border]`; `rounded-[--radius-full]`; lupa ikonu solda
- Aktifken `border-accent shadow-[0_0_0_3px_var(--color-accent-glow)]` — glow efekti
- 800ms debounce (mevcut mantık korunur)
- Temizle (×) butonu; metin varken görünür

### TrendGrid (arama yokken)

- "Günün Trendleri" başlığı
- 2 kolonlu grid (mobil); 4-5 kolon (desktop)
- `MovieCard` bileşeni kullanılır (Adım 2'den)

### SearchResultGrid (arama varken)

- Anında grid'e geçiş; skeleton önce gösterilir
- Her kart: poster + başlık + yıl + "Ekle" ikonu
- Sonuç yoksa empty state illüstrasyonu (SVG) + öneri metni

---

## BÖLÜM 5 — ADIM 5: Listeler Sayfası (/lists)

**Hedef:** Temiz, organize liste yönetimi; Letterboxd'un liste sayfasına yakın.  
**Hedef dosyalar:**

- `src/app/lists/page.js` (yalnızca JSX return)
- `src/components/pages/lists/ListCard.js`
- `src/components/pages/lists/NewListButton.js`
- `src/components/pages/lists/ListGrid.js`

### ListGrid

- İki varsayılan liste (İzlenecekler, İzlediklerim) sayfanın üstünde öne çıkar — tam genişlik banner kartı
- Özel listeler altta 2 kolon grid (mobil 1, desktop 3)
- "Yeni Liste Oluştur" kartı — kesik kenarlı, ikon + metin; grid'in son sırası

### ListCard (varsayılan)

- Tam genişlik; `bg-surface-2`; sol tarafta küçük poster collage (max 4 film)
- Sağda: liste adı, film sayısı badge, görünürlük ikonu (🔒 private / 🌍 public)
- Hover'da hafif `scale-[1.01]` transition

### ListCard (custom)

- `aspect-[4/3]` veya sabit yükseklik
- Arka plan: ilk filmin poster'ından otomatik blur gradient
- Üstte liste adı + film sayısı
- Sağ alt: 3 nokta menüsü (yeniden adlandır, görünürlük değiştir, sil)

### NewListButton

- Modal açar: isim gir, public/private seç, oluştur
- Modal `src/components/ui/Modal.js` kullanır

---

## BÖLÜM 6 — ADIM 6: Liste Detay Sayfası (/lists/[id])

**Hedef dosyalar:**

- `src/app/lists/[id]/page.js` (yalnızca JSX return)
- `src/components/pages/list-detail/ListHeader.js`
- `src/components/pages/list-detail/ListMovieGrid.js`

### ListHeader

- Liste adı (`font-syne font-bold text-2xl`)
- Meta: film sayısı, görünürlük badge, oluşturulma tarihi
- "Düzenle" ve paylaş ikonları sağda

### ListMovieGrid

- 3 kolon (mobil 2, desktop 4-5) poster grid
- Her kart üzerine hover'da film adı + kaldır butonu overlay
- Liste boşsa empty state: "Henüz film eklenmemiş" + "Film Keşfet" CTA

---

## BÖLÜM 7 — ADIM 7: Profil Sayfası (/profile)

**Hedef dosyalar:**

- `src/app/profile/page.js` (yalnızca JSX return)
- `src/components/pages/profile/ProfileHeader.js`
- `src/components/pages/profile/StatsRow.js`
- `src/components/pages/profile/RecentlyWatched.js`
- `src/components/pages/profile/PreferencesSection.js`

### ProfileHeader

- Geniş banner alanı: solda büyük avatar (`Avatar` bileşeni), sağda ad + e-posta
- Arka plan: son izlenen filmlerin posterlarından oluşturulan blur mozaik (CSS grid + blur)
- "Profili Paylaş" ve "Çıkış Yap" butonları

### StatsRow

- 3 metrik yan yana: İzlenen Film, İzlenecek Film, Ortalama Puan
- Her metrik: büyük sayı (`font-syne text-4xl font-bold text-accent`) + küçük etiket
- Mobilde 3 kolon; yatay çizgiyle ayrılmış

### RecentlyWatched

- Son 10 film; yatay kaydırmalı `MovieRow` (Adım 2'den)

### PreferencesSection

- Dil ve bölge dropdown seçicileri
- `bg-surface` paneli içinde; mevcut `handleLanguageChange` / `handleRegionChange` mantığı bağlanır

---

## BÖLÜM 8 — ADIM 8: Public Profil Sayfası (/u/[id])

**Hedef dosyalar:**

- `src/app/u/[id]/page.js` (yalnızca JSX return)
- `src/components/pages/public-profile/PublicProfileHeader.js`
- `src/components/pages/public-profile/PublicStats.js`
- `src/components/pages/public-profile/PublicListGrid.js`
- `src/components/pages/public-profile/FriendshipButton.js`

### Farklar /profile'dan

- Düzenleme yok; salt okunur görünüm
- `FriendshipButton`: "Arkadaş Ekle" / "Arkadaşsın" / "Mesaj Gönder" durumları
- Yalnızca public listeler gösterilir
- Kendi profilini açarsa `/profile`'a yönlendirme (mevcut mantık)

---

## BÖLÜM 9 — ADIM 9: Login Sayfası (/login)

**Hedef dosyalar:**

- `src/app/login/page.js` (yalnızca JSX return)

### Tasarım

- Tam ekran; sol taraf (desktop) büyük bir backdrop görseli veya animasyonlu gradient (`from-accent/20 via-bg to-bg`)
- Sağ taraf (mobilde tam ekran): logo, slogan, "Google ile Giriş Yap" butonu
- Buton: `bg-white text-black font-semibold` — Google'ın beyaz butonu; `rounded-[--radius-md]`; Google ikonu solda
- Alt kısımda küçük muted metin: gizlilik / kullanım koşulları

---

## BÖLÜM 10 — ADIM 10: Son Cilalama & Tutarlılık Geçişi

Bu adımda kod yazılmaz; yalnızca aşağıdaki kontroller yapılır ve gerekirse düzeltme yapılır.

### Kontrol listesi

- [ ] Tüm sayfalarda `--color-bg`, `--color-surface`, `--color-accent` tutarlı kullanılıyor mu?
- [ ] `font-syne` yalnızca başlıklarda, `font-inter` gövde ve UI'da kullanılıyor mu?
- [ ] Tüm `next/image` bileşenlerinde `alt` metni var mı?
- [ ] Tüm butonlarda `aria-label` veya görünür metin var mı?
- [ ] `Skeleton` bileşeni her async yükleme durumunda kullanılıyor mu?
- [ ] Bölüm 0.7'deki yasak tasarım kalıplarından hiçbiri kalmadı mı?
- [ ] Mobil BottomNav tüm sayfalarda doğru görünüyor mu? `pb-safe` var mı?
- [ ] `prefers-reduced-motion` media query'si animasyonlu kısımlarda var mı?
- [ ] Boş durum (empty state) her liste/grid için tasarlanmış mı?
- [ ] `focus-visible:ring-2 ring-accent` tüm interaktif elementlerde var mı?

---

## EK A — Referans Platformlar ve Alınan İlhamlar

| Platform       | Alınan özellik                                                                |
| -------------- | ----------------------------------------------------------------------------- |
| **Netflix**    | HeroBanner tam ekran backdrop; yatay MovieRow şeritleri; karanlık zemin       |
| **Letterboxd** | Film detay sayfası editorial düzen; poster + meta yan yana; rating yıldızları |
| **Mubi**       | Minimal, sinematik his; az eleman, çok boşluk; tipografi öne çıkıyor          |
| **JustWatch**  | Arama + grid keşif; sağlayıcı logoları; filtre yapısı                         |

Kopyalama yoktur. Bu platformların **his ve yapısı** referans alınır; tasarım token'ları ve içerik Movie Track'e özgüdür.

---

## EK B — Örnek Tailwind Sınıf Kalıpları

Agent bu kalıpları tutarlılık için kullanır:

```jsx
// Kart yüzeyi
className="bg-surface rounded-[--radius-md] border border-[--color-border]"

// Primary buton
className="bg-accent text-white font-inter font-semibold px-4 py-2 rounded-[--radius-md]
           hover:bg-accent/90 transition-colors focus-visible:ring-2 focus-visible:ring-accent"

// Ghost buton
className="border border-[--color-border] text-text font-inter font-medium px-4 py-2
           rounded-[--radius-md] hover:bg-surface-2 transition-colors"

// Muted metin
className="text-muted text-sm font-inter"

// Accent glow efekti (input focus vb.)
className="focus:outline-none focus:ring-2 focus:ring-accent focus:shadow-[0_0_0_4px_var(--color-accent-glow)]"

// Backdrop blur kart
className="bg-surface/80 backdrop-blur-md border border-[--color-border]"

// Film poster aspect ratio
className="aspect-[2/3] w-full object-cover rounded-[--radius-md]"
```

---

_Bu döküman Movie Track redesign sürecinin tek kaynağıdır. Çelişen talimatlar karşısında bu döküman geçerlidir._
