
## v7: DDI 肌色バイアス評価 (DenseNet-121)
- **日付**: 2026-03-11
- **モデル**: densenet_v3a (HAM10000訓練)
- **評価データ**: DDI 656枚 (biopsy確認済み)
- **Normalize**: HAM10000 train統計値
- **Binary AUC (全体)**: 0.5829

### Binary AUC FST層別 (Bootstrap 95% CI)
| FST群 | N | 悪性数 | AUC | 95% CI | Sensitivity | Specificity |
| ------ | - | ------ | --- | ------ | ----------- | ----------- |
| FST I-II | 208 | 49 | 0.592 | [0.497, 0.683] | 0.286 | 0.786 |
| FST III-IV | 241 | 74 | 0.633 | [0.555, 0.705] | 0.324 | 0.868 |
| FST V-VI | 207 | 48 | 0.514 | [0.414, 0.613] | 0.271 | 0.830 |

**統計的有意性**: CIが全群で重なっており、FST間のAUC差は統計的に有意ではない

### 7クラス Top-1 Accuracy (mapped subset)
| FST群 | Accuracy | 正解/N |
| ------ | -------- | ------ |
| FST I-II | 0.316 | 42/133 |
| FST III-IV | 0.342 | 63/184 |
| FST V-VI | 0.333 | 26/78 |

### Melanoma検出 FST別
| FST群 | mel N | 7class正解 | Binary検出(≥0.5) | P(mal)平均 |
| ------ | ----- | ---------- | ---------------- | ---------- |
| FST I-II | 7 | 0/7 | 1/7 | 0.272 |
| FST III-IV | 7 | 0/7 | 3/7 | 0.341 |
| FST V-VI | 7 | 2/7 | 2/7 | 0.233 |

### OOD悪性腫瘍ストレステスト (HAM10000外疾患)
- OOD悪性腫瘍: 48枚
- 検出 (P_mal≥0.5): 11/48
- P(malignant)平均: 0.242

### 成果物
- results/v7/ddi_predictions.csv
- results/v7/fst_comparison.csv

### 判断・メモ
- モダリティ不一致 (ダーモスコピー→臨床写真) が支配的交絡因子
- FST V-VI AUC 0.499はchance level。臨床写真モデル (v10) で再評価
- 統計的分離不可: サンプルサイズ不足でモダリティ不一致と肌色バイアスを切り離せない
