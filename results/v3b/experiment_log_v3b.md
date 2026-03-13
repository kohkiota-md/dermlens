
## v3b: DenseNet-121 WeightedRandomSampler + FocalLoss(γ=2) + CB weights(β=0.99)
- **日付**: 2026-03-11
- **モデル**: DenseNet-121 (densenet_v3b_*.pth)
- **損失関数**: FocalLoss(gamma=2) + CB weights(beta=0.99)
- **サンプリング**: WeightedRandomSampler (num_samples=len(df_train))
- **分割**: train/val/test 3分割 (random_state=42)
- **Early stopping**: patience=7 (val_loss監視)
- **学習時間**: 35.1 min (2104 sec)
- **停止エポック**: 16 / 50
- **Best val loss**: 0.12293
- **Best val acc**: 0.90693

### Val評価 (7クラス、argmax)
| クラス | Precision | Recall | F1 | AUC (OvR) |
| ------ | --------- | ------ | -- | --------- |
| akiec | 0.5238 | 0.7333 | 0.6111 | 0.9874 |
| bcc | 0.5652 | 0.7647 | 0.6500 | 0.9874 |
| bkl | 0.7692 | 0.6818 | 0.7229 | 0.9478 |
| df | 0.6000 | 0.7500 | 0.6667 | 0.9644 |
| mel | 0.4444 | 0.5217 | 0.4800 | 0.9196 |
| nv | 0.9814 | 0.9546 | 0.9678 | 0.9871 |
| vasc | 0.8571 | 0.8571 | 0.8571 | 0.9737 |
| **macro avg** | 0.6773 | 0.7519 | 0.7079 | 0.9668 |

### Test評価 (7クラス、argmax)
| クラス | Precision | Recall | F1 | AUC (OvR) |
| ------ | --------- | ------ | -- | --------- |
| akiec | 0.6111 | 0.7333 | 0.6667 | 0.9851 |
| bcc | 0.8095 | 0.9444 | 0.8718 | 0.9963 |
| bkl | 0.6667 | 0.6818 | 0.6742 | 0.9464 |
| df | 0.8000 | 1.0000 | 0.8889 | 1.0000 |
| mel | 0.4286 | 0.5217 | 0.4706 | 0.9116 |
| nv | 0.9720 | 0.9434 | 0.9575 | 0.9812 |
| vasc | 0.6667 | 0.6667 | 0.6667 | 0.9853 |
| **macro avg** | 0.7078 | 0.7845 | 0.7423 | 0.9723 |

- **[Val] ROC-AUC macro**: 0.9668
- **[Test] ROC-AUC macro**: 0.9723

### 混同行列 (Val)
```
[[ 11,   1,   1,   0,   1,   1,   0],
 [  2,  13,   2,   0,   0,   0,   0],
 [  5,   2,  30,   0,   5,   2,   0],
 [  0,   1,   0,   3,   0,   0,   0],
 [  2,   1,   4,   0,  12,   4,   0],
 [  1,   5,   2,   2,   9, 421,   1],
 [  0,   0,   0,   0,   0,   1,   6]]
```
### 混同行列 (Test)
```
[[ 11,   1,   2,   0,   0,   1,   0],
 [  0,  17,   1,   0,   0,   0,   0],
 [  4,   1,  30,   0,   5,   4,   0],
 [  0,   0,   0,   4,   0,   0,   0],
 [  2,   0,   3,   0,  12,   6,   0],
 [  1,   2,   9,   1,  10, 417,   2],
 [  0,   0,   0,   0,   1,   1,   4]]
```

### 成果物
- モデル: `../models/densenet_v3b_20260311_182540.pth`
- Val推論結果: `../results/models/v3b_val_predictions.npz`
- Test推論結果: `../results/models/v3b_test_predictions.npz`

- 結果ディレクトリ: `../results/v3b/`
  - fig_training_curves.png
  - fig_confusion_matrix_val.png / test.png
  - fig_error_rate_val.png
  - classification_report_val.txt / test.txt
  - norm_stats_v3b.json
  - experiment_log_v3b.md

### 判断・メモ
- 3分割修正（train/val/test）適用済み
- v3a (CE) との比較で採用モデルを決定
