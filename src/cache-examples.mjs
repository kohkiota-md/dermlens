#!/usr/bin/env node
// ============================================================
// src/cache-examples.mjs
//
// FastAPI /api/v1/predict-ds, /api/v1/predict-cl を叩いて
// example 画像の推論結果 JSON + Grad-CAM 画像を
// web/public/cache/ に静的ファイルとして保存する。
//
// Vercel CDN から即配信されるため、example クリック時に
// HF API 呼び出し不要。
//
// 使い方:
//   1. HF Space が Running 状態であることを確認
//   2. node src/cache-examples.mjs
//   3. web/public/cache/ をコミット
//
// 生成されるファイル:
//   web/public/cache/v3a/1.json, gradcam-1.jpg, ...
//   web/public/cache/v10/5.json, gradcam-5.jpg, ...
// ============================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HF_SPACE_URL = "https://komail9-skin-lesion-triage.hf.space";
const CACHE_DIR = path.resolve(__dirname, "..", "web", "public", "cache");

const EXAMPLES = {
  v3a: {
    endpoint: "predict-ds",
    images: [
      { id: "1", file: "web/public/examples/v3a_mel_correct.jpg" },
      { id: "2", file: "web/public/examples/v3a_nv_correct.jpg" },
      { id: "3", file: "web/public/examples/v3a_mel_misclass.jpg" },
      { id: "4", file: "web/public/examples/v3a_bcc_correct.jpg" },
    ],
  },
  v10: {
    endpoint: "predict-cl",
    images: [
      { id: "5", file: "web/public/examples/v10_mal_correct.jpg" },
      { id: "6", file: "web/public/examples/v10_benign_correct.jpg" },
      { id: "7", file: "web/public/examples/v10_mal_misclass.jpg" },
      { id: "8", file: "web/public/examples/v10_ddi_dark_tp.png" },
    ],
  },
};

// ── FastAPI 推論（1リクエストで完結）──────────────────
async function predict(imagePath, endpoint) {
  const fileBuffer = fs.readFileSync(path.resolve(__dirname, "..", imagePath));
  const ext = path.extname(imagePath).slice(1);
  const mimeType = ext === "png" ? "image/png" : "image/jpeg";
  const blob = new Blob([fileBuffer], { type: mimeType });

  const formData = new FormData();
  formData.append("image", blob, `upload.${ext}`);

  console.log(`  POST /api/v1/${endpoint}...`);
  const res = await fetch(`${HF_SPACE_URL}/api/v1/${endpoint}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API failed: ${res.status} ${errText}`);
  }

  return res.json();
}

// ── base64 → ファイル保存 ───────────────────────────
function saveBase64Image(base64, savePath) {
  if (!base64) return false;
  const buffer = Buffer.from(base64, "base64");
  fs.writeFileSync(savePath, buffer);
  console.log(`  Grad-CAM → ${path.basename(savePath)}`);
  return true;
}

// ── メイン ──────────────────────────────────────────
async function main() {
  console.log("=== DermLens Example Cache Generator (FastAPI) ===\n");

  for (const [model, config] of Object.entries(EXAMPLES)) {
    const modelDir = path.join(CACHE_DIR, model);
    fs.mkdirSync(modelDir, { recursive: true });
    console.log(`── ${model.toUpperCase()} (/api/v1/${config.endpoint}) ──`);

    for (const img of config.images) {
      try {
        const api = await predict(img.file, config.endpoint);

        // Grad-CAM base64 → JPGファイル保存
        let gradcamImageUrl = null;
        if (api.gradcam_base64) {
          const gradcamFile = `gradcam-${img.id}.jpg`;
          const ok = saveBase64Image(
            api.gradcam_base64,
            path.join(modelDir, gradcamFile),
          );
          if (ok) gradcamImageUrl = `/cache/${model}/${gradcamFile}`;
        }

        // PredictionResult 形式で保存
        const result = {
          confidences: api.confidences,
          topPrediction: api.top_prediction,
          topConfidence: api.top_confidence,
          risk: {
            binaryRiskScore: api.binary_risk_score,
            riskLevel: api.risk_level,
            threshold: api.threshold,
            calibrated: api.calibrated,
            temperature: api.temperature,
            ece: api.ece,
          },
          gradcamImageUrl,
        };

        fs.writeFileSync(
          path.join(modelDir, `${img.id}.json`),
          JSON.stringify(result, null, 2),
          "utf-8",
        );

        console.log(
          `  ✓ ${img.id} → ${api.top_prediction} (${(api.top_confidence * 100).toFixed(1)}%)${gradcamImageUrl ? " + Grad-CAM" : ""}\n`,
        );
      } catch (err) {
        console.error(`  ✗ ${img.id}: ${err.message}\n`);
      }
    }
  }

  console.log("✓ Done. Commit web/public/cache/ to deploy.");
}

main().catch(console.error);
