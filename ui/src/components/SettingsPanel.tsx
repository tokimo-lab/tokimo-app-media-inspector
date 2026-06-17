import { useEffect, useState } from "react";
import { api, type AiSettings, type GeoSettings } from "../api/client";

interface Props {
  t: (key: string) => string;
}

export function SettingsPanel({ t }: Props) {
  const [geo, setGeo] = useState<GeoSettings | null>(null);
  const [ai, setAi] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.getGeoSettings(), api.getAiSettings()])
      .then(([g, a]) => {
        setGeo(g);
        setAi(a);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSaveGeo = async () => {
    if (!geo) return;
    setSaving(true);
    try {
      await api.updateGeoSettings(geo);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAi = async () => {
    if (!ai) return;
    setSaving(true);
    try {
      await api.updateAiSettings(ai);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-sm opacity-50">Loading...</div>;

  return (
    <div className="flex flex-col gap-6">
      {geo && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t("geoSettings")}</h3>
          <label className="flex items-center gap-2 text-xs">
            <span>{t("enabled")}</span>
            <input
              type="checkbox"
              checked={geo.enabled}
              onChange={(e) => setGeo({ ...geo, enabled: e.target.checked })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span>{t("provider")}</span>
            <select
              value={geo.provider}
              onChange={(e) => setGeo({ ...geo, provider: e.target.value })}
              className="rounded border border-black/10 dark:border-white/10 bg-transparent px-2 py-1.5 text-xs"
            >
              <option value="amap">Amap (高德)</option>
              <option value="qqmap">QQ Map (腾讯)</option>
              <option value="tianditu">Tianditu (天地图)</option>
              <option value="mapbox">Mapbox</option>
              <option value="maptiler">MapTiler</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span>{t("apiKey")}</span>
            <input
              type="password"
              value={geo.amapApiKey ?? ""}
              onChange={(e) => setGeo({ ...geo, amapApiKey: e.target.value || null })}
              className="rounded border border-black/10 dark:border-white/10 bg-transparent px-2 py-1.5 text-xs"
            />
          </label>
          <button
            type="button"
            onClick={handleSaveGeo}
            disabled={saving}
            className="cursor-pointer self-start rounded bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            {t("save")}
          </button>
        </section>
      )}

      {ai && (
        <section className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold">{t("aiSettings")}</h3>
          <label className="flex items-center gap-2 text-xs">
            <span>OCR</span>
            <input
              type="checkbox"
              checked={ai.ocrEnabled}
              onChange={(e) => setAi({ ...ai, ocrEnabled: e.target.checked })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span>Face</span>
            <input
              type="checkbox"
              checked={ai.faceEnabled}
              onChange={(e) => setAi({ ...ai, faceEnabled: e.target.checked })}
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span>CLIP</span>
            <input
              type="checkbox"
              checked={ai.clipEnabled}
              onChange={(e) => setAi({ ...ai, clipEnabled: e.target.checked })}
            />
          </label>
          <button
            type="button"
            onClick={handleSaveAi}
            disabled={saving}
            className="cursor-pointer self-start rounded bg-[var(--color-accent)] px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            {t("save")}
          </button>
        </section>
      )}
    </div>
  );
}
