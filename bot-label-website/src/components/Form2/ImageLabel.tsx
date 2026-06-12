import { useEffect, useRef, useState } from 'react';

import DraggableArrow from './DraggableArrow';

import { drawGifFrame } from '@/utils/gif';
import useGiftStore from '@/stores/gifPlayerStore';

export default function ImageLabel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const { firstFrame } = useGiftStore();

  useEffect(() => {
    if (firstFrame && ctxRef.current) {
      drawGifFrame(
        ctxRef.current,
        firstFrame.data,
        firstFrame.width,
        firstFrame.height
      );
    }
  }, [firstFrame, ctxRef]);

  useEffect(() => {
    ctxRef.current = canvasRef.current?.getContext('2d') as null;
  }, [canvasRef]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  return (
    <div>
      <p className="text-sm mb-3">
        Please complete the annotation task in the image below.
      </p>
      <div className="relative" ref={containerRef} style={{ width: '100%' }}>
        <canvas
          ref={canvasRef}
          width={firstFrame?.width || 640}
          height={firstFrame?.height || 480}
          className="mb-4 w-full rounded-2xl overflow-hidden bg-gray-300 transition duration-300 ease-in-out cursor-pointer"
        ></canvas>
        <DraggableArrow
          className="absolute left-0 top-0"
          width={firstFrame?.width || 640}
          height={firstFrame?.height || 480}
          containerWidth={containerWidth}
        />
      </div>
    </div>
  );
}
