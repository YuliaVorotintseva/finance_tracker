import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { trpc } from "@/lib/trpc-server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const stats = await trpc.transactions.getStats({ month: currentMonth });

  return <DashboardClient initialStats={stats} currentMonth={currentMonth} />;
}
