"use client";

import { useState } from "react";

import { Button, Card, CardContent, Badge } from "@repo/ui";
import { trpc } from "../../lib/trcp-client";
import { AddCategoryDialog } from "./add-category-dialog";

export const CategoriesClient = () => {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: categories, isLoading } = trpc.categories.list.useQuery();

  const deleteMutation = trpc.categories.delete.useMutation({
    onSuccess: () => utils.categories.list.invalidate(),
  });

  const typeLabels = {
    income: "Доход",
    expense: "Расход",
    subscription: "Подписка",
    transfer: "Перевод",
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Категории</h1>
        <Button onClick={() => setIsAddOpen(true)}>+ Добавить категорию</Button>
      </div>

      {isLoading ? (
        <p>Загрузка...</p>
      ) : categories?.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            У вас пока нет категорий. Создайте первую!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categories?.map((category) => (
            <Card key={category.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <div>
                      <h3 className="font-semibold">{category.name}</h3>
                      <Badge variant="secondary" className="mt-1">
                        {typeLabels[category.type]}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate({ id: category.id })}
                    disabled={deleteMutation.isPending}
                  >
                    ✕
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AddCategoryDialog open={isAddOpen} onClose={() => setIsAddOpen(false)} />
    </div>
  );
};
