"use client";

import { useState, useCallback } from "react";
import Header from "@/components/Header";
import DisclaimerBanner from "@/components/DisclaimerBanner";
import ImageUploader from "@/components/ImageUploader";
import PredictionResultDisplay from "@/components/PredictionResult";
import Footer from "@/components/Footer";
import type {
  PredictionResult,
  PredictApiResponse,
  UploadStatus,
} from "@/lib/types";

// ── モデルタブ定義 ─────────────────────────────────
type ModelTab = "v3a" | "v10";

const TAB_CONFIG = {
  v3a: {
    label: "Dermoscopy",
    sublabel: "DenseNet-121 v3a",
    apiRoute: "/api/predict-ds",
    uploadLabel: "ダーモスコピー画像をアップロード",
    examples: [
      {
        src: "/examples/v3a_mel_correct.jpg",
        label: "Example 1",
        cacheId: "1",
      },
      {
        src: "/examples/v3a_nv_correct.jpg",
        label: "Example 2",
        cacheId: "2",
      },
      {
        src: "/examples/v3a_mel_misclass.jpg",
        label: "Example 3",
        cacheId: "3",
      },
      {
        src: "/examples/v3a_bcc_correct.jpg",
        label: "Example 4",
        cacheId: "4",
      },
    ],
    exampleNote:
      "クリックすると推論が実行されます（HAM10000 データセットより）",
    footerModel:
      "Model: DenseNet-121 v3a · Dataset: HAM10000 (10,015 dermoscopy images) · 7-class classification",
  },
  v10: {
    label: "Clinical Photo",
    sublabel: "PanDerm v10",
    apiRoute: "/api/predict-cl",
    uploadLabel: "臨床写真をアップロード",
    examples: [
      {
        src: "/examples/v10_mal_correct.jpg",
        label: "Example 5",
        cacheId: "5",
      },
      {
        src: "/examples/v10_benign_correct.jpg",
        label: "Example 6",
        cacheId: "6",
      },
      {
        src: "/examples/v10_mal_misclass.jpg",
        label: "Example 7",
        cacheId: "7",
      },
      {
        src: "/examples/v10_ddi_dark_tp.png",
        label: "Example 8",
        cacheId: "8",
      },
    ],
    exampleNote:
      "クリックすると推論が実行されます（Fitzpatrick17k / DDI データセットより）",
    footerModel:
      "Model: PanDerm ViT-Large v10 · Dataset: Fitzpatrick17k (tumor 6-class) · DDI AUC 0.675 (experimental)",
  },
} as const;

export default function Home() {
  const [activeTab, setActiveTab] = useState<ModelTab>("v3a");
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  // ── 追加: Example画像のプレビュー用 ──
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const config = TAB_CONFIG[activeTab];

  const handleTabChange = useCallback((tab: ModelTab) => {
    setActiveTab(tab);
    setStatus("idle");
    setResult(null);
    setError(null);
    setPreviewUrl(null);
  }, []);

  const handleImageSelected = useCallback(
    async (dataUri: string) => {
      setStatus("uploading");
      setResult(null);
      setError(null);
      // ユーザーが直接アップロードした場合は externalPreview を消す
      // （ImageUploader 内部の localPreview が表示される）
      setPreviewUrl(null);

      try {
        setStatus("predicting");

        const response = await fetch(config.apiRoute, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: dataUri }),
        });

        const data: PredictApiResponse = await response.json();

        if (!data.success || !data.data) {
          throw new Error(data.error || "予測に失敗しました");
        }

        setResult(data.data);
        setStatus("done");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "予測処理中にエラーが発生しました";
        setError(message);
        setStatus("error");
      }
    },
    [config.apiRoute],
  );

  const handleExampleClick = useCallback(
    async (cacheId: string) => {
      setResult(null);
      setError(null);

      // ── 追加: クリックしたExampleの画像をプレビュー表示 ──
      const imgSrc = config.examples.find((e) => e.cacheId === cacheId)?.src;
      if (imgSrc) {
        setPreviewUrl(imgSrc);
      }

      setStatus("predicting");

      try {
        // 静的キャッシュから取得（public/cache/{model}/{id}.json）
        const cacheUrl = `/cache/${activeTab}/${cacheId}.json`;
        const res = await fetch(cacheUrl);

        if (res.ok) {
          const cached: PredictionResult = await res.json();
          setResult(cached);
          setStatus("done");
          return;
        }

        // キャッシュ未生成 → API フォールバック
        console.warn(`Cache miss: ${cacheUrl}, falling back to API`);
        if (!imgSrc) throw new Error("Example not found");

        const imgRes = await fetch(imgSrc);
        const blob = await imgRes.blob();
        const dataUri = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () =>
            reject(new Error("画像の読み込みに失敗しました"));
          reader.readAsDataURL(blob);
        });
        await handleImageSelected(dataUri);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "サンプル画像の読み込みに失敗しました";
        setError(message);
        setStatus("error");
      }
    },
    [handleImageSelected, activeTab, config.examples],
  );

  // ── 追加: ImageUploaderのリセット時にpreviewUrlもクリア ──
  const handlePreviewReset = useCallback(() => {
    setPreviewUrl(null);
    setResult(null);
    setStatus("idle");
    setError(null);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        <DisclaimerBanner model={activeTab} />

        {/* ── モデル切り替えタブ ── */}
        <div className="flex rounded-xl border border-slate-200 overflow-hidden">
          {(Object.keys(TAB_CONFIG) as ModelTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex-1 px-4 py-3 text-center transition-colors cursor-pointer ${
                activeTab === tab
                  ? "bg-blue-50 border-b-2 border-blue-500"
                  : "bg-white hover:bg-slate-50"
              }`}
            >
              <span
                className={`text-sm font-semibold ${
                  activeTab === tab ? "text-blue-700" : "text-slate-500"
                }`}
              >
                {TAB_CONFIG[tab].label}
              </span>
              <span
                className={`block text-xs mt-0.5 ${
                  activeTab === tab ? "text-blue-500" : "text-slate-400"
                }`}
              >
                {TAB_CONFIG[tab].sublabel}
              </span>
            </button>
          ))}
        </div>

        {/* v10 研究段階注意 */}
        {activeTab === "v10" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs text-amber-700">
              <span className="font-semibold">⚠️ 研究段階モデル:</span>{" "}
              臨床写真モデルはDDI外部評価AUC=0.675の実験的モデルです。
              ダーモスコピーモデル（v3a, Binary
              AUC=0.979）と比較して精度が大幅に低く、 特にFST
              V–VI（濃色肌）ではほぼchance levelです。
            </p>
          </div>
        )}

        {/* 画像アップロード */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            {config.uploadLabel}
          </h2>
          <ImageUploader
            onImageSelected={handleImageSelected}
            status={status}
            externalPreview={previewUrl}
            onReset={handlePreviewReset}
          />
        </section>

        {/* ── Example 画像 ── */}
        <section>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">
            サンプル画像で試す
          </h2>
          <div
            className={`grid gap-3 ${
              config.examples.length <= 3 ? "grid-cols-3" : "grid-cols-4"
            }`}
          >
            {config.examples.map((ex, i) => (
              <button
                key={`${activeTab}-${i}`}
                onClick={() => handleExampleClick(ex.cacheId)}
                disabled={status === "predicting" || status === "uploading"}
                className="group relative aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <img
                  src={ex.src}
                  alt={ex.label}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">{config.exampleNote}</p>
        </section>

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in-up">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>

              <div>
                <p className="text-sm font-medium text-red-800">
                  エラーが発生しました
                </p>
                <p className="text-sm text-red-600 mt-1">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    setStatus("idle");
                  }}
                  className="mt-2 text-xs font-medium text-red-700 hover:text-red-900 underline cursor-pointer"
                >
                  もう一度試す
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 予測結果 */}
        {result && (
          <PredictionResultDisplay result={result} model={activeTab} />
        )}

        <Footer activeTab={activeTab} modelDescription={config.footerModel} />
      </main>
    </div>
  );
}
