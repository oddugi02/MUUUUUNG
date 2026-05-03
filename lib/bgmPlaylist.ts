export type BgmTrack = {
  id: string;
  title: string;
  category: string;
  /** `public` 기준 경로; null이면 재생 없음 */
  file: string | null;
};

/** `public/bgm`에 복사된 파일명과 동일 */
export const BGM_TRACKS: BgmTrack[] = [
  { id: "none", title: "재생 안 함", category: "", file: null },
  {
    id: "regina-caeli",
    title: "Gregorian — Regina Caeli",
    category: "성악",
    file: "/bgm/01-regina-caeli.mp3",
  },
  {
    id: "gregorian-chant",
    title: "Gregorian chant",
    category: "성악",
    file: "/bgm/02-gregorian-chant.mp3",
  },
  {
    id: "alleluia",
    title: "Alleluia, Alleluia",
    category: "성악",
    file: "/bgm/03-alleluia.mp3",
  },
  {
    id: "yeombool",
    title: "염불 소리",
    category: "불교",
    file: "/bgm/04-yeombool.wav",
  },
];

const STORAGE_KEY = "muuuuung-bgm-track";

export function bgmUrlFromFile(file: string | null): string | null {
  if (!file) return null;
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${base}${file}`;
}

export function loadBgmTrackId(): string {
  if (typeof window === "undefined") return "none";
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && BGM_TRACKS.some((t) => t.id === raw)) return raw;
  } catch {
    /* noop */
  }
  return "none";
}

export function saveBgmTrackId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* noop */
  }
}

export function getBgmTrackById(id: string): BgmTrack | undefined {
  return BGM_TRACKS.find((t) => t.id === id);
}
