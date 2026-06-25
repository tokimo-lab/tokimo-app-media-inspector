import type {
  AppRuntimeCtx,
  MediaAnalysisType,
  MediaAnalyzeImageResponse,
  MediaImageInput,
} from "@tokimo/sdk";
import { AppSetupGuide, type AppSetupGuideProps } from "@tokimo/ui";
import { Brain, FolderOpen, ScanFace, Search, Sparkles } from "lucide-react";
import { useState } from "react";
import { ResultViewer } from "./ResultViewer";

type GuideIcon = AppSetupGuideProps["features"][number]["icon"];

const guideIcon = (icon: typeof Brain) => icon as unknown as GuideIcon;

interface Props {
  t: (key: string) => string;
  ctx: AppRuntimeCtx;
}

const ANALYSIS_TYPES: MediaAnalysisType[] = ["ocr", "face", "clip", "gps", "all"];

function filenameFromPath(path: string): string | null {
  const name = path.split("/").filter(Boolean).pop();
  return name || null;
}

function parseImageInput(
  sourceId: string,
  path: string,
  fallbackError: string,
): MediaImageInput {
  if (sourceId && path) {
    return {
      kind: "vfs",
      sourceId,
      path,
      filename: filenameFromPath(path),
    };
  }

  const trimmed = path.trim();
  const match = /^vfs:\/\/([^/]+)(\/.*)$/.exec(trimmed);
  if (match) {
    return {
      kind: "vfs",
      sourceId: match[1],
      path: match[2],
      filename: filenameFromPath(match[2]),
    };
  }

  throw new Error(fallbackError);
}

export function AnalyzePanel({ t, ctx }: Props) {
  const [sourceId, setSourceId] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [path, setPath] = useState("");
  const [analysisType, setAnalysisType] = useState<MediaAnalysisType>("all");
  const [result, setResult] = useState<MediaAnalyzeImageResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullPath = sourceId && path ? `vfs://${sourceId}${path}` : path;

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
    setResult(null);
    try {
      const image = parseImageInput(sourceId, path, t("pickStorageRequired"));
      const resp = await ctx.shell.mediaIntelligence.analyzeImage({
        image,
        analysisType,
      });
      setResult(resp);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const isInitialEmpty = !sourceId && !path && !result && !error;

  if (isInitialEmpty) {
    return (
      <AppSetupGuide
        imageSrc="/api/apps/media-inspector/assets/icon.png"
        accentColor="indigo"
        title={t("setupTitle")}
        description={t("setupDescription")}
        features={[
          { icon: guideIcon(Search), label: t("setupFeatureOcr") },
          { icon: guideIcon(ScanFace), label: t("setupFeatureFace") },
          { icon: guideIcon(Brain), label: t("setupFeatureEmbedding") },
        ]}
        actionLabel={t("setupAction")}
        actionIcon={guideIcon(Sparkles)}
        onAction={handlePickFile}
        className="-m-4 h-[calc(100%+2rem)]"
      />
    );
  }

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
            className="min-w-0 flex-1 bg-transparent outline-none"
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

      {result && <ResultViewer path={fullPath} result={result} t={t} />}
    </div>
  );
}
