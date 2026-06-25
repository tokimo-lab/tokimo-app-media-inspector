use std::sync::{Arc, OnceLock};

use sea_orm::DatabaseConnection;
use tokimo_bus_client::BusClient;
use tokimo_media_intelligence::worker::client::MediaIntelligenceWorkerClient;

pub struct AppState {
    pub db: DatabaseConnection,
    pub ai_worker: Arc<MediaIntelligenceWorkerClient>,
    pub http_client: reqwest::Client,
    pub bus_client: Arc<OnceLock<Arc<BusClient>>>,
}

impl AppState {
    pub fn models_ready(&self) -> bool {
        self.ai_worker.models_ready()
    }

    pub fn ocr_ready(&self) -> bool {
        self.ai_worker.is_ocr_enabled() && self.ai_worker.ocr_models_ready()
    }

    pub fn face_ready(&self) -> bool {
        self.ai_worker.is_face_enabled() && self.ai_worker.face_models_ready()
    }

    pub fn clip_ready(&self) -> bool {
        self.ai_worker.is_clip_enabled() && self.ai_worker.clip_models_ready()
    }
}
