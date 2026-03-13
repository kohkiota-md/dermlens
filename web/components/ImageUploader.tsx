"use client";

import { useCallback, useRef, useState, DragEvent, ChangeEvent } from "react";
import type { UploadStatus } from "@/lib/types";

interface Props {
  onImageSelected: (dataUri: string) => void;
  status: UploadStatus;
  /** 親から渡すプレビュー画像（Example クリック時） */
  externalPreview?: string | null;
  /** 親にプレビュー解除を通知 */
  onReset?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export default function ImageUploader({
  onImageSelected,
  status,
  externalPreview,
  onReset,
}: Props) {
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 外部プレビュー（Example）とローカルプレビュー（D&D / ファイル選択）を統合
  const preview = externalPreview || localPreview;

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("JPEG、PNG、またはWebP画像を選択してください。");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("ファイルサイズは10MB以下にしてください。");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUri = e.target?.result as string;
        setLocalPreview(dataUri);
        onImageSelected(dataUri);
      };
      reader.onerror = () => setError("ファイルの読み込みに失敗しました。");
      reader.readAsDataURL(file);
    },
    [onImageSelected],
  );

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleReset = useCallback(() => {
    setLocalPreview(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
    onReset?.();
  }, [onReset]);

  const isProcessing = status === "uploading" || status === "predicting";

  return (
    <div className="space-y-4">
      {/* プレビュー表示 */}
      {preview ? (
        <div className="relative">
          <div className="rounded-xl overflow-hidden border border-slate-200 bg-white">
            <img
              src={preview}
              alt="アップロード画像"
              className="w-full max-h-80 object-contain bg-slate-50"
            />
          </div>

          {/* 処理中オーバーレイ */}
          {isProcessing && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="mt-3 text-sm font-medium text-slate-600 animate-gentle-pulse">
                  {status === "uploading"
                    ? "画像を送信中..."
                    : "AIが解析中..."}
                </p>
              </div>
            </div>
          )}

          {/* リセットボタン */}
          {!isProcessing && (
            <button
              onClick={handleReset}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 hover:bg-white rounded-full shadow-md flex items-center justify-center transition-colors cursor-pointer"
            >
              <svg
                className="w-4 h-4 text-slate-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      ) : (
        /* ドラッグ&ドロップ領域 */
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            drop-zone relative cursor-pointer rounded-xl border-2 border-dashed p-10
            flex flex-col items-center justify-center text-center
            ${
              dragActive
                ? "drop-zone-active border-blue-400 bg-blue-50"
                : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50"
            }
          `}
        >
          <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
            <svg
              className="w-7 h-7 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
          </div>

          <p className="text-sm font-medium text-slate-700">
            画像をドラッグ&ドロップ
          </p>
          <p className="text-xs text-slate-400 mt-1">
            または
            <span className="text-blue-600 font-medium">
              クリックして選択
            </span>
          </p>
          <p className="text-xs text-slate-400 mt-3">
            JPEG, PNG, WebP · 最大10MB
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      )}

      {/* エラー表示 */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-2">
          <svg
            className="w-4 h-4 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
          {error}
        </div>
      )}
    </div>
  );
}
