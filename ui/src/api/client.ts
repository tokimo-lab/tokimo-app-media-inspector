export type AnalysisType = "ocr" | "face" | "clip" | "gps" | "all";

export interface AnalyzeRequest {
  path: string;
  analysisType: AnalysisType;
}

export interface OcrItem {
  text: string;
  x: number | null;
  y: number | null;
  w: number | null;
  h: number | null;
  angle: number;
  score: number | null;
  paragraphId: number;
  charPositions: unknown | null;
  positioningType: string;
  corners: [number, number][] | null;
}

export interface OcrResult {
  items: OcrItem[];
}

export interface FaceItem {
  x: number;
  y: number;
  w: number;
  h: number;
  confidence: number;
  embedding: number[];
}

export interface FaceResult {
  faces: FaceItem[];
}

export interface ClipResult {
  embedding: number[];
}

export interface GpsResult {
  latitude: number;
  longitude: number;
  province: string | null;
  city: string | null;
  district: string | null;
  formattedAddress: string | null;
}

export interface AnalyzeResponse {
  path: string;
  ocr: OcrResult | null;
  face: FaceResult | null;
  clip: ClipResult | null;
  gps: GpsResult | null;
  errors?: Record<string, string>;
}

export interface AnalyzeJobResponse {
  jobId: string;
}

export interface JobStatusResponse {
  id: string;
  status: string;
  progress: number;
  data: unknown;
  error: string | null;
}

export interface HealthResponse {
  status: string;
  aiWorkerReady: boolean;
  ocrReady: boolean;
  faceReady: boolean;
  clipReady: boolean;
}

export interface CapabilitiesResponse {
  version: string;
  analysisTypes: string[];
  supportedFormats: string[];
}

export interface GeoSettings {
  provider: string;
  amapApiKey: string | null;
  amapSecret: string | null;
  qqmapApiKey: string | null;
  qqmapSecretKey: string | null;
  tiandituServerKey: string | null;
  mapboxAccessToken: string | null;
  maptilerApiKey: string | null;
}

export interface AiSettings {
  ocrModelName: string;
  ocrAuxModelName: string | null;
}

const BASE = "/api/apps/media-inspector";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json();
}

export const api = {
  analyze: (req: AnalyzeRequest) =>
    request<AnalyzeJobResponse>("/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    }),
  getJob: (jobId: string) => request<JobStatusResponse>(`/jobs/${jobId}`),
  cancelJob: (jobId: string) =>
    request<{ success: boolean }>(`/jobs/${jobId}/cancel`, {
      method: "POST",
    }),
  health: () => request<HealthResponse>("/health"),
  capabilities: () => request<CapabilitiesResponse>("/capabilities"),
  getGeoSettings: () => request<GeoSettings>("/settings/geo"),
  updateGeoSettings: (settings: Partial<GeoSettings>) =>
    request<GeoSettings>("/settings/geo", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }),
  getAiSettings: () => request<AiSettings>("/settings/ai"),
  updateAiSettings: (settings: Partial<AiSettings>) =>
    request<AiSettings>("/settings/ai", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    }),
  testGeo: (lat: number, lon: number) =>
    request<{
      success: boolean;
      province?: string;
      city?: string;
      district?: string;
      formattedAddress?: string;
      error?: string;
    }>("/settings/geo/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat, lon }),
    }),
};
