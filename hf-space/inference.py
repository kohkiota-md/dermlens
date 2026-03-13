"""
DermLens 推論エンジン — app.py から推論ロジックを切り出し
gradio_ui.py（Gradio表示用）と api.py（FastAPI用）の両方がimportする共通層

返り値は構造化 dict。Markdown生成は含めない。
"""

import torch
import torch.nn as nn
from torchvision import models, transforms
from PIL import Image
import numpy as np
import json
import os
import gc
import io
import base64
import time

# ╔════════════════════════════════════════════════════════════════╗
# ║  V3A: DenseNet-121 — ダーモスコピー 7クラス                    ║
# ╚════════════════════════════════════════════════════════════════╝

V3A_MODEL_PATH = "densenet_v3a_20260311_174706.pth"

V3A_CLASS_NAMES = ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc']

V3A_CLASS_LABELS = {
    'akiec': 'Actinic Keratosis (日光角化症)',
    'bcc':   'Basal Cell Carcinoma (基底細胞癌)',
    'bkl':   'Benign Keratosis (良性角化症)',
    'df':    'Dermatofibroma (皮膚線維腫)',
    'nv':    'Melanocytic Nevus (色素性母斑)',
    'vasc':  'Vascular Lesion (血管性病変)',
    'mel':   'Melanoma (悪性黒色腫)',
}

V3A_MALIGNANT_CLASSES = ['mel', 'bcc', 'akiec']

V3A_NORM_MEAN = [0.7581, 0.5482, 0.5736]
V3A_NORM_STD = [0.1419, 0.1530, 0.1707]
INPUT_SIZE = 224

# ── V3A Temperature & 閾値 ───────────────────────────
with open("temperature_v3a.json", "r") as f:
    _v3a_temp = json.load(f)
V3A_TEMPERATURE = _v3a_temp["temperature"]
V3A_ECE = _v3a_temp["ece_before"]

with open("posthoc_thresholds_v3a.json", "r") as f:
    _v3a_thresh = json.load(f)

V3A_BINARY_THRESHOLD = _v3a_thresh["binary_youden"]["threshold"]

V3A_YOUDEN_THRESHOLDS = {
    cls: _v3a_thresh["youden_thresholds_7class"][cls]["threshold"]
    for cls in V3A_CLASS_NAMES
}

print(f"[v3a] Model: {V3A_MODEL_PATH}")
print(f"[v3a] Temperature: {V3A_TEMPERATURE:.4f}, Binary threshold: {V3A_BINARY_THRESHOLD:.4f}")

# ── V3A モデル読み込み ───────────────────────────────
def load_v3a_model():
    model = models.densenet121(weights=None)
    num_ftrs = model.classifier.in_features
    model.classifier = nn.Linear(num_ftrs, len(V3A_CLASS_NAMES))
    state_dict = torch.load(V3A_MODEL_PATH, map_location="cpu", weights_only=True)
    model.load_state_dict(state_dict)
    model.eval()
    return model

print("[1] Loading v3a DenseNet...")
model_v3a = load_v3a_model()
print("[1] Done")

# ── V3A Grad-CAM ─────────────────────────────────────
_gradcam_store = {"activations": None, "gradients": None}

def _forward_hook(module, input, output):
    _gradcam_store["activations"] = output.detach()

def _backward_hook(module, grad_input, grad_output):
    _gradcam_store["gradients"] = grad_output[0].detach()

_target_layer = model_v3a.features.denseblock4
_target_layer.register_forward_hook(_forward_hook)
_target_layer.register_full_backward_hook(_backward_hook)
print("[v3a] ✓ Grad-CAM hooks registered on features.denseblock4")

v3a_preprocess = transforms.Compose([
    transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(V3A_NORM_MEAN, V3A_NORM_STD),
])


def generate_gradcam(tensor):
    model_v3a.zero_grad()
    tensor = tensor.detach().requires_grad_(True)
    logits = model_v3a(tensor)
    pred_idx = logits.argmax(dim=1).item()
    logits[0, pred_idx].backward()
    acts = _gradcam_store["activations"]
    grads = _gradcam_store["gradients"]
    if acts is None or grads is None:
        return logits.detach(), np.zeros((7, 7), dtype=np.float32), pred_idx
    acts, grads = acts[0], grads[0]
    weights = grads.mean(dim=[1, 2])
    cam = torch.relu((weights[:, None, None] * acts).sum(dim=0))
    cam = cam / (cam.max() + 1e-8)
    return logits.detach(), cam.cpu().numpy(), pred_idx


def overlay_gradcam(image_pil, cam, alpha=0.5):
    w, h = image_pil.size
    cam_uint8 = (cam * 255).astype(np.uint8)
    cam_resized = np.array(
        Image.fromarray(cam_uint8).resize((w, h), Image.BILINEAR)
    ) / 255.0
    heatmap = _jet_colormap(cam_resized)
    original = np.array(image_pil)
    blended = alpha * heatmap.astype(np.float32) + (1 - alpha) * original.astype(np.float32)
    return Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8))


def _jet_colormap(gray):
    r = np.clip(1.5 - np.abs(gray * 4 - 3), 0, 1)
    g = np.clip(1.5 - np.abs(gray * 4 - 2), 0, 1)
    b = np.clip(1.5 - np.abs(gray * 4 - 1), 0, 1)
    return (np.stack([r, g, b], axis=-1) * 255).astype(np.uint8)


# ── V3A Youden 閾値判定 ──────────────────────────────
def predict_class_youden_v3a(probs):
    top3 = sorted(
        [(cls, float(probs[V3A_CLASS_NAMES.index(cls)])) for cls in V3A_CLASS_NAMES],
        key=lambda x: x[1], reverse=True
    )[:3]
    exceeded = [
        cls for cls in V3A_CLASS_NAMES
        if float(probs[V3A_CLASS_NAMES.index(cls)]) >= V3A_YOUDEN_THRESHOLDS[cls]
    ]
    if len(exceeded) == 1:
        return exceeded[0], top3, "Youden"
    elif len(exceeded) == 0:
        return None, top3, "below all thresholds"
    else:
        return None, top3, f"multiple exceeded ({', '.join(exceeded)})"


def pil_to_base64(image_pil, fmt="JPEG"):
    """PIL Image → base64文字列（data: prefix なし）"""
    buf = io.BytesIO()
    image_pil.save(buf, format=fmt, quality=85)
    return base64.b64encode(buf.getvalue()).decode("utf-8")


# ── V3A 推論（構造化データ返却）───────────────────────
def run_inference_v3a(image_bytes: bytes) -> dict:
    """
    V3A推論。構造化 dict を返す（Markdown生成はしない）。

    Returns:
        dict with keys: confidences, top_prediction, top_confidence,
                        binary_risk_score, risk_level, threshold, calibrated,
                        temperature, ece, gradcam_base64
    """
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = v3a_preprocess(img).unsqueeze(0)

    gradcam_base64 = None
    try:
        _gradcam_store["activations"] = None
        _gradcam_store["gradients"] = None
        logits, cam, pred_idx = generate_gradcam(tensor.clone())
        gradcam_pil = overlay_gradcam(img, cam)
        gradcam_base64 = pil_to_base64(gradcam_pil)
    except Exception as e:
        print(f"[v3a] Grad-CAM failed: {e}")
        with torch.no_grad():
            logits = model_v3a(tensor)
        pred_idx = logits.argmax(dim=1).item()

    probs = torch.softmax(logits.detach() / V3A_TEMPERATURE, dim=1)[0]

    # 短縮キーで confidences を構成
    confidences = {c: float(probs[i]) for i, c in enumerate(V3A_CLASS_NAMES)}

    # 二値悪性リスク
    risk_score = sum(confidences[c] for c in V3A_MALIGNANT_CLASSES)
    risk_level = "high" if risk_score >= V3A_BINARY_THRESHOLD else "low"

    # top prediction
    top_cls = max(confidences, key=confidences.get)

    _gradcam_store["activations"] = None
    _gradcam_store["gradients"] = None
    gc.collect()

    return {
        "confidences": confidences,
        "top_prediction": top_cls,
        "top_confidence": confidences[top_cls],
        "binary_risk_score": risk_score,
        "risk_level": risk_level,
        "threshold": V3A_BINARY_THRESHOLD,
        "calibrated": True,
        "temperature": V3A_TEMPERATURE,
        "ece": V3A_ECE,
        "gradcam_base64": gradcam_base64,
        "model_version": "v3a",
    }


# ╔════════════════════════════════════════════════════════════════╗
# ║  V10: PanDerm ViT-Large — 臨床写真 6クラス                     ║
# ╚════════════════════════════════════════════════════════════════╝

from huggingface_hub import hf_hub_download

print("[2] Downloading panderm backbone...")
try:
    V10_BACKBONE_PATH = hf_hub_download(
        repo_id="komail9/panderm-backbone",
        filename="panderm_backbone.pth",
        token=os.environ.get("HF_TOKEN"),
    )
except Exception as e:
    print(f"[v10] ⚠ Backbone download failed: {e}")
    V10_BACKBONE_PATH = "panderm_backbone.pth"  # fallback to local
V10_LP_HEAD_PATH = "panderm_lp_head_v10_fitz_tumor_20260312_205219.pth"

V10_CLASS_NAMES = [
    'benign dermal', 'benign epidermal', 'benign melanocyte',
    'malignant dermal', 'malignant epidermal', 'malignant melanoma',
]
print(f"[2] Done: {V10_BACKBONE_PATH}")

V10_CLASS_LABELS = {
    'benign dermal':       'Benign Dermal (良性真皮腫瘍)',
    'benign epidermal':    'Benign Epidermal (良性表皮腫瘍)',
    'benign melanocyte':   'Benign Melanocyte (良性メラノサイト腫瘍)',
    'malignant dermal':    'Malignant Dermal (悪性真皮腫瘍)',
    'malignant epidermal': 'Malignant Epidermal (悪性表皮腫瘍)',
    'malignant melanoma':  'Malignant Melanoma (悪性黒色腫)',
}

# route.ts の LABEL_TO_KEY に相当する短縮キーマッピング
V10_SHORT_KEYS = {
    'benign dermal':       'benign_dermal',
    'benign epidermal':    'benign_epidermal',
    'benign melanocyte':   'benign_melanocyte',
    'malignant dermal':    'malignant_dermal',
    'malignant epidermal': 'malignant_epidermal',
    'malignant melanoma':  'malignant_melanoma',
}

V10_MALIGNANT_CLASSES = ['malignant dermal', 'malignant epidermal', 'malignant melanoma']

V10_NORM_MEAN = [0.485, 0.456, 0.406]
V10_NORM_STD = [0.228, 0.224, 0.225]

# ── V10 Temperature & 閾値 ───────────────────────────
with open("posthoc_thresholds_v10.json", "r") as f:
    _v10_thresh = json.load(f)

V10_TEMPERATURE = _v10_thresh["temperature"]
V10_ECE = _v10_thresh["val_ece_after"]

V10_BINARY_THRESHOLD = _v10_thresh["binary_clinical"]["threshold"]
V10_BINARY_RECALL = _v10_thresh["binary_clinical"]["val_recall"]

print(f"[v10] Temperature: {V10_TEMPERATURE:.4f}")
print(f"[v10] Binary Clinical threshold: {V10_BINARY_THRESHOLD:.4f} (recall={V10_BINARY_RECALL:.3f})")

# ── V10 モデル読み込み ───────────────────────────────
def load_v10_model():
    import timm
    backbone = timm.create_model(
        'vit_large_patch16_224', pretrained=False, num_classes=0, init_values=1e-4
    )
    backbone_sd = torch.load(V10_BACKBONE_PATH, map_location="cpu", weights_only=True)
    missing, unexpected = backbone.load_state_dict(backbone_sd, strict=False)
    if missing:
        print(f"[v10] ⚠ Backbone missing keys: {len(missing)}")
    if unexpected:
        print(f"[v10] ⚠ Backbone unexpected keys: {len(unexpected)}")
    backbone.eval()

    lp_head = nn.Linear(1024, len(V10_CLASS_NAMES))
    lp_data = torch.load(V10_LP_HEAD_PATH, map_location="cpu", weights_only=True)
    lp_head.weight.data = lp_data['weight']
    lp_head.bias.data = lp_data['bias']
    lp_head.eval()

    print(f"[v10] ✓ PanDerm ViT-Large + LP head loaded")
    return backbone, lp_head


V10_AVAILABLE = False
model_v10_backbone = None
model_v10_head = None

if os.path.exists(V10_BACKBONE_PATH) and os.path.exists(V10_LP_HEAD_PATH):
    print("[3] Loading v10 model...", flush=True)
    _t = time.time()
    model_v10_backbone, model_v10_head = load_v10_model()
    print(f"[3] Done ({time.time()-_t:.1f}s)", flush=True)
    V10_AVAILABLE = True
else:
    print(f"[v10] ⚠ Model files not found — v10 tab disabled")
    print(f"  Expected: {V10_BACKBONE_PATH}, {V10_LP_HEAD_PATH}")

# ── V10 Grad-CAM ─────────────────────────────────────
_v10_gradcam_store = {"activations": None, "gradients": None}

def _v10_forward_hook(module, input, output):
    _v10_gradcam_store["activations"] = output.detach()

def _v10_backward_hook(module, grad_input, grad_output):
    _v10_gradcam_store["gradients"] = grad_output[0].detach()

if V10_AVAILABLE:
    _v10_target_layer = model_v10_backbone.blocks[-1].norm1
    _v10_target_layer.register_forward_hook(_v10_forward_hook)
    _v10_target_layer.register_full_backward_hook(_v10_backward_hook)
    print("[v10] ✓ Grad-CAM hooks registered on blocks[-1]")

v10_preprocess = transforms.Compose([
    transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(V10_NORM_MEAN, V10_NORM_STD),
])


def generate_gradcam_v10(tensor):
    model_v10_backbone.zero_grad()
    if model_v10_head is not None:
        model_v10_head.zero_grad()
    tensor = tensor.detach().requires_grad_(True)
    features = model_v10_backbone(tensor)
    logits = model_v10_head(features)
    pred_idx = logits.argmax(dim=1).item()
    logits[0, pred_idx].backward()

    acts = _v10_gradcam_store["activations"]
    grads = _v10_gradcam_store["gradients"]
    if acts is None or grads is None:
        return logits.detach(), np.zeros((14, 14), dtype=np.float32), pred_idx

# ViT: acts shape = (1, 197, dim) — 1 CLS + 196 patch tokens
    patch_acts = acts[0, 1:, :]   # (196, dim)
    patch_grads = grads[0, 1:, :] # (196, dim)

    weights = patch_grads.mean(dim=0)  # (dim,)
    cam_flat = torch.relu((patch_acts * weights).sum(dim=1))  # (196,)
    cam = cam_flat.reshape(14, 14)
    cam = cam / (cam.max() + 1e-8)
    return logits.detach(), cam.cpu().numpy(), pred_idx


# ── V10 推論（構造化データ返却）───────────────────────
def run_inference_v10(image_bytes: bytes) -> dict:
    """
    V10推論。構造化 dict を返す（Markdown生成はしない）。
    """
    if not V10_AVAILABLE:
        raise RuntimeError("v10 model not loaded")

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    tensor = v10_preprocess(img).unsqueeze(0)

    gradcam_base64 = None
    try:
        _v10_gradcam_store["activations"] = None
        _v10_gradcam_store["gradients"] = None
        logits, cam, pred_idx = generate_gradcam_v10(tensor.clone())
        gradcam_pil = overlay_gradcam(img, cam)
        gradcam_base64 = pil_to_base64(gradcam_pil)
    except Exception as e:
        print(f"[v10] Grad-CAM failed: {e}")
        with torch.no_grad():
            features = model_v10_backbone(tensor)
            logits = model_v10_head(features)
        pred_idx = logits.argmax(dim=1).item()

    probs = torch.softmax(logits.detach() / V10_TEMPERATURE, dim=1)[0]

    # 短縮キーで confidences を構成
    confidences = {
        V10_SHORT_KEYS[c]: float(probs[i])
        for i, c in enumerate(V10_CLASS_NAMES)
    }

    # 二値悪性リスク
    risk_score = sum(float(probs[V10_CLASS_NAMES.index(c)]) for c in V10_MALIGNANT_CLASSES)
    risk_level = "high" if risk_score >= V10_BINARY_THRESHOLD else "low"

    # top prediction（短縮キー）
    top_cls = max(confidences, key=confidences.get)

    _v10_gradcam_store["activations"] = None
    _v10_gradcam_store["gradients"] = None
    gc.collect()

    return {
        "confidences": confidences,
        "top_prediction": top_cls,
        "top_confidence": confidences[top_cls],
        "binary_risk_score": risk_score,
        "risk_level": risk_level,
        "threshold": V10_BINARY_THRESHOLD,
        "calibrated": True,
        "temperature": V10_TEMPERATURE,
        "ece": V10_ECE,
        "gradcam_base64": gradcam_base64,
        "model_version": "v10",
    }
