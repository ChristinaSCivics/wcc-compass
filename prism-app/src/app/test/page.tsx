import { redirect } from "next/navigation";

/**
 * /test — the sandbox door.
 *
 * /login?test=1 is the real mechanism, but a query string is easy to mistype
 * and easier to forget, and forgetting it is exactly how three test identities
 * ended up counted as real voices on the map. This is the address worth
 * remembering.
 */
export default function TestEntry() {
  redirect("/login?test=1");
}
