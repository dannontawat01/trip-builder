'use client';

import React, { useState, useEffect } from 'react';
import { getOptimizedImageUrl } from '@/lib/optimizedImage';

export { getOptimizedImageUrl };

const SVG_FALLBACK = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23E2E0D8"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="24" fill="%23999999">📍</text></svg>';

export default function OptimizedImage({
  src,
  alt = '',
  width = 400,
  className = '',
  imgClassName = '',
  style = {},
  containerStyle = {},
  fallbackSrc,
  loading = 'lazy',
  onClick
}) {
  const [currentSrc, setCurrentSrc] = useState(() => getOptimizedImageUrl(src, width));
  const [isLoaded, setIsLoaded] = useState(false);
  const [errorStep, setErrorStep] = useState(0);

  useEffect(() => {
    setCurrentSrc(getOptimizedImageUrl(src, width));
    setIsLoaded(false);
    setErrorStep(0);
  }, [src, width]);

  const handleError = () => {
    // Step 0 -> Step 1: If proxied URL failed, try original direct source
    if (errorStep === 0 && currentSrc !== src) {
      setErrorStep(1);
      setCurrentSrc(src);
      return;
    }
    // Step 1 -> Step 2: Try city fallback
    if (errorStep <= 1 && fallbackSrc && currentSrc !== fallbackSrc) {
      setErrorStep(2);
      setCurrentSrc(fallbackSrc);
      return;
    }
    // Step 2 -> Step 3: SVG fallback
    if (currentSrc !== SVG_FALLBACK) {
      setErrorStep(3);
      setCurrentSrc(SVG_FALLBACK);
      setIsLoaded(true);
    }
  };

  return (
    <div
      className={`opt-img-container ${className}`}
      style={{ position: 'relative', overflow: 'hidden', ...containerStyle }}
      onClick={onClick}
    >
      {!isLoaded && (
        <div className="opt-img-shimmer" />
      )}
      <img
        src={currentSrc || SVG_FALLBACK}
        alt={alt}
        loading={loading}
        decoding="async"
        className={`opt-img-elem ${isLoaded ? 'loaded' : ''} ${imgClassName}`}
        style={style}
        onLoad={() => setIsLoaded(true)}
        onError={handleError}
      />
    </div>
  );
}
