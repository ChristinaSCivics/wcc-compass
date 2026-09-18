import { MASTERMIND, mastermindDate } from "@/lib/mastermind";

/**
 * The mastermind invitation.
 *
 * The point of the demo is to turn attention into a relationship with a date
 * attached: everyone on the call has been through the Compass, so it can open
 * on the shared vision. Until a date and registration link exist, this says so
 * plainly instead of showing a fake date or a dead button.
 */
export function Mastermind() {
  const when = mastermindDate();

  return (
    <section className="rounded-xl border border-borderline bg-surface p-6 max-w-xl text-left">
      <span className="block text-[10px] text-teal tracking-[0.2em] uppercase mb-2">
        What happens next
      </span>
      <h2 className="text-2xl mb-2">Come to the first mastermind</h2>
      <p className="text-sm text-muted leading-relaxed">
        A group call for everyone who&apos;s been through the Compass. We open on what
        we found we share, and go from there.
      </p>

      {when ? (
        <>
          <p className="mt-4 text-foreground">{when}</p>
          {MASTERMIND.registrationUrl && (
            <a
              href={MASTERMIND.registrationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 px-6 py-2.5 border border-teal text-teal rounded-full
                         hover:bg-teal hover:text-background transition-all"
            >
              Save my spot →
            </a>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Date coming shortly — it&apos;ll be posted here first.
        </p>
      )}
    </section>
  );
}
