"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  Button,
  Input,
  Label,
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Select,
} from "@repo/ui";
import { trpc } from "../../lib/trcp-client";

const transactionSchema = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Введите корректную сумму"),
  type: z.enum(["income", "expense", "transfer"]),
  categoryId: z.string().uuid().optional(),
  occurredAt: z.string(),
  description: z.string().max(200).optional(),
  merchantName: z.string().max(100).optional(),
});

type TransactionForm = z.infer<typeof transactionSchema>;

interface AddTransactionDialogProps {
  open: boolean;
  onClose: () => void;
}

export const AddTransactionDialog = ({
  open,
  onClose,
}: AddTransactionDialogProps) => {
  const utils = trpc.useUtils();

  const { data: categories } = trpc.categories.list.useQuery();

  const createMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      utils.transactions.list.invalidate();
      utils.transactions.getStats.invalidate();
      onClose();
      form.reset();
    },
  });

  const form = useForm<TransactionForm>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      amount: "",
      type: "expense",
      occurredAt: new Date().toISOString().slice(0, 16),
      description: "",
      merchantName: "",
    },
  });

  const onSubmit = (data: TransactionForm) => {
    createMutation.mutate({
      ...data,
      amount: data.amount,
      occurredAt: new Date(data.occurredAt).toISOString(),
    });
  };

  const expenseCategories =
    categories?.filter((c) => c.type === "expense") ?? [];
  const incomeCategories = categories?.filter((c) => c.type === "income") ?? [];

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Новая транзакция</DialogTitle>
      </DialogHeader>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="type">Тип</Label>
            <Select
              id="type"
              {...form.register("type")}
              options={[
                { value: "expense", label: "Расход" },
                { value: "income", label: "Доход" },
                { value: "transfer", label: "Перевод" },
              ]}
            />
          </div>

          <div>
            <Label htmlFor="amount">Сумма</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              {...form.register("amount")}
            />
            {form.formState.errors.amount && (
              <p className="mt-1 text-sm text-destructive">
                {form.formState.errors.amount.message}
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="category">Категория</Label>
          <Select
            id="category"
            {...form.register("categoryId")}
            options={[
              { value: "", label: "Без категории" },
              ...(form.watch("type") === "expense"
                ? expenseCategories
                : incomeCategories
              ).map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
          />
        </div>

        <div>
          <Label htmlFor="occurredAt">Дата и время</Label>
          <Input
            id="occurredAt"
            type="datetime-local"
            {...form.register("occurredAt")}
          />
        </div>

        <div>
          <Label htmlFor="description">Описание</Label>
          <Input
            id="description"
            placeholder="Например: Продукты в магазине"
            {...form.register("description")}
          />
        </div>

        <div>
          <Label htmlFor="merchantName">Мерчант</Label>
          <Input
            id="merchantName"
            placeholder="Например: Пятёрочка"
            {...form.register("merchantName")}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
