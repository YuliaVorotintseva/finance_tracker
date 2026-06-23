import { router } from "./trpc";
import { categoriesRouter } from "./routers/categories";

export const appRouter = router({
  categories: categoriesRouter,
});

export type AppRouter = typeof appRouter;
