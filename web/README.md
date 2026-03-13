# DermLens AI — 皮膚病変トリアージ支援 Web App

DenseNet-121 による7疾患分類（HAM10000）のフルスタック Web アプリケーション。

## アーキテクチャ

```
ブラウザ → Next.js App Router → API Route (/api/predict) → HF Spaces Gradio API
                                                              ↓
                                                  DenseNet-121 推論 (PyTorch)
                                                              ↓
                                          7クラス確率 + 臨床コンテキスト表示
```

## セットアップ手順

### 前提条件

- Node.js 20+ (`node -v` で確認)
- npm 10+ または yarn

### 1. プロジェクトディレクトリの準備

```bash
# このディレクトリをそのまま使用（create-next-appは不要）
cd skin-lesion-triage-web
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開く。

### 4. 動作確認

1. ダーモスコピー画像をドラッグ&ドロップ（またはクリックして選択）
2. HF Spaces API が呼び出され、7クラスの確率が表示される
3. 悪性疑い（mel/bcc/akiec）の場合、受診推奨アラートが表示される

> **Note:** HF Spaces 無料枠はスリープ後の起動に 30〜60 秒かかります。
> 初回リクエストでタイムアウトした場合、もう一度試してください。

## ファイル構成

```
app/
├── layout.tsx          # ルートレイアウト（メタデータ、フォント）
├── page.tsx            # メインページ（状態管理、コンポーネント統合）
├── globals.css         # Tailwind v4 + カスタムアニメーション
└── api/
    └── predict/
        └── route.ts    # API Route: HF Spaces Gradio API 呼び出し
components/
├── Header.tsx          # ヘッダー
├── DisclaimerBanner.tsx # 免責事項 + AI限界の明示
├── ImageUploader.tsx   # ドラッグ&ドロップ画像アップロード
└── PredictionResult.tsx # 予測結果 + 確率バー + 臨床コンテキスト
lib/
├── types.ts            # TypeScript 型定義
└── diseases.ts         # 7疾患の臨床情報 + ユーティリティ関数
```

## 臨床コンテキスト（差別化ポイント）

7疾患それぞれに皮膚科専門医としての解説を付与：

| ラベル | 疾患名 | 悪性度 | 受診推奨 |
|--------|--------|--------|----------|
| mel    | 悪性黒色腫 | 悪性 | **緊急** |
| bcc    | 基底細胞癌 | 悪性 | 早期 |
| akiec  | 日光角化症/ボーエン病 | 前癌病変 | 早期 |
| bkl    | 脂漏性角化症等 | 良性 | 経過観察 |
| df     | 皮膚線維腫 | 良性 | 経過観察 |
| nv     | 色素性母斑 | 良性 | 経過観察 |
| vasc   | 血管性病変 | 良性 | 経過観察 |

## 技術スタック

- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4
- **Backend:** Next.js API Routes (Server-side)
- **ML Inference:** HF Spaces (Gradio API)
- **Model:** DenseNet-121, fine-tuned on HAM10000

## TODO（Week 4〜6）

- [ ] 臨床コンテキストの加筆（OT先生の臨床経験に基づく修正）
- [ ] レスポンシブデザインの微調整
- [ ] ローディングUI改善
- [ ] エラーハンドリング強化（HF Spaces スリープ復帰対応）
- [ ] OGP画像・ファビコン設定
- [ ] Vercel デプロイ設定
