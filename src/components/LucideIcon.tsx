// Selected Lucide icon geometry, vendored locally so the embedded Tauri runtime
// does not need npm or a CDN at runtime. Lucide is licensed under the ISC License.
// Source set: lucide v1.29.0 UMD distribution; icon names match lucide.dev.
import { createElement } from 'react';

type IconNode = [tag: 'path' | 'circle' | 'rect' | 'line', attrs: Record<string, string | number>];

const ICONS = {
  'folder-tree': [
    ['path', { d: 'M20 10a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-2.5a1 1 0 0 1-.8-.4l-.9-1.2A1 1 0 0 0 15 3h-2a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z' }],
    ['path', { d: 'M20 21a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.9a1 1 0 0 1-.88-.55l-.42-.85a1 1 0 0 0-.92-.6H13a1 1 0 0 0-1 1v5a1 1 0 0 0 1 1Z' }],
    ['path', { d: 'M3 5a2 2 0 0 0 2 2h3' }],
    ['path', { d: 'M3 3v13a2 2 0 0 0 2 2h3' }],
  ],
  search: [
    ['path', { d: 'm21 21-4.34-4.34' }],
    ['circle', { cx: 11, cy: 11, r: 8 }],
  ],
  info: [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'M12 16v-4' }],
    ['path', { d: 'M12 8h.01' }],
  ],
  'triangle-alert': [
    ['path', { d: 'm21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3' }],
    ['path', { d: 'M12 9v4' }],
    ['path', { d: 'M12 17h.01' }],
  ],
  'git-compare-arrows': [
    ['circle', { cx: 5, cy: 6, r: 3 }],
    ['path', { d: 'M12 6h5a2 2 0 0 1 2 2v7' }],
    ['path', { d: 'm15 9-3-3 3-3' }],
    ['circle', { cx: 19, cy: 18, r: 3 }],
    ['path', { d: 'M12 18H7a2 2 0 0 1-2-2V9' }],
    ['path', { d: 'm9 15 3 3-3 3' }],
  ],
  'layout-grid': [
    ['rect', { width: 7, height: 7, x: 3, y: 3, rx: 1 }],
    ['rect', { width: 7, height: 7, x: 14, y: 3, rx: 1 }],
    ['rect', { width: 7, height: 7, x: 14, y: 14, rx: 1 }],
    ['rect', { width: 7, height: 7, x: 3, y: 14, rx: 1 }],
  ],
  'columns-2': [
    ['rect', { x: 3, y: 3, width: 18, height: 18, rx: 2 }],
    ['path', { d: 'M12 3v18' }],
  ],
  network: [
    ['rect', { x: 16, y: 16, width: 6, height: 6, rx: 1 }],
    ['rect', { x: 2, y: 16, width: 6, height: 6, rx: 1 }],
    ['rect', { x: 9, y: 2, width: 6, height: 6, rx: 1 }],
    ['path', { d: 'M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3' }],
    ['path', { d: 'M12 12V8' }],
  ],
  pencil: [
    ['path', { d: 'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z' }],
    ['path', { d: 'm15 5 4 4' }],
  ],
  settings: [
    ['path', { d: 'M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915' }],
    ['circle', { cx: 12, cy: 12, r: 3 }],
  ],
  'arrow-left': [
    ['path', { d: 'm12 19-7-7 7-7' }],
    ['path', { d: 'M19 12H5' }],
  ],
  'arrow-right': [
    ['path', { d: 'M5 12h14' }],
    ['path', { d: 'm12 5 7 7-7 7' }],
  ],
  x: [
    ['path', { d: 'M18 6 6 18' }],
    ['path', { d: 'm6 6 12 12' }],
  ],
  pin: [
    ['path', { d: 'M12 17v5' }],
    ['path', { d: 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z' }],
  ],
  'pin-off': [
    ['path', { d: 'M12 17v5' }],
    ['path', { d: 'M15 9.34V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H7.89' }],
    ['path', { d: 'm2 2 20 20' }],
    ['path', { d: 'M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h11' }],
  ],
  'circle-check': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'm9 12 2 2 4-4' }],
  ],
  'circle-x': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['path', { d: 'm15 9-6 6' }],
    ['path', { d: 'm9 9 6 6' }],
  ],
  star: [
    ['path', { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' }],
  ],
  'link-2': [
    ['path', { d: 'M9 17H7A5 5 0 0 1 7 7h2' }],
    ['path', { d: 'M15 7h2a5 5 0 1 1 0 10h-2' }],
    ['line', { x1: 8, x2: 16, y1: 12, y2: 12 }],
  ],
  'chevron-down': [['path', { d: 'm6 9 6 6 6-6' }]],
  'chevron-right': [['path', { d: 'm9 18 6-6-6-6' }]],
  'corner-down-left': [
    ['path', { d: 'M20 4v7a4 4 0 0 1-4 4H4' }],
    ['path', { d: 'm9 10-5 5 5 5' }],
  ],
  'rotate-ccw': [
    ['path', { d: 'M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8' }],
    ['path', { d: 'M3 3v5h5' }],
  ],
  check: [['path', { d: 'M20 6 9 17l-5-5' }]],
  circle: [['circle', { cx: 12, cy: 12, r: 10 }]],
  'circle-dot': [
    ['circle', { cx: 12, cy: 12, r: 10 }],
    ['circle', { cx: 12, cy: 12, r: 1 }],
  ],
  'file-text': [
    ['path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z' }],
    ['path', { d: 'M14 2v6h6' }],
    ['path', { d: 'M16 13H8' }],
    ['path', { d: 'M16 17H8' }],
    ['path', { d: 'M10 9H8' }],
  ],
  dot: [['circle', { cx: 12, cy: 12, r: 1 }]],
} satisfies Record<string, IconNode[]>;

export type LucideIconName = keyof typeof ICONS;

export function LucideIcon({
  name,
  size = 18,
  strokeWidth = 2,
  className = '',
}: {
  name: LucideIconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return (
    <svg
      className={`lucide-icon lucide-${name} ${className}`.trim()}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name].map(([tag, attrs], index) => createElement(tag, { ...attrs, key: `${name}-${index}` }))}
    </svg>
  );
}
