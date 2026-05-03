"use client";

import { BGM_TRACKS, type BgmTrack } from "@/lib/bgmPlaylist";

type BgmModalProps = {
  open: boolean;
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

function groupedTracks(): { category: string; items: BgmTrack[] }[] {
  const rest = BGM_TRACKS.filter((t) => t.id !== "none");
  const byCat = new Map<string, BgmTrack[]>();
  for (const t of rest) {
    const c = t.category || "기타";
    if (!byCat.has(c)) byCat.set(c, []);
    byCat.get(c)!.push(t);
  }
  return Array.from(byCat.entries()).map(([category, items]) => ({ category, items }));
}

export function BgmModal({ open, selectedId, onSelect, onClose }: BgmModalProps) {
  if (!open) return null;

  const groups = groupedTracks();
  const noneTrack = BGM_TRACKS.find((t) => t.id === "none");

  return (
    <div
      className="fixed inset-0 z-[2060] flex items-end justify-center bg-black/45 p-0 font-sans sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bgm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[min(85dvh,480px)] w-full max-w-lg flex-col rounded-t-2xl border border-neutral-400 border-b-0 bg-neutral-100 shadow-xl sm:rounded-2xl sm:border-b"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-300 px-4 py-3 sm:px-5">
          <h2 id="bgm-dialog-title" className="text-base font-semibold text-neutral-900">
            BGM
          </h2>
          <button
            type="button"
            className="rounded-full px-3 py-1 text-sm text-neutral-600 hover:bg-neutral-200"
            onClick={onClose}
          >
            닫기
          </button>
        </div>

        <p className="border-b border-neutral-200 px-4 py-2.5 text-center text-[11px] text-neutral-600 sm:px-5">
          곡을 고르면 반복 재생됩니다. 상단 <strong>스피커 버튼</strong>으로 소리를 끄면 BGM도 같이
          멈춥니다.
        </p>

        <div className="touch-pan-y flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {noneTrack ? (
            <button
              type="button"
              onClick={() => {
                onSelect(noneTrack.id);
                onClose();
              }}
              className={`mb-4 w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                selectedId === noneTrack.id
                  ? "border-neutral-900 bg-neutral-900 text-neutral-100"
                  : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400"
              }`}
            >
              {noneTrack.title}
            </button>
          ) : null}

          {groups.map(({ category, items }) => (
            <div key={category} className="mb-4 last:mb-0">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                {category}
              </p>
              <div className="flex flex-col gap-2">
                {items.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onSelect(t.id);
                      onClose();
                    }}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                      selectedId === t.id
                        ? "border-neutral-900 bg-neutral-900 text-neutral-100"
                        : "border-neutral-300 bg-white text-neutral-800 hover:border-neutral-400"
                    }`}
                  >
                    {t.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
