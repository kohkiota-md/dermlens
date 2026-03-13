// ============================================================
// 型定義：皮膚病変トリアージアプリ
// ============================================================

/** 悪性リスク判定の構造化データ */
export interface RiskData {
  /** 悪性リスク集約値（0〜1） */
  binaryRiskScore: number;
  /** リスクレベル */
  riskLevel: "high" | "moderate" | "low";
  /** 使用した閾値 */
  threshold: number;
  /** Temperature Scaling 適用済みか */
  calibrated: boolean;
  /** Temperature 値 */
  temperature: number;
  /** ECE 値 */
  ece: number;
}

/** 推論結果 */
export interface PredictionResult {
  /** 疾患ラベル → 確率（0〜1） */
  confidences: Record<string, number>;
  /** 最も確率の高い疾患 */
  topPrediction: string;
  /** 最高確率値 */
  topConfidence: number;
  /** 悪性リスク判定（構造化データ） */
  risk: RiskData;
  /** Grad-CAMヒートマップ画像URL or data URI */
  gradcamImageUrl?: string | null;
}

/** 各疾患の臨床情報 */
export interface DiseaseInfo {
  /** 疾患略称（モデル出力ラベル） */
  key: string;
  /** 正式名称（英語） */
  nameEn: string;
  /** 正式名称（日本語） */
  nameJa: string;
  /** 皮膚科医としての臨床解説 */
  description: string;
  /** 悪性度カテゴリ */
  severity: "benign" | "premalignant" | "malignant";
  /** 受診推奨レベル */
  urgency: "routine" | "soon" | "urgent";
  /** 受診推奨メッセージ */
  recommendation: string;
  /** 鑑別診断のポイント */
  differentialNote: string;
}

/** API Route のレスポンス */
export interface PredictApiResponse {
  success: boolean;
  data?: PredictionResult;
  error?: string;
}

/** アップロード状態 */
export type UploadStatus = "idle" | "uploading" | "predicting" | "done" | "error";
