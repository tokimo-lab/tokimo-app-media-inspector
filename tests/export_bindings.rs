#![allow(unused_imports)]

use tokimo_app_media_inspector::handlers::analyze::{AnalysisType, AnalyzeRequest, AnalyzeResponse};
use tokimo_app_media_inspector::handlers::health::{CapabilitiesResponse, HealthResponse};
use tokimo_app_media_inspector::handlers::settings::{AiSettingsOutput, GeoSettingsOutput, TestGeoResponse};
use tokimo_app_media_inspector::services::clip::ClipResult;
use tokimo_app_media_inspector::services::face::{FaceItem, FaceResult};
use tokimo_app_media_inspector::services::geo::GpsResult;
use tokimo_app_media_inspector::services::ocr::{OcrItem, OcrResult};
use ts_rs::{Config, TS};

#[test]
fn export_bindings() {
    let cfg = Config::from_env();

    AnalysisType::export_all(&cfg).unwrap();
    AnalyzeRequest::export_all(&cfg).unwrap();
    AnalyzeResponse::export_all(&cfg).unwrap();
    HealthResponse::export_all(&cfg).unwrap();
    CapabilitiesResponse::export_all(&cfg).unwrap();
    AiSettingsOutput::export_all(&cfg).unwrap();
    GeoSettingsOutput::export_all(&cfg).unwrap();
    TestGeoResponse::export_all(&cfg).unwrap();
    ClipResult::export_all(&cfg).unwrap();
    FaceItem::export_all(&cfg).unwrap();
    FaceResult::export_all(&cfg).unwrap();
    GpsResult::export_all(&cfg).unwrap();
    OcrItem::export_all(&cfg).unwrap();
    OcrResult::export_all(&cfg).unwrap();
}
