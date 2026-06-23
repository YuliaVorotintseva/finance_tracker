import { z } from "zod";
import { eq } from "@repo/db";

import { router, protectedProcedure } from "../trpc";
import { categories } from "@repo/db/schema";

export const categoriesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(categories)
      .where(eq(categories.userId, ctx.user.id))
      .orderBy(categories.name);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50),
        type: z.enum(["income", "expense", "subscription", "transfer"]),
        color: z
          .string()
          .regex(/^#[0-9a-f]{6}$/i)
          .default("#6366f1"),
        icon: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [created] = await ctx.db
        .insert(categories)
        .values({ ...input, userId: ctx.user.id })
        .returning();
      return created;
    }),
});
