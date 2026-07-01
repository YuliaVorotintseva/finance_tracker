import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

import type { Database } from "@repo/db";

export interface TRPCContext {
  db: Database;
  user: { id: string; email: string } | null;
  ip?: string;
  userAgent?: string;
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

const loggingMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;

  if (result.ok) {
    console.log(`OK ${type} ${path} - ${durationMs}ms`);
  } else {
    console.error(
      `ERROR ${type} ${path} - ${durationMs}ms - ${result.error.code}`,
    );
  }

  return result;
});

export const protectedProcedure = t.procedure
  .use(loggingMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  });

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  // TODO: добавить проверку роли admin
  return next({ ctx });
});
