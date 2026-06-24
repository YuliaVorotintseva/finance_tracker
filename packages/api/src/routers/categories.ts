import { z } from "zod";
import { and, eq } from "@repo/db";

import { router, protectedProcedure } from "../trpc";
import { categories } from "@repo/db/schema";
import { TRPCError } from "@trpc/server";

const categoryInputSchema = z.object({
  name: z.string().min(2).max(50).trim(),
  type: z.enum(["income", "expense", "subscription", "transfer"]),
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}$/i, "Invalid hex color")
    .default("#6366f1"),
  icon: z.string().max(20).optional(),
});

const categoryUpdateSchema = categoryInputSchema.partial();

export const categoriesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(categories)
      .where(eq(categories.userId, ctx.user.id))
      .orderBy(categories.name);
  }),

  listByType: protectedProcedure
    .input(z.enum(["income", "expense", "subscription", "transfer"]))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(categories)
        .where(
          and(eq(categories.userId, ctx.user.id), eq(categories.type, input)),
        )
        .orderBy(categories.name);
    }),

  create: protectedProcedure
    .input(categoryInputSchema)
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.categories.findFirst({
        where: and(
          eq(categories.userId, ctx.user.id),
          eq(categories.name, input.name),
        ),
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Category with this name already exists",
        });
      }

      const [created] = await ctx.db
        .insert(categories)
        .values({ ...input, userId: ctx.user.id })
        .returning();

      return created;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: categoryUpdateSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(categories)
        .set(input.data)
        .where(
          and(eq(categories.id, input.id), eq(categories.userId, ctx.user.id)),
        )
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(categories)
        .where(
          and(eq(categories.id, input.id), eq(categories.userId, ctx.user.id)),
        );

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found",
        });
      }

      return { success: true };
    }),
});
