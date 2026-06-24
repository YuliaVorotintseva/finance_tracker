import { router } from "./trpc";
import { categoriesRouter } from "./routers/categories";
import { transactionsRouter } from "./routers/transactions";

export const appRouter = router({
  categories: categoriesRouter,
  transactions: transactionsRouter,
});

export type AppRouter = typeof appRouter;
