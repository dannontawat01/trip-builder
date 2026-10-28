export function getWrappedFocusTarget(controls, activeElement, backwards) {
  if (controls.length === 0) return null;
  const first = controls[0];
  const last = controls[controls.length - 1];
  if (!controls.includes(activeElement)) return backwards ? last : first;
  if (backwards && activeElement === first) return last;
  if (!backwards && activeElement === last) return first;
  return null;
}
