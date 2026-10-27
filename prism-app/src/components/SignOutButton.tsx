"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Sign out, warning first when an anonymous spot would be left behind for good. */
export function SignOutButton({
  className,
  label = "Leave",
  title = "Sign out",
}: {
  className?: string;
  label?: string;
  title?: string;
}) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.is_anonymous) {
      const sure = window.confirm(
        "You entered without an account, so signing out means this browser can't return to your conversations. Your confirmed vision stays safely on the map. Sign out?"
      );
      if (!sure) return;
    }
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button onClick={() => void signOut()} className={className} title={title}>
      {label}
    </button>
  );
}
