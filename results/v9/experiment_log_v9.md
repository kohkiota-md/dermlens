
## v9: PanDerm LP DDI肌色バイアス評価
- **日付**: 2026-03-11
- **モデル**: PanDerm ViT-Large LP (v8 head)
- **評価データ**: DDI 656枚 (biopsy確認済み)
- **Normalize**: ImageNet標準値 (PanDerm用)
- **Transform**: Resize(256) → CenterCrop(224)
- **Binary AUC (全体)**: 0.6663

### FST層別 Binary AUC (Bootstrap 95% CI, n=2000)
| FST群 | N | 悪性数 | AUC | 95% CI | Sensitivity | Specificity |
| ------ | - | ------ | --- | ------ | ----------- | ----------- |
| FST I-II | 208 | 49 | 0.693 | [0.603, 0.778] | 0.041 | 0.975 |
| FST III-IV | 241 | 74 | 0.757 | [0.686, 0.823] | 0.122 | 1.000 |
| FST V-VI | 207 | 48 | 0.506 | [0.402, 0.605] | 0.021 | 1.000 |

**統計的有意性**: FST III-IV と FST V-VI のCIが重なっていない

### Melanoma検出 FST別 (全21枚)
| FST群 | mel N | 7class正解 | Binary検出(≥0.5) | P(mel)平均 | P(mal)平均 |
| ------ | ----- | ---------- | ---------------- | ---------- | ---------- |
| FST I-II | 7 | 0/7 | 0/7 | 0.050 | 0.120 |
| FST III-IV | 7 | 0/7 | 0/7 | 0.006 | 0.070 |
| FST V-VI | 7 | 0/7 | 0/7 | 0.006 | 0.007 |

### OOD悪性腫瘍ストレステスト (HAM10000外疾患)
- OOD悪性腫瘍: 64枚
- 検出 (P_mal≥0.5): 1/64
- P(malignant)平均: 0.075

### DenseNet v7 vs PanDerm v9 比較
| 指標 | DenseNet v7 | PanDerm v9 | Δ |
| ---- | ----------- | ---------- | - |
| Binary AUC (全体) | 0.547 | 0.666 | +0.119 |
| FST I-II AUC | 0.560 | 0.693 | +0.133 |
| FST III-IV AUC | 0.585 | 0.757 | +0.172 |
| FST V-VI AUC | 0.497 | 0.506 | +0.009 |

### 成果物
- results/v9/ddi_predictions_panderm.csv
- results/v9/fst_comparison_panderm.csv
- results/v9/roc_by_fst.png

### 判断・メモ
- FST V-VI AUC 0.500: chance level。臨床写真モデル (v10) でFitz訓練後に再評価
- FST I-IV改善 (+12.8〜17.6pt)、FST V-VIほぼ変化なし (+0.1pt)
- P(mal)平均: FST I-II=0.130 vs FST V-VI=0.008 (1/16)
- PanDerm著者の "stable cross-skin-tone" はfine-tuning後の評価。LP+HAM headでは再現できない
