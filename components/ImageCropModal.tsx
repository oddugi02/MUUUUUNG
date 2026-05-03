"use client";

import { useCallback, useState } from "react";
import Cropper, { Area, Point } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

const MAX_OUTPUT_PX = 2048;

/** blob URL → 이미지 로드 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener("load", () => resolve(img));
    img.addEventListener("error", (e) => reject(e));
    img.src = src;
  });
}

/** 크롭 영역을 캔버스로 래스터 → JPEG Blob (긴 변 최대 MAX_OUTPUT_PX) */
async function canvasCropToBlob(
  imageSrc: string,
  pixelCrop: Area,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2d context unavailable");

  let { width, height } = pixelCrop;
  const scale = Math.min(1, MAX_OUTPUT_PX / Math.max(width, height));
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  canvas.width = outW;
  canvas.height = outH;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outW,
    outH,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("이미지를 만들 수 없습니다."));
        else resolve(blob);
      },
      mimeType,
      quality,
    );
  });
}

type ImageCropModalProps = {
  imageSrc: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
};

/** 원형 포털과 잘 맞는 정사각형 크롭 */
export function ImageCropModal({ imageSrc, onConfirm, onCancel }: ImageCropModalProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setCroppedAreaPixels(areaPx);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;
    setBusy(true);
    try {
      const blob = await canvasCropToBlob(imageSrc, croppedAreaPixels, "image/jpeg", 0.92);
      onConfirm(blob);
    } catch {
      setBusy(false);
    }
    // 성공 시 부모가 언마운트하므로 busy 복구 불필요
  }, [croppedAreaPixels, imageSrc, onConfirm]);

  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/55 p-4 font-sans"
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-dialog-title"
    >
      <div className="flex w-full max-w-lg flex-col rounded-lg border border-neutral-400 bg-neutral-100 p-4 shadow-xl sm:p-5">
        <h2 id="crop-dialog-title" className="mb-3 text-center text-base font-semibold text-neutral-900">
          이미지 맞추기
        </h2>
        <p className="mb-3 text-center text-xs text-neutral-600">
          드래그로 위치를 옮기고, 슬라이더로 확대할 수 있어요. 정사각형 안에 담긴 부분이 터널에 쓰입니다.
        </p>

        <div className="relative h-[min(52vh,380px)] w-full overflow-hidden rounded-md bg-neutral-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="flex items-center gap-3 text-sm text-neutral-800">
            <span className="w-10 shrink-0 text-neutral-600">확대</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="min-w-0 flex-1 accent-neutral-900"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            disabled={busy}
            className="rounded-full border border-neutral-500 bg-white px-6 py-2 text-sm text-neutral-800 transition hover:bg-neutral-50 active:scale-[0.98] disabled:opacity-50"
            onClick={onCancel}
          >
            취소
          </button>
          <button
            type="button"
            disabled={busy || !croppedAreaPixels}
            className="rounded-full border border-neutral-700 bg-neutral-900 px-8 py-2 text-sm text-neutral-100 transition hover:bg-black active:scale-[0.98] disabled:opacity-50"
            onClick={handleConfirm}
          >
            {busy ? "처리 중…" : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
