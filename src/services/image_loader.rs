use std::time::Duration;

use crate::error::AppError;

const NEEDS_FFMPEG_DECODE: &[&str] = &[
    ".heic", ".heif", ".avif", ".raw", ".cr2", ".cr3", ".nef", ".arw", ".dng", ".orf", ".rw2", ".pef", ".srw", ".raf",
];

const FFMPEG_TIMEOUT: Duration = Duration::from_secs(25);

pub async fn load_image_bytes(http: &reqwest::Client, path: &str) -> Result<Vec<u8>, AppError> {
    if path.starts_with("vfs://") {
        load_vfs_bytes(http, path).await
    } else {
        load_local_bytes(path).await
    }
}

fn parse_vfs_path(vfs_path: &str) -> Result<(&str, &str), AppError> {
    let stripped = vfs_path
        .strip_prefix("vfs://")
        .ok_or_else(|| AppError::BadRequest(format!("invalid VFS path: {vfs_path}")))?;
    let slash_idx = stripped
        .find('/')
        .ok_or_else(|| AppError::BadRequest(format!("VFS path missing sub-path: {vfs_path}")))?;
    let source_id = &stripped[..slash_idx];
    let sub_path = &stripped[slash_idx..];
    if source_id.is_empty() {
        return Err(AppError::BadRequest("VFS source ID is empty".into()));
    }
    Ok((source_id, sub_path))
}

async fn load_vfs_bytes(http: &reqwest::Client, vfs_path: &str) -> Result<Vec<u8>, AppError> {
    let (source_id, sub_path) = parse_vfs_path(vfs_path)?;

    let url = format!(
        "http://localhost:5678/api/vfs/{source_id}/read-file?path={}",
        urlencoding::encode(sub_path)
    );

    let resp = http
        .get(&url)
        .send()
        .await
        .map_err(|e| AppError::Internal(format!("VFS read request failed: {e}")))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(AppError::Internal(format!("VFS read failed ({status}): {body}")));
    }

    let bytes = resp
        .bytes()
        .await
        .map_err(|e| AppError::Internal(format!("VFS read body error: {e}")))?;

    let ext = std::path::Path::new(sub_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    if NEEDS_FFMPEG_DECODE.contains(&format!(".{ext}").as_str()) {
        let filename = std::path::Path::new(sub_path)
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or("image");
        convert_to_jpeg(bytes.to_vec(), filename).await
    } else {
        Ok(bytes.to_vec())
    }
}

async fn load_local_bytes(path: &str) -> Result<Vec<u8>, AppError> {
    let file_path = std::path::Path::new(path);
    if !file_path.exists() {
        return Err(AppError::NotFound(format!("file not found: {path}")));
    }

    let ext = file_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();

    let bytes = tokio::fs::read(file_path)
        .await
        .map_err(|e| AppError::Internal(format!("read file: {e}")))?;

    if NEEDS_FFMPEG_DECODE.contains(&format!(".{ext}").as_str()) {
        let filename = file_path.file_name().and_then(|f| f.to_str()).unwrap_or("image");
        convert_to_jpeg(bytes, filename).await
    } else {
        Ok(bytes)
    }
}

async fn convert_to_jpeg(bytes: Vec<u8>, filename: &str) -> Result<Vec<u8>, AppError> {
    let fname = filename.to_string();
    let input_len = bytes.len();
    let handle = tokio::task::spawn_blocking(move || {
        use tokimo_package_ffmpeg::image::{ImageDecodeOptions, ImageFormat, decode_image_from_bytes};

        let opts = ImageDecodeOptions {
            width: None,
            format: ImageFormat::Jpeg,
            quality: 2,
        };
        decode_image_from_bytes(&bytes, &fname, &opts)
    });

    let result = tokio::time::timeout(FFMPEG_TIMEOUT, handle)
        .await
        .map_err(|_| AppError::Internal(format!("FFmpeg timeout for {filename} ({FFMPEG_TIMEOUT:?})")))?
        .map_err(|e| AppError::Internal(format!("task join error: {e}")))?
        .map_err(|e| AppError::Internal(format!("FFI decode failed for {filename}: {e}")))?;

    tracing::info!(
        "[media-inspector] Converted {filename} ({} KB) → JPEG ({} KB) via FFI",
        input_len / 1024,
        result.len() / 1024
    );
    Ok(result)
}
