"use client";

import { useState } from "react";
import type { PredictionResult, RiskData, DiseaseInfo } from "@/lib/types";
import {
  getDiseaseDict,
  isMalignantSuspected,
  getUrgencyColor,
  getSeverityBadge,
  sortConfidences,
} from "@/lib/diseases";

interface Props {
  result: PredictionResult;
  model?: "v3a" | "v10";
}

export default function PredictionResultDisplay({
  result,
  model = "v3a",
}: Props) {
  const diseases = getDiseaseDict(model);
  const sorted = sortConfidences(result.confidences);
  const topDisease = diseases[result.topPrediction];

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* ──────────────────────────────────────────────
          v10 研究段階バナー
          ────────────────────────────────────────────── */}
      {model === "v10" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700">
            <span className="font-semibold">⚠️ 研究段階モデル</span> — DDI外部評価
            AUC=0.675。FST V–VI（濃色肌）では AUC=0.572。スクリーニング補助の参考値としてのみご利用ください。
          </p>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          悪性リスク判定 + 受診推奨
          ────────────────────────────────────────────── */}
      {result.risk && (
        <RiskAssessmentPanel risk={result.risk} model={model} topDisease={topDisease} />
      )}

      {/* ──────────────────────────────────────────────
          予測結果サマリー
          ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">予測結果</h3>
            {topDisease && (
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  getSeverityBadge(topDisease.severity).className
                }`}
              >
                {getSeverityBadge(topDisease.severity).label}
              </span>
            )}
          </div>
          {topDisease && (
            <p className="text-lg font-bold text-slate-900 mt-1">
              {topDisease.nameJa}
              <span className="text-sm font-normal text-slate-400 ml-2">
                ({topDisease.nameEn})
              </span>
            </p>
          )}
        </div>

        {/* ──────────────────────────────────────────────
            確率バー（全クラス）
            ────────────────────────────────────────────── */}
        <div className="p-4 space-y-3">
          {sorted.map(([label, confidence], index) => {
            const disease = diseases[label];
            const isTop = index === 0;
            const percentage = (confidence * 100).toFixed(1);
            const isMalig = isMalignantSuspected(label, model);

            return (
              <div key={label}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-mono font-bold uppercase ${
                        isTop ? "text-slate-800" : "text-slate-500"
                      }`}
                    >
                      {label}
                    </span>
                    {disease && (
                      <span className="text-xs text-slate-400">
                        {disease.nameJa.split("（")[0]}
                      </span>
                    )}
                    {isMalig && confidence > 0.1 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    )}
                  </div>
                  <span
                    className={`text-xs font-mono tabular-nums ${
                      isTop ? "font-bold text-slate-800" : "text-slate-400"
                    }`}
                  >
                    {percentage}%
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`confidence-bar h-full rounded-full ${
                      isMalig && confidence > 0.1
                        ? isTop
                          ? "bg-red-500"
                          : "bg-red-300"
                        : isTop
                        ? "bg-blue-500"
                        : "bg-blue-200"
                    }`}
                    style={{
                      width: `${Math.max(confidence * 100, 0.5)}%`,
                      animationDelay: `${index * 80}ms`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──────────────────────────────────────────────
          Grad-CAM（モデルの注視領域）
          ────────────────────────────────────────────── */}
      {result.gradcamImageUrl && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">
              Grad-CAM（モデルの注視領域）
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              赤い領域ほどモデルの判断に寄与しています
            </p>
          </div>
          <div className="p-4">
            <img
              src={result.gradcamImageUrl}
              alt="Grad-CAM heatmap"
              className="w-full rounded-lg"
            />
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
          臨床コンテキスト（展開可能）
          ────────────────────────────────────────────── */}
      {topDisease && <ClinicalContextPanel disease={topDisease} />}
    </div>
  );
}

// ============================================================
// 臨床コンテキストパネル — 皮膚科医にしか書けない解説
// ============================================================
function ClinicalContextPanel({ disease }: { disease: DiseaseInfo }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div
      className={`rounded-xl border overflow-hidden ${getUrgencyColor(
        disease.urgency,
      )}`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
          <span className="text-sm font-semibold">臨床コンテキスト</span>
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 8.25l-7.5 7.5-7.5-7.5"
          />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 text-sm animate-fade-in-up">
          <div>
            <p className="font-medium mb-1">疾患概要</p>
            <p className="opacity-80">{disease.description}</p>
          </div>
          <div>
            <p className="font-medium mb-1">鑑別診断のポイント</p>
            <p className="opacity-80">{disease.differentialNote}</p>
          </div>
          <div>
            <p className="font-medium mb-1">受診推奨</p>
            <p className="opacity-80">{disease.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// 悪性リスク判定パネル — 構造化データから直接レンダリング
// ============================================================
function RiskAssessmentPanel({
  risk,
  model = "v3a",
  topDisease,
}: {
  risk: RiskData;
  model?: "v3a" | "v10";
  topDisease?: DiseaseInfo;
}) {
  const isMalig = risk.riskLevel === "high";
  const score = `${(risk.binaryRiskScore * 100).toFixed(1)}%`;
  const threshold = `${(risk.threshold * 100).toFixed(1)}%`;
  const ece = risk.ece.toFixed(3);
  const temp = risk.temperature.toFixed(4);

  const riskFormula =
    model === "v10"
      ? "悪性リスク = malignant 3クラスの合計確率"
      : "悪性リスク = mel + bcc + akiec の合計確率";

  return (
    <div
      className={`rounded-xl border-2 p-4 ${
        isMalig
          ? "border-red-300 bg-red-50"
          : "border-emerald-300 bg-emerald-50"
      }`}
    >
      {/* 判定ラベル */}
      <p
        className={`text-lg font-bold ${
          isMalig ? "text-red-800" : "text-emerald-800"
        }`}
      >
        {isMalig ? "⚠️ 悪性の疑いあり" : "✅ 悪性の疑いは低い"}
      </p>

      {/* 受診推奨（悪性疑い時のみ） */}
      {isMalig && topDisease && (
        <p
          className={`text-sm mt-2 ${
            topDisease.urgency === "urgent"
              ? "text-red-700"
              : "text-amber-700"
          }`}
        >
          {topDisease.recommendation}
        </p>
      )}

      {/* スコア・閾値 */}
      <p
        className={`text-sm font-semibold mt-3 ${
          isMalig ? "text-red-700" : "text-emerald-700"
        }`}
      >
        悪性リスクスコア: {score}
        <span className="font-normal ml-1">（判定閾値: {threshold}）</span>
      </p>

      {/* ECE */}
      <p
        className={`text-xs mt-1 ${
          isMalig ? "text-red-500" : "text-emerald-500"
        }`}
      >
        モデルの確率誤差 ±{Math.round(risk.ece * 100)}%（ECE = {ece}）
      </p>

      {/* 技術注記 */}
      <div
        className={`mt-3 pt-3 border-t text-xs ${
          isMalig
            ? "border-red-200 text-red-400"
            : "border-emerald-200 text-emerald-400"
        }`}
      >
        <p className="italic">
          {riskFormula}（Temperature Scaling補正済み, T={temp}）
        </p>
        <p className="mt-1">
          ⚠️ このアプリは診断ツールではありません。必ず医師の診察を受けてください。
        </p>
      </div>
    </div>
  );
}
