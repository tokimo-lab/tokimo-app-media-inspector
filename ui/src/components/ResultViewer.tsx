import type {
  ClipResult,
  FaceResult,
  GpsResult,
  OcrResult,
} from "../api/client";

interface AnalyzeResultData {
  path: string;
  ocr: OcrResult | null;
  face: FaceResult | null;
  clip: ClipResult | null;
  gps: GpsResult | null;
}

interface Props {
  result: AnalyzeResultData;
  t: (key: string) => string;
}

export function ResultViewer({ result, t }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <div className="text-xs opacity-50">{result.path}</div>

      {result.ocr && (
        <section className="rounded border border-black/10 dark:border-white/10 p-3">
          <h3 className="mb-2 text-sm font-semibold">{t("ocr")}</h3>
          {result.ocr.items.length === 0 ? (
            <div className="text-xs opacity-50">{t("noResult")}</div>
          ) : (
            <div className="flex flex-col gap-1">
              {result.ocr.items.map((item) => (
                <div key={item.text} className="flex items-start gap-2 text-xs">
                  <span className="shrink-0 rounded bg-black/[0.05] dark:bg-white/[0.05] px-1.5 py-0.5 font-mono">
                    {item.score != null
                      ? `${(item.score * 100).toFixed(0)}%`
                      : "-"}
                  </span>
                  <span className="break-all">{item.text}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {result.face && (
        <section className="rounded border border-black/10 dark:border-white/10 p-3">
          <h3 className="mb-2 text-sm font-semibold">{t("face")}</h3>
          {result.face.faces.length === 0 ? (
            <div className="text-xs opacity-50">{t("noResult")}</div>
          ) : (
            <div className="flex flex-col gap-2">
              {result.face.faces.map((face) => (
                <div
                  key={`${face.x}-${face.y}`}
                  className="rounded bg-black/[0.03] dark:bg-white/[0.03] p-2 text-xs"
                >
                  <div>
                    {t("confidence")}: {(face.confidence * 100).toFixed(1)}%
                  </div>
                  <div>
                    {t("coordinates")}: ({face.x}, {face.y}, {face.w}, {face.h})
                  </div>
                  <div>
                    {t("dimensions")}: {face.embedding.length}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {result.clip && (
        <section className="rounded border border-black/10 dark:border-white/10 p-3">
          <h3 className="mb-2 text-sm font-semibold">{t("clip")}</h3>
          <div className="text-xs">
            {t("dimensions")}: {result.clip.embedding.length}
          </div>
          <div className="mt-1 font-mono text-[10px] opacity-60">
            [
            {result.clip.embedding
              .slice(0, 8)
              .map((v) => v.toFixed(4))
              .join(", ")}
            ...]
          </div>
        </section>
      )}

      {result.gps && (
        <section className="rounded border border-black/10 dark:border-white/10 p-3">
          <h3 className="mb-2 text-sm font-semibold">{t("gps")}</h3>
          <div className="flex flex-col gap-1 text-xs">
            <div>
              {t("coordinates")}: {result.gps.latitude.toFixed(6)},{" "}
              {result.gps.longitude.toFixed(6)}
            </div>
            {result.gps.province && (
              <div>
                {t("province")}: {result.gps.province}
              </div>
            )}
            {result.gps.city && (
              <div>
                {t("city")}: {result.gps.city}
              </div>
            )}
            {result.gps.district && (
              <div>
                {t("district")}: {result.gps.district}
              </div>
            )}
            {result.gps.formattedAddress && (
              <div>
                {t("address")}: {result.gps.formattedAddress}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
