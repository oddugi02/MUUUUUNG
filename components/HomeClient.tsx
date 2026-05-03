"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBgmPlayer } from "@/hooks/useBgmPlayer";
import { loadBgmTrackId, saveBgmTrackId } from "@/lib/bgmPlaylist";
import {
  DEFAULT_PORTAL_SETTINGS,
  loadPortalSettings,
  savePortalSettings,
  type PortalSettings,
} from "@/lib/portalSettings";
import { BgmModal } from "./BgmModal";
import { ImageCropModal } from "./ImageCropModal";
import { PortalSettingsModal } from "./PortalSettingsModal";
import { PortalTunnel } from "./PortalTunnel";

const DEMO_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/demo.png`;

const WELCOME_STORAGE_KEY = "muuuuung-welcome-seen";

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
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [infoSlide, setInfoSlide] = useState(0);
  /** 첫 방문 안내: 바깥 탭으로 닫기 비활성화 */
  const [infoBackdropClosable, setInfoBackdropClosable] = useState(true);
  /** 파일 선택 후 크롭 UI용 blob URL (확정 전) */
  const [cropPreviewSrc, setCropPreviewSrc] = useState<string | null>(null);
  const [portalSettings, setPortalSettings] = useState<PortalSettings>(DEFAULT_PORTAL_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bgmOpen, setBgmOpen] = useState(false);
  const [bgmTrackId, setBgmTrackId] = useState("none");
  const skipNextSettingsSave = useRef(true);
  const skipBgmSave = useRef(true);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPortalSettings(loadPortalSettings());
  }, []);

  useEffect(() => {
    setBgmTrackId(loadBgmTrackId());
  }, []);

  useBgmPlayer(bgmTrackId);

  useEffect(() => {
    if (skipNextSettingsSave.current) {
      skipNextSettingsSave.current = false;
      return;
    }
    savePortalSettings(portalSettings);
  }, [portalSettings]);

  useEffect(() => {
    if (skipBgmSave.current) {
      skipBgmSave.current = false;
      return;
    }
    saveBgmTrackId(bgmTrackId);
  }, [bgmTrackId]);

  useEffect(() => {
    try {
      if (!localStorage.getItem(WELCOME_STORAGE_KEY)) {
        setInfoModalOpen(true);
        setInfoSlide(0);
        setInfoBackdropClosable(false);
      }
    } catch {
      /* private mode 등 */
    }
  }, []);

  const displaySrc = customObjectUrl ?? DEMO_SRC;
  const isCustom = customObjectUrl !== null;

  const imageAlt = useMemo(
    () => (isCustom ? "사용자가 업로드한 이미지" : "데모 이미지"),
    [isCustom],
  );

  const mungLevel = useMemo(() => mungLevelFromElapsedSeconds(seconds), [seconds]);
  const mungBrand = useMemo(() => mungWord(mungLevel), [mungLevel]);

  useEffect(() => {
    let id: number | null = null;
    const start = () => {
      if (id !== null) return;
      id = window.setInterval(() => {
        setSeconds((s) => s + 1);
      }, 1000);
    };
    const stop = () => {
      if (id === null) return;
      window.clearInterval(id);
      id = null;
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const revokeIfNeeded = useCallback(() => {
    setCropPreviewSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
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
      setCropPreviewSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, []);

  const onCropConfirm = useCallback((blob: Blob) => {
    const nextUrl = URL.createObjectURL(blob);
    setCropPreviewSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCustomObjectUrl((old) => {
      if (old) URL.revokeObjectURL(old);
      return nextUrl;
    });
    setSeconds(0);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const onCropCancel = useCallback(() => {
    setCropPreviewSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const openInfoFromHint = useCallback(() => {
    setInfoSlide(0);
    setInfoBackdropClosable(true);
    setInfoModalOpen(true);
  }, []);

  const closeInfoModal = useCallback(() => {
    setInfoModalOpen(false);
    setInfoBackdropClosable(true);
  }, []);

  const onInfoConfirm = useCallback(() => {
    try {
      localStorage.setItem(WELCOME_STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    closeInfoModal();
  }, [closeInfoModal]);

  const portalTunnelKey = `${displaySrc}-${portalSettings.ringExpandSec}-${portalSettings.centerSizePercent}-${portalSettings.maskShape}`;
  const bgmPlaybackOff = bgmTrackId === "none";

  return (
    <main className="relative flex h-dvh min-h-0 flex-col overflow-hidden bg-neutral-300">
      <PortalTunnel
        key={portalTunnelKey}
        imageSrc={displaySrc}
        imageAlt={imageAlt}
        ringExpandSec={portalSettings.ringExpandSec}
        centerSizePercent={portalSettings.centerSizePercent}
        maskShape={portalSettings.maskShape}
      />

      <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex justify-between gap-4 p-4 sm:p-6">
        <div className="pointer-events-auto flex max-md:origin-top-left max-md:scale-[0.75] flex-col gap-2 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openInfoFromHint}
              aria-label="도움말: 멍때리기의 효능"
              title="멍때리기의 효능"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-400/80 bg-neutral-100/95 text-neutral-800 shadow-md shadow-neutral-900/10 backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
            >
              <HelpGlyph className="h-5 w-5 shrink-0" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setBgmOpen(true)}
              aria-label={bgmPlaybackOff ? "BGM 선택 — 현재 재생 안 함" : "BGM 선택"}
              title={bgmPlaybackOff ? "BGM 선택 (재생 안 함)" : "BGM 선택"}
              className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border shadow-md backdrop-blur-sm transition active:scale-[0.98] ${
                bgmPlaybackOff
                  ? "border-neutral-400/70 bg-neutral-200/95 text-neutral-500 shadow-neutral-900/5 hover:bg-neutral-200"
                  : "border-neutral-400/80 bg-neutral-100/95 text-neutral-800 shadow-neutral-900/10 hover:bg-white"
              }`}
            >
              <span className="relative inline-flex h-5 w-5 items-center justify-center">
                <MusicNoteGlyph className="h-5 w-5 shrink-0" aria-hidden />
                {bgmPlaybackOff ? (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-1/2 top-1/2 h-0.5 w-[130%] -translate-x-1/2 -translate-y-1/2 -rotate-45 rounded-full bg-current opacity-95"
                  />
                ) : null}
              </span>
            </button>
          </div>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            aria-label="터널 설정: 속도, 중앙 크기, 마스크"
            title="터널 설정"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-400/80 bg-neutral-100/95 text-neutral-800 shadow-md shadow-neutral-900/10 backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
          >
            <SettingsGlyph className="h-5 w-5 shrink-0" aria-hidden />
          </button>
        </div>
        <div className="pointer-events-auto flex max-md:origin-top-right max-md:scale-[0.75] flex-col items-end gap-2">
          {!isCustom ? (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label="내 이미지로 멍때리기"
                title="내 이미지로 멍때리기"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-400/80 bg-neutral-100/95 text-neutral-800 shadow-md shadow-neutral-900/10 backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
              >
                <UploadGlyph className="h-5 w-5 shrink-0" aria-hidden />
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
                aria-label="다른 이미지 업로드"
                title="Other"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-400/80 bg-neutral-100/95 px-4 py-2 text-sm text-neutral-800 shadow-md shadow-neutral-900/10 backdrop-blur-sm transition hover:bg-white active:scale-[0.98]"
              >
                <UploadGlyph className="h-4 w-4 shrink-0" aria-hidden />
                Other
              </button>
              <button
                type="button"
                onClick={() => setLeaveConfirmOpen(true)}
                aria-label="돌아가기"
                title="돌아가기"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-neutral-600 bg-neutral-800/95 text-neutral-100 shadow-md transition hover:bg-neutral-900 active:scale-[0.98]"
              >
                <BackArrowGlyph className="h-5 w-5 shrink-0" aria-hidden />
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

      {cropPreviewSrc ? (
        <ImageCropModal
          imageSrc={cropPreviewSrc}
          onConfirm={onCropConfirm}
          onCancel={onCropCancel}
        />
      ) : null}

      <PortalSettingsModal
        open={settingsOpen}
        settings={portalSettings}
        onChange={setPortalSettings}
        onClose={() => setSettingsOpen(false)}
      />

      <BgmModal
        open={bgmOpen}
        selectedId={bgmTrackId}
        onSelect={(id) => setBgmTrackId(id)}
        onClose={() => setBgmOpen(false)}
      />

      {infoModalOpen ? (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/45 p-4 font-sans"
          role="dialog"
          aria-modal="true"
          aria-labelledby="info-dialog-title"
          onClick={() => {
            if (infoBackdropClosable) closeInfoModal();
          }}
        >
          <div
            className="max-h-[min(85vh,32rem)] w-full max-w-md touch-pan-y overflow-y-auto overscroll-contain rounded-lg border border-neutral-400 bg-neutral-100 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex justify-center gap-1.5" aria-hidden>
              <span
                className={`h-1.5 w-1.5 rounded-full ${infoSlide === 0 ? "bg-neutral-800" : "bg-neutral-400"}`}
              />
              <span
                className={`h-1.5 w-1.5 rounded-full ${infoSlide === 1 ? "bg-neutral-800" : "bg-neutral-400"}`}
              />
            </div>

            {infoSlide === 0 ? (
              <>
                <h2
                  id="info-dialog-title"
                  className="mb-4 text-center text-base font-semibold text-neutral-900"
                >
                  MUUUUUNG
                </h2>
                <p className="mb-6 text-center text-sm leading-relaxed text-neutral-800">
                  업로드한 이미지로 펼쳐지는 무한 터널입니다. 아무것도 하지 않는 시간을 천천히
                  기록해 보세요. 손가락이나 마우스를 움직이면 화면 속 레이어가 부드럽게 따라옵니다.
                </p>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    className="rounded-full border border-neutral-700 bg-neutral-900 px-8 py-2 text-sm text-neutral-100 transition hover:bg-black active:scale-[0.98]"
                    onClick={() => setInfoSlide(1)}
                  >
                    다음
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2
                  id="info-dialog-title"
                  className="mb-4 text-center text-base font-semibold text-neutral-900"
                >
                  멍때리기의 효능
                </h2>
                <ul className="mb-6 list-disc space-y-2 pl-5 text-sm leading-relaxed text-neutral-800">
                  <li>잠깐 멍해지면 뇌가 쉬면서 불필요한 긴장이 풀릴 수 있어요.</li>
                  <li>아무것도 하지 않는 시간이 새 아이디어나 통찰로 이어지기도 해요.</li>
                  <li>자극에서 잠시 거리를 두면 마음이 가라앉고 집중이 돌아오기도 해요.</li>
                  <li className="text-neutral-600">
                    너무 오래 같은 자세로만 있으면 목·허리에 부담이 될 수 있어요. 가끔 스트레칭도 해
                    주세요.
                  </li>
                </ul>
                <div className="flex justify-center gap-3">
                  <button
                    type="button"
                    className="rounded-full border border-neutral-500 bg-white px-5 py-2 text-sm text-neutral-800 transition hover:bg-neutral-50 active:scale-[0.98]"
                    onClick={() => setInfoSlide(0)}
                  >
                    이전
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-neutral-700 bg-neutral-900 px-8 py-2 text-sm text-neutral-100 transition hover:bg-black active:scale-[0.98]"
                    onClick={onInfoConfirm}
                  >
                    확인
                  </button>
                </div>
              </>
            )}
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

function MusicNoteGlyph({ className }: { className?: string }) {
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
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function SettingsGlyph({ className }: { className?: string }) {
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
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HelpGlyph({ className }: { className?: string }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
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

function BackArrowGlyph({ className }: { className?: string }) {
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
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

