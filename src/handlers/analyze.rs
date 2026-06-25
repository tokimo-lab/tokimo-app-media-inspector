use std::sync::Arc;

use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use ts_rs::TS;
use uuid::Uuid;

use crate::bus_clients::jobs;
use crate::error::AppError;
use crate::state::AppState;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub enum AnalysisType {
    Ocr,
    Face,
    Clip,
    Gps,
    All,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct AnalyzeRequest {
    pub path: String,
    pub analysis_type: AnalysisType,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct AnalyzeResponse {
    #[ts(type = "string")]
    pub job_id: Uuid,
}

pub async fn analyze(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AnalyzeRequest>,
) -> Result<Json<AnalyzeResponse>, AppError> {
    let client = state
        .bus_client
        .get()
        .ok_or_else(|| AppError::Internal("BusClient not yet bound".into()))?;

    let params = serde_json::json!({
        "path": req.path,
        "analysisType": match req.analysis_type {
            AnalysisType::Ocr => "ocr",
            AnalysisType::Face => "face",
            AnalysisType::Clip => "clip",
            AnalysisType::Gps => "gps",
            AnalysisType::All => "all",
        },
    });

    let job = jobs::create(
        client,
        client.auto_caller("media-inspector"),
        jobs::CreateJobRequest::new("media_inspector_process", params),
    )
    .await?;

    Ok(Json(AnalyzeResponse { job_id: job.id }))
}
