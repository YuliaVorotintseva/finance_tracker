import { z } from "zod";
import { eq, and, desc, sql, count, sum } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { router, protectedProcedure } from "../trpc";
import { transactions, categories } from "@repo/db/schema";
import { serializeDates } from "../utils/date";

export const transactionsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().uuid().optional(),
        categoryId: z.string().uuid().optional(),
        type: z.enum(["income", "expense", "transfer"]).optional(),
        dateFrom: z.string().datetime().optional(),
        dateTo: z.string().datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, cursor, categoryId, type, dateFrom, dateTo } = input;

      const conditions = [eq(transactions.userId, ctx.user.id)];

      if (categoryId) conditions.push(eq(transactions.categoryId, categoryId));
      if (type) conditions.push(eq(transactions.type, type));

      if (dateFrom)
        conditions.push(
          sql`${transactions.occurredAt} >= ${dateFrom}::timestamp`,
        );
      if (dateTo)
        conditions.push(
          sql`${transactions.occurredAt} <= ${dateTo}::timestamp`,
        );
      if (cursor)
        conditions.push(
          sql`${transactions.occurredAt} < (SELECT "occurred_at" FROM "transactions" WHERE "id" = ${cursor})`,
        );

      const items = await ctx.db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          currency: transactions.currency,
          type: transactions.type,
          occurredAt: transactions.occurredAt,
          description: transactions.description,
          merchantName: transactions.merchantName,
          source: transactions.source,
          category: {
            id: categories.id,
            name: categories.name,
            color: categories.color,
            icon: categories.icon,
          },
        })
        .from(transactions)
        .leftJoin(categories, eq(transactions.categoryId, categories.id))
        .where(and(...conditions))
        .orderBy(desc(transactions.occurredAt), desc(transactions.id))
        .limit(limit + 1);

      let nextCursor: string | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return serializeDates({
        items,
        nextCursor,
      });
    }),

  create: protectedProcedure
    .input(
      z.object({
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
        currency: z.string().default("RUB"),
        type: z.enum(["income", "expense", "transfer"]),
        categoryId: z.string().uuid().optional(),
        occurredAt: z.string().datetime(),
        description: z.string().max(200).optional(),
        merchantName: z.string().max(100).optional(),
        notes: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(transactions)
        .values({
          userId: ctx.user.id,
          accountId: null,
          categoryId: input.categoryId ?? null,
          amount: input.amount,
          currency: input.currency,
          type: input.type,
          occurredAt: input.occurredAt,
          description: input.description ?? null,
          merchantName: input.merchantName ?? null,
          notes: input.notes ?? null,
          source: "manual",
        })
        .returning();

      return serializeDates(created);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(transactions)
        .where(
          and(
            eq(transactions.id, input.id),
            eq(transactions.userId, ctx.user.id),
          ),
        );

      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { success: true };
    }),

  getStats: protectedProcedure
    .input(
      z.object({
        month: z.string().regex(/^\d{4}-\d{2}$/, "YYYY-MM format"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const [year, month] = input.month.split("-").map(Number);

      const startDate = `${year}-${String(month).padStart(2, "0")}-01 00:00:00`;
      const lastDay = new Date(
        year ?? new Date().getFullYear(),
        month ?? new Date().getMonth(),
        0,
      ).getDate();
      const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")} 23:59:59`;

      const [stats] = await ctx.db
        .select({
          totalIncome: sum(
            sql`CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount}::numeric ELSE 0 END`,
          ),
          totalExpense: sum(
            sql`CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount}::numeric ELSE 0 END`,
          ),
          transactionCount: count(),
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, ctx.user.id),
            sql`${transactions.occurredAt} >= ${startDate}::timestamp`,
            sql`${transactions.occurredAt} <= ${endDate}::timestamp`,
          ),
        );

      const byCategory = await ctx.db
        .select({
          categoryId: categories.id,
          categoryName: categories.name,
          categoryColor: categories.color,
          total: sum(transactions.amount),
          count: count(),
        })
        .from(transactions)
        .innerJoin(categories, eq(transactions.categoryId, categories.id))
        .where(
          and(
            eq(transactions.userId, ctx.user.id),
            eq(transactions.type, "expense"),
            sql`${transactions.occurredAt} >= ${startDate}::timestamp`,
            sql`${transactions.occurredAt} <= ${endDate}::timestamp`,
          ),
        )
        .groupBy(categories.id, categories.name, categories.color)
        .orderBy(sql`SUM(${transactions.amount}) DESC`);

      return serializeDates({
        totalIncome: stats?.totalIncome ?? "0",
        totalExpense: stats?.totalExpense ?? "0",
        transactionCount: stats?.transactionCount ?? 0,
        byCategory,
      });
    }),
});
