"use client";

import { useState } from "react";

interface Props {
  model?: "v3a" | "v10";
}

export default function DisclaimerBanner({ model = "v3a" }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        {/* Warning icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-5 h-5 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            このアプリは診断ツールではありません
          </p>
          <p className="text-sm text-amber-700 mt-1">
            AIの予測結果は参考情報であり、医師の診察・診断に代わるものではありません。
            皮膚の異常が気になる場合は、必ず皮膚科専門医を受診してください。
          </p>

          {expanded && (
            <div className="mt-3 pt-3 border-t border-amber-200 space-y-2 text-xs text-amber-700 animate-fade-in-up">
              {model === "v3a" ? (
                <>
                  <p>
                    <strong>モデルの限界：</strong>
                    本モデルはHAM10000データセット（10,015枚のダーモスコピー画像）で訓練されています。
                    スマートフォンで撮影した一般的な臨床写真では精度が保証されません。
                  </p>
                  <p>
                    <strong>患者母集団の偏り：</strong>
                    訓練データはオーストリアの患者（フィッツパトリック スキンタイプI〜III）に偏っています。
                    日本人を含むスキンタイプIV〜VIでの検証は行われていません。
                  </p>
                  <p>
                    <strong>クラス不均衡：</strong>
                    母斑（nv）が6,705枚に対し、皮膚線維腫（df）は115枚と58倍の偏りがあり、
                    少数クラスの予測精度は低くなる傾向があります。
                  </p>
                </>
              ) : (
                <>
                  <p>
                    <strong>研究段階モデル：</strong>
                    本モデルはPanDerm ViT-Large（Fitzpatrick17k腫瘍サブセット、6クラス）で訓練された
                    Linear Probeです。DDI外部評価AUC=0.675であり、臨床使用に十分な精度ではありません。
                  </p>
                  <p>
                    <strong>肌色による精度格差：</strong>
                    DDI評価においてFST III–IV AUC=0.758に対し、FST V–VI（濃色肌）AUC=0.572と
                    統計的に有意な格差が確認されています。濃色肌ではほぼchance levelです。
                  </p>
                  <p>
                    <strong>内部評価の限界：</strong>
                    Fitzpatrick17kは患者IDが公開されておらず、train/test間の患者レベルのデータリークを
                    否定できません。内部指標（Binary AUC 0.909）は楽観的な推定値です。
                  </p>
                  <p>
                    <strong>ライセンス制約：</strong>
                    PanDermバックボーンの重みはCC-BY-NC-ND 4.0（非商用）ライセンスです。
                  </p>
                </>
              )}
            </div>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors cursor-pointer"
          >
            {expanded ? "閉じる" : "AI診断の限界について詳しく見る"}
          </button>
        </div>
      </div>
    </div>
  );
}
