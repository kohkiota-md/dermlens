#!/usr/bin/env python3
"""PanDerm backbone weights を HF Spaces 用に抽出する。

元checkpoint から encoder 部分のみ抽出し、timm 形式に変換して保存。

変換内容:
  1. encoder. prefix のキーだけ抽出（decoder/regressor 除外）
  2. q_bias + v_bias → qkv.bias に融合（PanDerm CAE-v2 → timm 形式）
  3. gamma_1/gamma_2 → ls1.gamma/ls2.gamma にリネーム（LayerScale）

Usage:
    cd ~/skin-lesion-triage
    conda activate skin-ai
    python prepare_v10_deploy.py
"""

import torch
from pathlib import Path

CKPT_PATH = Path.home() / 'PanDerm/checkpoints/panderm_ll_data6_checkpoint-499.pth'
OUTPUT_PATH = Path.home() / 'skin-lesion-triage/hf-space/panderm_backbone.pth'

# ── 1. encoder keys だけ抽出 ─────────────────────────
print(f"Loading: {CKPT_PATH}")
assert CKPT_PATH.exists(), f"Not found: {CKPT_PATH}"

ckpt = torch.load(CKPT_PATH, map_location='cpu', weights_only=True)
print(f"  Total keys in checkpoint: {len(ckpt)}")

encoder_sd = {}
skipped = 0
for k, v in ckpt.items():
    if k.startswith('encoder.'):
        encoder_sd[k[len('encoder.'):]] = v
    else:
        skipped += 1

print(f"  Encoder keys: {len(encoder_sd)}, Skipped: {skipped}")

# ── 2. QKV bias 融合 ────────────────────────────────
# PanDerm: blocks.X.attn.q_bias / v_bias → timm: blocks.X.attn.qkv.bias
fused_sd = {}
q_biases = {}
v_biases = {}

for k, v in encoder_sd.items():
    if '.attn.q_bias' in k:
        block_prefix = k.replace('.attn.q_bias', '')
        q_biases[block_prefix] = v
    elif '.attn.v_bias' in k:
        block_prefix = k.replace('.attn.v_bias', '')
        v_biases[block_prefix] = v
    else:
        fused_sd[k] = v

fused_count = 0
for block_prefix in sorted(q_biases.keys()):
    q = q_biases[block_prefix]
    v = v_biases[block_prefix]
    k_zeros = torch.zeros_like(q)
    qkv_bias = torch.cat([q, k_zeros, v])
    fused_sd[f"{block_prefix}.attn.qkv.bias"] = qkv_bias
    fused_count += 1

print(f"  QKV bias fused: {fused_count} blocks")

# ── 3. LayerScale リネーム ───────────────────────────
# PanDerm: blocks.X.gamma_1 / gamma_2 → timm: blocks.X.ls1.gamma / ls2.gamma
renamed_sd = {}
ls_count = 0
for k, v in fused_sd.items():
    if '.gamma_1' in k:
        renamed_sd[k.replace('.gamma_1', '.ls1.gamma')] = v
        ls_count += 1
    elif '.gamma_2' in k:
        renamed_sd[k.replace('.gamma_2', '.ls2.gamma')] = v
        ls_count += 1
    else:
        renamed_sd[k] = v

print(f"  LayerScale renamed: {ls_count} params")
print(f"  Final keys: {len(renamed_sd)}")

torch.save(renamed_sd, OUTPUT_PATH)
size_mb = OUTPUT_PATH.stat().st_size / 1024 / 1024
print(f"  Saved: {OUTPUT_PATH} ({size_mb:.1f} MB)")

# ── 4. timm 互換性検証 ──────────────────────────────
print(f"\nVerifying timm compatibility...")
import timm

# init_values で LayerScale を有効化
model = timm.create_model(
    'vit_large_patch16_224', pretrained=False, num_classes=0, init_values=1e-4
)
missing, unexpected = model.load_state_dict(renamed_sd, strict=False)
print(f"  missing={len(missing)}, unexpected={len(unexpected)}")
if missing:
    print(f"  Missing: {missing}")
if unexpected:
    print(f"  Unexpected: {unexpected}")

# 推論テスト
model.eval()
with torch.no_grad():
    feat = model(torch.randn(1, 3, 224, 224))
print(f"  Forward: (1,3,224,224) → {feat.shape}")
assert feat.shape == (1, 1024), f"Expected (1, 1024), got {feat.shape}"

if missing == [] and unexpected == []:
    print(f"\n✓ 完全一致。このまま使える。")
else:
    print(f"\n⚠ 不一致あり。上の出力を貼って相談してください。")
