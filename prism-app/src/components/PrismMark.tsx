/** The golden diamond prism mark from Peter's slides. */
export function PrismMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2 L21 12 L12 22 L3 12 Z"
        stroke="var(--gold)"
        strokeWidth="1.2"
        fill="rgba(212,162,78,0.08)"
      />
      <path d="M12 2 L12 22 M3 12 L21 12" stroke="var(--gold)" strokeWidth="0.5" opacity="0.6" />
    </svg>
  );
}
