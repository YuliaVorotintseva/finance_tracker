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
  ColorPicker,
} from "@repo/ui";
import { trpc } from "../../lib/trcp-client";

const categorySchema = z.object({
  name: z.string().min(2).max(50),
  type: z.enum(["income", "expense", "subscription", "transfer"]),
  color: z.string().regex(/^#[0-9a-f]{6}$/i),
  icon: z.string().max(20).optional(),
});

type CategoryForm = z.output<typeof categorySchema>;

interface AddCategoryDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddCategoryDialog({ open, onClose }: AddCategoryDialogProps) {
  const utils = trpc.useUtils();

  const createMutation = trpc.categories.create.useMutation({
    onSuccess: () => {
      utils.categories.list.invalidate();
      onClose();
      form.reset();
    },
  });

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      type: "expense",
      color: "#6366f1",
    },
  });

  const onSubmit = (data: CategoryForm) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>
        <DialogTitle>Новая категория</DialogTitle>
      </DialogHeader>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="name">Название</Label>
          <Input
            id="name"
            placeholder="Например: Продукты"
            {...form.register("name")}
          />
          {form.formState.errors.name && (
            <p className="mt-1 text-sm text-destructive">
              {form.formState.errors.name.message}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="type">Тип</Label>
          <Select
            id="type"
            {...form.register("type")}
            options={[
              { value: "expense", label: "Расход" },
              { value: "income", label: "Доход" },
              { value: "subscription", label: "Подписка" },
              { value: "transfer", label: "Перевод" },
            ]}
          />
        </div>

        <div>
          <Label>Цвет</Label>
          <ColorPicker
            value={form.watch("color")}
            onChange={(color) => form.setValue("color", color)}
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
}
