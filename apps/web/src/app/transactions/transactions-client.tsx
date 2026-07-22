"use client";

import { useState } from "react";

import { Button, Card, CardContent, Badge } from "@repo/ui";
import { trpc } from "../../lib/trcp-client";
import { AddTransactionDialog } from "./add-transaction-dialog";

export const TransactionsClient = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data, fetchNextPage, hasNextPage, isFetching, refetch } =
    trpc.transactions.list.useInfiniteQuery(
      { limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      },
    );

  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const transactions = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Transactions</h1>
        <Button onClick={() => setIsAddOpen(true)}>+ Add</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="px-4 py-3 text-sm">
                      {new Date(tx.occurredAt).toLocaleDateString("en-EN")}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium">{tx.description || "—"}</div>
                      {tx.merchantName && (
                        <div className="text-xs text-muted-foreground">
                          {tx.merchantName}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {tx.category ? (
                        <Badge
                          variant="secondary"
                          className="border-l-4"
                          style={{ borderLeftColor: tx.category.color }}
                        >
                          {tx.category.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-semibold ${
                        tx.type === "income" ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {tx.amount} {tx.currency}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate({ id: tx.id })}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hasNextPage && (
            <div className="border-t p-4 text-center">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetching}
              >
                {isFetching ? "Loading..." : "Show more"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AddTransactionDialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
};
