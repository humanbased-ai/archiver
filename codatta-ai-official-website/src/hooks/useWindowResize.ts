import { useState, useEffect } from "react";
import { debounce } from "lodash-es";

interface WindowSize {
  width: number;
  height: number;
}

export function useWindowResize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    // Debounce resize handler to limit update frequency
    const handleResize = debounce(() => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }, 200); // 200ms delay

    window.addEventListener("resize", handleResize);

    // Clean up event listener and cancel any pending debounced calls
    return () => {
      handleResize.cancel();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return windowSize;
}
