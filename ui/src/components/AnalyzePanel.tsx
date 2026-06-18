import type { AppRuntimeCtx } from "@tokimo/sdk";
import { useJobSubscription } from "@tokimo/sdk";
import { FolderOpen } from "lucide-react";
import { useRef, useState } from "react";
import {
  type AnalysisType,
  type AnalyzeResponse,
  api,
  type JobStatusResponse,
} from "../api/client";
import { JobProgress } from "./JobProgress";
import { ResultViewer } from "./ResultViewer";

interface Props {
  t: (key: string) => string;
  ctx: AppRuntimeCtx;
}

const ANALYSIS_TYPES: AnalysisType[] = ["ocr", "face", "clip", "gps", "all"];

export function AnalyzePanel({ t, ctx }: Props) {
  const [sourceId, setSourceId] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [path, setPath] = useState("");
  const [analysisType, setAnalysisType] = useState<AnalysisType>("all");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobResult, setJobResult] = useState<JobStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completedRef = useRef(false);

  const fullPath = sourceId && path ? `vfs://${sourceId}${path}` : path;

  useJobSubscription(jobId, (event) => {
    const job = (event.data as { job?: JobStatusResponse })?.job;
    if (job) {
      setJobResult(job);
      if (
        (job.status === "completed" || job.status === "failed") &&
        !completedRef.current
      ) {
        completedRef.current = true;
      }
    }
  });

  const handlePickFile = async () => {
    const binding = await ctx.shell.pickStorageBinding({
      title: t("pickImage"),
      allowFileSelection: true,
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
    setJobId(null);
    setJobResult(null);
    completedRef.current = false;
    try {
      const resp = await api.analyze({ path: target, analysisType });
      setJobId(resp.jobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const finalResult =
    jobResult?.status === "completed" && jobResult.data
      ? (jobResult.data as AnalyzeResponse)
      : null;

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
            placeholder={
              sourceId ? t("pathPlaceholder") : t("pathOrPickPlaceholder")
            }
            className="flex-1 bg-transparent outline-none min-w-0"
            onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
          />
        </div>
        <button
          type="button"
          onClick={handlePickFile}
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
        <div className="rounded bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </div>
      )}

      {jobId && <JobProgress jobId={jobId} result={jobResult} t={t} />}

      {finalResult && <ResultViewer result={finalResult} t={t} />}
    </div>
  );
}
