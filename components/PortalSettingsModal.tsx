"use client";

import { useEffect, useState } from "react";
import type { PortalMaskShape, PortalSettings } from "@/lib/portalSettings";
import {
  DEFAULT_PORTAL_SETTINGS,
  DEFAULT_SLIDER_SNAP_RADIUS,
  MASK_SHAPE_LABELS,
  snapToDefault,
} from "@/lib/portalSettings";

type TabId = "speed" | "center" | "mask";

const TABS: { id: TabId; label: string }[] = [
  { id: "speed", label: "속도" },
  { id: "center", label: "중앙" },
  { id: "mask", label: "마스크" },
];

const MASK_ORDER: PortalMaskShape[] = ["circle", "soft", "roundedSquare", "heart"];

const RING_MIN = 6;
const RING_MAX = 90;
const CENTER_MIN = 16;
const CENTER_MAX = 48;

const DEF_SEC = DEFAULT_PORTAL_SETTINGS.ringExpandSec;
const DEF_PCT = DEFAULT_PORTAL_SETTINGS.centerSizePercent;
const DEF_MASK = DEFAULT_PORTAL_SETTINGS.maskShape;

function defaultTickLeftPercent(value: number, min: number, max: number): string {
  const t = (value - min) / (max - min);
  return `${t * 100}%`;
}

type PortalSettingsModalProps = {
  open: boolean;
  settings: PortalSettings;
  onChange: (next: PortalSettings) => void;
  onClose: () => void;
};

export function PortalSettingsModal({
  open,
  settings,
  onChange,
  onClose,
}: PortalSettingsModalProps) {
  const [tab, setTab] = useState<TabId>("speed");

  useEffect(() => {
    if (open) setTab("speed");
  }, [open]);

  if (!open) return null;

  const applyAllDefaults = () => {
    onChange({ ...DEFAULT_PORTAL_SETTINGS });
  };

  return (
    <div
      className="fixed inset-0 z-[2050] flex items-end justify-center bg-black/45 p-0 font-sans sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portal-settings-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(88dvh,580px)] w-full max-w-lg flex-col rounded-t-2xl border border-neutral-400 border-b-0 bg-neutral-100 shadow-xl sm:rounded-2xl sm:border-b"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 border-b border-neutral-300 px-4 py-3 sm:px-5">
          <h2 id="portal-settings-title" className="min-w-0 text-base font-semibold text-neutral-900">
            터널 설정
          </h2>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              className="whitespace-nowrap rounded-full border border-amber-600/80 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-950 transition hover:bg-amber-100"
              onClick={applyAllDefaults}
            >
              모두 기본값
            </button>
            <button
              type="button"
              className="whitespace-nowrap rounded-full px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-200"
              onClick={onClose}
            >
              닫기
            </button>
          </div>
        </div>

        <p className="border-b border-neutral-200 bg-amber-50/90 px-4 py-2.5 text-center text-[11px] leading-snug text-amber-950 sm:px-5">
          <span className="font-medium">앱 기본(설정 도입 전)</span> · 디스크{" "}
          <span className="tabular-nums font-semibold">{DEF_SEC}초</span> · 중앙{" "}
          <span className="tabular-nums font-semibold">{DEF_PCT}%</span> · 마스크{" "}
          <span className="font-semibold">{MASK_SHAPE_LABELS[DEF_MASK]}</span>
          <span className="text-amber-800/90">
            {" "}
            — 슬라이더는 기본값 ±{DEFAULT_SLIDER_SNAP_RADIUS}에서 자동 맞춤
          </span>
        </p>

        <div className="flex border-b border-neutral-300 px-2 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`min-w-0 flex-1 rounded-t-lg px-2 py-2.5 text-center text-sm font-medium transition ${
                tab === t.id
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-600 hover:bg-neutral-200/80"
              }`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="touch-pan-y flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
          {tab === "speed" ? (
            <section aria-labelledby="speed-heading">
              <h3 id="speed-heading" className="mb-2 text-sm font-medium text-neutral-800">
                디스크 확장 속도
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-neutral-600">
                한 겹의 이미지 디스크가 화면 가장자리까지 커지는 데 걸리는 시간입니다. 짧을수록
                빠릅니다. 새 디스크가 이어서 생기는 간격은 이 값에 맞춰 자동으로 잡혀, 빠르게
                설정해도 겹쳐 보이는 여러 겹이 유지되도록 되어 있어요.
              </p>
              <p className="mb-3 text-xs text-neutral-700">
                <span className="rounded bg-neutral-200/90 px-1.5 py-0.5 font-medium text-neutral-900">
                  기본 {DEF_SEC}초
                </span>
                <span className="text-neutral-500"> — 노란 눈금 위로 맞추면 원래 기본과 동일</span>
              </p>
              <label className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>빠름</span>
                  <span className="tabular-nums text-neutral-800">
                    {settings.ringExpandSec}초 / 디스크
                  </span>
                  <span>느림</span>
                </div>
                <div className="relative pb-1 pt-0.5">
                  <div
                    className="pointer-events-none absolute inset-x-0 top-[calc(50%-2px)] z-0 flex h-5 items-center"
                    aria-hidden
                  >
                    <span
                      title={`앱 기본값 ${DEF_SEC}초`}
                      className="absolute h-3 w-[3px] -translate-x-1/2 rounded-full bg-amber-500 shadow-sm ring-1 ring-amber-600/40"
                      style={{ left: defaultTickLeftPercent(DEF_SEC, RING_MIN, RING_MAX) }}
                    />
                  </div>
                  <input
                    type="range"
                    min={RING_MIN}
                    max={RING_MAX}
                    step={1}
                    value={settings.ringExpandSec}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const ringExpandSec = snapToDefault(
                        raw,
                        RING_MIN,
                        RING_MAX,
                        DEF_SEC,
                        DEFAULT_SLIDER_SNAP_RADIUS,
                      );
                      onChange({ ...settings, ringExpandSec });
                    }}
                    className="relative z-10 w-full accent-neutral-900"
                  />
                </div>
              </label>
            </section>
          ) : null}

          {tab === "center" ? (
            <section aria-labelledby="center-heading">
              <h3 id="center-heading" className="mb-2 text-sm font-medium text-neutral-800">
                중앙 고정 이미지 크기
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-neutral-600">
                가장 앞에 고정되는 이미지 원의 크기입니다. 터널 정사각형 안에서 차지하는 비율이에요.
              </p>
              <p className="mb-3 text-xs text-neutral-700">
                <span className="rounded bg-neutral-200/90 px-1.5 py-0.5 font-medium text-neutral-900">
                  기본 {DEF_PCT}%
                </span>
                <span className="text-neutral-500"> — 노란 눈금 위로 맞추면 원래 기본과 동일</span>
              </p>
              <label className="flex flex-col gap-2">
                <div className="flex justify-between text-xs text-neutral-600">
                  <span>작게</span>
                  <span className="tabular-nums text-neutral-800">{settings.centerSizePercent}%</span>
                  <span>크게</span>
                </div>
                <div className="relative pb-1 pt-0.5">
                  <div
                    className="pointer-events-none absolute inset-x-0 top-[calc(50%-2px)] z-0 flex h-5 items-center"
                    aria-hidden
                  >
                    <span
                      title={`앱 기본값 ${DEF_PCT}%`}
                      className="absolute h-3 w-[3px] -translate-x-1/2 rounded-full bg-amber-500 shadow-sm ring-1 ring-amber-600/40"
                      style={{ left: defaultTickLeftPercent(DEF_PCT, CENTER_MIN, CENTER_MAX) }}
                    />
                  </div>
                  <input
                    type="range"
                    min={CENTER_MIN}
                    max={CENTER_MAX}
                    step={1}
                    value={settings.centerSizePercent}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const centerSizePercent = snapToDefault(
                        raw,
                        CENTER_MIN,
                        CENTER_MAX,
                        DEF_PCT,
                        DEFAULT_SLIDER_SNAP_RADIUS,
                      );
                      onChange({ ...settings, centerSizePercent });
                    }}
                    className="relative z-10 w-full accent-neutral-900"
                  />
                </div>
              </label>
            </section>
          ) : null}

          {tab === "mask" ? (
            <section aria-labelledby="mask-heading">
              <h3 id="mask-heading" className="mb-2 text-sm font-medium text-neutral-800">
                마스크 모양
              </h3>
              <p className="mb-3 text-xs leading-relaxed text-neutral-600">
                중앙과 확장되는 레이어의 가장자리 형태를 고릅니다.
              </p>
              <p className="mb-3 text-xs text-neutral-700">
                <span className="rounded bg-neutral-200/90 px-1.5 py-0.5 font-medium text-neutral-900">
                  기본 {MASK_SHAPE_LABELS[DEF_MASK]}
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
                {MASK_ORDER.map((id) => {
                  const isDefaultShape = id === DEF_MASK;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`relative rounded-xl border px-3 py-3 text-left text-sm transition ${
                        settings.maskShape === id
                          ? "border-neutral-900 bg-neutral-900 text-neutral-100"
                          : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400"
                      }`}
                      onClick={() => onChange({ ...settings, maskShape: id })}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span>{MASK_SHAPE_LABELS[id]}</span>
                        {isDefaultShape ? (
                          <span
                            className={`shrink-0 rounded px-1 py-0 text-[10px] font-medium leading-none ${
                              settings.maskShape === id
                                ? "bg-white/20 text-white"
                                : "bg-amber-100 text-amber-900 ring-1 ring-amber-400/80"
                            }`}
                          >
                            기본
                          </span>
                        ) : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <div className="border-t border-neutral-300 px-4 py-3 text-center text-[11px] text-neutral-500 sm:px-6">
          설정은 이 브라우저에 저장됩니다.
        </div>
      </div>
    </div>
  );
}
