export const DEFAULT_LANGUAGE = "tr";
export const DEFAULT_REGION = "TR";

export const LANGUAGES = [
  { code: "tr", label: "Türkçe", tmdb: "tr-TR", dayjs: "tr" },
  { code: "en", label: "English", tmdb: "en-US", dayjs: "en" },
];

export const REGIONS = [
  { code: "TR", label: "Türkiye" },
  { code: "US", label: "United States" },
  { code: "GB", label: "United Kingdom" },
  { code: "DE", label: "Deutschland" },
];

const messages = {
  tr: {
    nav: { home: "Ana Sayfa", discover: "Keşfet", messages: "Mesajlar", profile: "Profil", search: "Film ara..." },
    common: { loading: "Yükleniyor...", cancel: "İptal", save: "Kaydet", saved: "Kaydedildi", saving: "Kaydediliyor...", error: "Bir hata oluştu." },
    settings: {
      title: "Ayarlar", language: "Dil", region: "Bölge", languageHelp: "Arayüz ve film bilgileri için dil.",
      regionHelp: "TMDB sonuçları ve izleme platformları bu bölgeye göre gösterilir.",
      saved: "Tercihler kaydedildi.", error: "Tercihler kaydedilemedi.",
    },
    profile: { watched: "İzlendi", wishlist: "Listede", average: "Ort. Puan", friends: "Arkadaşlarım", addFriend: "+ Arkadaş Ekle", recentlyWatched: "Son İzlenenler", all: "Tümü", share: "Paylaş", logout: "Çıkış" },
    search: { title: "Film Keşfet", placeholder: "Film ara...", trending: "Günün Trendleri", results: "sonuç", noResults: "Sonuç bulunamadı", tryDifferent: "Farklı bir arama deneyin" },
    movie: { watchWhere: "Nereden izlenir?", subscription: "Abonelik", free: "Ücretsiz", ads: "Reklamlı", rent: "Kiralama", buy: "Satın alma", noProviders: "Bu bölgede yayın bilgisi bulunamadı.", providersError: "İzleme seçenekleri şu anda yüklenemiyor.", justWatch: "İzleme seçenekleri JustWatch üzerinden sağlanır.", overview: "Özet", cast: "Oyuncular", trailer: "Fragman" },
  },
  en: {
    nav: { home: "Home", discover: "Discover", messages: "Messages", profile: "Profile", search: "Search films..." },
    common: { loading: "Loading...", cancel: "Cancel", save: "Save", saved: "Saved", saving: "Saving...", error: "Something went wrong." },
    settings: {
      title: "Settings", language: "Language", region: "Region", languageHelp: "Language for the interface and movie details.",
      regionHelp: "TMDB results and streaming platforms are shown for this region.",
      saved: "Preferences saved.", error: "Could not save preferences.",
    },
    profile: { watched: "Watched", wishlist: "Watchlist", average: "Avg. rating", friends: "My friends", addFriend: "+ Add friend", recentlyWatched: "Recently watched", all: "All", share: "Share", logout: "Log out" },
    search: { title: "Discover films", placeholder: "Search films...", trending: "Trending today", results: "results", noResults: "No results found", tryDifferent: "Try a different search" },
    movie: { watchWhere: "Where to watch", subscription: "Subscription", free: "Free", ads: "With ads", rent: "Rent", buy: "Buy", noProviders: "No streaming information is available in this region.", providersError: "Watch options are unavailable right now.", justWatch: "Watch options provided through JustWatch.", overview: "Overview", cast: "Cast", trailer: "Trailer" },
  },
};

export function normalizeLanguage(value) {
  return LANGUAGES.some((language) => language.code === value) ? value : DEFAULT_LANGUAGE;
}

export function normalizeRegion(value) {
  return REGIONS.some((region) => region.code === value) ? value : DEFAULT_REGION;
}

export function getLanguageConfig(language) {
  return LANGUAGES.find((item) => item.code === normalizeLanguage(language)) || LANGUAGES[0];
}

export function getRegionLabel(region, language = DEFAULT_LANGUAGE) {
  const normalized = normalizeRegion(region);
  if (language === "tr" && normalized === "US") return "Amerika Birleşik Devletleri";
  if (language === "tr" && normalized === "GB") return "Birleşik Krallık";
  if (language === "tr" && normalized === "DE") return "Almanya";
  return REGIONS.find((item) => item.code === normalized)?.label || REGIONS[0].label;
}

export function translate(language, key, values = {}) {
  const normalized = normalizeLanguage(language);
  const value = key.split(".").reduce((result, part) => result?.[part], messages[normalized])
    ?? key.split(".").reduce((result, part) => result?.[part], messages[DEFAULT_LANGUAGE])
    ?? key;
  return typeof value === "string"
    ? value.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? `{${name}}`)
    : value;
}
