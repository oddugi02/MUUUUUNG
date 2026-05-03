"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PortalMaskShape } from "@/lib/portalSettings";
import {
  maskImageForShape,
  PORTAL_RING_FADE_OUT_MS,
  ringStartForCenterPercent,
  staggerMsForExpandSec,
} from "@/lib/portalSettings";

/** 포인터 정규화용 가상 화면 배율(>1). 클수록 같은 손/마우스 이동에 목표 변화가 완만해짐 */
const POINTER_VIRTUAL_SCALE = 2.05;

/** raw 포인터 → 1차 목표(저역 통과) — 고주파 떨림 제거 */
const POINTER_LERP_STAGED = 0.19;
/** 1차 목표 → 실제 transform — 최종 유동감 */
const POINTER_LERP_VISUAL = 0.045;

/** 이 값 이하면 유동 오프셋이 정지한 것으로 보고 rAF 루프 중단 */
const POINTER_SETTLE_EPS = 0.012;

type RingItem = { id: number; exiting: boolean };

export type PortalTunnelProps = {
  imageSrc: string;
  imageAlt: string;
  ringExpandSec: number;
  centerSizePercent: number;
  maskShape: PortalMaskShape;
};

function useRingEndScale(ringStart: number) {
  const portalRef = useRef<HTMLDivElement>(null);
  const [ringEnd, setRingEnd] = useState(2.15);

  useLayoutEffect(() => {
    const el = portalRef.current;
    if (!el) return;

    let resizeFrame: number | null = null;
    const update = () => {
      const side = el.getBoundingClientRect().width;
      if (side < 2) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const diagonal = Math.hypot(vw, vh);
      const raw = diagonal / side;
      const next = Math.max(raw * 1.002, ringStart + 0.02);
      setRingEnd(next);
    };

    const scheduleUpdate = () => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        update();
      });
    };

    update();
    const ro = new ResizeObserver(scheduleUpdate);
    ro.observe(el);
    window.addEventListener("resize", scheduleUpdate);
    return () => {
      if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
      ro.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [ringStart]);

  return { portalRef, ringEnd };
}

export function PortalTunnel({
  imageSrc,
  imageAlt,
  ringExpandSec,
  centerSizePercent,
  maskShape,
}: PortalTunnelProps) {
  const ringStart = useMemo(
    () => ringStartForCenterPercent(centerSizePercent),
    [centerSizePercent],
  );
  const ringStaggerMs = useMemo(
    () => staggerMsForExpandSec(ringExpandSec),
    [ringExpandSec],
  );
  const maskCss = useMemo(() => maskImageForShape(maskShape), [maskShape]);

  const { portalRef, ringEnd } = useRingEndScale(ringStart);
  const tunnelRootRef = useRef<HTMLDivElement>(null);
  const bundleRef = useRef<HTMLDivElement>(null);
  const rawOffsetRef = useRef({ x: 0, y: 0 });
  const stagedOffsetRef = useRef({ x: 0, y: 0 });
  const smoothOffsetRef = useRef({ x: 0, y: 0 });
  const nextIdRef = useRef(0);
  const pendingTimeoutsRef = useRef(new Set<number>());
  const [rings, setRings] = useState<RingItem[]>(() => [{ id: 0, exiting: false }]);

  useEffect(() => {
    const timeoutsSet = pendingTimeoutsRef.current;

    const scheduleRemoval = (rid: number) => {
      const tFade = window.setTimeout(() => {
        timeoutsSet.delete(tFade);
        setRings((prev) =>
          prev.map((r) => (r.id === rid ? { ...r, exiting: true } : r)),
        );
      }, ringExpandSec * 1000);

      const tRemove = window.setTimeout(() => {
        timeoutsSet.delete(tRemove);
        setRings((prev) => prev.filter((r) => r.id !== rid));
      }, ringExpandSec * 1000 + PORTAL_RING_FADE_OUT_MS);

      timeoutsSet.add(tFade);
      timeoutsSet.add(tRemove);
    };

    scheduleRemoval(0);

    let staggerId: number | null = null;
    const startStagger = () => {
      if (staggerId !== null) return;
      staggerId = window.setInterval(() => {
        nextIdRef.current += 1;
        const newId = nextIdRef.current;
        setRings((prev) => [...prev, { id: newId, exiting: false }]);
        scheduleRemoval(newId);
      }, ringStaggerMs);
    };
    const stopStagger = () => {
      if (staggerId === null) return;
      window.clearInterval(staggerId);
      staggerId = null;
    };

    const onStaggerVisibility = () => {
      if (document.hidden) stopStagger();
      else startStagger();
    };

    if (!document.hidden) startStagger();
    document.addEventListener("visibilitychange", onStaggerVisibility);

    return () => {
      stopStagger();
      document.removeEventListener("visibilitychange", onStaggerVisibility);
      Array.from(timeoutsSet).forEach((tid) => window.clearTimeout(tid));
      timeoutsSet.clear();
    };
  }, [ringExpandSec, ringStaggerMs]);

  /** 유동 보간: 포인터 활동이 있을 때만 rAF. 탭 비가시 시 링 애니 일시정지 + 루프 중단. */
  useEffect(() => {
    const portalEl = portalRef.current;
    const bundleEl = bundleRef.current;
    const tunnelRoot = tunnelRootRef.current;
    if (!portalEl || !bundleEl || !tunnelRoot) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const maxShift = () => Math.min(44, Math.min(window.innerWidth, window.innerHeight) * 0.06);

    const updateTarget = (clientX: number, clientY: number) => {
      const rect = portalEl.getBoundingClientRect();
      const pad = 12;
      const inside =
        clientX >= rect.left - pad &&
        clientX <= rect.right + pad &&
        clientY >= rect.top - pad &&
        clientY <= rect.bottom + pad;

      if (!inside) {
        rawOffsetRef.current.x = 0;
        rawOffsetRef.current.y = 0;
        return;
      }

      const iw = window.innerWidth;
      const ih = window.innerHeight;
      const halfVirtW = (iw * POINTER_VIRTUAL_SCALE) / 2;
      const halfVirtH = (ih * POINTER_VIRTUAL_SCALE) / 2;
      let nx = (clientX - iw / 2) / halfVirtW;
      let ny = (clientY - ih / 2) / halfVirtH;
      nx = Math.max(-1, Math.min(1, nx));
      ny = Math.max(-1, Math.min(1, ny));
      const m = maxShift() * POINTER_VIRTUAL_SCALE;
      rawOffsetRef.current.x = nx * m;
      rawOffsetRef.current.y = ny * m;
    };

    let rafId: number | null = null;

    const queueTick = () => {
      if (rafId !== null) return;
      if (document.hidden || reducedMotion.matches) return;
      rafId = requestAnimationFrame(tick);
    };

    const tick = () => {
      rafId = null;
      const bundle = bundleEl;
      const raw = rawOffsetRef.current;
      const staged = stagedOffsetRef.current;
      const smooth = smoothOffsetRef.current;

      if (document.hidden) return;

      if (reducedMotion.matches) {
        staged.x = staged.y = 0;
        smooth.x = smooth.y = 0;
        raw.x = raw.y = 0;
        bundle.style.transform = "translate3d(0,0,0)";
        bundle.classList.remove("will-change-transform");
        return;
      }

      staged.x += (raw.x - staged.x) * POINTER_LERP_STAGED;
      staged.y += (raw.y - staged.y) * POINTER_LERP_STAGED;
      smooth.x += (staged.x - smooth.x) * POINTER_LERP_VISUAL;
      smooth.y += (staged.y - smooth.y) * POINTER_LERP_VISUAL;

      bundle.classList.add("will-change-transform");
      bundle.style.transform = `translate3d(${smooth.x}px, ${smooth.y}px, 0)`;

      const eps = POINTER_SETTLE_EPS;
      const settled =
        Math.abs(raw.x) < eps &&
        Math.abs(raw.y) < eps &&
        Math.abs(staged.x) < eps &&
        Math.abs(staged.y) < eps &&
        Math.abs(smooth.x) < eps &&
        Math.abs(smooth.y) < eps;

      if (settled) {
        smooth.x = smooth.y = staged.x = staged.y = 0;
        bundle.style.transform = "translate3d(0,0,0)";
        bundle.classList.remove("will-change-transform");
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    const onMouseMove = (e: MouseEvent) => {
      updateTarget(e.clientX, e.clientY);
      queueTick();
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      updateTarget(e.touches[0].clientX, e.touches[0].clientY);
      queueTick();
    };

    const clearTarget = () => {
      rawOffsetRef.current.x = 0;
      rawOffsetRef.current.y = 0;
      queueTick();
    };

    const onVisibility = () => {
      if (document.hidden) {
        tunnelRoot.classList.add("portal-tunnel-paused");
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
      } else {
        tunnelRoot.classList.remove("portal-tunnel-paused");
        queueTick();
      }
    };

    if (reducedMotion.matches) {
      bundleEl.style.transform = "translate3d(0,0,0)";
    }

    document.addEventListener("visibilitychange", onVisibility);
    if (document.hidden) tunnelRoot.classList.add("portal-tunnel-paused");

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", clearTarget);
    window.addEventListener("touchcancel", clearTarget);
    window.addEventListener("blur", clearTarget);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      tunnelRoot.classList.remove("portal-tunnel-paused");
      bundleEl.classList.remove("will-change-transform");
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", clearTarget);
      window.removeEventListener("touchcancel", clearTarget);
      window.removeEventListener("blur", clearTarget);
    };
  }, []);

  const portalVars = {
    "--portal-ring-start": String(ringStart),
    "--portal-ring-end": String(ringEnd),
    "--portal-fade-ms": `${PORTAL_RING_FADE_OUT_MS}ms`,
    "--portal-mask-center": maskCss,
  } as React.CSSProperties;

  const expandDuration = `${ringExpandSec}s`;

  return (
    <div ref={tunnelRootRef} className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={bundleRef}
        className="absolute inset-0"
        style={{ transform: "translate3d(0,0,0)" }}
      >
        <div
          className="absolute inset-[-18%] scale-[1.12] opacity-[0.92]"
          style={{
            backgroundImage: `url(${imageSrc})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(52px) saturate(1.06)",
            transform: "rotate(1.5deg)",
          }}
          aria-hidden
        />

        <div className="relative flex h-full w-full items-center justify-center">
          <div
            ref={portalRef}
            className="relative aspect-square w-[min(94vmin,760px)] max-h-[88dvh] touch-none"
            style={portalVars}
          >
            {rings.map((ring, idx) => (
              <div
                key={ring.id}
                className={`portal-ring-layer portal-mask-disc absolute inset-0 flex origin-center items-center justify-center will-change-[transform,opacity] ${
                  ring.exiting ? "portal-ring-exiting" : ""
                }`}
                style={{
                  zIndex: idx + 1,
                  ...(ring.exiting
                    ? {}
                    : {
                        animation: `portal-ring ${expandDuration} forwards`,
                        animationFillMode: "both" as const,
                      }),
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs and user uploads */}
                <img
                  src={imageSrc}
                  alt=""
                  decoding="async"
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                />
              </div>
            ))}

            <div className="absolute inset-0 z-[1000] flex items-center justify-center">
              <div
                className="portal-mask-center aspect-square shrink-0"
                style={{
                  width: `${centerSizePercent}%`,
                  maxWidth: `${centerSizePercent}%`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs and user uploads */}
                <img
                  src={imageSrc}
                  alt={imageAlt}
                  decoding="async"
                  draggable={false}
                  className="h-full w-full select-none object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
