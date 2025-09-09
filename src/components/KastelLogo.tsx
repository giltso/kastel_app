interface KastelLogoProps {
  size?: number;
  className?: string;
}

export function KastelLogo({ size = 24, className = "" }: KastelLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label="Kastel Hardware Logo"
    >
      {/* Top-left square - Red */}
      <rect x="5" y="5" width="40" height="40" fill="#ef4444" />
      
      {/* Top-right square - Blue */}
      <rect x="55" y="5" width="40" height="40" fill="#3b82f6" />
      
      {/* Bottom-left square - Blue */}
      <rect x="5" y="55" width="40" height="40" fill="#3b82f6" />
      
      {/* Bottom-right square - Red */}
      <rect x="55" y="55" width="40" height="40" fill="#ef4444" />
    </svg>
  );
}