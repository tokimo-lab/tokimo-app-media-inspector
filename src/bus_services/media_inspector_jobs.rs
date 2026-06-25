use std::sync::Arc;

use serde_json::Value as JsonValue;
use tokimo_bus_client::BusClientBuilder;
use tokimo_bus_protocol::{BusError, HttpMethod, MethodDecl};
use uuid::Uuid;

use crate::state::AppState;

fn decl(name: &str, description: &str) -> MethodDecl {
    MethodDecl {
        name: name.into(),
        description: Some(description.into()),
        requires_auth: false,
        streaming: false,
        http_method: HttpMethod::Post,
        path: None,
    }
}

fn decode_request(raw: &[u8]) -> Result<(Uuid, JsonValue), BusError> {
    let v: JsonValue = serde_json::from_slice(raw).map_err(|e| BusError::BadRequest(format!("json decode: {e}")))?;
    let job = v
        .get("job")
        .ok_or_else(|| BusError::BadRequest("missing 'job' field".into()))?;
    let job_id = job
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| BusError::BadRequest("missing 'job.id'".into()))
        .and_then(|s| Uuid::parse_str(s).map_err(|e| BusError::BadRequest(format!("job.id UUID: {e}"))))?;
    let params = job.get("params").cloned().unwrap_or(JsonValue::Null);
    Ok((job_id, params))
}

pub fn register(builder: BusClientBuilder, ctx: Arc<AppState>) -> BusClientBuilder {
    let ctx_process = ctx.clone();
    builder
        .method(decl("dispatch_media_inspector_process", "Run an image analysis job"))
        .on_invoke("dispatch_media_inspector_process", move |req| {
            let ctx = ctx_process.clone();
            async move {
                let (job_id, params) = decode_request(&req.payload)?;
                crate::queue::media_inspector_process::handle(&ctx, job_id, &params)
                    .await
                    .map(|result| serde_json::to_vec(&result.unwrap_or_default()).unwrap_or_default())
                    .map_err(|e| BusError::Internal(e.to_string()))
            }
        })
        .method(decl("capabilities", "Return media-inspector bus service capabilities"))
        .on_invoke("capabilities", |_req| async move {
            serde_json::to_vec(&serde_json::json!({
                "version": env!("CARGO_PKG_VERSION"),
                "methods": [
                    "dispatch_media_inspector_process",
                    "capabilities",
                ],
            }))
            .map_err(|e| BusError::Internal(e.to_string()))
        })
}
