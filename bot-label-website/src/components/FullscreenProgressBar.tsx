import React from 'react';

interface ProgressBarProps {
  progress: number;
  isVisible: boolean;
}

const FullscreenProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  isVisible,
}) => {
  if (!isVisible) return <></>;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 transition-opacity duration-300">
      <div className="w-4/5 max-w-2xl bg-white bg-opacity-30 rounded-full overflow-hidden shadow-lg">
        <div
          className="h-4 bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 ease-out rounded-full"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className="text-white text-2xl mt-4 font-semibold">
        {Math.round(progress)}%
      </div>
    </div>
  );
};

export default FullscreenProgressBar;
