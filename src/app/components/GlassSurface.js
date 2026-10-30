'use client';

import { useEffect, useState } from 'react';
import { resolveGlassMode } from '../../lib/glassCapabilities';

const GLASS_VARIANTS = new Set(['dock', 'toolbar', 'map-controls']);
const MEDIA_QUERIES = {
  reducedMotion: '(prefers-reduced-motion: reduce)',
  reducedTransparency: '(prefers-reduced-transparency: reduce)',
  forcedColors: '(forced-colors: active)',
};
const DECORATION_STYLE = {
  position: 'absolute',
  inset: 0,
  borderRadius: 'inherit',
  pointerEvents: 'none',
};
const NATIVE_SETTINGS = {
  outset: 0,
  depth: 0.6,
  blur: 1,
  dispersion: 0.1,
  specular: 0.4,
  light: 315,
  pressable: false,
  ripple: false,
};

function readCapabilities(mediaQueries) {
  return {
    userAgent: window.navigator.userAgent,
    platform: window.navigator.platform,
    maxTouchPoints: window.navigator.maxTouchPoints,
    supportsBlur: Boolean(window.CSS?.supports?.('backdrop-filter', 'blur(1px)')
      || window.CSS?.supports?.('-webkit-backdrop-filter', 'blur(1px)')),
    supportsSvgBackdrop: Boolean(window.CSS?.supports?.('backdrop-filter', 'url(#a)')),
    ...Object.fromEntries(Object.entries(mediaQueries)
      .map(([preference, query]) => [preference, query.matches])),
  };
}

function useGlassCapabilities() {
  const [capabilities, setCapabilities] = useState(null);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      setCapabilities({ supportsBlur: false });
      return;
    }
    const mediaQueries = Object.fromEntries(Object.entries(MEDIA_QUERIES)
      .map(([preference, query]) => [preference, window.matchMedia(query)]));
    const updateCapabilities = () => setCapabilities(readCapabilities(mediaQueries));
    for (const query of Object.values(mediaQueries)) {
      query.addEventListener('change', updateCapabilities);
    }
    updateCapabilities();
    return () => {
      for (const query of Object.values(mediaQueries)) {
        query.removeEventListener('change', updateCapabilities);
      }
    };
  }, []);
  return capabilities;
}

function useNativeGlass(desiredMode, setVasoComponent) {
  useEffect(() => {
    if (desiredMode !== 'native') return;
    let active = true;
    import('vaso').then(({ Vaso }) => {
      if (!active) return;
      setVasoComponent(() => Vaso);
    }).catch(() => {
      if (!active) return;
      console.warn('GlassSurface: native decoration unavailable; using CSS.');
      setVasoComponent(null);
    });
    return () => { active = false; };
  }, [desiredMode, setVasoComponent]);
}

export default function GlassSurface({
  component: Component = 'div',
  mode = 'auto',
  variant = 'toolbar',
  className = '',
  children,
  ...props
}) {
  const capabilities = useGlassCapabilities();
  const [VasoComponent, setVasoComponent] = useState(null);
  const safeVariant = GLASS_VARIANTS.has(variant) ? variant : 'toolbar';
  const desiredMode = resolveGlassMode({ mode, variant, capabilities });
  useNativeGlass(desiredMode, setVasoComponent);
  const resolvedMode = desiredMode === 'native' && !VasoComponent ? 'css' : desiredMode;

  return (
    <Component
      {...props}
      className={`glass-surface glass-surface--${safeVariant} ${className}`.trim()}
      data-glass-mode={resolvedMode}
    >
      {resolvedMode === 'native' && VasoComponent ? (
        <VasoComponent
          key={safeVariant}
          {...NATIVE_SETTINGS}
          component="span"
          aria-hidden="true"
          className="glass-surface-effect"
          style={DECORATION_STYLE}
        />
      ) : (
        <span aria-hidden="true" className="glass-surface-effect" />
      )}
      {children}
    </Component>
  );
}