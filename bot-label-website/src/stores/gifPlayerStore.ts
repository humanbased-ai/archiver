// stores/giftStore.ts
import { getGifFrameUrl, type Frame } from '@/utils/gif';
import { proxy, useSnapshot } from 'valtio';

let currentCanvas: HTMLCanvasElement | null = null;
let currentFrame: Frame | null;

interface GiftStore {
  frameReady: boolean;
  startIndex: number;
  endIndex: number;
  description: string;
  frames: Frame[];
  firstFrame: Frame | null;
}
const giftStore = proxy<GiftStore>({
  frameReady: false,
  startIndex: 0, // 默认从0开始
  endIndex: Infinity, // 默认为无穷大
  description: '',
  frames: [],
  get firstFrame() {
    return this.frames[this.startIndex];
  },
});

export const setCanvas = (canvas: HTMLCanvasElement | null) => {
  currentCanvas = canvas;
};

export const setFrame = (frame: Frame) => {
  currentFrame = frame;
  giftStore.frameReady = !!frame;
};

export const getFrameUrl = (options?: {
  maxWidth: number;
  maxHeight: number;
  quality: number;
}) => {
  return getGifFrameUrl(currentFrame as unknown as Frame, options);
};

export const updateFrames = (frames: Frame[]) => {
  giftStore.frames = frames;
};

export const updateFrameRange = (startIndex: number, endIndex: number) => {
  giftStore.startIndex = startIndex ?? 0;
  giftStore.endIndex = endIndex ?? Infinity;
};

export const updateFrameDescription = (des: string) => {
  giftStore.description = des;
};


const useGiftStore = () => {
  return useSnapshot(giftStore);
};

export default useGiftStore;
