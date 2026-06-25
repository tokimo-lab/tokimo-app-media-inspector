use serde::Serialize;
use tokimo_media_intelligence::worker::client::MediaIntelligenceWorkerClient;
use ts_rs::TS;

use crate::config::AiSettings;
use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct ClipResult {
    pub embedding: Vec<f32>,
}

pub async fn analyze(
    ai: &MediaIntelligenceWorkerClient,
    image_bytes: Vec<u8>,
    _settings: &AiSettings,
    request_id: Option<String>,
) -> Result<ClipResult, AppError> {
    if !ai.is_clip_enabled() || !ai.clip_models_ready() {
        return Err(AppError::Internal("CLIP model files not found".into()));
    }

    let embedding = ai
        .clip_image(image_bytes, request_id)
        .await
        .map_err(|e| AppError::Internal(format!("CLIP failed: {e}")))?;

    if embedding.len() != 512 {
        return Err(AppError::Internal(format!(
            "CLIP returned {} dims, expected 512",
            embedding.len()
        )));
    }

    Ok(ClipResult { embedding })
}
