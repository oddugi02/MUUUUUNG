/** 마스크 모양 — CSS mask 이미지로 표현 */
export type PortalMaskShape = "circle" | "soft" | "roundedSquare" | "heart";

export type PortalSettings = {
  /** 한 디스크가 화면 끝까지 확장하는 데 걸리는 시간(초) — 작을수록 빠름 */
  ringExpandSec: number;
  /** 중앙 고정 이미지 너비(% of 포털 정사각형) */
  centerSizePercent: number;
  maskShape: PortalMaskShape;
};

export const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  ringExpandSec: 30,
  centerSizePercent: 30,
  maskShape: "circle",
};

const STORAGE_KEY = "muuuuung-portal-settings";

/** PortalTunnel과 동일 — 확장 종료 후 페이드 제거 시간(ms) */
export const PORTAL_RING_FADE_OUT_MS = 480;

/**
 * 동시에 겹쳐 있는 디스크 레이어 상한. 너무 많으면 GPU 합성 한계로 장시간 재생 시 흰 화면 번쩍임 발생.
 * stagger 간격은 이 값으로부터 최소 한도가 계산됨.
 */
export const PORTAL_MAX_OVERLAPPING_RINGS = 22;

/** 빠른 확장일 때도 스태거가 너무 벌어지지 않도록 — 동시에 보이는 디스크 개수 하한(목표) */
const TARGET_MIN_VISIBLE_OVERLAP = 8;

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** 슬라이더가 기본값 ± radius 안이면 기본값으로 맞춤 (스냅) */
export const DEFAULT_SLIDER_SNAP_RADIUS = 2;

export function snapToDefault(
  value: number,
  min: number,
  max: number,
  defaultValue: number,
  radius: number = DEFAULT_SLIDER_SNAP_RADIUS,
): number {
  const v = clamp(value, min, max);
  if (Math.abs(v - defaultValue) <= radius) {
    return clamp(defaultValue, min, max);
  }
  return v;
}

/**
 * 새 디스크 시작 간격(ms).
 * - 기존 30초·2초 비율(`raw`)을 기본으로 유지.
 * - 확장이 느리면 동시 레이어가 너무 많이 쌓이지 않도록 **하한**을 둠.
 * - 확장이 빠르면 `raw`가 커져 상한 6000ms에만 걸리면 새 디스크가 몇 초에 한 번만 나와
 *   **겹침이 거의 없음** → 그래서 **상한**을 `expandMs / TARGET_MIN_VISIBLE_OVERLAP`으로도 잡아
 *   최소한의 겹치는 레이어가 보이게 함.
 */
export function staggerMsForExpandSec(ringExpandSec: number): number {
  const expandMs = ringExpandSec * 1000 + PORTAL_RING_FADE_OUT_MS;
  const lower = Math.max(600, Math.ceil(expandMs / PORTAL_MAX_OVERLAPPING_RINGS));
  const upperFromOverlap = Math.floor(expandMs / TARGET_MIN_VISIBLE_OVERLAP);
  const upper = Math.min(6000, upperFromOverlap);
  const raw = Math.round(2000 * (30 / ringExpandSec));

  if (upper < lower) {
    return clamp(raw, lower, Math.min(6000, expandMs));
  }
  return clamp(raw, lower, upper);
}

/** 중앙 크기에 맞춰 확장 시작 스케일 (기존 30%·0.26 비율 근사) */
export function ringStartForCenterPercent(centerPct: number): number {
  const v = (centerPct / 100) * 0.87;
  return clamp(v, 0.14, 0.44);
}

/** CSS mask-image 값 — 터널·중앙 고정에 동일 적용 */
export function maskImageForShape(shape: PortalMaskShape): string {
  switch (shape) {
    case "circle":
      return [
        "radial-gradient(",
        "circle at center,",
        "#000 56%,",
        "rgba(0,0,0,0.93) 62%,",
        "rgba(0,0,0,0.35) 69%,",
        "transparent 73%",
        ")",
      ].join(" ");
    case "soft":
      return [
        "radial-gradient(",
        "circle at center,",
        "#000 42%,",
        "rgba(0,0,0,0.82) 56%,",
        "rgba(0,0,0,0.22) 70%,",
        "transparent 78%",
        ")",
      ].join(" ");
    case "roundedSquare": {
      const svg = encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">' +
          '<rect width="100" height="100" fill="%23000"/>' +
          '<rect x="17" y="17" width="66" height="66" rx="14" fill="%23fff"/>' +
          "</svg>",
      );
      return `url("data:image/svg+xml,${svg}")`;
    }
    case "heart":
      /* 실제 렌더는 PortalTunnel에서 clip-path(SVG #id)로 처리 */
      return maskImageForShape("circle");
    default:
      return maskImageForShape("circle");
  }
}

export function loadPortalSettings(): PortalSettings {
  if (typeof window === "undefined") return { ...DEFAULT_PORTAL_SETTINGS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PORTAL_SETTINGS };
    const p = JSON.parse(raw) as Record<string, unknown>;
    const storedShape = p.maskShape;
    return {
      ringExpandSec: clamp(
        typeof p.ringExpandSec === "number" ? p.ringExpandSec : DEFAULT_PORTAL_SETTINGS.ringExpandSec,
        6,
        90,
      ),
      centerSizePercent: clamp(
        typeof p.centerSizePercent === "number"
          ? p.centerSizePercent
          : DEFAULT_PORTAL_SETTINGS.centerSizePercent,
        16,
        48,
      ),
      maskShape: (() => {
        const ms =
          storedShape === "diamond"
            ? "heart"
            : typeof storedShape === "string"
              ? storedShape
              : undefined;
        return ms === "soft" ||
          ms === "roundedSquare" ||
          ms === "heart" ||
          ms === "circle"
          ? ms
          : "circle";
      })(),
    };
  } catch {
    return { ...DEFAULT_PORTAL_SETTINGS };
  }
}

export function savePortalSettings(s: PortalSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

export const MASK_SHAPE_LABELS: Record<PortalMaskShape, string> = {
  circle: "원형",
  soft: "부드러운 다각형",
  roundedSquare: "사각형",
  heart: "하트",
};
