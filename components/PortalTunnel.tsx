"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/** 시작 → 화면 끝까지 (기존 대비 약 2배 느리게) */
const RING_EXPAND_SEC = 30;
/** 다음 디스크가 확장을 시작하기까지 */
const RING_STAGGER_MS = 2000;
/** 페이드아웃 후 DOM 제거까지 (CSS --portal-fade-ms 와 동일 권장) */
const RING_FADE_OUT_MS = 480;

/** 고정 중앙(w-[30%] 기준)보다 살짝 작은 디스크에서 확장 시작 */
const RING_START = 0.26;

type RingItem = { id: number; exiting: boolean };

type PortalTunnelProps = {
  imageSrc: string;
  imageAlt: string;
};

function useRingEndScale() {
  const portalRef = useRef<HTMLDivElement>(null);
  const [ringEnd, setRingEnd] = useState(2.15);

  useLayoutEffect(() => {
    const el = portalRef.current;
    if (!el) return;

    const update = () => {
      const side = el.getBoundingClientRect().width;
      if (side < 2) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const diagonal = Math.hypot(vw, vh);
      const raw = diagonal / side;
      const next = Math.max(raw * 1.002, RING_START + 0.02);
      setRingEnd(next);
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  return { portalRef, ringEnd };
}

export function PortalTunnel({ imageSrc, imageAlt }: PortalTunnelProps) {
  const { portalRef, ringEnd } = useRingEndScale();
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
      }, RING_EXPAND_SEC * 1000);

      const tRemove = window.setTimeout(() => {
        timeoutsSet.delete(tRemove);
        setRings((prev) => prev.filter((r) => r.id !== rid));
      }, RING_EXPAND_SEC * 1000 + RING_FADE_OUT_MS);

      timeoutsSet.add(tFade);
      timeoutsSet.add(tRemove);
    };

    scheduleRemoval(0);

    const intervalId = window.setInterval(() => {
      nextIdRef.current += 1;
      const newId = nextIdRef.current;
      setRings((prev) => [...prev, { id: newId, exiting: false }]);
      scheduleRemoval(newId);
    }, RING_STAGGER_MS);

    return () => {
      window.clearInterval(intervalId);
      Array.from(timeoutsSet).forEach((tid) => window.clearTimeout(tid));
      timeoutsSet.clear();
    };
  }, []);

  const portalVars = {
    "--portal-ring-start": String(RING_START),
    "--portal-ring-end": String(ringEnd),
    "--portal-fade-ms": `${RING_FADE_OUT_MS}ms`,
  } as React.CSSProperties;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* 배경 스머지 — 레퍼런스처럼 바깥 질감 */}
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
          className="relative aspect-square w-[min(94vmin,760px)] max-h-[88dvh]"
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
                      animation: `portal-ring ${RING_EXPAND_SEC}s forwards`,
                      animationFillMode: "both" as const,
                    }),
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs and user uploads */}
              <img
                src={imageSrc}
                alt=""
                draggable={false}
                className="h-full w-full select-none object-cover"
              />
            </div>
          ))}

          {/* 링 레이어 zIndex가 커져도 항상 위에 — 확장층(idx+1) 최대보다 충분히 큼 */}
          <div className="absolute inset-0 z-[1000] flex items-center justify-center">
            <div className="portal-mask-center aspect-square w-[30%] max-w-[30%]">
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs and user uploads */}
              <img
                src={imageSrc}
                alt={imageAlt}
                draggable={false}
                className="h-full w-full select-none object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
