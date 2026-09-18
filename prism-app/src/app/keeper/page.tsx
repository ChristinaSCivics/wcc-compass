import { redirect } from "next/navigation";

/** The admin tools moved to /admin. Old bookmarks shouldn't dead-end. */
export default function KeeperMoved() {
  redirect("/admin");
}
