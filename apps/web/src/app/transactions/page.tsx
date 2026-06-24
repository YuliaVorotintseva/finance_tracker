import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { TransactionsClient } from "./transactions-client";

export default async function TransactionsPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <TransactionsClient />;
}
