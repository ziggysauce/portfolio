const paths = {
  menu: <path d="M3 6.5h18M3 12h18M3 17.5h18" />,
  close: <path d="M5 5l14 14M19 5L5 19" />,
  bag: (
    <>
      <path d="M4 9.5h16l-1.5 10a1.5 1.5 0 0 1-1.5 1.3H7a1.5 1.5 0 0 1-1.5-1.3L4 9.5z" />
      <path d="M3 9.5h18M7.5 9.5l1-6h7l1 6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="7" />
      <path d="M15.8 15.8L21 21" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  arrowRight: <path d="M3 12h18M15 6l6 6-6 6" />,
  arrowDown: <path d="M12 4v16M6 14l6 6 6-6" />,
  back: <path d="M15 4l-8 8 8 8" />,
  share: (
    <>
      <path d="M12 15V3.5M7.5 8L12 3.5 16.5 8" />
      <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
    </>
  ),
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 24, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

export function PinIcon({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M12 1.5a8 8 0 0 0-8 8c0 5.2 5.6 11 7.4 12.8a.8.8 0 0 0 1.2 0C14.4 20.5 20 14.700 20 9.500a8 8 0 0 0-8-8zm0 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
      />
    </svg>
  );
}
