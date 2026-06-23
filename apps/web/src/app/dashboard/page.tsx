import { redirect } from "next/navigation";

import { trpc } from "@/lib/trpc-server";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";

export default async function DashboardPage() {
  const categories = await trpc.categories.list();

  if (!categories) redirect("/login");

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle>Категории</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{categories.length}</p>
        </CardContent>
      </Card>
    </div>
  );
}
