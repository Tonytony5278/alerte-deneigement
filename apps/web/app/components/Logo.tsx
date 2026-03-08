/**
 * Inline SVG logo matching the app icon: triangle warning sign with
 * snowflake inside + red notification badge. No square background.
 */
export function Logo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Sign post */}
      <rect x="30" y="46" width="4" height="14" rx="1.5" fill="#1E40AF" />
      {/* Triangle warning sign - white fill with red border */}
      <path
        d="M32 6L6 50h52L32 6z"
        fill="white"
        stroke="#DC2626"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      {/* Snowflake inside triangle */}
      <g fill="#2563EB">
        <rect x="31" y="20" width="2" height="18" rx="1" />
        <rect x="31" y="20" width="2" height="18" rx="1" transform="rotate(60 32 29)" />
        <rect x="31" y="20" width="2" height="18" rx="1" transform="rotate(120 32 29)" />
        <circle cx="32" cy="29" r="2.5" />
        <circle cx="32" cy="20" r="1.5" />
        <circle cx="32" cy="38" r="1.5" />
        <circle cx="24.2" cy="24.5" r="1.5" />
        <circle cx="39.8" cy="33.5" r="1.5" />
        <circle cx="24.2" cy="33.5" r="1.5" />
        <circle cx="39.8" cy="24.5" r="1.5" />
      </g>
      {/* Red notification badge with ! */}
      <circle cx="50" cy="12" r="9" fill="#DC2626" />
      <text x="50" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="system-ui">!</text>
    </svg>
  );
}
