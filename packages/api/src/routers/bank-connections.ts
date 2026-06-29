import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { router, protectedProcedure } from "../trpc";
import { bankConnections } from "@repo/db/schema";
import { decrypt, encrypt } from "@repo/crypto";

export const bankConnectionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const connections = await ctx.db.query.bankConnections.findMany({
      where: eq(bankConnections.userId, ctx.user.id),
      with: {
        accounts: true,
      },
    });

    return connections.map((conn) => ({
      id: conn.id,
      userId: conn.userId,
      institutionId: conn.institutionId,
      institutionName: conn.institutionName,
      status: conn.status,
      lastSyncedAt: conn.lastSyncedAt,
      createdAt: conn.createdAt,
      accounts: conn.accounts,
    }));
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
      try {
        const encryptedAccessToken = encrypt(input.accessToken);
        const encryptedRefreshToken = input.refreshToken
          ? encrypt(input.refreshToken)
          : null;

        const [connection] = await ctx.db
          .insert(bankConnections)
          .values({
            userId: ctx.user.id,
            institutionId: input.institutionId,
            institutionName: input.institutionName,
            encryptedAccessToken,
            encryptedRefreshToken,
            status: "active",
          })
          .returning();

        return {
          id: connection!.id,
          userId: connection!.userId,
          institutionId: connection!.institutionId,
          institutionName: connection!.institutionName,
          status: connection!.status,
          lastSyncedAt: connection!.lastSyncedAt,
          createdAt: connection!.createdAt,
        };
      } catch (error: unknown) {
        console.error("Failed to create bank connection:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save bank connection",
        });
      }
    }),

  getDecryptedToken: protectedProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
        tokenType: z.enum(["access", "refresh"]),
      }),
    )
    .query(async ({ ctx, input }) => {
      const connection = await ctx.db.query.bankConnections.findFirst({
        where: and(
          eq(bankConnections.id, input.connectionId),
          eq(bankConnections.userId, ctx.user.id),
        ),
      });

      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const encryptedToken =
        input.tokenType === "access"
          ? connection.encryptedAccessToken
          : connection.encryptedRefreshToken;

      if (!encryptedToken) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `${input.tokenType} token not found`,
        });
      }

      try {
        return {
          token: decrypt(encryptedToken),
          institutionName: connection.institutionName,
          status: connection.status,
        };
      } catch (error) {
        console.error("Failed to decrypt token:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Failed to decrypt token. The encryption key may have changed.",
        });
      }
    }),

  updateTokens: protectedProcedure
    .input(
      z.object({
        connectionId: z.string().uuid(),
        accessToken: z.string().min(1),
        refreshToken: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const connection = await ctx.db.query.bankConnections.findFirst({
        where: and(
          eq(bankConnections.id, input.connectionId),
          eq(bankConnections.userId, ctx.user.id),
        ),
      });

      if (!connection) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const encryptedAccessToken = encrypt(input.accessToken);
      const encryptedRefreshToken = input.refreshToken
        ? encrypt(input.refreshToken)
        : null;

      const [updated] = await ctx.db
        .update(bankConnections)
        .set({
          encryptedAccessToken,
          encryptedRefreshToken,
          lastSyncedAt: new Date().toISOString(),
        })
        .where(eq(bankConnections.id, input.connectionId))
        .returning();

      return { success: true, id: updated!.id };
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
