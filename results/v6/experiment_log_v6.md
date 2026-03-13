
## v6: Conformal Prediction（E-1 / E-2 / E-3）

- 日時: (実行日を記入)
- 対象モデル: `models/densenet_v3a_*.pth`（最終モデル）
- ファイル: `src/v6.ipynb`
- 手法: Adaptive Prediction Sets (APS; Romano et al., NeurIPS 2020)
- calibrated確率使用（Temperature Scaling T=1.4478）
- 分割: val=calibration 551 / test 552（層化、seed=42）

### E-1: カバレッジと集合サイズ

| 信頼水準 | α    | q̂     | Coverage | Mean Size | Median Size |
| -------- | ---- | ------ | -------- | --------- | ----------- |
| 90%      | 0.10 | 0.9991 | 1.0000   | 3.16      | 3          |
| 95%      | 0.05 | 0.9996 | 1.0000   | 3.60      | 4          |
| 99%      | 0.01 | 1.0000 | 1.0000   | 4.90      | 5          |

### E-2: mel安全性（α=0.05）

| 指標 | 値 |
| ---- | -- |
| mel class coverage | 1.0000 |
| argmax mel recall | 0.5652 |
| CP mel detection | 1.0000 |
| argmax見逃し→CP救済 | 10/10 |

### E-3: トリアージ比較（悪性紹介判定、α=0.05）

| Method | Sensitivity | Missed (FN) | Over-refer (FP) |
| ------ | ----------- | ----------- | --------------- |
| argmax | 0.7143 | 16 | 19 |
| CP     | 1.0000 | 0 | 414 |
