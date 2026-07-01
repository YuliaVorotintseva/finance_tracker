import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { type NextRequest } from "next/server";

import { appRouter } from "@repo/api";
import { createTRPCContext } from "@/lib/trpc-server";

const handler = (req: NextRequest) => {
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  ];

  if (origin && !allowedOrigins.includes(origin)) {
    return new Response("Forbidden", { status: 403 });
  }

  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ error, path }) {
      console.error(`tRPC error on ${path}:`, error.message);
    },
  });
};

export { handler as GET, handler as POST };
