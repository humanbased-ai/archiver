import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { cn } from '@udecode/cn';
import { Divider } from 'antd';

import GifPlayer from '@/components/GifPlayer';
import Form1 from '@/components/Form1';
import Form2 from '@/components/Form2';
import Form3 from '@/components/Form3';
import ImageLabel from '@/components/Form2/ImageLabel';
import Instruction from '@/components/Instruction';

const Gif1Page: React.FC = () => {
  const [frameCount, setFrameCount] = useState(0);
  const { formType } = useParams();

  const onGifPlayerReady = (frameCount: number) => {
    setFrameCount(frameCount);
    console.log('frameCount', frameCount);
  };

  return (
    <div className="flex flex-col md:flex-row p-10 gap-10 flex-1 overflow-auto max-w-[1500px] mx-auto">
      {Number(formType) !== 2 ? (
        <div className={cn('w-full md:w-[500px] flex flex-col')}>
          <GifPlayer onReady={onGifPlayerReady} />
          <Divider style={{ borderColor: '#FFFFFF1F' }} />
          <Instruction formType={formType || ''} />
        </div>
      ) : (
        <div className={cn('w-full md:w-1/3  max-h-full')}>
          <GifPlayer onReady={onGifPlayerReady} />
          <ImageLabel />
        </div>
      )}
      <div
        className={cn(
          'max-h-screen overflow-auto flex-1',
          formType === '2' && 'md:w-2/3'
        )}
      >
        {formType === '1' && <Form1 max={frameCount} />}
        {formType === '2' && <Form2 />}
        {formType === '3' && <Form3 />}
      </div>
    </div>
  );
};

export default Gif1Page;
