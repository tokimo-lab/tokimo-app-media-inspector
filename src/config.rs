use serde::{Deserialize, Serialize};

use crate::db::repos::system_config_repo::SystemConfigSection;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GeoSettings {
    pub provider: String,
    pub amap_api_key: Option<String>,
    pub amap_secret: Option<String>,
    pub qqmap_api_key: Option<String>,
    pub qqmap_secret_key: Option<String>,
    pub tianditu_server_key: Option<String>,
    pub mapbox_access_token: Option<String>,
    pub maptiler_api_key: Option<String>,
}

impl SystemConfigSection for GeoSettings {
    const SCOPE: &'static str = "media_inspector";
    const SCOPE_ID: &'static str = "geo";
    fn default_value() -> Self {
        Self {
            provider: "amap".to_string(),
            amap_api_key: None,
            amap_secret: None,
            qqmap_api_key: None,
            qqmap_secret_key: None,
            tianditu_server_key: None,
            mapbox_access_token: None,
            maptiler_api_key: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiSettings {
    #[serde(default = "default_ocr_model")]
    pub ocr_model_name: String,
    #[serde(default)]
    pub ocr_aux_model_name: Option<String>,
}

fn default_ocr_model() -> String {
    "rapid-ocr-rust".to_string()
}

impl SystemConfigSection for AiSettings {
    const SCOPE: &'static str = "media_inspector";
    const SCOPE_ID: &'static str = "ai";
    fn default_value() -> Self {
        Self {
            ocr_model_name: default_ocr_model(),
            ocr_aux_model_name: None,
        }
    }
}
