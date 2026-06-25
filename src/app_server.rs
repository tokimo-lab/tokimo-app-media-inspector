use std::sync::Arc;

use axum::{
    Router, middleware,
    routing::{get, post},
};
use tokimo_bus_protocol::{BusListener, DataPlaneSocket};
use tracing::{error, info};

use crate::{assets, handlers, state::AppState};

pub async fn spawn(service: &str, ctx: Arc<AppState>) -> anyhow::Result<DataPlaneSocket> {
    let (listener, socket) = BusListener::bind_for_app(service)?;
    info!(?socket, "image-cortex: app server listening");

    let router = build_router(ctx);

    tokio::spawn(async move {
        if let Err(e) = axum::serve(listener, router).await {
            error!(error = %e, "image-cortex: app server stopped");
        }
    });

    Ok(socket)
}

fn build_router(ctx: Arc<AppState>) -> Router {
    Router::new()
        .route("/analyze", post(handlers::analyze::analyze))
        .route("/jobs/{job_id}", get(handlers::jobs::get_job))
        .route("/jobs/{job_id}/cancel", post(handlers::jobs::cancel_job))
        .route("/health", get(handlers::health::health))
        .route("/capabilities", get(handlers::health::capabilities))
        .route(
            "/settings/geo",
            get(handlers::settings::get_geo).put(handlers::settings::update_geo),
        )
        .route(
            "/settings/ai",
            get(handlers::settings::get_ai).put(handlers::settings::update_ai),
        )
        .route("/settings/geo/test", post(handlers::settings::test_geo))
        .route("/assets/{*path}", get(assets::serve))
        .layer(middleware::from_fn(tokimo_bus_protocol::task_local::auth_middleware))
        .with_state(ctx)
}
