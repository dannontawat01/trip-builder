const ICON_PATHS = {
  map: 'M3 5l6-2 6 2 6-2v16l-6 2-6-2-6 2V5z M9 3v16 M15 5v16',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M6 7a7 7 0 0 1 12-1l2 3 M18 17a7 7 0 0 1-12 1l-2-3',
  settings: 'M4 6h9 M17 6h3 M4 12h3 M11 12h9 M4 18h9 M17 18h3 M17 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M11 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0 M17 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
  users: 'M15 21v-2a5 5 0 0 0-10 0v2 M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M17 4a4 4 0 0 1 0 8 M19 15a5 5 0 0 1 2 4v2',
  folder: 'M3 7V5a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M3 17l6-6 4 4 3-3 5 5 M16 7h.01',
  link: 'M10 14l4-4 M8 16l-1 1a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4 0 M16 8l1-1a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4 0',
  chevron: 'M7 10l5 5 5-5',
  sun: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1 1 M18 18l1 1 M5 19l1-1 M18 6l1-1',
  moon: 'M20 15a8 8 0 0 1-11-11 8 8 0 1 0 11 11z',
  cloud: 'M6 19a4 4 0 0 1-1-8 6 6 0 0 1 12-1 4.5 4.5 0 0 1 1 9H6z'
};

export default function ToolbarIcon({ name, spinning = false }) {
  return (
    <svg
      className={`toolbar-icon${spinning ? ' is-spinning' : ''}`}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}
