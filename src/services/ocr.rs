use serde::Serialize;
use tokimo_media_intelligence::worker::client::MediaIntelligenceWorkerClient;
use ts_rs::TS;

use crate::config::AiSettings;
use crate::error::AppError;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct OcrResult {
    pub items: Vec<OcrItem>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct OcrItem {
    pub text: String,
    pub x: Option<f64>,
    pub y: Option<f64>,
    pub w: Option<f64>,
    pub h: Option<f64>,
    pub angle: f64,
    pub score: Option<f64>,
    pub paragraph_id: i32,
    pub char_positions: Option<serde_json::Value>,
    pub positioning_type: String,
    pub corners: Option<Vec<[f64; 2]>>,
}

pub async fn analyze(
    ai: &MediaIntelligenceWorkerClient,
    image_bytes: Vec<u8>,
    settings: &AiSettings,
    request_id: Option<String>,
) -> Result<OcrResult, AppError> {
    if !ai.is_ocr_enabled() || !ai.ocr_models_ready() {
        return Err(AppError::Internal("OCR model files not found".into()));
    }

    use tokimo_media_intelligence::worker::protocol::types as wire;
    let model = settings.ocr_model_name.as_str();
    let needs_hybrid = !wire::ocr_model_supports_blocks(model);
    let items = if needs_hybrid {
        let det_model = settings.ocr_aux_model_name.as_deref().unwrap_or("rapid-ocr-rust");
        ai.ocr_hybrid(
            image_bytes,
            Some(det_model.to_string()),
            Some(model.to_string()),
            request_id,
        )
        .await
        .map_err(|e| AppError::Internal(format!("OCR failed: {e}")))?
    } else {
        ai.ocr(image_bytes, Some(model.to_string()), request_id)
            .await
            .map_err(|e| AppError::Internal(format!("OCR failed: {e}")))?
    };

    let coord = |v: f32| -> Option<f64> { if v < 0.0 { None } else { Some(f64::from(v)) } };

    let ocr_items = items
        .into_iter()
        .filter(|item| !item.text.trim().is_empty())
        .map(|item| OcrItem {
            positioning_type: if item.char_positions.is_some() {
                "ctc".to_string()
            } else {
                "canvas".to_string()
            },
            char_positions: item.char_positions.map(|positions| {
                serde_json::json!(
                    positions
                        .iter()
                        .map(|(x, w)| serde_json::json!({"x": f64::from(*x), "w": f64::from(*w)}))
                        .collect::<Vec<_>>()
                )
            }),
            text: item.text,
            x: coord(item.x),
            y: coord(item.y),
            w: coord(item.w),
            h: coord(item.h),
            angle: f64::from(item.angle),
            score: Some(f64::from(item.score)),
            paragraph_id: item.paragraph_id as i32,
            corners: item
                .corners
                .map(|c| c.iter().map(|(x, y)| [f64::from(*x), f64::from(*y)]).collect()),
        })
        .collect();

    Ok(OcrResult { items: ocr_items })
}
