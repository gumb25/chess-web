import React from 'react';

// Small stroke icon set (24×24, currentColor) so the UI doesn't depend on
// emoji, which render differently on every platform.
type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function Icon({ size = 20, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h14V9"/><path d="M10 20v-6h4v6"/></Icon>
);
export const PuzzleIcon = (p: IconProps) => (
  <Icon {...p}><path d="M13 3l-2 4 4 1-5 13"/><path d="M8 11l7-1"/><circle cx="18" cy="5" r="1.5"/></Icon>
);
export const TargetIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.8" fill="currentColor"/></Icon>
);
export const SwordsIcon = (p: IconProps) => (
  <Icon {...p}><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M9.5 17.5 21 6V3h-3L6.5 14.5"/><path d="m11 19-6-6"/><path d="m8 16-4 4"/><path d="m5 21-2-2"/></Icon>
);
export const BookIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 6.5C10.5 5 8 4.5 4 4.5v14c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-14c-4 0-6.5.5-8 2Z"/><path d="M12 6.5v14"/></Icon>
);
export const MicroscopeIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 3v18h18"/><path d="m7 15 4-5 3 3 5-7"/></Icon>
);
export const TrophyIcon = (p: IconProps) => (
  <Icon {...p}><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a3 3 0 0 0 3 4"/><path d="M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4"/><path d="M8 20h8"/><path d="M9.5 17h5l.5 3h-6l.5-3Z"/></Icon>
);
export const SettingsIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/></Icon>
);
export const FlipIcon = (p: IconProps) => (
  <Icon {...p}><path d="M7 4v16"/><path d="m3 8 4-4 4 4"/><path d="M17 20V4"/><path d="m21 16-4 4-4-4"/></Icon>
);
export const UndoIcon = (p: IconProps) => (
  <Icon {...p}><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/></Icon>
);
export const BulbIcon = (p: IconProps) => (
  <Icon {...p}><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z"/></Icon>
);
export const EyeIcon = (p: IconProps) => (
  <Icon {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></Icon>
);
export const FlagIcon = (p: IconProps) => (
  <Icon {...p}><path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/></Icon>
);
export const RetryIcon = (p: IconProps) => (
  <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></Icon>
);
export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></Icon>
);
export const ChevronRightIcon = (p: IconProps) => (
  <Icon {...p}><path d="m9 6 6 6-6 6"/></Icon>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}><path d="m15 6-6 6 6 6"/></Icon>
);
export const ChevronsLeftIcon = (p: IconProps) => (
  <Icon {...p}><path d="m11 6-6 6 6 6"/><path d="m18 6-6 6 6 6"/></Icon>
);
export const ChevronsRightIcon = (p: IconProps) => (
  <Icon {...p}><path d="m6 6 6 6-6 6"/><path d="m13 6 6 6-6 6"/></Icon>
);
export const ResetIcon = (p: IconProps) => (
  <Icon {...p}><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/></Icon>
);
export const PlayIcon = (p: IconProps) => (
  <Icon {...p}><path d="M7 4.5v15l12-7.5-12-7.5Z"/></Icon>
);
export const CheckIcon = (p: IconProps) => (
  <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7"/></Icon>
);
export const XIcon = (p: IconProps) => (
  <Icon {...p}><path d="M6 6l12 12"/><path d="M18 6 6 18"/></Icon>
);
export const SunIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></Icon>
);
export const MoonIcon = (p: IconProps) => (
  <Icon {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/></Icon>
);
export const MonitorIcon = (p: IconProps) => (
  <Icon {...p}><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/></Icon>
);
export const FilterIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 5h16l-6 7.5V19l-4 2v-8.5L4 5Z"/></Icon>
);
export const FlameIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3c.5 3 4 5 4 9a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5C10 10 11 11 11 11s-1.5-4 1-8Z"/><path d="M12 21a7 7 0 0 0 7-7c0-4-3-6.5-4-9"/><path d="M12 21a7 7 0 0 1-7-7c0-2 1-3.5 2-4.5"/></Icon>
);
export const ClipboardIcon = (p: IconProps) => (
  <Icon {...p}><rect x="8" y="3" width="8" height="4" rx="1"/><path d="M8 5H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/></Icon>
);
export const ShuffleIcon = (p: IconProps) => (
  <Icon {...p}><path d="M16 3h5v5"/><path d="M4 20 21 3"/><path d="M21 16v5h-5"/><path d="m15 15 6 6"/><path d="M4 4l5 5"/></Icon>
);
