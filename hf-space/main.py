"""
DermLens エントリポイント — FastAPI + Gradio 共存

Routes:
  /api/v1/...  → RESTful API（Next.js route.ts から呼ばれる）
  /gradio      → Gradio UI（面接デモ用）
  /docs        → Swagger UI（OpenAPI 仕様書）
"""

import gradio as gr
from api import app as fastapi_app
from gradio_ui import demo as gradio_demo

# Gradio を FastAPI にマウント
app = gr.mount_gradio_app(fastapi_app, gradio_demo, path="/")

print("[4] FastAPI + Gradio ready", flush=True)
