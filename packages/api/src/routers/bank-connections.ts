import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { router, protectedProcedure } from "../trpc";
import { bankConnections } from "@repo/db/schema";

export const bankConnectionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.query.bankConnections.findMany({
      where: eq(bankConnections.userId, ctx.user.id),
      with: {
        accounts: true,
      },
    });
  }),

  create: protectedProcedure
    .input(
      z.object({
        institutionId: z.string(),
        institutionName: z.string(),
        accessToken: z.string(),
        refreshToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Зашифровать токены перед сохранением
      const [connection] = await ctx.db
        .insert(bankConnections)
        .values({
          userId: ctx.user.id,
          institutionId: input.institutionId,
          institutionName: input.institutionName,
          encryptedAccessToken: input.accessToken, // TODO: зашифровать
          encryptedRefreshToken: input.refreshToken, // TODO: зашифровать
          status: "active",
        })
        .returning();

      return connection;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(bankConnections)
        .where(
          and(
            eq(bankConnections.id, input.id),
            eq(bankConnections.userId, ctx.user.id),
          ),
        );

      if (result.length === 0) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { success: true };
    }),
});
