import { useRef, useEffect, useCallback } from 'react';

interface UseAnimationProps {
  fps: number;
  frameCount: number;
  onFrame: (frame: number) => void;
  onStop: () => void;
}

const useAnimation = ({
  fps,
  frameCount,
  onFrame,
  onStop,
}: UseAnimationProps) => {
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const isPlayingRef = useRef<boolean>(false);
  const seekTimerRef = useRef<number>();

  const animate = useCallback(
    (time: number) => {
      if (!isPlayingRef.current) return;

      const deltaTime = time - previousTimeRef.current;
      const frameDuration = 1000 / fps;

      if (deltaTime >= frameDuration) {
        if (frameRef.current + 1 >= frameCount) {
          onStop?.();
        } else {
          frameRef.current += 1;
        }
        previousTimeRef.current = time;

        onFrame(frameRef.current);
      }

      // console.log(frameRef.current, frameCount);
      requestRef.current = requestAnimationFrame(animate);
    },
    [fps, frameCount, onFrame, onStop]
  );

  const play = useCallback(() => {
    clearTimeout(seekTimerRef.current);

    isPlayingRef.current = true;
    previousTimeRef.current = performance.now();

    if (frameRef.current + 1 >= frameCount) {
      frameRef.current = 0;
    }

    requestRef.current && cancelAnimationFrame(requestRef.current);
    requestRef.current = requestAnimationFrame(animate);
  }, [frameCount, animate]);

  const pause = useCallback(() => {
    clearTimeout(seekTimerRef.current);

    isPlayingRef.current = false;

    requestRef.current && cancelAnimationFrame(requestRef.current);
    requestRef.current = null;
  }, []);

  const seek = useCallback(
    (frameIndex: number) => {
      frameRef.current = frameIndex;
      previousTimeRef.current = performance.now();

      requestRef.current && cancelAnimationFrame(requestRef.current);

      // if (isPlayingRef.current) {
      //   clearTimeout(seekTimerRef.current);
      //   setTimeout(() => {
      //     requestRef.current = requestAnimationFrame(animate);
      //   }, 500);
      // }

      onFrame(frameIndex);
    },
    [onFrame]
  );

  useEffect(() => {
    return () => pause();
  }, [pause]);

  return { play, pause, seek };
};

export default useAnimation;
