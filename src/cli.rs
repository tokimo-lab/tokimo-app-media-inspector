use anyhow::Context;

use crate::{
    db::{init_pool, repos::system_config_repo::SystemConfigSection},
    services,
};

pub async fn run_analyze(path: String, analysis_type: String) -> anyhow::Result<()> {
    let db = init_pool().await.context("connect database failed")?;

    let ai_settings: crate::config::AiSettings = {
        use crate::db::repos::system_config_repo::SystemConfigRepo;
        SystemConfigRepo::get(&db)
            .await
            .unwrap_or_else(|_| crate::config::AiSettings::default_value())
    };

    let data_local = std::env::var("TOKIMO_DATA_LOCAL_PATH")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|_| std::path::PathBuf::from("./.data/local"));

    let ai_worker = tokimo_media_intelligence::worker::client::MediaIntelligenceWorkerClient::from_settings(
        &tokimo_media_intelligence::worker::client::MediaIntelligenceWorkerSettings::default(),
        &data_local,
    );

    let http_client = reqwest::Client::new();

    let req = crate::handlers::analyze::AnalyzeRequest {
        path: path.clone(),
        analysis_type: match analysis_type.as_str() {
            "ocr" => crate::handlers::analyze::AnalysisType::Ocr,
            "face" => crate::handlers::analyze::AnalysisType::Face,
            "clip" => crate::handlers::analyze::AnalysisType::Clip,
            "gps" => crate::handlers::analyze::AnalysisType::Gps,
            _ => crate::handlers::analyze::AnalysisType::All,
        },
    };

    let image_bytes = services::image_loader::load_image_bytes(&http_client, &req.path).await?;

    let response = match req.analysis_type {
        crate::handlers::analyze::AnalysisType::Ocr => {
            let ocr = services::ocr::analyze(&ai_worker, image_bytes, &ai_settings, None).await?;
            serde_json::json!({ "path": req.path, "ocr": ocr })
        }
        crate::handlers::analyze::AnalysisType::Face => {
            let face = services::face::analyze(&ai_worker, image_bytes, &ai_settings, None).await?;
            serde_json::json!({ "path": req.path, "face": face })
        }
        crate::handlers::analyze::AnalysisType::Clip => {
            let clip = services::clip::analyze(&ai_worker, image_bytes, &ai_settings, None).await?;
            serde_json::json!({ "path": req.path, "clip": clip })
        }
        crate::handlers::analyze::AnalysisType::Gps => {
            let geo_settings: crate::config::GeoSettings = {
                use crate::db::repos::system_config_repo::SystemConfigRepo;
                SystemConfigRepo::get(&db)
                    .await
                    .unwrap_or_else(|_| crate::config::GeoSettings::default_value())
            };
            let gps = services::geo::analyze(&http_client, &image_bytes, &geo_settings).await?;
            serde_json::json!({ "path": req.path, "gps": gps })
        }
        crate::handlers::analyze::AnalysisType::All => {
            let geo_settings = crate::config::GeoSettings::default_value();
            let (ocr_r, face_r, clip_r, gps_r) = tokio::join!(
                services::ocr::analyze(
                    &ai_worker,
                    image_bytes.clone(),
                    &ai_settings,
                    Some("cli:ocr".to_string())
                ),
                services::face::analyze(
                    &ai_worker,
                    image_bytes.clone(),
                    &ai_settings,
                    Some("cli:face".to_string())
                ),
                services::clip::analyze(
                    &ai_worker,
                    image_bytes.clone(),
                    &ai_settings,
                    Some("cli:clip".to_string())
                ),
                services::geo::analyze(&http_client, &image_bytes, &geo_settings),
            );
            let mut errors = serde_json::Map::new();
            let ocr = match ocr_r {
                Ok(value) => Some(value),
                Err(err) => {
                    errors.insert("ocr".into(), serde_json::json!(err.to_string()));
                    None
                }
            };
            let face = match face_r {
                Ok(value) => Some(value),
                Err(err) => {
                    errors.insert("face".into(), serde_json::json!(err.to_string()));
                    None
                }
            };
            let clip = match clip_r {
                Ok(value) => Some(value),
                Err(err) => {
                    errors.insert("clip".into(), serde_json::json!(err.to_string()));
                    None
                }
            };
            let gps = match gps_r {
                Ok(value) => Some(value),
                Err(err) => {
                    errors.insert("gps".into(), serde_json::json!(err.to_string()));
                    None
                }
            };
            serde_json::json!({
                "path": req.path,
                "ocr": ocr,
                "face": face,
                "clip": clip,
                "gps": gps,
                "errors": errors,
            })
        }
    };

    println!("{}", serde_json::to_string_pretty(&response)?);
    Ok(())
}

pub async fn run_health() -> anyhow::Result<()> {
    println!("Media Inspector CLI — health check");
    println!("Use 'bun dev --apps=media-inspector' to run the full server.");
    Ok(())
}
