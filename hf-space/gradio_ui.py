"""
DermLens Gradio UI — HF Spaces 面接デモ用
inference.py から数値を受け取り、Markdown を生成して Gradio UI に表示する。
"""

import gradio as gr
import numpy as np
from PIL import Image

from inference import (
    # V3A
    V3A_CLASS_NAMES, V3A_CLASS_LABELS, V3A_MALIGNANT_CLASSES,
    V3A_TEMPERATURE, V3A_ECE, V3A_BINARY_THRESHOLD,
    V3A_YOUDEN_THRESHOLDS,
    v3a_preprocess, generate_gradcam, overlay_gradcam,
    model_v3a, predict_class_youden_v3a,
    _gradcam_store,
    # V10
    V10_CLASS_NAMES, V10_CLASS_LABELS, V10_MALIGNANT_CLASSES,
    V10_TEMPERATURE, V10_ECE, V10_BINARY_THRESHOLD,
    V10_AVAILABLE,
    v10_preprocess, generate_gradcam_v10,
    model_v10_backbone, model_v10_head,
    _v10_gradcam_store,
    INPUT_SIZE,
)

import torch
import gc


# ╔════════════════════════════════════════════════════════════════╗
# ║  V3A Gradio predict 関数                                      ║
# ╚════════════════════════════════════════════════════════════════╝

def predict_v3a(image):
    print(f"[v3a] predict called", flush=True)
    if image is None:
        return {}, "", None

    img = Image.fromarray(image).convert("RGB")
    tensor = v3a_preprocess(img).unsqueeze(0)

    gradcam_image = None
    try:
        _gradcam_store["activations"] = None
        _gradcam_store["gradients"] = None
        logits, cam, pred_idx = generate_gradcam(tensor.clone())
        gradcam_image = overlay_gradcam(img, cam)
    except Exception:
        with torch.no_grad():
            logits = model_v3a(tensor)
        pred_idx = logits.argmax(dim=1).item()

    probs = torch.softmax(logits.detach() / V3A_TEMPERATURE, dim=1)[0]
    class_probs = {V3A_CLASS_LABELS[c]: float(probs[i]) for i, c in enumerate(V3A_CLASS_NAMES)}

    pred_class, top3, pred_method = predict_class_youden_v3a(probs)
    if pred_class is not None:
        pred_label = f"**予測クラス: {V3A_CLASS_LABELS[pred_class]}**（Youden 閾値適用）"
    else:
        top3_str = " / ".join(f"{V3A_CLASS_LABELS[c]} ({p:.1%})" for c, p in top3)
        pred_label = f"**予測クラス: 判定不能**（{pred_method}）\n\n候補: {top3_str}"

    risk_score = sum(float(probs[V3A_CLASS_NAMES.index(c)]) for c in V3A_MALIGNANT_CLASSES)
    label = "⚠️ 悪性の疑いあり" if risk_score >= V3A_BINARY_THRESHOLD else "✅ 悪性の疑いは低い"

    ece_pct = round(V3A_ECE * 100)
    gradcam_target = V3A_CLASS_NAMES[pred_idx]
    risk_text = (
        f"### {label}\n\n"
        f"**悪性リスクスコア: {risk_score:.1%}**（判定閾値: {V3A_BINARY_THRESHOLD:.1%}）\n\n"
        f"{pred_label}\n\n"
        f"モデルの確率誤差 ±{ece_pct}%（ECE = {V3A_ECE:.3f}）\n\n"
        f"---\n"
        f"*悪性リスク = mel + bcc + akiec の合計確率（Temperature Scaling 補正済み, T={V3A_TEMPERATURE:.4f}）*\n\n"
        f"*Grad-CAM target: {gradcam_target}（argmax クラス）— "
        f"赤い領域ほどモデルの判断に寄与*\n\n"
        f"⚠️ このアプリは診断ツールではありません。必ず医師の診察を受けてください。"
    )

    _gradcam_store["activations"] = None
    _gradcam_store["gradients"] = None
    gc.collect()

    return class_probs, risk_text, gradcam_image


# ╔════════════════════════════════════════════════════════════════╗
# ║  V10 Gradio predict 関数                                      ║
# ╚════════════════════════════════════════════════════════════════╝

def predict_v10(image):
    print(f"[v10] predict called", flush=True)
    if image is None:
        return {}, "", None

    img = Image.fromarray(image).convert("RGB")
    tensor = v10_preprocess(img).unsqueeze(0)

    gradcam_image = None
    try:
        _v10_gradcam_store["activations"] = None
        _v10_gradcam_store["gradients"] = None
        logits, cam, pred_idx = generate_gradcam_v10(tensor.clone())
        gradcam_image = overlay_gradcam(img, cam)
    except Exception as e:
        print(f"[v10] Grad-CAM failed: {e}")
        with torch.no_grad():
            features = model_v10_backbone(tensor)
            logits = model_v10_head(features)
        pred_idx = logits.argmax(dim=1).item()

    probs = torch.softmax(logits.detach() / V10_TEMPERATURE, dim=1)[0]
    class_probs = {V10_CLASS_LABELS[c]: float(probs[i]) for i, c in enumerate(V10_CLASS_NAMES)}

    risk_score = sum(float(probs[V10_CLASS_NAMES.index(c)]) for c in V10_MALIGNANT_CLASSES)
    label = "⚠️ 悪性の疑いあり" if risk_score >= V10_BINARY_THRESHOLD else "✅ 悪性の疑いは低い"

    pred_name = V10_CLASS_NAMES[pred_idx]
    ece_pct = round(V10_ECE * 100)
    gradcam_target = V10_CLASS_NAMES[pred_idx]
    risk_text = (
        f"### {label}\n\n"
        f"**悪性リスクスコア: {risk_score:.1%}**（判定閾値: {V10_BINARY_THRESHOLD:.1%}）\n\n"
        f"**予測クラス: {V10_CLASS_LABELS[pred_name]}**（argmax）\n\n"
        f"モデルの確率誤差 ±{ece_pct}%（ECE = {V10_ECE:.3f}）\n\n"
        f"---\n"
        f"*悪性リスク = malignant 3クラスの合計確率（Temperature Scaling 補正済み, T={V10_TEMPERATURE:.4f}）*\n\n"
        f"*Grad-CAM target: {gradcam_target}（argmax クラス）— "
        f"赤い領域ほどモデルの判断に寄与*\n\n"
        f"⚠️ **臨床写真モデルは研究段階です。** DDI外部評価 AUC=0.675。\n"
        f"ダーモスコピーモデル（v3a, AUC=0.962）と比較して精度が大幅に低く、\n"
        f"FST V–VI（濃色肌）では AUC=0.572（ほぼchance level）です。\n"
        f"スクリーニング補助の参考値としてのみご利用ください。\n\n"
        f"⚠️ このアプリは診断ツールではありません。必ず医師の診察を受けてください。"
    )

    _v10_gradcam_store["activations"] = None
    _v10_gradcam_store["gradients"] = None
    gc.collect()

    return class_probs, risk_text, gradcam_image


# ╔════════════════════════════════════════════════════════════════╗
# ║  Model Details (Markdown)                                      ║
# ╚════════════════════════════════════════════════════════════════╝

V3A_MODEL_DETAILS = """
## Model Details — Dermoscopy Module (v3a)

| Item | Detail |
|:---|:---|
| **Architecture** | DenseNet-121, fine-tuned from ImageNet (all layers trainable, ~7.98M params) |
| **Dataset** | HAM10000 — 10,015 dermoscopic images, 7 diagnostic classes |
| **Imbalance strategy** | WeightedRandomSampler + CrossEntropyLoss (unweighted) |
| **ROC-AUC (macro)** | 0.9783 (7-class OvR, test set) |
| **Binary AUC** | 0.9615 (malignant aggregation: mel + bcc + akiec, test set) |
| **Sensitivity** | 96.4% (binary malignant, val; Youden threshold=0.1439) |
| **Specificity** | 86.5% (binary malignant, val; Youden threshold=0.1439) |
| **Calibration** | Temperature Scaling T=1.4478, ECE 0.0316 → 0.0289 |
| **External eval** | DDI AUC 0.583 (cross-modality; same-modality external not available) |
| **Skin tone** | Trained on Fitzpatrick I–III (European cohort). Performance on other skin tones is expected to be lower but cannot be quantified. |

📄 [Full Model Card](https://github.com/Kohkiota/skin-lesion-triage/blob/main/MODEL_CARD.md)
"""

V10_MODEL_DETAILS = """
## Model Details — Clinical Photo Module (v10)

| Item | Detail |
|:---|:---|
| **Architecture** | PanDerm ViT-Large/16 (Yan et al., Nature Medicine 2025) + Linear Probe (~6K params) |
| **Dataset** | Fitzpatrick17k tumor subset, 6 classes |
| **Internal Binary AUC** | 0.9089 (Fitz test; patient leakage caveat — see Model Card) |
| **Calibration** | Temperature Scaling T=0.8699, ECE 0.0523 → 0.0505 |
| **External eval (DDI)** | AUC 0.675, sensitivity 82.5%, specificity 36.9% (clinical threshold) |
| **DDI FST V–VI** | AUC 0.572 — near chance level |
| **License** | PanDerm weights: CC-BY-NC-ND 4.0 (non-commercial) |

📄 [Full Model Card](https://github.com/Kohkiota/skin-lesion-triage/blob/main/MODEL_CARD.md)
"""


# ╔════════════════════════════════════════════════════════════════╗
# ║  Gradio UI 構築                                                ║
# ╚════════════════════════════════════════════════════════════════╝

demo_v3a = gr.Interface(
    fn=predict_v3a,
    inputs=gr.Image(label="皮膚病変のダーモスコピー画像をアップロード"),
    outputs=[
        gr.Label(num_top_classes=7, label="7クラス分類（calibrated確率）"),
        gr.Markdown(label="悪性リスク判定"),
        gr.Image(label="Grad-CAM（モデルの注視領域）", type="pil"),
    ],
    title="Dermoscopy Model — DenseNet-121 v3a",
    description=(
        "HAM10000で学習したDenseNet-121による7クラス分類 + 良悪性二値判定。\n"
        "Temperature Scaling（T=1.4478）でcalibration済み。Grad-CAMで注視領域を可視化。"
    ),
    article=V3A_MODEL_DETAILS,
    examples=[
        "examples/v3a_mel_correct.jpg",
        "examples/v3a_nv_correct.jpg",
        "examples/v3a_mel_misclass.jpg",
        "examples/v3a_bcc_correct.jpg",
    ],
    cache_examples=True,
    flagging_mode="never",
    api_name="predict_ds",
)

if V10_AVAILABLE:
    demo_v10 = gr.Interface(
        fn=predict_v10,
        inputs=gr.Image(label="皮膚病変の臨床写真をアップロード"),
        outputs=[
            gr.Label(num_top_classes=6, label="6クラス分類（calibrated確率）"),
            gr.Markdown(label="悪性リスク判定"),
            gr.Image(label="Grad-CAM（モデルの注視領域）", type="pil"),
        ],
        title="Clinical Photo Model — PanDerm v10",
        description=(
            "PanDerm ViT-Large（Fitzpatrick17k腫瘍6クラス）によるスクリーニング補助。\n"
            "Temperature Scaling（T=0.8700）でcalibration済み。Grad-CAMで注視領域を可視化。\n\n"
            "⚠️ DDI外部評価 AUC=0.675 — 研究段階のモデルです。FST V–VIでは精度が大幅に低下します。"
        ),
        article=V10_MODEL_DETAILS,
        examples=[
            "examples/v10_mal_correct.jpg",
            "examples/v10_benign_correct.jpg",
            "examples/v10_mal_misclass.jpg",
            "examples/v10_ddi_dark_tp.png",
        ],
        cache_examples=True,
        flagging_mode="never",
        api_name="predict_cl",
    )

    demo = gr.TabbedInterface(
        [demo_v3a, demo_v10],
        ["Dermoscopy (v3a)", "Clinical Photo (v10)"],
        title="DermLens — AI Skin Lesion Triage",
    )
else:
    demo = demo_v3a
