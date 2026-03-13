import { NextRequest, NextResponse } from "next/server";

// ============================================================
// POST /api/predict-cl
// FastAPI /api/v1/predict-cl へ推論リクエスト — v10 Clinical Photo Model
// ============================================================

const HF_SPACE_URL = "https://komail9-skin-lesion-triage.hf.space";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body as { image: string };

    if (!image) {
      return NextResponse.json(
        { success: false, error: "画像が提供されていません" },
        { status: 400 },
      );
    }

    // ── Base64 → Blob 変換 ──
    const base64Match = image.match(
      /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/,
    );
    if (!base64Match) {
      return NextResponse.json(
        { success: false, error: "無効な画像形式です" },
        { status: 400 },
      );
    }

    const mimeType = `image/${base64Match[1]}`;
    const ext = base64Match[1] === "jpeg" ? "jpg" : base64Match[1];
    const binaryStr = atob(base64Match[2]);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    // ── FastAPI 推論リクエスト ──
    const formData = new FormData();
    formData.append("image", blob, `upload.${ext}`);

    const res = await fetch(`${HF_SPACE_URL}/api/v1/predict-cl`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[v10] FastAPI predict failed:", res.status, errText);

      // v10 モデル未読み込み時の graceful degradation
      if (res.status === 503 || res.status === 404) {
        return NextResponse.json(
          {
            success: false,
            error:
              "臨床写真モデル（v10）は現在利用できません。HF Space にモデルファイルがデプロイされていない可能性があります。",
          },
          { status: 503 },
        );
      }

      if (res.status === 500) {
        return NextResponse.json(
          { success: false, error: errText || "推論サーバーエラー" },
          { status: 500 },
        );
      }
      throw new Error(`推論リクエスト失敗: ${res.status}`);
    }

    const api = await res.json();

    // ── FastAPI → PredictionResult マッピング ──
    console.log("[v10] ✓ Top prediction:", api.top_prediction, api.top_confidence);

    return NextResponse.json({
      success: true,
      data: {
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
        gradcamImageUrl: api.gradcam_base64
          ? `data:image/jpeg;base64,${api.gradcam_base64}`
          : null,
      },
    });
  } catch (error) {
    console.error("[v10] Prediction error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "予測処理中にエラーが発生しました";

    if (
      message.includes("fetch failed") ||
      message.includes("ECONNREFUSED") ||
      message.includes("ENOTFOUND")
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "HF Spacesが起動中です。先にブラウザで https://komail9-skin-lesion-triage.hf.space にアクセスしてSpaceを起こしてから再度お試しください。",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
