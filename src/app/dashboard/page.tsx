import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { roleDashboardPath } from "@/lib/roles";

export default async function DashboardIndex() {
  const session = await auth();
  redirect(roleDashboardPath[session?.user.role ?? "STUDENT"]);
}
