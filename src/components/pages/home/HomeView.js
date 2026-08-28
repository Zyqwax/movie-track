import HomeHero from "./HomeHero";
import HomeLibrarySection from "./HomeLibrarySection";

export default function HomeView({
  hero,
  wishlist,
  watched,
  activeTab,
  listed,
  options,
  sortKey,
  sortOpen,
  sortRef,
  dayjsLocale,
  onShuffle,
  onTabChange,
  onSortToggle,
  onSortChange,
}) {
  return (
    <div className="px-6 pb-10 pt-7 max-lg:px-6 max-lg:pt-6 max-md:px-4 max-md:pb-24 max-md:pt-5">
      <HomeHero
        hero={hero}
        wishlist={wishlist}
        watched={watched}
        onShuffle={onShuffle}
      />
      <HomeLibrarySection
        activeTab={activeTab}
        wishlist={wishlist}
        watched={watched}
        listed={listed}
        options={options}
        sortKey={sortKey}
        sortOpen={sortOpen}
        sortRef={sortRef}
        dayjsLocale={dayjsLocale}
        onTabChange={onTabChange}
        onSortToggle={onSortToggle}
        onSortChange={onSortChange}
      />
    </div>
  );
}
