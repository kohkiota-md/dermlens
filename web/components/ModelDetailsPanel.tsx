"use client";

import { useState } from "react";

// ============================================================
// Model Details — 折りたたみ式スペックテーブル
// ============================================================

type ModelTab = "v3a" | "v10";

const V3A_SPECS = [
  [
    "Architecture",
    "DenseNet-121, fine-tuned from ImageNet (all layers trainable, ~7.98M params)",
  ],
  ["Dataset", "HAM10000 — 10,015 dermoscopic images, 7 diagnostic classes"],
  [
    "Imbalance strategy",
    "WeightedRandomSampler + CrossEntropyLoss (unweighted)",
  ],
  ["ROC-AUC (macro)", "0.9783 (7-class OvR, test set)"],
  ["Binary AUC", "0.9615 (malignant aggregation: mel + bcc + akiec, test set)"],
  ["Sensitivity", "96.4% (binary malignant, val; Youden threshold=0.1439)"],
  ["Specificity", "86.5% (binary malignant, val; Youden threshold=0.1439)"],
  ["Calibration", "Temperature Scaling T=1.4478, ECE 0.0316 → 0.0289"],
  [
    "External eval",
    "DDI AUC 0.583 (cross-modality; same-modality external not available)",
  ],
  [
    "Skin tone",
    "Trained on Fitzpatrick I–III (European cohort). Performance on other skin tones is expected to be lower but cannot be quantified.",
  ],
] as const;

const V10_SPECS = [
  [
    "Architecture",
    "PanDerm ViT-Large/16 (Yan et al., Nature Medicine 2025) + Linear Probe (~6K params)",
  ],
  ["Dataset", "Fitzpatrick17k tumor subset, 6 classes"],
  [
    "Internal Binary AUC",
    "0.9089 (Fitz test; patient leakage caveat — see Model Card)",
  ],
  [
    "Sensitivity",
    "94.7% (binary malignant, clinical threshold=0.1776, Fitz test)",
  ],
  [
    "Specificity",
    "59.6% (binary malignant, clinical threshold=0.1776, Fitz test)",
  ],
  [
    "Calibration",
    "Temperature Scaling T=0.8699, ECE 0.0523 → 0.0505",
  ],
  [
    "External eval (DDI)",
    "AUC 0.675, sensitivity 82.5%, specificity 36.9% (clinical threshold)",
  ],
  ["DDI FST V–VI", "AUC 0.572 — near chance level"],
  ["Skin tone", "FST V–VI performance is substantially degraded"],
  [
    "License",
    "PanDerm weights: CC-BY-NC-ND 4.0 (non-commercial)",
  ],
] as const;

interface Props {
  activeTab: ModelTab;
}

export default function ModelDetailsPanel({ activeTab }: Props) {
  const [open, setOpen] = useState(false);
  const specs = activeTab === "v10" ? V10_SPECS : V3A_SPECS;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left cursor-pointer hover:bg-slate-50 transition-colors"
      >
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Model Details —{" "}
          {activeTab === "v10" ? "PanDerm v10" : "DenseNet-121 v3a"}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform ${
            open ? "rotate-180" : ""
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

      {open && (
        <div className="border-t border-slate-200 animate-fade-in-up">
          {/* スペックテーブル */}
          <table className="w-full text-xs">
            <tbody>
              {specs.map(([label, value], i) => (
                <tr
                  key={label}
                  className={i % 2 === 0 ? "bg-slate-50" : "bg-white"}
                >
                  <td className="px-4 py-2 font-semibold text-slate-600 w-1/3 align-top">
                    {label}
                  </td>
                  <td className="px-4 py-2 text-slate-500">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Inference Pipeline */}
          {activeTab === "v3a" ? (
            <div className="border-t border-slate-200 px-4 py-3 space-y-2 text-xs text-slate-400">
              <p className="font-semibold text-slate-500">Inference Pipeline</p>
              <p>
                <span className="font-medium">
                  Step 1 — Temperature Scaling:
                </span>{" "}
                logits / T=1.4478 → softmax. Corrects overconfidence (T &gt; 1).
                ECE: 0.0316 → 0.0289 overall.
              </p>
              <p>
                <span className="font-medium">Step 2 — 7-class output:</span>{" "}
                Per-class Youden&apos;s J threshold applied to calibrated
                probabilities (One-vs-Rest). mel: threshold=0.0194,
                sensitivity=1.000, specificity=0.737, AUC=0.9410.
              </p>
              <p>
                <span className="font-medium">
                  Step 3 — Binary malignancy score:
                </span>{" "}
                P(malignant) = P(mel) + P(bcc) + P(akiec) — Esteva et al.
                (Nature, 2017) aggregation. Binary Youden threshold=0.1439:
                sensitivity=0.964, specificity=0.865, Binary AUC=0.9683 (val).
              </p>
              <p>
                <span className="font-medium">Explainability:</span> Grad-CAM
                (Selvaraju et al., ICCV 2017) on features.denseblock4 (1024ch,
                7×7 spatial).
              </p>
              <p className="pt-1">
                <span className="font-medium">References:</span> Esteva et al.,
                Nature 2017 · Tschandl et al., Sci Data 2018 · Guo et al., ICML
                2017 · Selvaraju et al., ICCV 2017
              </p>
            </div>
          ) : (
            <div className="border-t border-slate-200 px-4 py-3 space-y-2 text-xs text-slate-400">
              <p className="font-semibold text-slate-500">Inference pipeline</p>
              <p>
                <span className="font-medium">
                  Step 1 — Feature extraction:
                </span>{" "}
                PanDerm ViT-Large encoder (frozen) extracts 1024-dim CLS token
                features. Architecture built via{" "}
                <code className="text-slate-500">timm</code> (Apache-2.0);
                PanDerm weights loaded via key mapping (CC-BY-NC-ND 4.0).
              </p>
              <p>
                <span className="font-medium">
                  Step 2 — Linear classification:
                </span>{" "}
                LP head (6K params): 1024-dim → 6-class logits.
              </p>
              <p>
                <span className="font-medium">
                  Step 3 — Temperature Scaling:
                </span>{" "}
                <code className="text-slate-500">logits / T=0.8699</code> →
                softmax. T &lt; 1 corrects underconfidence typical of LP.
              </p>
              <p>
                <span className="font-medium">
                  Step 4 — Binary malignancy score (Clinical threshold):
                </span>{" "}
                <code className="text-slate-500">
                  P(malignant) = P(mal_dermal) + P(mal_epidermal) +
                  P(mal_melanoma)
                </code>
                . Clinical threshold=0.1776: sensitivity=0.952 (val),
                specificity=0.596 (test). Clinical threshold adopted over Youden
                (recall=0.797): screening requires maximum sensitivity.
              </p>
              <p>
                <span className="font-medium">Explainability:</span> Grad-CAM
                adapted for ViT: gradient-weighted patch token activations from
                blocks[-1] (last transformer block), reshaped to 14×14 spatial
                grid (196 patches = 14×14, patch size 16×16 pixels).
              </p>
              <p className="pt-1">
                <span className="font-medium">Attribution:</span> PanDerm: Yan
                S, et al. Nature Medicine 2025; 31: 2691–2702.
              </p>
            </div>
          )}

          {/* Model Card リンク */}
          <div className="border-t border-slate-200 px-4 py-3">
            <a
              href="https://github.com/Kohkiota/skin-lesion-triage/blob/main/MODEL_CARD.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-700 underline"
            >
              📄 Full Model Card
            </a>
          </div>
        </div>
      )}
    </div>
  );
}