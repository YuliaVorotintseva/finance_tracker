import { describe, it, expect, vi } from "vitest";
import { createCaller } from "./caller";

vi.mock("@repo/db", () => ({
  db: {},
}));

vi.mock("@repo/db/schema", () => ({
  categories: {},
  transactions: {},
  bankConnections: {},
}));

describe("createCaller", () => {
  it("should create caller with context", async () => {
    const mockContext = {
      db: {} as any,
      user: { id: "user-1", email: "test@example.com" },
    };

    const caller = await createCaller(mockContext);

    expect(caller).toBeDefined();
    expect(caller.categories).toBeDefined();
    expect(caller.transactions).toBeDefined();
    expect(caller.bankConnections).toBeDefined();
  });

  it("should create caller with null user", async () => {
    const mockContext = {
      db: {} as any,
      user: null,
    };

    const caller = await createCaller(mockContext);

    expect(caller).toBeDefined();
  });
});
