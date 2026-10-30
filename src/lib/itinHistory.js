export const MAX_HISTORY_ENTRIES = 50;

export function createHistory() {
  return { past: [], future: [] };
}

export function pushHistory(history, snapshot, maxEntries = MAX_HISTORY_ENTRIES) {
  const past = [...history.past, structuredClone(snapshot)];
  return { past: past.slice(Math.max(0, past.length - maxEntries)), future: [] };
}

export function undoHistory(history, current) {
  if (history.past.length === 0) return { history, value: current, changed: false };
  const value = structuredClone(history.past[history.past.length - 1]);
  return {
    history: { past: history.past.slice(0, -1), future: [structuredClone(current), ...history.future] },
    value,
    changed: true
  };
}

export function redoHistory(history, current) {
  if (history.future.length === 0) return { history, value: current, changed: false };
  const [value, ...future] = history.future;
  return {
    history: { past: [...history.past, structuredClone(current)].slice(-MAX_HISTORY_ENTRIES), future },
    value: structuredClone(value),
    changed: true
  };
}
