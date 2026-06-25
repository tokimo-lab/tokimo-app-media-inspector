use serde::Serialize;
use tokimo_media_intelligence::worker::client::MediaIntelligenceWorkerClient;
use ts_rs::TS;

use crate::config::AiSettings;
use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct FaceResult {
    pub faces: Vec<FaceItem>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct FaceItem {
    pub x: i32,
    pub y: i32,
    pub w: i32,
    pub h: i32,
    pub confidence: f32,
    pub embedding: Vec<f32>,
}

pub async fn analyze(
    ai: &MediaIntelligenceWorkerClient,
    image_bytes: Vec<u8>,
    _settings: &AiSettings,
    request_id: Option<String>,
) -> Result<FaceResult, AppError> {
    if !ai.is_face_enabled() || !ai.face_models_ready() {
        return Err(AppError::Internal("Face model files not found".into()));
    }

    let detections = ai
        .detect_faces(image_bytes, request_id)
        .await
        .map_err(|e| AppError::Internal(format!("Face detection failed: {e}")))?;

    let faces = detections
        .into_iter()
        .map(|d| FaceItem {
            x: d.x,
            y: d.y,
            w: d.w,
            h: d.h,
            confidence: d.confidence,
            embedding: d.embedding,
        })
        .collect();

    Ok(FaceResult { faces })
}
