"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PortalTunnel } from "./PortalTunnel";

const DEMO_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/demo.png`;

export function HomeClient() {
  const [customObjectUrl, setCustomObjectUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const displaySrc = customObjectUrl ?? DEMO_SRC;
  const isCustom = customObjectUrl !== null;

  const imageAlt = useMemo(
    () => (isCustom ? "사용자가 업로드한 이미지" : "데모 이미지"),
    [isCustom],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const revokeIfNeeded = useCallback(() => {
    setCustomObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSeconds(0);
    if (fileRef.current) fileRef.current.value = "";
    setLeaveConfirmOpen(false);
  }, []);

  const onPickFile = useCallback((fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setCustomObjectUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setSeconds(0);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  return (
    <main className="relative flex min-h-dvh flex-col bg-neutral-300">
      <PortalTunnel key={displaySrc} imageSrc={displaySrc} imageAlt={imageAlt} />

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex justify-end p-4 sm:p-6">
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          {!isCustom ? (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-400/80 bg-neutral-100/95 px-4 py-2 text-sm text-neutral-800 shadow-md shadow-neutral-900/10 backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
              >
                <UploadGlyph className="h-4 w-4 shrink-0" aria-hidden />
                내 이미지로 멍때리기
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onPickFile(e.target.files)}
              />
            </>
          ) : (
            <div className="flex flex-col items-end gap-2">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-neutral-400/80 bg-neutral-100/95 px-4 py-2 text-sm text-neutral-800 shadow-md shadow-neutral-900/10 backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
              >
                <UploadGlyph className="h-4 w-4 shrink-0" aria-hidden />
                다른 이미지 업로드
              </button>
              <button
                type="button"
                onClick={() => setLeaveConfirmOpen(true)}
                className="rounded-full border border-neutral-600 bg-neutral-800/95 px-4 py-2 text-sm text-neutral-100 shadow-md transition hover:bg-neutral-900 active:scale-[0.98]"
              >
                돌아가기
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onPickFile(e.target.files)}
              />
            </div>
          )}
        </div>
      </div>

      {leaveConfirmOpen ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 p-4 font-mono"
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-dialog-title"
        >
          <div className="w-full max-w-sm rounded-lg border border-neutral-400 bg-neutral-100 p-5 shadow-xl">
            <p id="leave-dialog-title" className="mb-5 text-center text-sm text-neutral-900">
              홈화면으로 돌아가시겠습니까?
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                className="rounded-full border border-neutral-500 bg-white px-5 py-2 text-sm text-neutral-800 transition hover:bg-neutral-50 active:scale-[0.98]"
                onClick={() => setLeaveConfirmOpen(false)}
              >
                아니요
              </button>
              <button
                type="button"
                className="rounded-full border border-neutral-700 bg-neutral-900 px-5 py-2 text-sm text-neutral-100 transition hover:bg-black active:scale-[0.98]"
                onClick={revokeIfNeeded}
              >
                네
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="timer-frame px-5 py-3 text-center">
          <p className="text-sm tracking-tight text-black sm:text-base">
            <span className="tabular-nums">{seconds}</span>
            <span> seconds of MUNG .....</span>
          </p>
        </div>
      </div>
    </main>
  );
}

function UploadGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 11V3" />
      <path d="m8 7 4-4 4 4" />
      <rect x="3" y="13" width="18" height="8" rx="1.5" />
    </svg>
  );
}
