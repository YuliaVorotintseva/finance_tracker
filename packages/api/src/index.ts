import { router } from "./trpc";
import { categoriesRouter } from "./routers/categories";
import { transactionsRouter } from "./routers/transactions";
import { bankConnectionsRouter } from "./routers/bank-connections";
import { importRouter } from "./routers/import";

export const appRouter = router({
  categories: categoriesRouter,
  transactions: transactionsRouter,
  bankConnections: bankConnectionsRouter,
  import: importRouter,
});

export type AppRouter = typeof appRouter;
