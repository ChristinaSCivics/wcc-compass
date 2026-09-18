/**
 * The PRiSM mark: a faceted octahedron, blue facets left, violet right,
 * with a light highlight where the facets meet.
 *
 * Rebuilt from the official WCC Framework / Orientation diagrams
 * (public/brand/), whose gem samples as blue #054194 -> #84C0EF on the left
 * and violet #4C3493 -> #8254C0 on the right. It replaces the earlier gold
 * diamond, which predated the house style.
 */
export function PrismMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      role="presentation"
    >
      {/* left-back facet */}
      <path d="M12 1.5 L3 11.5 L12 12.4 Z" fill="#3f7fd0" />
      {/* left-front facet */}
      <path d="M3 11.5 L12 22.5 L12 12.4 Z" fill="#1d4f9e" />
      {/* right-back facet */}
      <path d="M12 1.5 L21 11.5 L12 12.4 Z" fill="#a98ce8" />
      {/* right-front facet */}
      <path d="M21 11.5 L12 22.5 L12 12.4 Z" fill="#7756c4" />
      {/* highlight where the facets meet */}
      <path
        d="M12 1.5 L12 22.5 M3 11.5 L21 11.5"
        stroke="#e9effa"
        strokeWidth="0.7"
        opacity="0.55"
      />
      <path
        d="M12 1.5 L3 11.5 L12 22.5 L21 11.5 Z"
        stroke="#c9d8f2"
        strokeWidth="0.5"
        opacity="0.35"
      />
    </svg>
  );
}
