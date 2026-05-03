"use client";

import { useEffect, useRef } from "react";
import { bgmUrlFromFile, getBgmTrackById } from "@/lib/bgmPlaylist";

/**
 * 선택된 BGM 트랙이 있으면 loop 재생. `none`/파일 없음이면 정지.
 * 탭이 백그라운드면 일시정지.
 */
export function useBgmPlayer(trackId: string) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadedSrcRef = useRef<string | null>(null);

  useEffect(() => {
    const a = new Audio();
    a.loop = true;
    a.preload = "auto";
    a.volume = 0.5;
    audioRef.current = a;
    return () => {
      a.pause();
      a.src = "";
      loadedSrcRef.current = null;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const sync = () => {
      const track = getBgmTrackById(trackId);
      const url = track?.file ? bgmUrlFromFile(track.file) : null;

      if (!url) {
        loadedSrcRef.current = null;
        a.pause();
        a.src = "";
        a.load();
        return;
      }

      if (loadedSrcRef.current !== url) {
        loadedSrcRef.current = url;
        a.pause();
        a.src = url;
        a.load();
      }

      if (document.hidden) {
        a.pause();
        return;
      }

      void a.play().catch(() => {});
    };

    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [trackId]);
}
