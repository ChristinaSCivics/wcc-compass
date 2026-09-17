/**
 * "Your piece of the puzzle."
 *
 * The onboarding interview already asks what a person is great at, what they'd
 * most want to build, what they can realistically give, and whether they light
 * up at connecting people — and the extraction already stores all four. Until
 * now that went straight into the draft and was never reflected back.
 *
 * This closes the Core MVP Promise: a participant should be able to find their
 * place, not only describe the world they want.
 */

type Vision = Record<string, unknown>;

function str(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s === "" ? null : s;
}

function list(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => (typeof x === "string" ? x.trim() : "")).filter(Boolean);
}

/** host_spark may be a boolean, null, or a string carrying the evidence. */
function spark(v: unknown): string | null {
  if (v === true) return "You lit up at welcoming and connecting people.";
  const s = str(v);
  if (!s) return null;
  const low = s.toLowerCase();
  if (low === "false" || low === "no" || low === "null") return null;
  if (low === "true" || low === "yes") return "You lit up at welcoming and connecting people.";
  return s;
}

export function yourPieceIsEmpty(vision: Vision | null | undefined): boolean {
  if (!vision) return true;
  return (
    list(vision.gifts).length === 0 &&
    !str(vision.blueprint) &&
    !str(vision.capacity) &&
    !spark(vision.host_spark)
  );
}

export function YourPiece({ vision, compact }: { vision: Vision; compact?: boolean }) {
  const gifts = list(vision.gifts);
  const blueprint = str(vision.blueprint);
  const capacity = str(vision.capacity);
  const hostSpark = spark(vision.host_spark);

  if (yourPieceIsEmpty(vision)) return null;

  if (compact) {
    return (
      <div className="rounded-xl border border-borderline bg-surface p-6">
        <h2 className="text-xl mb-1">Your piece of the puzzle</h2>
        {blueprint ? (
          <p className="text-sm text-muted leading-relaxed">{blueprint}</p>
        ) : (
          <p className="text-sm text-muted">What you carry into the work you described.</p>
        )}
        {gifts.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {gifts.slice(0, 4).map((g, i) => (
              <span
                key={i}
                className="text-xs text-gold border border-gold/40 rounded-full px-3 py-1"
              >
                {g}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-borderline bg-surface p-6 space-y-5">
      <div>
        <h2 className="text-xl mb-1">Your piece of the puzzle</h2>
        <p className="text-sm text-muted leading-relaxed">
          You described a world. This is the part you said you carry into it — in your
          own words, as you confirmed them.
        </p>
      </div>

      {blueprint && <Row label="What you'd most want to build">{blueprint}</Row>}

      {gifts.length > 0 && (
        <div>
          <Label>What you&apos;re great at</Label>
          <div className="flex flex-wrap gap-2">
            {gifts.map((g, i) => (
              <span
                key={i}
                className="text-sm text-gold border border-gold/40 rounded-full px-3 py-1"
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      )}

      {capacity && <Row label="What you can give">{capacity}</Row>}
      {hostSpark && <Row label="Something Prism noticed">{hostSpark}</Row>}

      <p className="text-xs text-muted/70 leading-relaxed">
        Edit any of this on your vision above — it comes from your confirmed words,
        so changing it there changes it here.
      </p>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-sm text-gold tracking-widest uppercase mb-2">{children}</span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}
