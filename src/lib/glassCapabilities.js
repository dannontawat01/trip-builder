const CHROMIUM_BROWSER = /(?:Chrome|Chromium)\/\d+/i;
const EXCLUDED_BROWSER = /Firefox|FxiOS|CriOS|EdgiOS|iPhone|iPad|iPod/i;
const APPLE_DESKTOP = /Mac/i;
const NATIVE_VARIANTS = new Set(['dock', 'toolbar']);

export function supportsNativeGlass(capabilities = {}) {
  const {
    userAgent = '',
    platform = '',
    maxTouchPoints = 0,
    supportsBlur,
    supportsSvgBackdrop,
  } = capabilities ?? {};
  const appleTouchDevice = maxTouchPoints > 0
    && (APPLE_DESKTOP.test(platform) || APPLE_DESKTOP.test(userAgent));

  return supportsBlur === true
    && supportsSvgBackdrop === true
    && CHROMIUM_BROWSER.test(userAgent)
    && !EXCLUDED_BROWSER.test(userAgent)
    && !EXCLUDED_BROWSER.test(platform)
    && !appleTouchDevice;
}

export function resolveGlassMode(options = {}) {
  const { mode = 'auto', variant = 'toolbar', capabilities } = options ?? {};
  if (mode === 'opaque') return 'opaque';
  if (!capabilities) return 'css';
  if (capabilities.supportsBlur !== true
    || capabilities.reducedTransparency
    || capabilities.forcedColors) return 'opaque';
  if (mode !== 'auto'
    || capabilities.reducedMotion
    || !NATIVE_VARIANTS.has(variant)) return 'css';
  return supportsNativeGlass(capabilities) ? 'native' : 'css';
}