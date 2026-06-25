use std::sync::Arc;

use axum::{
    Json,
    extract::{Path, State},
};
use serde::Serialize;
use ts_rs::TS;
use uuid::Uuid;

use crate::bus_clients::jobs;
use crate::error::AppError;
use crate::state::AppState;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
#[derive(TS)]
#[ts(export)]
pub struct JobStatusResponse {
    #[ts(type = "string")]
    pub id: Uuid,
    pub status: String,
    pub progress: i32,
    pub data: Option<serde_json::Value>,
    pub error: Option<String>,
}

pub async fn get_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<Uuid>,
) -> Result<Json<JobStatusResponse>, AppError> {
    let client = state
        .bus_client
        .get()
        .ok_or_else(|| AppError::Internal("BusClient not yet bound".into()))?;

    let response = jobs::query(
        client,
        client.auto_caller("media-inspector"),
        jobs::QueryJobsRequest {
            id: Some(job_id),
            job_type: None,
            status: None,
            page: None,
            page_size: None,
        },
    )
    .await?;

    let job = response
        .items
        .into_iter()
        .next()
        .ok_or_else(|| AppError::NotFound("job not found".into()))?;

    Ok(Json(JobStatusResponse {
        id: job.id,
        status: job.status,
        progress: job.progress,
        data: job.data,
        error: job.error,
    }))
}

pub async fn cancel_job(
    State(state): State<Arc<AppState>>,
    Path(job_id): Path<Uuid>,
) -> Result<Json<serde_json::Value>, AppError> {
    let client = state
        .bus_client
        .get()
        .ok_or_else(|| AppError::Internal("BusClient not yet bound".into()))?;

    jobs::cancel(
        client,
        client.auto_caller("media-inspector"),
        jobs::CancelJobRequest::new(job_id),
    )
    .await?;

    Ok(Json(serde_json::json!({ "success": true })))
}
