/**
 * Inline SVG bell+snowflake logo for web use.
 * Uses brand-primary blue. No square background — that's for app stores only.
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
      {/* Bell body */}
      <path
        d="M32 4c-1.5 0-2.7 1-3 2.4C20.5 8.5 14 16 14 25v11c0 2-1 3.8-2.6 4.9L10 42v3h44v-3l-1.4-1.1C51 39.8 50 38 50 36V25c0-9-6.5-16.5-15-18.6C34.7 5 33.5 4 32 4z"
        fill="currentColor"
        className="text-brand-primary"
      />
      {/* Bell clapper */}
      <path
        d="M26 48c0 3.3 2.7 6 6 6s6-2.7 6-6H26z"
        fill="currentColor"
        className="text-brand-primary"
      />
      {/* Snowflake */}
      <g className="text-white" fill="currentColor">
        <rect x="31" y="18" width="2" height="16" rx="1" />
        <rect x="31" y="18" width="2" height="16" rx="1" transform="rotate(60 32 26)" />
        <rect x="31" y="18" width="2" height="16" rx="1" transform="rotate(120 32 26)" />
        <circle cx="32" cy="26" r="2" />
        {/* Snowflake branch tips */}
        <circle cx="32" cy="18" r="1.2" />
        <circle cx="32" cy="34" r="1.2" />
        <circle cx="25.1" cy="22" r="1.2" />
        <circle cx="38.9" cy="30" r="1.2" />
        <circle cx="25.1" cy="30" r="1.2" />
        <circle cx="38.9" cy="22" r="1.2" />
      </g>
      {/* Road marks */}
      <rect x="26" y="56" width="4" height="2" rx="0.5" fill="currentColor" className="text-blue-300" />
      <rect x="34" y="56" width="4" height="2" rx="0.5" fill="currentColor" className="text-blue-300" />
    </svg>
  );
}
