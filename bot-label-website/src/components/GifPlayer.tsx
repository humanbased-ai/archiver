import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button, Slider, message } from 'antd';
import { useSearchParams } from 'react-router-dom';

import { drawGifFrame, loadGifFrames } from '@/utils/gif';
import useAnimation from '@/hooks/useAnimation';

import FullscreenProgressBar from './FullscreenProgressBar';

import playIcon from '@/assets/play-circle.png';
import pauseIcon from '@/assets/pause-circle.png';

import { GIFTS } from '@/config';
import useGiftStore, { setFrame, updateFrames } from '@/stores/gifPlayerStore';
import { cn } from '@udecode/cn';

interface GifPlayerProps {
  onReady?: (frameCount: number) => void;
}

const GifPlayer: React.FC<GifPlayerProps> = ({ onReady }) => {
  const [searchParams] = useSearchParams();
  const { startIndex, endIndex, frames } = useGiftStore();
  const docId = searchParams.get('id') as keyof typeof GIFTS;

  const gifConfig = GIFTS[docId];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  const [loadingPercent, setLoadingPercent] = useState(0);
  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(0.5);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 640,
    height: 480,
  });
  const framesCount = useMemo(
    () => Math.min(endIndex - startIndex + 1, frames?.length || 0),
    [frames, startIndex, endIndex]
  );
  const { play, pause, seek } = useAnimation({
    fps: 30 * speed,
    frameCount: framesCount,
    onFrame: (frameIndex: number) => {
      setCurrentFrameIndex(frameIndex);

      if (ctxRef.current && frames) {
        drawGifFrame(
          ctxRef.current,
          frames[frameIndex + startIndex]?.data,
          size.width,
          size.height
        );
      }
    },
    onStop: () => {
      setIsPlaying(false);
    },
  });

  async function loadGif() {
    setReady(false);
    try {
      const frames = await loadGifFrames(
        gifConfig?.gif,
        function onProgress(progress) {
          const percent = Math.round(progress * 100);
          if (percent >= loadingPercent) {
            setLoadingPercent(percent);
          }
          console.log(progress, 'progress');
        }
      );

      setSize({ width: frames[0].width, height: frames[0].height });
      setFrame(frames[Math.ceil(frames.length / 2)]);
      updateFrames(frames);
      setReady(true);
      onReady?.(frames.length);
    } catch (e) {
      message.error('Gif source load failed!');
    }
  }

  useEffect(() => {
    ctxRef.current = canvasRef.current?.getContext('2d') as null;
  }, [canvasRef]);

  useEffect(() => {
    loadGif();
  }, []);

  useEffect(() => {
    if (ready) {
      seek(0);
    }
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    if (isPlaying) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, ready]);

  const handleTogglePlay = () => {
    if (!ready) return;

    setIsPlaying((isPlaying) => !isPlaying);
  };

  const toggleSpeed = (newSpeed: number) => {
    setSpeed((pre) => (pre === newSpeed ? 0.5 : newSpeed));
  };

  const handleFrameChange = async (val: number) => {
    if (!ready) return;
    console.log(val, 'val');
    seek(val);
    setIsPlaying(false);
  };

  return (
    <div className="flex flex-col items-center bg-gray-900 text-white box-content w-full">
      <canvas
        ref={canvasRef}
        width={size.width}
        height={size.height}
        className="mb-4 w-full rounded-2xl overflow-hidden bg-gray-300 transition duration-300 ease-in-out cursor-pointer"
        onClick={handleTogglePlay}
      ></canvas>
      <div className="flex items-center mb-4 h-10 w-full gap-2">
        <Button
          type="text"
          icon={<></>}
          loading={!ready}
          onClick={handleTogglePlay}
          className="w-6 h-6 p-0 mr-3"
        >
          <object
            data={isPlaying ? pauseIcon : playIcon}
            type="image/png"
            className="w-6 h-6"
          />
        </Button>
        <div className="text-xs min-w-[20px] text-right">
          {currentFrameIndex + 1}/{framesCount}
        </div>
        <Slider
          className="flex-1"
          defaultValue={0}
          min={0}
          max={framesCount - 1}
          disabled={!ready}
          value={currentFrameIndex}
          onChange={handleFrameChange}
          tooltip={{
            formatter: (value) => value,
            open: !ready ? false : undefined,
          }}
          styles={{
            rail: {
              backgroundColor: '#bfbfbf',
            },
          }}
        />
        <div
          className={cn(
            'w-[40px] h-4 border rounded-[4px] border-solid text-xs text-center leading-4 box-content cursor-pointer transition-all hover:bg-white hover:text-[#1C1C26]',
            speed === 0.25 && 'text-[#1C1C26] bg-white'
          )}
          onClick={() => toggleSpeed(0.25)}
        >
          0.25
        </div>
        <div
          className={cn(
            'w-[40px] h-4 border rounded-[4px] border-solid text-xs text-center leading-4 box-content cursor-pointer transition-all hover:bg-white hover:text-[#1C1C26]',
            speed === 0.75 && 'text-[#1C1C26] bg-white'
          )}
          onClick={() => toggleSpeed(0.75)}
        >
          0.75
        </div>
      </div>
      <FullscreenProgressBar progress={loadingPercent} isVisible={!ready} />
    </div>
  );
};

export default GifPlayer;
