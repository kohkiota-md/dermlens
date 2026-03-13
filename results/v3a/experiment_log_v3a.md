
## v3a: DenseNet-121 WeightedRandomSampler + CrossEntropyLoss
- **日付**: 2026-03-11
- **モデル**: DenseNet-121 (densenet_v3a_*.pth)
- **損失関数**: CrossEntropyLoss (クラス重みなし)
- **サンプリング**: WeightedRandomSampler (num_samples=len(df_train))
- **分割**: train/val/test 3分割 (random_state=42)
- **Early stopping**: patience=7 (val_loss監視)
- **学習時間**: 58.1 min (3485 sec)
- **停止エポック**: 27 / 50
- **Best val loss**: 0.26548
- **Best val acc**: 0.91474

### Val評価 (7クラス、argmax) — TS最適化・閾値最適化のベース
| クラス | Precision | Recall | F1 | AUC (OvR) |
| ------ | --------- | ------ | -- | --------- |
| akiec | 0.6667 | 0.5333 | 0.5926 | 0.9749 |
| bcc | 0.7368 | 0.8235 | 0.7778 | 0.9960 |
| bkl | 0.7805 | 0.7273 | 0.7529 | 0.9738 |
| df | 0.5000 | 0.5000 | 0.5000 | 0.9982 |
| mel | 0.4412 | 0.6522 | 0.5263 | 0.9435 |
| nv | 0.9770 | 0.9615 | 0.9691 | 0.9917 |
| vasc | 0.8571 | 0.8571 | 0.8571 | 0.9992 |
| **macro avg** | 0.7085 | 0.7221 | 0.7108 | 0.9825 |

### Test評価 (7クラス、argmax) — 最終報告用
| クラス | Precision | Recall | F1 | AUC (OvR) |
| ------ | --------- | ------ | -- | --------- |
| akiec | 0.7500 | 0.6000 | 0.6667 | 0.9861 |
| bcc | 0.7895 | 0.8333 | 0.8108 | 0.9950 |
| bkl | 0.6400 | 0.7273 | 0.6809 | 0.9633 |
| df | 1.0000 | 0.7500 | 0.8571 | 0.9991 |
| mel | 0.4643 | 0.5652 | 0.5098 | 0.9328 |
| nv | 0.9747 | 0.9593 | 0.9669 | 0.9821 |
| vasc | 1.0000 | 0.8333 | 0.9091 | 0.9899 |
| **macro avg** | 0.8026 | 0.7526 | 0.7716 | 0.9783 |

- **[Val] ROC-AUC macro (OvR)**: 0.9825
- **[Test] ROC-AUC macro (OvR)**: 0.9783
- **[Test] mel Recall (argmax)**: 0.5652

### 混同行列 (Val)
```
[[  8,   1,   2,   0,   2,   2,   0],
 [  1,  14,   0,   1,   0,   0,   1],
 [  3,   2,  32,   0,   4,   3,   0],
 [  0,   1,   0,   2,   1,   0,   0],
 [  0,   0,   4,   0,  15,   4,   0],
 [  0,   1,   3,   1,  12, 424,   0],
 [  0,   0,   0,   0,   0,   1,   6]]
```

### 混同行列 (Test)
```
[[  9,   1,   4,   0,   0,   1,   0],
 [  0,  15,   2,   0,   0,   1,   0],
 [  1,   1,  32,   0,   6,   4,   0],
 [  0,   0,   1,   3,   0,   0,   0],
 [  1,   1,   4,   0,  13,   4,   0],
 [  1,   1,   7,   0,   9, 424,   0],
 [  0,   0,   0,   0,   0,   1,   5]]
```

### 成果物
- モデル: `../models/densenet_v3a_20260311_174706.pth`
- Val推論結果: `../results/models/v3a_val_predictions.npz`
- Test推論結果: `../results/models/v3a_test_predictions.npz`
  - keys: all_probs (N,7), y_true (N,), all_logits (N,7)

- 結果ディレクトリ: `../results/v3a/`
  - fig_training_curves.png
  - fig_confusion_matrix_val.png / test.png
  - fig_error_rate_val.png
  - classification_report_val.txt / test.txt
  - norm_stats_v3a.json
  - experiment_log_v3a.md

### 判断・メモ
- 3分割修正（train/val/test）適用済み
- v3b (FocalLoss + CB Loss) との比較でどちらを採用するか確認
- post-hoc閾値最適化・Temperature Scaling は v4/v5 で実施
