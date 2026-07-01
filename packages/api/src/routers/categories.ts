import { z } from "zod";
import { eq, and, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { router, protectedProcedure } from "../trpc";
import { categories } from "@repo/db/schema";
import { serializeDates } from "../utils/date";

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
    try {
      const result = await ctx.db
        .select()
        .from(categories)
        .where(eq(categories.userId, ctx.user.id))
        .orderBy(desc(categories.createdAt));

      const serialized = serializeDates(result);

      return serialized;
    } catch (error: unknown) {
      console.error("categories.list ERROR:", error);
      throw error;
    }
  }),

  create: protectedProcedure
    .input(categoryInputSchema)
    .mutation(async ({ ctx, input }) => {
      try {
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

        const serialized = serializeDates(created);

        return serialized;
      } catch (error: unknown) {
        console.error("categories.create ERROR:", error);
        throw error;
      }
    }),

  listByType: protectedProcedure
    .input(z.enum(["income", "expense", "subscription", "transfer"]))
    .query(async ({ ctx, input }) => {
      try {
        const result = await ctx.db
          .select()
          .from(categories)
          .where(
            and(eq(categories.userId, ctx.user.id), eq(categories.type, input)),
          )
          .orderBy(categories.name);

        return serializeDates(result);
      } catch (error: unknown) {
        console.error("categories.listByType ERROR:", error);
        throw error;
      }
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: categoryUpdateSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [updated] = await ctx.db
          .update(categories)
          .set(input.data)
          .where(
            and(
              eq(categories.id, input.id),
              eq(categories.userId, ctx.user.id),
            ),
          )
          .returning();

        if (!updated) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found",
          });
        }

        return serializeDates(updated);
      } catch (error: unknown) {
        console.error("categories.update ERROR:", error);
        throw error;
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await ctx.db
          .delete(categories)
          .where(
            and(
              eq(categories.id, input.id),
              eq(categories.userId, ctx.user.id),
            ),
          )
          .returning({ id: categories.id });

        if (result.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Category not found",
          });
        }

        return { success: true };
      } catch (error: unknown) {
        console.error("categories.delete ERROR:", error);
        throw error;
      }
    }),
});
