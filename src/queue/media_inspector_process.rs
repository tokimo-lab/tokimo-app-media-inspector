use serde_json::{Value as JsonValue, json};
use std::sync::Arc;
use uuid::Uuid;

use crate::error::AppError;
use crate::services;
use crate::state::AppState;

pub async fn handle(state: &Arc<AppState>, _job_id: Uuid, params: &JsonValue) -> Result<Option<JsonValue>, AppError> {
    let path = params
        .get("path")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::BadRequest("missing path".into()))?;
    let analysis_type = params.get("analysisType").and_then(|v| v.as_str()).unwrap_or("all");

    let image_bytes = services::image_loader::load_image_bytes(&state.http_client, path).await?;

    let ai_settings: crate::config::AiSettings = {
        use crate::db::repos::system_config_repo::{SystemConfigRepo, SystemConfigSection};
        SystemConfigRepo::get(&state.db)
            .await
            .unwrap_or_else(|_| crate::config::AiSettings::default_value())
    };

    let geo_settings: crate::config::GeoSettings = {
        use crate::db::repos::system_config_repo::{SystemConfigRepo, SystemConfigSection};
        SystemConfigRepo::get(&state.db)
            .await
            .unwrap_or_else(|_| crate::config::GeoSettings::default_value())
    };

    let request_id = Some(_job_id.to_string());
    let mut errors = serde_json::Map::new();
    let (ocr, face, clip, gps) = match analysis_type {
        "ocr" => {
            let ocr = services::ocr::analyze(&state.ai_worker, image_bytes, &ai_settings, request_id).await?;
            (Some(ocr), None, None, None)
        }
        "face" => {
            let face = services::face::analyze(&state.ai_worker, image_bytes, &ai_settings, request_id).await?;
            (None, Some(face), None, None)
        }
        "clip" => {
            let clip = services::clip::analyze(&state.ai_worker, image_bytes, &ai_settings, request_id).await?;
            (None, None, Some(clip), None)
        }
        "gps" => {
            let gps = services::geo::analyze(&state.http_client, &image_bytes, &geo_settings).await?;
            (None, None, None, Some(gps))
        }
        _ => {
            let (ocr_r, face_r, clip_r, gps_r) = tokio::join!(
                services::ocr::analyze(
                    &state.ai_worker,
                    image_bytes.clone(),
                    &ai_settings,
                    Some(format!("{_job_id}:ocr")),
                ),
                services::face::analyze(
                    &state.ai_worker,
                    image_bytes.clone(),
                    &ai_settings,
                    Some(format!("{_job_id}:face")),
                ),
                services::clip::analyze(
                    &state.ai_worker,
                    image_bytes.clone(),
                    &ai_settings,
                    Some(format!("{_job_id}:clip")),
                ),
                services::geo::analyze(&state.http_client, &image_bytes, &geo_settings),
            );
            let ocr = match ocr_r {
                Ok(value) => Some(value),
                Err(err) => {
                    errors.insert("ocr".into(), json!(err.to_string()));
                    None
                }
            };
            let face = match face_r {
                Ok(value) => Some(value),
                Err(err) => {
                    errors.insert("face".into(), json!(err.to_string()));
                    None
                }
            };
            let clip = match clip_r {
                Ok(value) => Some(value),
                Err(err) => {
                    errors.insert("clip".into(), json!(err.to_string()));
                    None
                }
            };
            let gps = match gps_r {
                Ok(value) => Some(value),
                Err(err) => {
                    errors.insert("gps".into(), json!(err.to_string()));
                    None
                }
            };
            if ocr.is_none() && face.is_none() && clip.is_none() && gps.is_none() {
                return Err(AppError::Internal(format!(
                    "all analyses failed: {}",
                    serde_json::Value::Object(errors)
                )));
            }
            (ocr, face, clip, gps)
        }
    };

    Ok(Some(json!({
        "path": path,
        "ocr": ocr,
        "face": face,
        "clip": clip,
        "gps": gps,
        "errors": errors,
    })))
}
