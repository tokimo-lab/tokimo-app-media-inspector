# tokimo-app-media-inspector

图片分析中间件 — OCR / 人脸 / CLIP / GPS 逆地理编码

## 功能

- **OCR 文字识别** — 从图片中提取文字
- **人脸识别** — 检测人脸并提取 512 维 embedding
- **CLIP 嵌入** — 生成图片的 512 维语义向量
- **GPS 逆地理编码** — 从 EXIF GPS 坐标获取地址信息

## 使用

### HTTP API

```bash
# 分析图片
curl -X POST http://localhost:5678/api/apps/media-inspector/analyze \
  -H "Content-Type: application/json" \
  -d '{"path": "/path/to/image.jpg", "analysisType": "all"}'

# 健康检查
curl http://localhost:5678/api/apps/media-inspector/health

# 能力查询
curl http://localhost:5678/api/apps/media-inspector/capabilities
```

### Bus 调用（其他 App）

```rust
let payload = serde_json::to_vec(&serde_json::json!({
    "path": "/data/photos/IMG_001.jpg",
    "analysisType": "ocr"
}))?;
let result = bus_client.invoke("media-inspector", "analyze", payload, caller).await?;
```

### CLI

```bash
# 分析图片
tokimo-app-media-inspector analyze /path/to/image.jpg --type ocr

# 健康检查
tokimo-app-media-inspector health
```

## 开发

```bash
bun dev --apps=media-inspector
```
