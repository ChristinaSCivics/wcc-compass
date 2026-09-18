import { redirect } from "next/navigation";

/** Moved to /admin/members. */
export default function Moved() {
  redirect("/admin/members");
}
