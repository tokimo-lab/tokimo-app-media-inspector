import { useEffect, useState } from "react";
import { api, type HealthResponse } from "../api/client";

interface Props {
  t: (key: string) => string;
}

export function HealthStatus({ t }: Props) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.health().then(setHealth).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm opacity-50">Loading...</div>;
  if (!health) return <div className="text-sm text-red-500">Failed to load</div>;

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold">{t("health")}</h3>
      <div className="grid grid-cols-2 gap-2">
        <StatusItem label="AI Worker" ok={health.aiWorkerReady} />
        <StatusItem label="OCR" ok={health.ocrReady} />
        <StatusItem label="Face" ok={health.faceReady} />
        <StatusItem label="CLIP" ok={health.clipReady} />
      </div>
    </div>
  );
}

function StatusItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center gap-2 rounded border border-black/10 dark:border-white/10 px-3 py-2 text-sm">
      <span className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-green-500" : "bg-red-500"}`} />
      <span>{label}</span>
    </div>
  );
}
