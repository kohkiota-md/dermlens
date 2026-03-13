
## v10: PanDerm LP + Fitzpatrick17k + TS + 閾値最適化 + DDI評価
- **日付**: 2026-03-12
- **モデル**: PanDerm ViT-Large LP, backbone凍結, 6クラス (Fitz17k腫瘍)
- **LP訓練**: solver=lbfgs, lambda=61.44
- **TS**: Fitz val, L-BFGS, T=0.8699
- **閾値**: Youden=0.5606 (val Recall=0.797, Prec=0.829)
- **閾値**: 臨床(>=95%)=0.1776 (val Recall=0.952, Prec=0.642)
- **ECE**: before=0.0523 / after=0.0505 (Δ=-0.0019)

### 6クラス評価 (Fitz test)
- **ROC-AUC macro**: 0.9263
- **Accuracy**: 0.6926
- **Macro F1**: 0.6547

| クラス | Precision | Recall | F1 | AUC (OvR) |
| ------ | --------- | ------ | -- | --------- |
| benign dermal | 0.669 | 0.731 | 0.699 | 0.8864 |
| benign epidermal | 0.656 | 0.592 | 0.622 | 0.8799 |
| benign melanocyte | 0.762 | 0.471 | 0.582 | 0.9299 |
| malignant dermal | 0.778 | 0.438 | 0.560 | 0.9835 |
| malignant epidermal | 0.737 | 0.828 | 0.780 | 0.9364 |
| malignant melanoma | 0.671 | 0.700 | 0.685 | 0.9417 |
| **macro avg** | 0.712 | 0.626 | 0.655 | 0.9263 |

### Fitz test binary (malignant/benign)
- malignant=208, benign=267

| 条件 | Binary AUC | Recall | Specificity | Precision | F1 |
| ---- | ---------- | ------ | ----------- | --------- | -- |
| argmax (thr=0.5) | 0.9089 | 0.822 | 0.846 | 0.807 | 0.814 |
| TS + Youden | 0.9089 | 0.793 | 0.861 | 0.817 | 0.805 |
| TS + 臨床閾値 (>=95%) | 0.9089 | 0.947 | 0.596 | 0.646 | 0.768 |

### DDI外部評価 4条件 × 全群
| 条件 | FST群 | AUC | Recall | Specificity | Precision |
| ---- | ----- | --- | ------ | ----------- | --------- |
| 1. Baseline (thr=0.5) | overall | 0.675 | 0.491 | 0.720 | 0.382 |
| 1. Baseline (thr=0.5) | FST I-II | 0.657 | 0.571 | 0.579 | 0.295 |
| 1. Baseline (thr=0.5) | FST III-IV | 0.758 | 0.554 | 0.784 | 0.532 |
| 1. Baseline (thr=0.5) | FST V-VI | 0.572 | 0.312 | 0.792 | 0.312 |
| 2. TS + thr=0.5 | overall | 0.673 | 0.497 | 0.711 | 0.378 |
| 2. TS + thr=0.5 | FST I-II | 0.655 | 0.571 | 0.585 | 0.298 |
| 2. TS + thr=0.5 | FST III-IV | 0.754 | 0.568 | 0.760 | 0.512 |
| 2. TS + thr=0.5 | FST V-VI | 0.571 | 0.312 | 0.786 | 0.306 |
| 3. TS + Youden | overall | 0.673 | 0.444 | 0.761 | 0.396 |
| 3. TS + Youden | FST I-II | 0.655 | 0.531 | 0.616 | 0.299 |
| 3. TS + Youden | FST III-IV | 0.754 | 0.500 | 0.820 | 0.552 |
| 3. TS + Youden | FST V-VI | 0.571 | 0.271 | 0.843 | 0.342 |
| 4. TS + 臨床閾値(>=95%) | overall | 0.673 | 0.825 | 0.369 | 0.315 |
| 4. TS + 臨床閾値(>=95%) | FST I-II | 0.655 | 0.898 | 0.252 | 0.270 |
| 4. TS + 臨床閾値(>=95%) | FST III-IV | 0.754 | 0.892 | 0.449 | 0.418 |
| 4. TS + 臨床閾値(>=95%) | FST V-VI | 0.571 | 0.646 | 0.403 | 0.246 |

### DDI Binary AUC: v7 / v9 / v10 比較
| FST群 | DenseNet v7 | PanDerm+HAM v9 | PanDerm+Fitz v10 | v9→v10 Δ |
| ----- | ----------- | -------------- | ---------------- | --------- |
| overall | 0.547 | 0.666 | 0.675 | +0.009 |
| FST I-II | 0.560 | 0.689 | 0.657 | -0.032 |
| FST III-IV | 0.585 | 0.761 | 0.758 | -0.003 |
| FST V-VI | 0.497 | 0.500 | 0.572 | +0.072 |

### 成果物
- models/panderm_lp_head_v10_fitz_tumor_*.pth
- results/models/v10_test_predictions.npz  (all_probs, all_logits, y_true)
- results/models/v10_val_predictions.npz
- results/v10/posthoc_thresholds_v10.json
- results/v10/ddi_predictions_v10.csv

### 判断・メモ
- Fitz test AUC 0.909 は訓練分布内評価。独立外部評価は DDI overall AUC
- DDI overall AUC v9→v10: FST V-VI以外は改善、FST V-VI は +0.072 と最大改善
- Youden閾値がDDIに汎化しない（Fitz val vs DDI 分布差）
- 臨床閾値はFST全群で一様に改善 → バイアス選択的緩和にはならない
- FST V-VI AUC 0.572 は chance level（0.5）をわずかに上回るが実用水準には未達
- v10初回（9クラス全体）DDI AUC 0.591に悪化。原因: inflammatoryクラス（67%）の支配とmalignantクラス定義のDDIとの不一致。腫瘍6クラスのみに絞り込んで修正版を訓練
