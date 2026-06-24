import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { CategoriesClient } from "./categories-client";

export default async function CategoriesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <CategoriesClient />;
}
