"use client";

import { useState } from "react";

/**
 * A YouTube video that doesn't phone YouTube until someone asks for it.
 *
 * The usual embed loads an iframe, cookies and a thumbnail from Google the
 * moment the page renders — on a page whose whole argument is that it collects
 * the minimum. So this draws its own poster and only mounts the player on a
 * click, through youtube-nocookie.
 *
 * Deliberately not autoplaying, not muted-looping, not a background: a video
 * someone chose to watch, in a page that reads the same without it.
 */
export function Video({
  id,
  title,
  kicker,
  note,
}: {
  id: string;
  title: string;
  kicker?: string;
  note?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <figure className="w-full">
      <div
        className="relative w-full overflow-hidden rounded-xl border border-borderline
                   bg-surface aspect-video"
      >
        {playing ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            onClick={() => setPlaying(true)}
            className="group absolute inset-0 flex flex-col items-center justify-center gap-4
                       px-6 text-center transition-colors hover:bg-surface-raised"
            aria-label={`Play: ${title}`}
          >
            <span
              className="flex h-16 w-16 items-center justify-center rounded-full border border-accent
                         text-accent transition-all group-hover:bg-accent group-hover:text-background"
            >
              <svg width="20" height="22" viewBox="0 0 20 22" aria-hidden>
                <path d="M0 0v22l20-11z" fill="currentColor" />
              </svg>
            </span>
            <span className="max-w-md">
              <span className="block text-base sm:text-lg">{title}</span>
              {note && <span className="mt-1 block text-xs text-muted">{note}</span>}
            </span>
          </button>
        )}
      </div>
      {kicker && (
        <figcaption className="mt-3 text-xs text-muted">
          {kicker}
          {!playing && " · nothing loads from YouTube until you press play"}
        </figcaption>
      )}
    </figure>
  );
}
