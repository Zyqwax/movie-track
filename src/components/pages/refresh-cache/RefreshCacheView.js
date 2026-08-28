// ── Refresh cache presentation ──────────────────────────────────────────────
export default function RefreshCacheView({ status, logs, loading, onRefresh, t }) {
  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-white font-mono">
      <h1 className="text-2xl mb-4 text-rose-500 font-bold">{t("refreshCache.title")}</h1>

      <button
        onClick={onRefresh}
        disabled={loading}
        className="px-6 py-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 disabled:opacity-50 mb-6"
      >
        {loading ? t("refreshCache.processing") : t("refreshCache.refresh")}
      </button>

      <div className="mb-4">
        <span className="text-zinc-500">Durum: </span>
        <span className="font-bold text-amber-400">{status}</span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg h-[400px] overflow-y-auto">
        {logs.map((log, index) => (
          <div key={index} className="text-sm text-zinc-300 mb-1 border-b border-zinc-800/50 pb-1">{log}</div>
        ))}
        {logs.length === 0 && <div className="text-zinc-600">{t("refreshCache.waiting")}</div>}
      </div>
    </div>
  );
}
