"use client";

import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui";
import { trpc } from "../../lib/trcp-client";

interface DashboardClientProps {
  initialStats: {
    totalIncome: string;
    totalExpense: string;
    transactionCount: number;
    byCategory: {
      categoryId: string;
      categoryName: string;
      categoryColor: string;
      total: string | null;
      count: number;
    }[];
  };
  currentMonth: string;
}

const MetricCard = ({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: string;
}) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${color}`}>
          {value.toFixed(2)} ₽
        </div>
      </CardContent>
    </Card>
  );
};

export const DashboardClient = ({
  initialStats,
  currentMonth,
}: DashboardClientProps) => {
  const [month, setMonth] = useState(currentMonth);

  const { data: stats, isLoading } = trpc.transactions.getStats.useQuery(
    { month },
    { initialData: initialStats },
  );

  const income = parseFloat(stats?.totalIncome ?? "0");
  const expense = parseFloat(stats?.totalExpense ?? "0");
  const balance = income - expense;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Дашборд</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard title="Доходы" value={income} color="text-green-600" />
        <MetricCard title="Расходы" value={expense} color="text-red-600" />
        <MetricCard
          title="Баланс"
          value={balance}
          color={balance >= 0 ? "text-blue-600" : "text-red-600"}
        />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Расходы по категориям</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Загрузка...</p>
          ) : stats?.byCategory.length === 0 ? (
            <p className="text-muted-foreground">Нет данных за этот месяц</p>
          ) : (
            <div className="space-y-3">
              {stats?.byCategory.map((cat) => {
                const total = parseFloat(cat.total!);
                const percent = expense > 0 ? (total / expense) * 100 : 0;
                return (
                  <div key={cat.categoryId} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{cat.categoryName}</span>
                      <span>
                        {total.toFixed(2)} ₽ ({percent.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: cat.categoryColor,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
