# DermLens — AI 皮膚病変トリアージツール

皮膚病変の分類＋リスク層別化 Web アプリケーション。ダーモスコピー 7 クラス分類（DenseNet-121）と臨床写真 6 クラス分類（PanDerm ViT-Large）の 2 モデル構成。後処理閾値設計・確率キャリブレーション・Grad-CAM 可視化・肌色バイアス評価を組み込み、FastAPI による自前 RESTful API + Next.js フロントエンドのフルスタック構成。

**デモ:** [skin-lesion-triage.vercel.app](https://skin-lesion-triage.vercel.app)
**推論 API:** [Hugging Face Spaces](https://huggingface.co/spaces/komail9/skin-lesion-triage) · [Swagger UI](https://komail9-skin-lesion-triage.hf.space/docs)
**モデルカード:** [MODEL_CARD.md](MODEL_CARD.md)

| モデル | モダリティ | データセット | 多クラス AUC | Binary AUC | 外部評価 (DDI) | 状態 |
|--------|-----------|------------|-------------|------------|---------------|------|
| DenseNet-121 v3a | ダーモスコピー | HAM10000 (10,015 枚, 7 クラス) | 0.9783 | 0.9615 | 0.583（モダリティ不一致） | **本番** |
| PanDerm ViT-Large v10 | 臨床写真 | Fitzpatrick17k 腫瘍 (6 クラス) | 0.909* | — | **0.675** | **実験段階** |

\* Fitzpatrick17k は patient ID 非公開のため test split の patient leakage 懸念あり。DDI AUC 0.675 が唯一の信頼できる外部指標。

v10（臨床写真版）はスマートフォン写真での皮膚スクリーニングを見据えて開発したが、DDI 外部評価で臨床使用に十分な精度には達しなかった。アプリ上では「研究段階」ラベルを付けてデプロイしている。詳細は[Clinical Photo モデル: PanDerm v10](#clinical-photo-モデル-panderm-v10)を参照。

> **診断ツールではありません。** 本アプリはポートフォリオプロジェクトであり、医学的判断に使用してはなりません。詳細は[倫理的配慮](#倫理的配慮)を参照してください。

---

## 臨床的背景

本プロジェクトは [Esteva et al., _Nature_ 2017](https://doi.org/10.1038/nature21056) に触発されている。深層学習による皮膚癌分類が皮膚科専門医レベルに達することを示したランドマーク論文である。翌年の [Haenssle et al., _Annals of Oncology_ 2018](https://doi.org/10.1093/annonc/mdy166) は58名の皮膚科医とCNNの直接比較で同様の知見を追認し、臨床実装への道を開いた。本プロジェクトでは、公開データセットHAM10000（[Tschandl et al. 2018](https://doi.org/10.1038/sdata.2018.161)）で同じ転移学習アプローチを再現し、手法を実地で理解した。

2024–2025年の皮膚科AI領域では、PanDerm（[Yan et al., _Nature Medicine_ 2025](https://doi.org/10.1038/s41591-025-03747-y)）のような200万画像規模のfoundation modelが登場する一方、GPT-4oのHAM10000での精度は57.7%に留まり（[Sattler et al. 2025](https://doi.org/10.2196/67551)）、汎用LLMは専門モデルに遠く及ばない。本プロジェクトでは古典的CNN（DenseNet-121）での徹底的な後処理設計と、最新foundation model（PanDerm）の比較評価の両方を経験した。

---

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────┐
│                     ブラウザ                              │
│  画像アップロード → 確率バー → 臨床コンテキスト表示       │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│              Vercel（フロントエンド）                     │
│  Next.js 15 App Router + React 19 + TypeScript           │
│  API Route: /api/predict-{ds,cl} → サーバーサイドプロキシ │
└──────────────────────┬──────────────────────────────────┘
                       │ RESTful API (1 request)
┌──────────────────────▼──────────────────────────────────┐
│        Hugging Face Spaces（推論 — Docker SDK）          │
│  FastAPI + Gradio 共存                                    │
│  ├── /api/v1/predict-ds  → DenseNet-121 v3a (dermoscopy) │
│  ├── /api/v1/predict-cl  → PanDerm ViT-Large v10 (clin.) │
│  ├── /api/v1/health      → ヘルスチェック                 │
│  ├── /docs               → Swagger UI（OpenAPI 仕様書）   │
│  └── /                   → Gradio UI（デモ）              │
│                                                           │
│  推論パイプライン:                                        │
│  画像前処理 → モデル推論 → Temperature Scaling            │
│  → 7クラス Youden 閾値判定 → 悪性リスク二値集約           │
│  → Grad-CAM 生成 → JSON レスポンス                        │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│              CI/CD パイプライン                           │
│  GitHub Actions: TypeScript 型チェック + ビルド            │
│    (.github/workflows/ci.yml — push/PR時に自動実行)       │
│  Vercel: main ブランチ push で自動デプロイ                │
│  HF Spaces: deploy-hf.yml で hf-space/ を自動 push       │
└─────────────────────────────────────────────────────────┘
```

**設計判断:**

- **FastAPI 自前 RESTful API** — Gradio の自動生成 API（SSE プロトコル、3 ステップリクエスト）を排し、エンドポイント設計・Pydantic レスポンススキーマ・エラーコード・OpenAPI 仕様を自分でコントロール。DermLens の推論は同期処理で 1 回の POST で完結するため、SSE は不要であり、フレームワークの抽象がユースケースに合っていなかった。
- **FastAPI + Gradio 共存** — `gr.mount_gradio_app()` で Gradio を `/gradio` にマウント。デモ用 UI と API が同一コンテナで稼働。推論ロジック（`inference.py`）は両方から共有し、Markdown 生成は Gradio 側のみが担当。
- **サーバーサイド API プロキシ** — Next.js API Route から HF Spaces を呼び出すことで、推論エンドポイント URL をクライアント側コードに露出させず、HF コールドスタート時のエラーハンドリングも可能にしている。
- **Docker SDK** — Gradio SDK では FastAPI を動かせないため Docker SDK に移行。Dockerfile は 8 行。
- **CPU 推論** — 単一画像の分類には十分（レイテンシ約 2 秒）。GPU はこのユースケースにはオーバースペックでホスティングコストも増加。

---

## 採用モデル概要

### Dermoscopy: DenseNet-121 v3a

| 項目 | 値 |
|------|-----|
| アーキテクチャ | DenseNet-121, ImageNet 事前学習, 全層 fine-tune (~7.98M params) |
| 訓練データ | HAM10000 — 10,015 枚, 7 クラス |
| 不均衡対策 | WeightedRandomSampler + CrossEntropyLoss |
| ROC-AUC (macro) | 0.9783 (test) |
| Binary AUC | 0.9615（mel + bcc + akiec 集約, test） |
| Binary 閾値 | 0.1439（Binary Youden, val最適化） |
| 悪性感度 | 0.964 (val) / 0.875 (test) |
| 悪性特異度 | 0.865 (val) / 0.462 precision (test) |
| Calibration | Temperature Scaling T=1.4478, ECE 0.0316 → 0.0289 |
| 外部評価 (DDI AUC) | 0.583（モダリティ不一致 — ダーモスコピー訓練 → 臨床写真評価） |
| Explainability | Grad-CAM on `features.denseblock4` |

### Clinical Photo: PanDerm ViT-Large v10（研究段階）

| 項目 | 値 |
|------|-----|
| アーキテクチャ | PanDerm ViT-Large/16 backbone (凍結) + Linear Probe (~6K params) |
| 訓練データ | Fitzpatrick17k 腫瘍サブセット, 6 クラス |
| 不均衡対策 | L-BFGS Linear Probe（backbone 凍結） |
| ROC-AUC (macro) | 0.9263（Fitz test*） |
| Binary AUC | 0.9089（Fitz test*） |
| Binary 閾値 | 0.1776（臨床 ≥95% 基準） |
| 悪性感度 | 0.825（DDI overall） |
| 悪性特異度 | 0.369（DDI overall） |
| Calibration | Temperature Scaling T=0.8699, ECE 0.0523 → 0.0505 |
| 外部評価 (DDI AUC) | **0.675** |
| DDI FST V–VI AUC | 0.572（near chance — アプリ上で明示） |
| ライセンス | PanDerm weights: CC-BY-NC-ND 4.0（非商用） |
| Explainability | Grad-CAM adapted for ViT (`blocks[-1].norm1`, 14×14 patch grid) |

\* Fitz test は patient leakage 懸念あり。DDI AUC 0.675 が信頼できる外部指標。

> 開発経緯・棄却実験・閾値設計の詳細は[モデル開発の詳細](#モデル開発の詳細)を参照。

---

## 肌色バイアス評価（v7 / v9 / v10）

HAM10000 のオーストリア/オーストラリア集団は、白色人種の病変呈示に対する系統的バイアスを生む。これは精度の問題だけでなく、**公平性の問題**である。濃い肌色のメラノーマは臨床的にも進行期で診断される傾向があり、バイアスのかかった AI システムはこの格差をさらに拡大するリスクがある。

評価データ: **DDI（Diverse Dermatology Images）** — バイオプシー確認済み 656 枚（[Daneshjou et al., _Science Advances_ 2022](https://doi.org/10.1126/sciadv.abq6147)）

| 実験 | モデル | 訓練データ | DDI overall | FST III-IV | FST V-VI | FST 格差 |
|------|--------|----------|------------|-----------|---------|---------|
| v7 | DenseNet v3a | HAM（DS） | 0.583 | 0.633 | 0.514 | 0.078 |
| v9 | PanDerm LP | HAM（DS） | 0.666 | 0.757 | 0.506 | 0.187 |
| v10 | PanDerm LP | Fitz17k（臨床） | **0.675** | 0.758 | **0.572** | **0.085** |

**v7 → v9:** backbone の汎用視覚特徴で +8.3pt。ただし FST V-VI は 0.506 のまま。
**v9 → v10:** 臨床写真データで head を訓練し直し、FST V-VI が +6.6pt、FST 格差が半減。
**残存バイアス:** FST V-VI AUC 0.572 は臨床的に不十分。アプリ上で明示。

---

## データセット

### HAM10000（v3a 用）

**出典:** [Harvard Dataverse](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/DBW86T) — 7 疾患カテゴリの 10,015 枚のダーモスコピー画像。

| クラス | 枚数 | 割合 |
|--------|------|------|
| nv | 6,705 | 66.9% |
| mel | 1,113 | 11.1% |
| bkl | 1,099 | 11.0% |
| bcc | 514 | 5.1% |
| akiec | 327 | 3.3% |
| vasc | 142 | 1.4% |
| df | 115 | 1.1% |

**撮像方法:** 全 10,015 枚がダーモスコピー画像（偏光ダーモスコープによる約 10 倍拡大撮影）。スマートフォン写真とは根本的に異なる。**モデル精度はスマートフォン画像には転用できない。**

**患者集団:** ウィーン医科大学およびオーストラリア Queensland のクリニックで収集。Fitzpatrick I–III（白色人種）に偏重。

**クラス不均衡への対処:** WeightedRandomSampler（逆頻度サンプリング、`num_samples=len(df_train)`）。nv:df = 58:1 の偏りあり。

### Fitzpatrick17k（v10 用）

Fitzpatrick17k 腫瘍サブセット、6 クラス（benign/malignant × dermal/epidermal/melanocyte）。Patient ID 非公開のため train/test 間の patient leakage を完全には否定できない。

### DDI（外部評価用）

656 枚、バイオプシー確認済み、FST I–VI の多様な肌色を含む独立評価セット。

---

## 倫理的配慮

### 免責事項の設計根拠

アプリは常時表示・非消去型の免責バナーを表示し、診断ツールではないことを明示。v3a（dermoscopy）と v10（clinical photo）でバナー内容を切り替え、各モデル固有の限界を表示する。

**臨床 AI は偽りの安心感を生むのではなく、害を減らすべきである。** メラノーマ感度 65% の「皮膚がん検出器」を一般向けに出し、ユーザーがその出力を医学的安全保証として扱えば、積極的に有害。UI は専門医への受診を促す方向に設計しており、受診を遠ざける方向には設計していない。

### リスク層別化ロジック

| 層 | 対象 | 推奨行動 |
|----|------|---------|
| 緊急 | mel（悪性黒色腫） | 皮膚科への即時受診 |
| 早期紹介 | bcc、akiec | 皮膚科の予約を推奨 |
| 経過観察 | nv、bkl、df、vasc | 変化があれば受診 |

---

## 技術スタック

| レイヤー | 技術 | バージョン |
|---------|------|----------|
| ML 学習 | PyTorch + torchvision | 2.6.0+cu124 |
| Dermoscopy モデル | DenseNet-121 (ImageNet 事前学習) | — |
| Clinical Photo モデル | PanDerm ViT-Large + timm | — |
| 推論 API | **FastAPI** + Uvicorn (Docker SDK) | 0.115+ |
| デモ UI | Gradio（`/gradio` にマウント） | 5.x |
| フロントエンド | Next.js (App Router) + React + TypeScript | 15.x / 19.x |
| スタイリング | Tailwind CSS | 4.x |
| CI/CD | GitHub Actions + Vercel 自動デプロイ | — |
| GPU (学習) | NVIDIA RTX 3080 ×2 | CUDA 12.x |
| ランタイム | Python 3.11 / Node.js 20 | — |

---

## リポジトリ構成

```
skin-lesion-triage/
├── README.md
├── MODEL_CARD.md                      ← CHAI 準拠モデルカード
├── docs/
│   └── 04_実験ログ.md                 ← v2〜v10 全実験の詳細ログ
├── src/
│   ├── skin-lesion-classification-acc-90-pytorch(...).ipynb
│   │                                  ← v2 ベースライン（Kaggle 原典）
│   ├── v3a.ipynb                      ← 訓練: WRS + CE（最終モデル）
│   ├── v3b.ipynb                      ← 訓練: WRS + Focal Loss + CB weights（棄却）
│   ├── v4.ipynb                       ← 閾値最適化 + 二値集約
│   ├── v5.ipynb                       ← Temperature Scaling キャリブレーション
│   ├── v6.ipynb                       ← Conformal Prediction（棄却）
│   ├── v7.ipynb                       ← DDI バイアス評価 (DenseNet v3a)
│   ├── v8.ipynb                       ← PanDerm LP + HAM
│   ├── v9.ipynb                       ← PanDerm LP DDI バイアス評価
│   ├── v10.ipynb                      ← PanDerm LP + Fitzpatrick17k + DDI評価
│   ├── tsne_v3a.ipynb                 ← t-SNE 埋め込み解析 (DenseNet v3a)
│   ├── tsne_v8.ipynb                  ← t-SNE 埋め込み解析 (PanDerm v8)
│   ├── tsne_v10.ipynb                 ← t-SNE 埋め込み解析 (PanDerm v10)
│   ├── gradcam_v3a.ipynb              ← Grad-CAM 可視化分析
│   ├── gradcam_v10.ipynb              ← Grad-CAM ViT 適用分析
│   ├── prepare_v10_deploy.py          ← v10 重み抽出スクリプト
│   └── cache-examples.mjs             ← Example キャッシュ生成（FastAPI対応）
├── models/                            ← .pth ファイル（Git LFS、.gitignore 対象外）
│   ├── densenet_v3a_*.pth             ← 最終モデル重み
│   └── panderm_lp_head_v10_*.pth      ← PanDerm LP head（臨床写真版）
├── results/                           ← 実験成果物（npz, json, png）
│   ├── models/                        ← val_predictions, confusion matrix
│   ├── v4_TS/                         ← Temperature Scaling 成果物
│   ├── v5_ph/                         ← 閾値最適化 成果物
│   ├── v7/ v8/ v9/ v10/              ← DDI バイアス評価 成果物
│   └── tsne/                          ← t-SNE 埋め込み解析（report PDF + PNG）
├── hf-space/                          ← HF Spaces 推論サーバー（Docker SDK）
│   ├── Dockerfile                     ← Docker エントリ（8行）
│   ├── main.py                        ← FastAPI + Gradio 共存起動
│   ├── api.py                         ← RESTful API エンドポイント（Pydantic スキーマ）
│   ├── inference.py                   ← 推論ロジック（共通層、Markdown 生成なし）
│   ├── gradio_ui.py                   ← Gradio UI + Markdown 生成（HF 表示用）
│   ├── requirements.txt               ← torch, timm, fastapi, uvicorn, gradio
│   ├── posthoc_thresholds_v3a.json    ← v3a 閾値・Temperature 設定
│   ├── posthoc_thresholds_v10.json    ← v10 閾値・Temperature 設定
│   ├── temperature_v3a.json           ← v3a Temperature Scaling パラメータ
│   ├── densenet_v3a_*.pth             ← DenseNet-121 重み（Git LFS）
│   ├── panderm_lp_head_v10_*.pth      ← PanDerm LP head（Git LFS）
│   ├── examples/                      ← Gradio UI 用 Example 画像
│   ├── .gitattributes                 ← Git LFS 設定
│   └── README.md                      ← HF Spaces メタデータ（sdk: docker）
├── web/                               ← Next.js フロントエンド
│   ├── app/
│   │   ├── page.tsx                   ← メインページ（状態管理 + タブ切替）
│   │   └── api/
│   │       ├── predict-ds/route.ts    ← v3a プロキシ（FastAPI 1リクエスト）
│   │       └── predict-cl/route.ts    ← v10 プロキシ（+ graceful degradation）
│   ├── components/
│   │   ├── DisclaimerBanner.tsx        ← モデル別免責バナー
│   │   ├── ImageUploader.tsx           ← ドラッグ&ドロップアップロード
│   │   ├── PredictionResult.tsx        ← 確率バー + リスク判定（構造化データ）
│   │   ├── ModelDetailsPanel.tsx       ← モデルスペック（折りたたみ）
│   │   └── Footer.tsx
│   ├── lib/
│   │   ├── types.ts                   ← 型定義（RiskData 構造化）
│   │   └── diseases.ts               ← 疾患臨床情報
│   ├── public/
│   │   ├── examples/                  ← Example 画像（v3a×4 + v10×4）
│   │   └── cache/                     ← Example 推論結果キャッシュ（JSON + Grad-CAM）
│   └── next.config.ts
├── .github/workflows/
│   ├── ci.yml                         ← TypeScript 型チェック + ビルド（push/PR）
│   └── deploy-hf.yml                 ← HF Spaces 自動デプロイ
└── data/                              ← .gitignore 対象（HAM10000 約 2GB）
```

---

## モデル開発の詳細

### Dermoscopy モデル: DenseNet-121 v3a

#### モデル選定: DenseNet-121 vs EfficientNet-B0

両モデルを ImageNet 事前学習済み重みから HAM10000（10,015 画像、7 クラス）で fine-tune。ReduceLROnPlateau (patience=3) を適用し、ベストエポックの重みを復元して評価。

| 指標 | DenseNet-121 | EfficientNet-B0 | 選定 |
|------|-------------|----------------|------|
| パラメータ数 | 8.0M | 5.3M | — |
| Best Val Acc | 0.935 (epoch 13) | 0.931 (epoch 8) | DenseNet |
| ROC-AUC (macro) | **0.9908** | 0.9871 | DenseNet |
| Macro F1 | **0.83** | 0.80 | DenseNet |
| bcc F1 | **0.92** | 0.81 | DenseNet |
| mel F1 | **0.62** | 0.60 | DenseNet |

**選定理由:** 全体 Accuracy は同等（0.93）だが、臨床的に重要な悪性腫瘍（bcc: F1 0.92 vs 0.81）で DenseNet が大幅にリード。EfficientNet は epoch 8 でピーク後に val loss 増加、DenseNet は LR 減衰後の epoch 11-13 で改善が継続。

#### v3a 最終結果（WeightedRandomSampler + CrossEntropyLoss）

| 指標 | v3a (test) |
|------|-----|
| ROC-AUC macro (OvR) | **0.9783** |
| mel ROC-AUC (OvR) | 0.9328 |
| Binary AUC | **0.9615** |
| mel Recall (argmax) | 0.565 |
| mel Recall (Binary Youden, test) | **0.875** |
| Test Accuracy | 0.908 |

#### クラス別性能（テストセット）

| クラス | 疾患名 | Precision | Recall | F1 | AUC (OvR) | 悪性度 |
|--------|--------|-----------|--------|------|-----------|--------|
| nv | 色素性母斑 | 0.975 | 0.959 | 0.967 | 0.9821 | 良性 |
| vasc | 血管性病変 | 1.000 | 0.833 | 0.909 | 0.9899 | 良性 |
| bcc | 基底細胞癌 | 0.789 | 0.833 | 0.811 | 0.9950 | 悪性 |
| bkl | 脂漏性角化症等 | 0.640 | 0.727 | 0.681 | 0.9633 | 良性 |
| df | 皮膚線維腫 | 1.000 | 0.750 | 0.857 | 0.9991 | 良性 |
| akiec | 日光角化症/ボーエン病 | 0.750 | 0.600 | 0.667 | 0.9861 | 前癌病変 |
| mel | **悪性黒色腫** | 0.464 | 0.565 | 0.510 | 0.9328 | **悪性** |

#### 既知の限界：悪性黒色腫の感度

v3a の mel Recall（argmax, test）= **0.565**。23 枚中 10 枚のメラノーマを見逃している。スクリーニングツールとして許容できない水準。

**重要な洞察:** mel ROC-AUC = 0.9328（test）。モデルの判別能力はすでに高い。低い recall は argmax 閾値の問題であり、特徴抽出の問題ではない。ポストホック閾値最適化で mel Recall = **0.875**（test, Binary Youden）を達成（後述の推論パイプラインを参照）。

#### v3b: Focal Loss + CB Loss の検証と棄却

| 指標 | v3a (CE) | v3b (FL+CB) | Δ |
|------|---------|------------|---|
| ROC-AUC macro (test) | **0.9783** | 0.9723 | −0.0060 |
| mel AUC (test) | **0.9328** | 0.9116 | −0.0212 |
| Macro F1 (test) | **0.772** | 0.742 | −0.030 |

**v3a を採用。** 不均衡対処の損失関数が plain CE + WRS を下回る結果は、不均衡学習文献で報告されている "no silver bullet" 現象（Johnson & Khoshgoftaar, 2019）と整合する。

### 推論パイプライン（v3a）

#### Step 1 — Temperature Scaling（v5）

| 指標 | Before | After | Δ |
|------|--------|-------|---|
| ECE overall | 0.0316 | 0.0289 | −0.0026 |
| mel ECE | 0.0389 | 0.0331 | −0.0058 |
| Temperature | — | **1.4478** | T > 1: 過信補正 |

mel ECE も TS 後に改善（−0.0058）。

#### Step 2 — 7クラス分類（クラス別 Youden 閾値）

TS 補正済み確率にクラスごとの Youden's J 閾値（OvR ROC 最適化、val）を適用:

| クラス | 閾値 (Youden) | 感度 | 特異度 | AUC (OvR) |
|--------|-------------|------|--------|-----------|
| akiec | 0.0161 | 0.933 | 0.953 | 0.9752 |
| bcc | 0.0252 | 1.000 | 0.963 | 0.9957 |
| bkl | 0.1066 | 0.932 | 0.923 | 0.9738 |
| df | 0.2188 | 1.000 | 0.996 | 0.9982 |
| mel | 0.0194 | 1.000 | 0.737 | 0.9410 |
| nv | 0.6629 | 0.934 | 0.973 | 0.9920 |
| vasc | 0.0483 | 1.000 | 0.993 | 0.9989 |
| **macro** | — | — | — | **0.9825** |

#### Step 3 — 二値悪性リスク判定（3 クラス集約 + Binary Youden 閾値）

**悪性リスクスコア:** `P(malignant) = P(mel) + P(bcc) + P(akiec)`（Esteva et al., Nature 2017 の集約アプローチと同一設計）

3 クラス集約により mel OvR AUC 0.9410 → Binary AUC **0.9683**（val）に向上。

| 手法 | 閾値 | 悪性 Recall (val) | Specificity (val) |
|------|------|-----------|------------|
| **Binary Youden（採用）** | **0.1439** | **0.964** | 0.865 |
| Binary Clinical | 0.1439 | 0.964 | 0.865 |

Binary Youden と Binary Clinical が同一閾値（0.1439）に収束。Test での Binary Recall は 0.875（Binary AUC 0.9615）。

スクリーニング用途では偽陰性（見逃し → 診断遅延 → ステージ進行）のコストが偽陽性を大きく上回る。

#### Conformal Prediction（v6 — 棄却）

APS（Romano et al., 2020）を適用したが、高精度モデルでは prediction set が飽和（平均 3.68 クラス / 7 クラス）。80% 以上が「要受診」判定となり臨床的に無意味なため棄却。**棄却の判断自体がポートフォリオ内容。**

---

### Clinical Photo モデル: PanDerm v10

#### 動機

v3a（DenseNet + HAM10000）は DDI 臨床写真評価で AUC 0.583（chance level 付近）。訓練モダリティ（ダーモスコピー）と評価モダリティ（臨床写真）の不一致が支配的要因。臨床写真でのスクリーニングには別モデルが必要。

#### アーキテクチャ

PanDerm ViT-Large（Yan et al., Nature Medicine 2025）の backbone を凍結し、Linear Probe（6K params）を Fitzpatrick17k 腫瘍サブセット（6 クラス）で訓練。backbone は `timm` で再構築し、CC-BY-NC-ND 4.0 の重みのみをロード（ソースコード依存を回避）。

#### 性能

| 指標 | v10 |
|------|-----|
| Temperature | 0.8699（T < 1: LP 特有の自信不足を補正） |
| ECE | 0.0523 → 0.0505 |
| Binary Clinical 閾値 | 0.1776（感度 ≥ 95% 基準） |
| DDI AUC | **0.675** |
| DDI FST V–VI AUC | 0.572（near chance） |

#### 先行研究との DDI 性能比較

| モデル | 開発元 | 訓練データ | DDI Binary AUC（95% CI） |
|--------|--------|----------|------------------------|
| DeepDerm / Google DermAssist | Google Health / Stanford | 臨床写真＋DS混合 | 0.56（0.51–0.61） |
| ModelDerm | ソウル大 | 臨床写真 | 0.65（0.61–0.70） |
| HAM10000 baseline | Tschandl et al. / ISIC | ダーモスコピー | 0.67（0.62–0.71） |
| **v10（本プロジェクト）** | PanDerm + Fitz17k | 臨床写真 | **0.675** |
| v7（本プロジェクト） | DenseNet + HAM | ダーモスコピー | 0.583 |

v10 の DDI AUC 0.675 は先行研究の中で最も高い HAM10000 baseline（0.67）とほぼ同水準。CI の重複を考慮すると統計的に有意な差ではない。

#### v10 の制約（誠実な整理）

- Fitz17k は patient ID 非公開のため test split の patient leakage 懸念あり → Fitz test AUC 0.909 は過大評価の可能性
- DDI 臨床閾値での Precision = 0.315（5 件中 3 件が偽陽性）
- 独立外部評価が DDI 単独（n=656）のみ

#### なぜ v10 をデプロイしたか

v10 は「高性能な臨床写真分類器」としてデプロイしているのではない。**デプロイの目的は以下の 3 点:**

1. **モダリティ不一致の定量的実証:** v3a（DS 訓練）が臨床写真で AUC 0.583 に落ちることを示し、v10（臨床写真訓練）で 0.675 に回復する過程自体が、「訓練データと推論環境の一致が性能を支配する」という ML 基本原則の実証。
2. **Foundation Model の実運用経験:** PanDerm の重みを `timm` で再構築し、ライセンス制約（CC-BY-NC-ND 4.0）を回避しつつデプロイ。論文の再現にとどまらず、weight loading の silent failure（AUC ~0.54）の検出・修正を含む実運用上の課題を解決している。
3. **制約を明示したうえでのデプロイ判断:** DDI AUC 0.675・Precision 0.315 をアプリ上に明記し、「研究段階」ラベルを付けた。性能が不十分なモデルを黙ってデプロイするのではなく、制約を定量的に示したうえでユーザーに判断材料を提供する設計が妥当と考えた。

アプリ上では DDI AUC 0.675 を前面に出し、Fitz test AUC は「参考値・leakage 懸念あり」と明記する設計方針をとる。

> 学習の詳細ログ: [`docs/04_実験ログ.md`](docs/04_実験ログ.md)

---

## 参考文献

### 皮膚科 AI — 基盤論文

| # | 論文 | 掲載 | IF | 被引用数 |
|---|------|------|----|---------|
| 1 | Esteva A et al. "Dermatologist-level classification of skin cancer with deep neural networks" (2017) | Nature | 64.8 | ~11,200 |
| 2 | Haenssle HA et al. "Man against machine" (2018) | Ann Oncol | 56.7 | ~1,260 |
| 3 | Tschandl P et al. "The HAM10000 dataset" (2018) | Sci Data | 5.8 | ~3,100 |

### 皮膚科 AI — 最新動向（2024–2025）

| # | 論文 | 掲載 | 使用箇所 |
|---|------|------|---------|
| 4 | Yan S et al. "PanDerm" (2025) | Nature Medicine | v10 backbone |
| 5 | Zhou Y et al. "SkinGPT-4" (2024) | Nature Communications | 将来方向の参照 |
| 6 | Sattler L et al. "Evaluating Diagnostic Accuracy of ChatGPT-4 Omni in Identifying Melanoma" (2025) | JMIR Dermatology | 臨床的背景 |

### クラス不均衡・損失関数

| # | 論文 | 掲載 | 使用箇所 |
|---|------|------|---------|
| 7 | Lin TY et al. "Focal Loss for Dense Object Detection" (2017) | ICCV | v3b（棄却） |
| 8 | Cui Y et al. "Class-Balanced Loss Based on Effective Number of Samples" (2019) | CVPR | v3b（棄却） |

### 不確実性推定・バイアス評価

| # | 論文 | 掲載 | 使用箇所 |
|---|------|------|---------|
| 9 | Romano Y et al. "Classification with Valid and Adaptive Coverage" (2020) | NeurIPS | v6（棄却） |
| 10 | Daneshjou R et al. "Disparities in dermatology AI performance" (2022) | Science Advances | DDI 評価データ |

### 埋め込み解析・可視化

| # | 論文 | 掲載 | 使用箇所 |
|---|------|------|---------|
| 11 | Cino L et al. "Skin Lesion Classification Through Test Time Augmentation and Explainable AI" (2025) | J. Imaging | t-SNE 解析手法の参照 |
| 12 | van der Maaten L, Hinton G. "Visualizing Data using t-SNE" (2008) | JMLR | t-SNE 手法 |

### 書籍

| # | 書籍 | 参照章 |
|---|------|-------|
| 13 | Huyen C. "Designing Machine Learning Systems" (2022) | 第 4 章（学習データ）、第 6 章（特徴量） |

---

## ライセンス

Apache 2.0

**注意:** PanDerm backbone の重み（v10）は CC-BY-NC-ND 4.0（非商用）。本リポジトリの Apache 2.0 ライセンスは PanDerm 重みには適用されない。
