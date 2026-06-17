import type { AppRuntimeCtx } from "@tokimo/sdk";
import { FolderOpen } from "lucide-react";
import { useState } from "react";
import { api, type AnalyzeResponse, type AnalysisType } from "../api/client";
import { ResultViewer } from "./ResultViewer";

interface Props {
  t: (key: string) => string;
  ctx: AppRuntimeCtx;
}

interface StorageBinding {
  sourceId: string;
  sourceType: string;
  sourceName: string;
  displayHints?: { protocolPrefix?: string };
  path: string;
}

const ANALYSIS_TYPES: AnalysisType[] = ["ocr", "face", "clip", "gps", "all"];

export function AnalyzePanel({ t, ctx }: Props) {
  const [sourceId, setSourceId] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [path, setPath] = useState("");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("all");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullPath = sourceId && path ? `vfs://${sourceId}${path}` : path;

  const handlePickStorage = async () => {
    const binding: StorageBinding | null = await ctx.shell.pickStorageBinding({
      title: t("pickImage"),
      initial: sourceId ? { sourceId, path } : undefined,
    });
    if (binding) {
      setSourceId(binding.sourceId);
      setSourceName(binding.sourceName);
      setPath(binding.path);
    }
  };

  const handleAnalyze = async () => {
    const target = fullPath.trim();
    if (!target) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const resp = await api.analyze({ path: target, analysisType });
      setResult(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="flex flex-1 items-center gap-2 rounded border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm">
          {sourceId ? (
            <span className="shrink-0 rounded bg-[var(--color-accent-subtle)] px-2 py-0.5 text-xs text-[var(--color-accent)]">
              {sourceName || sourceId}
            </span>
          ) : null}
          <input
            type="text"
            value={path}
            onChange={(e) => {
              setPath(e.target.value);
              if (sourceId) {
                setSourceId("");
                setSourceName("");
              }
            }}
            placeholder={sourceId ? t("pathPlaceholder") : t("pathOrPickPlaceholder")}
            className="flex-1 bg-transparent outline-none min-w-0"
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          />
        </div>
        <button
          type="button"
          onClick={handlePickStorage}
          className="cursor-pointer rounded border border-black/10 dark:border-white/10 px-3 py-2 text-sm hover:bg-black/[0.05] dark:hover:bg-white/[0.05]"
          title={t("pickStorage")}
        >
          <FolderOpen size={16} />
        </button>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading || !fullPath.trim()}
          className="cursor-pointer rounded bg-[var(--color-accent)] px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {loading ? t("analyzing") : t("analyze")}
        </button>
      </div>

      <div className="flex gap-2">
        {ANALYSIS_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setAnalysisType(type)}
            className={`cursor-pointer rounded px-3 py-1.5 text-xs transition ${
              analysisType === type
                ? "bg-[var(--color-accent-subtle)] text-[var(--color-accent)]"
                : "bg-black/[0.05] dark:bg-white/[0.05] hover:bg-black/[0.1] dark:hover:bg-white/[0.1]"
            }`}
          >
            {t(type)}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded bg-red-500/10 px-3 py-2 text-sm text-red-500">{error}</div>
      )}

      {result && <ResultViewer result={result} t={t} />}
    </div>
  );
}
