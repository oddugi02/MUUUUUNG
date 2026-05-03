"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PortalTunnel } from "./PortalTunnel";

const DEMO_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/demo.png`;

/** 10s → 20s → 30s … 구간마다 레벨 상승 (누적 10, 30, 60, …초). */
function mungLevelFromElapsedSeconds(t: number): number {
  let level = 1;
  while (t >= 5 * level * (level + 1)) {
    level += 1;
  }
  return level;
}

/** 레벨 n → M + U×n + NG (MUNG, MUUNG, MUUUNG, …). */
function mungWord(level: number): string {
  return `M${"U".repeat(level)}NG`;
}

export function HomeClient() {
  const [customObjectUrl, setCustomObjectUrl] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const displaySrc = customObjectUrl ?? DEMO_SRC;
  const isCustom = customObjectUrl !== null;

  const imageAlt = useMemo(
    () => (isCustom ? "사용자가 업로드한 이미지" : "데모 이미지"),
    [isCustom],
  );

  const mungLevel = useMemo(() => mungLevelFromElapsedSeconds(seconds), [seconds]);
  const mungBrand = useMemo(() => mungWord(mungLevel), [mungLevel]);

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

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex justify-between gap-4 p-4 sm:p-6">
        <div className="pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={() => setBenefitsOpen(true)}
            className="rounded-full border border-neutral-400/80 bg-neutral-100/95 px-4 py-2 text-sm text-neutral-800 shadow-md shadow-neutral-900/10 backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
          >
            멍때리기의 효능
          </button>
        </div>
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

      {benefitsOpen ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 p-4 font-sans"
          role="dialog"
          aria-modal="true"
          aria-labelledby="benefits-dialog-title"
          onClick={() => setBenefitsOpen(false)}
        >
          <div
            className="max-h-[min(85vh,32rem)] w-full max-w-md overflow-y-auto rounded-lg border border-neutral-400 bg-neutral-100 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="benefits-dialog-title"
              className="mb-4 text-center text-base font-semibold text-neutral-900"
            >
              멍때리기의 효능
            </h2>
            <ul className="mb-6 list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-800">
              <li>잠깐 멍해지면 뇌가 쉬면서 불필요한 긴장이 풀릴 수 있어요.</li>
              <li>아무것도 하지 않는 시간이 새 아이디어나 통찰로 이어지기도 해요.</li>
              <li>자극에서 잠시 거리를 두면 마음이 가라앉고 집중이 돌아오기도 해요.</li>
              <li className="text-neutral-600">
                너무 오래 같은 자세로만 있으면 목·허리에 부담이 될 수 있어요. 가끔 스트레칭도 해 주세요.
              </li>
            </ul>
            <div className="flex justify-center">
              <button
                type="button"
                className="rounded-full border border-neutral-700 bg-neutral-900 px-8 py-2 text-sm text-neutral-100 transition hover:bg-black active:scale-[0.98]"
                onClick={() => setBenefitsOpen(false)}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
          <p className="mb-1 text-sm font-medium tracking-tight text-black sm:text-base">
            MUNG LV <span className="tabular-nums">{mungLevel}</span>.
          </p>
          <p className="text-sm tracking-tight text-black sm:text-base">
            <span className="tabular-nums">{seconds}</span>
            <span>
              {" "}
              seconds of {mungBrand}
            </span>
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
