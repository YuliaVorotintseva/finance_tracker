import { router } from "./trpc";
import { categoriesRouter } from "./routers/categories";
import { transactionsRouter } from "./routers/transactions";
import { bankConnectionsRouter } from "./routers/bank-connections";

export const appRouter = router({
  categories: categoriesRouter,
  transactions: transactionsRouter,
  bankConnections: bankConnectionsRouter,
});

export type AppRouter = typeof appRouter;
