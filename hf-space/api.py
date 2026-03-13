"""
DermLens FastAPI — RESTful API エンドポイント
Next.js route.ts から呼ばれる。構造化JSONを返す。
"""

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import time

from inference import (
    run_inference_v3a,
    run_inference_v10,
    V10_AVAILABLE,
)

app = FastAPI(
    title="DermLens API",
    version="1.0.0",
    description="皮膚病変トリアージ推論API — DenseNet-121 (dermoscopy) + PanDerm ViT-Large (clinical photo)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://dermlens.vercel.app"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── レスポンススキーマ ───────────────────────────────

class PredictionResponse(BaseModel):
    confidences: dict[str, float]
    top_prediction: str
    top_confidence: float
    binary_risk_score: float
    risk_level: str              # "high" | "moderate" | "low"
    threshold: float
    calibrated: bool
    temperature: float
    ece: float
    gradcam_base64: str | None
    model_version: str
    inference_time_ms: float


# ── エンドポイント ───────────────────────────────────

ALLOWED_TYPES = {"image/jpeg", "image/png"}


@app.post("/api/v1/predict-ds", response_model=PredictionResponse)
async def predict_dermoscopy(image: UploadFile):
    """Dermoscopy model (v3a) — DenseNet-121, HAM10000 7-class"""
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, detail="JPEG/PNGのみ対応")

    image_bytes = await image.read()
    start = time.monotonic()
    result = run_inference_v3a(image_bytes)
    elapsed = (time.monotonic() - start) * 1000

    return PredictionResponse(**result, inference_time_ms=round(elapsed, 1))


@app.post("/api/v1/predict-cl", response_model=PredictionResponse)
async def predict_clinical(image: UploadFile):
    """Clinical photo model (v10) — PanDerm ViT-Large, Fitzpatrick17k 6-class"""
    if not V10_AVAILABLE:
        raise HTTPException(
            503,
            detail="臨床写真モデル（v10）は現在利用できません。モデルファイルが見つかりません。",
        )

    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, detail="JPEG/PNGのみ対応")

    image_bytes = await image.read()
    start = time.monotonic()
    result = run_inference_v10(image_bytes)
    elapsed = (time.monotonic() - start) * 1000

    return PredictionResponse(**result, inference_time_ms=round(elapsed, 1))


@app.get("/api/v1/health")
async def health():
    return {
        "status": "ok",
        "v3a_loaded": True,
        "v10_loaded": V10_AVAILABLE,
    }