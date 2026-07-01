import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../index";
import { mockDb } from "../__mocks__/db";

vi.mock("@repo/db", () => ({
  db: mockDb,
}));

vi.mock("@repo/db/schema", () => ({
  transactions: {
    id: "id",
    userId: "userId",
    amount: "amount",
    currency: "currency",
    type: "type",
    occurredAt: "occurredAt",
    description: "description",
    merchantName: "merchantName",
    categoryId: "categoryId",
    source: "source",
  },
  categories: {
    id: "id",
    name: "name",
    color: "color",
  },
}));

describe("Transactions Router", () => {
  const testUser = { id: "user-1", email: "test@example.com" };
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    caller = appRouter.createCaller({
      db: mockDb as any,
      user: testUser,
    });
  });

  describe("list", () => {
    it("should return paginated transactions", async () => {
      const mockTransactions = Array.from({ length: 5 }, (_, i) => ({
        id: `tx-${i}`,
        amount: "100.00",
        currency: "RUB",
        type: "expense",
        occurredAt: "2024-01-01T00:00:00.000Z",
        description: `Test ${i}`,
        merchantName: "Store",
        source: "manual",
        category: null,
      }));
      mockDb.limit.mockResolvedValueOnce(mockTransactions);

      const result = await caller.transactions.list({ limit: 20 });

      expect(result.items).toHaveLength(5);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should return nextCursor when more items exist", async () => {
      const mockTransactions = Array.from({ length: 21 }, (_, i) => ({
        id: `tx-${i}`,
        amount: "100.00",
        currency: "RUB",
        type: "expense",
        occurredAt: "2024-01-01T00:00:00.000Z",
        description: `Test ${i}`,
        merchantName: "Store",
        source: "manual",
        category: null,
      }));
      mockDb.limit.mockResolvedValueOnce(mockTransactions);

      const result = await caller.transactions.list({ limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBe("tx-20");
    });

    it("should validate limit range", async () => {
      await expect(caller.transactions.list({ limit: 0 })).rejects.toThrow();

      await expect(caller.transactions.list({ limit: 101 })).rejects.toThrow();
    });
  });

  describe("create", () => {
    it("should create transaction", async () => {
      const newTx = {
        id: "new-tx",
        amount: "1500.00",
        currency: "RUB",
        type: "expense",
        occurredAt: "2024-01-15T00:00:00.000Z",
        description: "Test",
        userId: "user-1",
      };
      mockDb.returning.mockResolvedValueOnce([newTx]);

      const result = await caller.transactions.create({
        amount: "1500.00",
        currency: "RUB",
        type: "expense",
        occurredAt: "2024-01-15T00:00:00.000Z",
        description: "Test",
      });

      expect(result!.id).toBe("new-tx");
      expect(result!.amount).toBe("1500.00");
    });

    it("should validate amount format", async () => {
      await expect(
        caller.transactions.create({
          amount: "invalid",
          type: "expense",
          occurredAt: "2024-01-15T00:00:00.000Z",
        }),
      ).rejects.toThrow();
    });

    it("should validate occurredAt format", async () => {
      await expect(
        caller.transactions.create({
          amount: "100",
          type: "expense",
          occurredAt: "invalid-date",
        }),
      ).rejects.toThrow();
    });
  });

  describe("getStats", () => {
    it("should return stats for month", async () => {
      const mockStats = {
        totalIncome: "50000",
        totalExpense: "30000",
        transactionCount: 10,
      };
      mockDb.from.mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce([{ ...mockStats }]),
      });

      const mockByCategory = [
        {
          categoryId: "cat-1",
          categoryName: "Продукты",
          categoryColor: "#f00",
          total: "10000",
          count: 5,
        },
      ];
      mockDb.orderBy.mockResolvedValueOnce(mockByCategory);

      const result = await caller.transactions.getStats({ month: "2024-01" });

      expect(result.transactionCount).toBe(10);
    });

    it("should validate month format", async () => {
      await expect(
        caller.transactions.getStats({ month: "invalid" }),
      ).rejects.toThrow();

      await expect(
        caller.transactions.getStats({ month: "2024-1" }),
      ).rejects.toThrow();
    });
  });

  describe("auth protection", () => {
    it("should reject unauthenticated access", async () => {
      const unauthCaller = appRouter.createCaller({
        db: mockDb as any,
        user: null,
      });

      await expect(
        unauthCaller.transactions.list({ limit: 20 }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
