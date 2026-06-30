import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ImportClient } from "./import-client";

export default async function ImportPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <ImportClient />;
}
