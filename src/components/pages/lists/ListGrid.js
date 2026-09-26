import ListCard from "@/components/pages/lists/ListCard";

export default function ListGrid({ lists, t, editingId, editingName, onEditStart, onEditingNameChange, onSave, onVisibilityChange, newListButton }) {
  const defaults = lists.filter((list) => list.id === "wishlist" || list.id === "watched");
  const customLists = lists.filter((list) => list.type === "custom");

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-labelledby="default-lists-heading">
        <h2 id="default-lists-heading" className="font-syne text-lg font-semibold text-text">{t("lists.title")}</h2>
        <div className="space-y-3">
          {defaults.map((list) => <ListCard key={list.id} list={list} movies={list.movies || list.previewMovies || []} t={t} editingId={editingId} editingName={editingName} onEditStart={onEditStart} onEditingNameChange={onEditingNameChange} onSave={onSave} onVisibilityChange={onVisibilityChange} />)}
        </div>
      </section>

      {customLists.length > 0 && <section className="space-y-3" aria-labelledby="custom-lists-heading"><h2 id="custom-lists-heading" className="font-syne text-lg font-semibold text-text">{t("lists.customHelp")}</h2><div className="grid grid-cols-1 gap-3 md:grid-cols-3">{customLists.map((list) => <ListCard key={list.id} list={list} movies={list.movies || list.previewMovies || []} t={t} editingId={editingId} editingName={editingName} onEditStart={onEditStart} onEditingNameChange={onEditingNameChange} onSave={onSave} onVisibilityChange={onVisibilityChange} />)}{newListButton}</div></section>}
      {customLists.length === 0 && <section className="grid grid-cols-1 md:grid-cols-3">{newListButton}</section>}
    </div>
  );
}
