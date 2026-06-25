import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Input,
  Select,
  SettingGroup,
  SettingRow,
  Spin,
  StickySaveBar,
} from "@tokimo/ui";
import { ExternalLink } from "lucide-react";
import { type AiSettings, api, type GeoSettings } from "../api/client";
import {
  DEFAULT_AUX_MODEL,
  OCR_DETECTION_MODELS,
  OCR_MODELS,
} from "../lib/ocr-models";

interface Props {
  t: (key: string) => string;
  onOpenAiModels: () => void;
}

const GEO_PROVIDER_OPTIONS = [
  { value: "amap", label: "Amap (高德)" },
  { value: "qqmap", label: "QQ Map (腾讯)" },
  { value: "tianditu", label: "Tianditu (天地图)" },
  { value: "mapbox", label: "Mapbox" },
  { value: "maptiler", label: "MapTiler" },
];

function getGeoApiKey(geo: GeoSettings): string {
  switch (geo.provider) {
    case "qqmap":
      return geo.qqmapApiKey ?? "";
    case "tianditu":
      return geo.tiandituServerKey ?? "";
    case "mapbox":
      return geo.mapboxAccessToken ?? "";
    case "maptiler":
      return geo.maptilerApiKey ?? "";
    case "amap":
    default:
      return geo.amapApiKey ?? "";
  }
}

function setGeoApiKey(geo: GeoSettings, value: string): GeoSettings {
  const apiKey = value || null;
  switch (geo.provider) {
    case "qqmap":
      return { ...geo, qqmapApiKey: apiKey };
    case "tianditu":
      return { ...geo, tiandituServerKey: apiKey };
    case "mapbox":
      return { ...geo, mapboxAccessToken: apiKey };
    case "maptiler":
      return { ...geo, maptilerApiKey: apiKey };
    case "amap":
    default:
      return { ...geo, amapApiKey: apiKey };
  }
}

export function SettingsPanel({ t, onOpenAiModels }: Props) {
  const [geo, setGeo] = useState<GeoSettings | null>(null);
  const [ai, setAi] = useState<AiSettings | null>(null);
  const [initialGeo, setInitialGeo] = useState<GeoSettings | null>(null);
  const [initialAi, setInitialAi] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([api.getGeoSettings(), api.getAiSettings()])
      .then(([g, a]) => {
        setGeo(g);
        setAi(a);
        setInitialGeo(g);
        setInitialAi(a);
      })
      .finally(() => setLoading(false));
  }, []);

  const geoDirty = useMemo(
    () =>
      geo != null &&
      initialGeo != null &&
      JSON.stringify(geo) !== JSON.stringify(initialGeo),
    [geo, initialGeo],
  );

  const aiDirty = useMemo(
    () =>
      ai != null &&
      initialAi != null &&
      JSON.stringify(ai) !== JSON.stringify(initialAi),
    [ai, initialAi],
  );

  const dirty = geoDirty || aiDirty;
  const selectedOcrModel = OCR_MODELS.find(
    (model) => model.id === ai?.ocrModelName,
  );
  const needsDetectionModel = selectedOcrModel?.supportsBlocks === false;

  const handleSaveSettings = async () => {
    if (!dirty) return;
    setSaving(true);
    try {
      if (geo && geoDirty) {
        await api.updateGeoSettings(geo);
        setInitialGeo(geo);
      }
      if (ai && aiDirty) {
        await api.updateAiSettings(ai);
        setInitialAi(ai);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    setGeo(initialGeo);
    setAi(initialAi);
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center text-fg-muted">
        <Spin />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-full flex-col">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold leading-tight text-fg-primary">
            {t("settingsTitle")}
          </h2>
          <p className="mt-1 max-w-2xl text-xs leading-relaxed text-fg-muted">
            {t("settingsDescription")}
          </p>
        </div>
      </div>

      <div className={`w-full space-y-6 ${dirty ? "pb-20" : ""}`}>
        {geo && (
          <SettingGroup
            title={t("geoSettings")}
            desc={t("geoSettingsDescription")}
          >
            <SettingRow label={t("provider")} desc={t("providerDesc")}>
              <Select
                value={geo.provider}
                onChange={(provider) =>
                  setGeo({ ...geo, provider: String(provider) })
                }
                options={GEO_PROVIDER_OPTIONS}
                className="w-56"
              />
            </SettingRow>
            <SettingRow label={t("apiKey")} desc={t("apiKeyDesc")}>
              <Input.Password
                value={getGeoApiKey(geo)}
                onChange={(e) => setGeo(setGeoApiKey(geo, e.target.value))}
                className="w-80 max-w-full"
              />
            </SettingRow>
          </SettingGroup>
        )}

        {ai && (
          <SettingGroup
            title={t("aiSettings")}
            desc={t("aiSettingsDescription")}
          >
            <SettingRow
              label={t("aiModelManagement")}
              desc={t("aiModelManagementDesc")}
            >
              <Button
                icon={<ExternalLink className="h-4 w-4" />}
                onClick={onOpenAiModels}
              >
                {t("openAiModelManagement")}
              </Button>
            </SettingRow>
            <SettingRow label={t("ocrRecognitionModel")} desc={t("ocrDesc")}>
              <Select
                value={ai.ocrModelName}
                onChange={(value) =>
                  setAi({ ...ai, ocrModelName: String(value) })
                }
                className="w-56"
                options={OCR_MODELS.map((model) => ({
                  value: model.id,
                  label: model.name,
                }))}
              />
            </SettingRow>
            {needsDetectionModel && (
              <SettingRow label={t("ocrAuxModel")} desc={t("ocrAuxModelDesc")}>
                <Select
                  value={ai.ocrAuxModelName ?? DEFAULT_AUX_MODEL}
                  onChange={(value) =>
                    setAi({
                      ...ai,
                      ocrAuxModelName: String(value),
                    })
                  }
                  className="w-56"
                  options={OCR_DETECTION_MODELS.map((model) => ({
                    value: model.id,
                    label: model.name,
                  }))}
                />
              </SettingRow>
            )}
          </SettingGroup>
        )}
      </div>

      <StickySaveBar
        dirty={dirty}
        loading={saving}
        onSave={handleSaveSettings}
        onReset={handleResetSettings}
        message={t("unsavedSettings")}
        saveLabel={t("save")}
        resetLabel={t("reset")}
      />
    </div>
  );
}
