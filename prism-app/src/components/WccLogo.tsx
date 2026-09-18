import Image from "next/image";

/**
 * The official World Co-Creation marks (public/brand/).
 *
 * `WccLogo` is the full horizontal lockup — gradient W plus wordmark — for
 * places with room. `WccMark` is the W alone, for tight spots like the nav.
 * Both PNGs have transparent backgrounds, so they sit on any ground.
 *
 * Note: the supplied "Mark Dark" shipped with an opaque black field baked in,
 * which read as a black square on our navy. The black has been keyed out.
 */

export function WccLogo({ height = 32, className = "" }: { height?: number; className?: string }) {
  // source is 1178 x 242
  const width = Math.round((height * 1178) / 242);
  return (
    <Image
      src="/brand/wcc-logo-horizontal.png"
      alt="World Co-Creation"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}

export function WccMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  // source is 265 x 247, very close to square
  return (
    <Image
      src="/brand/wcc-mark.png"
      alt=""
      width={size}
      height={Math.round((size * 247) / 265)}
      className={className}
      aria-hidden
    />
  );
}
