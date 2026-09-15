'use client';

import { useState, useEffect } from 'react';

export function useOrientation() {
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function updateOrientation() {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      const landscape = width > height;

      setIsLandscape(landscape);
      setDimensions({ width, height });
    }

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return {
    isLandscape,
    orientation: isLandscape ? ('landscape' as const) : ('portrait' as const),
    width: dimensions.width,
    height: dimensions.height,
  };
}
