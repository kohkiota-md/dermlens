# DermLens — Model Card

*Format adapted from the [CHAI Applied Model Card v0.1](https://chai.org/workgroup/applied-model) (Coalition for Health AI, 2024)*

---

## Summary

DermLens is a skin lesion classification system with two modules: a **dermoscopy module** (DenseNet-121) and a **clinical photo module** (PanDerm ViT-Large). Both output calibrated probabilities and a binary malignant risk score designed for screening-assist triage. The system prioritizes sensitivity over specificity to minimize missed malignancies.

**This is not a medical device.** DermLens is not FDA-cleared, CE-marked, or approved by any regulatory body. It is intended for educational and portfolio demonstration purposes only.

**Keywords:** skin lesion classification, dermoscopy, clinical photography, melanoma screening, DenseNet-121, PanDerm, HAM10000, Fitzpatrick17k

---

## Uses and Directions

| Field | Description |
|---|---|
| **Intended use** | Decision-support for skin lesion triage. Designed to *inform*, not replace, clinical judgment. Requires clinician oversight (human-in-the-loop). |
| **Primary intended users** | Dermatologists and trained clinicians. Dermoscopy module requires dermoscopy experience. |
| **Target population** | Adult patients with dermoscopic or clinical photographs of skin lesions. |
| **Out-of-scope uses** | Stand-alone diagnosis; pediatric lesions; mucosal or nail lesions; patients with Fitzpatrick skin types V–VI without awareness of documented performance limitations (see Warnings). |

---

## Warnings

### Known Risks and Limitations

- **Not a medical device.** For demonstration purposes only.
- **No independent same-modality external validation.** Both modules lack evaluation on a held-out dataset from the same modality and a different institution. All internal metrics (ROC-AUC, Binary AUC) are from train/val splits of the training dataset. DDI is the only independent evaluation, with caveats noted below.
- **Class imbalance residual.** Melanoma is a minority class in both training sets. Argmax recall is moderate (0.609 for dermoscopy, 0.822 for clinical photo); clinical thresholds are required to achieve screening-grade sensitivity.
- **Cross-modality degradation.** The dermoscopy module performs at chance level on clinical photographs (DDI AUC = 0.547). Each module should only be used with its intended image modality.

### Known Biases

- **Dermoscopy module:** Trained on HAM10000 (Fitzpatrick I–III, two European institutions). Performance on skin tones outside this range is expected to be lower, but cannot be quantified — no skin-tone-diverse dermoscopic evaluation dataset exists. The DDI evaluation (AUC = 0.547) reflects modality mismatch, not skin tone bias.
- **Clinical photo module:** DDI evaluation showed FST V–VI AUC = 0.572 — above chance but not clinically useful. FST III–IV AUC = 0.758 vs FST V–VI AUC = 0.572; the confidence intervals do not overlap, confirming statistically significant skin tone disparity.
- **Geographic bias.** Dermoscopy training data from two European institutions; clinical photo training data from US-based Fitzpatrick17k. Generalizability to other populations is unvalidated.

### Clinical Risk Level

Not applicable (non-clinical demonstration). If deployed clinically, would be classified as *informing* clinical management — low-to-medium risk per IMDRF SaMD framework.

---

## Module 1: Dermoscopy (v3a)

### AI System Facts

| Field | Detail |
|---|---|
| Architecture | DenseNet-121 (Huang et al., CVPR 2017), fine-tuned from ImageNet. All layers trainable (~7.98M params). |
| Training data | HAM10000 — 10,015 dermoscopic images, 7 classes (akiec, bcc, bkl, df, mel, nv, vasc). Train/val split by `lesion_id` (80/20). |
| Imbalance mitigation | WeightedRandomSampler (inverse class frequency). CrossEntropyLoss (unweighted). |
| Optimization | Adam (lr=1e-3), ReduceLROnPlateau (patience=3, factor=0.1). Early stopping on val_loss (patience=7). Stopped at epoch 27/50. |
| Calibration | Temperature Scaling (Guo et al., ICML 2017). T=1.382 (overconfidence correction). ECE: 0.0266 → 0.0203. |
| Output | 7-class calibrated probabilities → binary malignant risk: `p_mal = p(mel) + p(bcc) + p(akiec)` (Esteva et al., 2017). |
| Threshold | Clinical threshold (mel sensitivity ≥ 95%): mel OvR = 0.0507, binary = 0.2147. |
| Explainability | Grad-CAM (target: `features.denseblock4`), displayed as overlay in app. |

### Key Metrics

#### Usefulness — Diagnostic Performance

*Test type: Internal (HAM10000 train/val split, stratified by lesion_id)*

| Metric | Value |
|---|---|
| ROC-AUC (7-class macro) | 0.9869 |
| Binary AUC (malignant vs benign) | 0.9787 |
| Macro F1 (argmax) | 0.804 |
| ECE (post-calibration) | 0.0203 |

**Per-class performance (argmax):**

| Class | Precision | Recall | F1 | AUC (OvR) | Prevalence |
|---|---|---|---|---|---|
| akiec | 0.727 | 0.800 | 0.762 | 0.991 | 3.3% |
| bcc | 0.842 | 0.914 | 0.877 | 0.999 | 5.1% |
| bkl | 0.788 | 0.761 | 0.775 | 0.974 | 11.0% |
| df | 0.714 | 0.625 | 0.667 | 0.999 | 1.2% |
| mel | 0.549 | 0.609 | 0.577 | 0.958 | 11.1% |
| nv | 0.977 | 0.969 | 0.973 | 0.989 | 66.9% |
| vasc | 1.000 | 1.000 | 1.000 | 1.000 | 1.4% |

**Operating point comparison (binary malignant vs benign):**

| Method | Sensitivity | Specificity | Precision | F1 | Binary AUC |
|---|---|---|---|---|---|
| Argmax | 0.609 | — | 0.549 | 0.577 | — |
| Youden (mel OvR) | 0.717 | 0.935 | 0.452 | 0.555 | — |
| Binary Youden | 0.964 | 0.923 | 0.585 | 0.728 | 0.9787 |
| **Binary Clinical** | **0.955** | **0.926** | **0.592** | **0.731** | **0.9787** |

#### Fairness — Skin Tone Evaluation

*Test type: External, cross-modality (DDI, 656 biopsy-confirmed clinical photographs)*

| Subgroup | N | Binary AUC | 95% CI |
|---|---|---|---|
| Overall | 656 | 0.547 | — |
| FST I–II | 208 | 0.560 | [0.472, 0.645] |
| FST III–IV | 241 | 0.585 | [0.502, 0.660] |
| FST V–VI | 207 | 0.499 | [0.398, 0.602] |

**Interpretation:** Near-chance performance across all subgroups. The dominant confounder is modality mismatch (dermoscopy model evaluated on clinical photos), not skin tone bias. CIs overlap across all FST groups — the model fails uniformly on clinical photographs. Same-modality external evaluation is not available; performance on skin tones outside Fitzpatrick I–III is expected to be lower but cannot be quantified.

#### Safety — Calibration & Uncertainty

| Metric | Value |
|---|---|
| ECE (post-TS) | 0.0203 |
| Temperature | T=1.382 (>1: corrects overconfidence) |
| Conformal Prediction | Tested (APS, α=0.05): rejected. Mean prediction set size = 3.68 at 95% coverage. High model accuracy causes prediction set saturation, rendering CP ineffective for uncertainty quantification. |

---

## Module 2: Clinical Photo (v10)

### AI System Facts

| Field | Detail |
|---|---|
| Architecture | PanDerm ViT-Large/16 (Yan et al., Nature Medicine 2025), backbone frozen. Linear probe head (6 classes). Backbone reconstructed via `timm` (Apache-2.0) to avoid dependency on CC-BY-NC-ND 4.0 source code. |
| Training data | Fitzpatrick17k — tumor subset, 6 classes (benign dermal, benign epidermal, benign melanocyte, malignant dermal, malignant epidermal, malignant melanoma). |
| Imbalance mitigation | L-BFGS logistic regression with balanced class weights (sklearn, λ=61.44). |
| Calibration | Temperature Scaling. T=0.8699 (<1: corrects underconfidence, typical of linear probing). ECE: 0.0523 → 0.0505. |
| Output | 6-class calibrated probabilities → binary malignant risk (sum of 3 malignant classes). |
| Threshold | Clinical threshold (sensitivity ≥ 95%): binary = 0.1776 (Fitz val recall = 0.952). |
| Explainability | Not implemented for this module. Planned future work. |

### Key Metrics

#### Usefulness — Diagnostic Performance

*Test type: Internal (Fitzpatrick17k train/test split)*

⚠️ **Caveat:** Fitzpatrick17k does not publish patient IDs. Patient-level data leakage between train and test splits cannot be ruled out. Internal metrics should be interpreted as optimistic estimates.

| Metric | Value |
|---|---|
| ROC-AUC (6-class macro) | 0.9263 |
| Binary AUC (malignant vs benign) | 0.9089 |
| Macro F1 (argmax) | 0.655 |
| ECE (post-calibration) | 0.0505 |

**Per-class performance (argmax):**

| Class | Precision | Recall | F1 | AUC (OvR) |
|---|---|---|---|---|
| benign dermal | 0.669 | 0.731 | 0.699 | 0.886 |
| benign epidermal | 0.656 | 0.592 | 0.622 | 0.880 |
| benign melanocyte | 0.762 | 0.471 | 0.582 | 0.930 |
| malignant dermal | 0.778 | 0.438 | 0.560 | 0.984 |
| malignant epidermal | 0.737 | 0.828 | 0.780 | 0.936 |
| malignant melanoma | 0.671 | 0.700 | 0.685 | 0.942 |

**Operating point comparison (Fitz test, binary malignant vs benign):**

| Method | Sensitivity | Specificity | Precision | F1 | Binary AUC |
|---|---|---|---|---|---|
| Argmax (thr=0.5) | 0.822 | 0.846 | 0.807 | 0.814 | 0.9089 |
| TS + Youden | 0.793 | 0.861 | 0.817 | 0.805 | 0.9089 |
| **TS + Clinical (≥95%)** | **0.947** | **0.596** | **0.646** | **0.768** | **0.9089** |

#### Fairness — Skin Tone Evaluation

*Test type: External (DDI, 656 biopsy-confirmed clinical photographs, same modality)*

**DDI performance by Fitzpatrick skin type (clinical threshold, thr=0.1776):**

| Subgroup | N | Binary AUC | Sensitivity | Specificity | Precision |
|---|---|---|---|---|---|
| Overall | 656 | 0.675 | 0.825 | 0.369 | 0.315 |
| FST I–II | 208 | 0.657 | 0.898 | 0.252 | 0.270 |
| FST III–IV | 241 | 0.758 | 0.892 | 0.449 | 0.418 |
| FST V–VI | 207 | 0.572 | 0.646 | 0.403 | 0.246 |

**Interpretation:** DDI overall AUC of 0.675 is comparable to published baselines on the same dataset (DeepDerm: 0.56, ModelDerm: 0.65, HAM10000 baseline: 0.67; Daneshjou et al., 2022). FST V–VI AUC of 0.572 is above chance but not clinically useful. The FST III–IV vs FST V–VI gap (0.758 vs 0.572, non-overlapping CIs) confirms statistically significant skin tone disparity. Clinical threshold improves sensitivity across all FST groups but does not selectively reduce the disparity. Specificity at clinical threshold is low across all groups (overall 36.9%), reflecting the sensitivity-maximizing design.

**DDI progression across model iterations:**

| Subgroup | DenseNet v7 (DS→clinical) | PanDerm+HAM v9 | PanDerm+Fitz v10 |
|---|---|---|---|
| Overall | 0.547 | 0.666 | 0.675 |
| FST I–II | 0.560 | 0.689 | 0.657 |
| FST III–IV | 0.585 | 0.761 | 0.758 |
| FST V–VI | 0.497 | 0.500 | 0.572 |

#### Safety — Calibration

| Metric | Value |
|---|---|
| ECE (post-TS) | 0.0505 |
| Temperature | T=0.8699 (<1: corrects underconfidence inherent to linear probing) |

---

## Experimental Design Decisions

| Decision | Rationale |
|---|---|
| v3a (CE+WRS) over v3b (Focal+CB+WRS) | v3b underperformed on ROC-AUC macro (0.9843 vs 0.9869) and Macro F1 (0.792 vs 0.804). Demonstrates the "no silver bullet" finding from imbalance learning literature (Johnson & Khoshgoftaar, 2019). |
| Clinical threshold over Youden's J | False negative cost (missed melanoma → delayed diagnosis → stage progression) far exceeds false positive cost (unnecessary biopsy) in screening context. |
| Binary aggregation (mel+bcc+akiec) | Follows Esteva et al. (2017). Binary AUC (0.9787) exceeds mel-only OvR AUC (0.9581), validating multi-class malignant aggregation. |
| `val_loss` for early stopping | Continuous loss detects probability quality degradation that discrete accuracy misses. |
| Train-split-only normalization | Prevents data leakage from validation set statistics. |
| PanDerm backbone via `timm` | Avoids dependency on `modeling_finetune.py` (CC-BY-NC-ND 4.0 ND clause). Key mapping (qkv bias fusion, LayerScale rename) verified with 0 missing/unexpected keys. |
| Fitz17k tumor-only 6 classes | Full 9-class (including inflammatory) degraded DDI AUC to 0.591 due to inflammatory class dominance (67%) and malignant class definition mismatch with DDI. |
| Conformal Prediction rejected | APS at α=0.05 produced mean set size of 3.68 with 100% coverage — prediction set saturation renders it clinically uninformative on high-accuracy classifiers. |
| Two modules in one application | Same CI/CD pipeline; demonstrates modality-aware system design. Each module documents its own performance and limitations independently. |

---

## Resources

| Type | Reference |
|---|---|
| Dermoscopy training data | Tschandl P et al. "The HAM10000 dataset." *Sci Data* 5, 180161 (2018) |
| Clinical photo training data | Groh M et al. "Evaluating deep neural networks trained on clinical images in dermatology with the Fitzpatrick 17k dataset." *CVPR* (2021) |
| DenseNet-121 | Huang G et al. "Densely Connected Convolutional Networks." *CVPR* (2017) |
| PanDerm | Yan S et al. "A multimodal vision foundation model for clinical dermatology." *Nat Med* 31, 2691–2702 (2025) |
| Binary aggregation | Esteva A et al. "Dermatologist-level classification of skin cancer with deep neural networks." *Nature* 542, 115–118 (2017) |
| Temperature Scaling | Guo C et al. "On Calibration of Modern Neural Networks." *ICML* (2017) |
| Conformal Prediction | Romano Y et al. "Classification with Valid and Adaptive Coverage." *NeurIPS* (2020) |
| Imbalance survey | Johnson JM & Khoshgoftaar TM. "Survey on deep learning with class imbalance." *J Big Data* 6, 27 (2019) |
| Focal Loss | Lin TY et al. "Focal Loss for Dense Object Detection." *CVPR* (2017) |
| Class-Balanced Loss | Cui Y et al. "Class-Balanced Loss Based on Effective Number of Samples." *CVPR* (2019) |
| DDI bias evaluation | Daneshjou R et al. "Disparities in dermatology AI performance across skin tones." *Sci Adv* 8, eabq6147 (2022) |
| Model Card format | Coalition for Health AI. "Applied Model Card v0.1." (2024) |

---

*Last updated: 2026-03-08 | Dermoscopy module: v3a-20260304 | Clinical photo module: v10-20260308*
