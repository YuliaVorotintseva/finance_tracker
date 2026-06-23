import "server-only";
import { cache } from "react";

import { createCaller } from "@repo/api/caller";
import { db } from "@repo/db";
import { auth } from "./auth";

export const createTRPCContext = cache(async () => {
  const session = await auth();

  return {
    db,
    user: session?.user?.id
      ? { id: session.user.id, email: session.user.email! }
      : null,
  };
});

export const trpc = createCaller(await createTRPCContext());
