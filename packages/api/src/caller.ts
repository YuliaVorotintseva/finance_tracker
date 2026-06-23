import { appRouter } from "./index";
import type { TRPCContext } from "./trpc";

export const createCaller = (ctx: TRPCContext) => {
  return appRouter.createCaller(ctx);
};
