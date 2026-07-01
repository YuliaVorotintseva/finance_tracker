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
}));

describe("Import Router", () => {
  const testUser = { id: "user-1", email: "test@example.com" };
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    vi.clearAllMocks();
    caller = appRouter.createCaller({
      db: mockDb as any,
      user: testUser,
    });
  });

  describe("getBankPresets", () => {
    it("should return list of bank presets", async () => {
      const result = await caller.import.getBankPresets();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("key");
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("delimiter");
    });

    it("should include major Russian banks", async () => {
      const result = await caller.import.getBankPresets();

      const bankKeys = result.map((b) => b.key);
      expect(bankKeys).toContain("sberbank");
      expect(bankKeys).toContain("tinkoff");
      expect(bankKeys).toContain("alfa");
      expect(bankKeys).toContain("vtb");
    });
  });

  describe("parse", () => {
    it("should parse CSV content with bank preset", async () => {
      const csvContent = `Информация о счете
Дата;Сумма;Валюта;Описание
01.01.2024;-1500.00;RUB;Пятёрочка
02.01.2024;50000.00;RUB;Зарплата`;

      const result = await caller.import.parse({
        content: csvContent,
        bankPreset: "sberbank",
      });

      expect(result.headers).toBeDefined();
      expect(result.preview).toBeDefined();
      expect(result.totalRows).toBe(2);
    });

    it("should parse CSV with tinkoff preset (no skipRows)", async () => {
      const csvContent = `Дата операции;Сумма операции;Валюта операции;Описание
01.01.2024;-1500.00;RUB;Пятёрочка
02.01.2024;50000.00;RUB;Зарплата`;

      const result = await caller.import.parse({
        content: csvContent,
        bankPreset: "tinkoff",
      });

      expect(result.totalRows).toBe(2);
    });
  });

  describe("import", () => {
    it("should import transactions from CSV", async () => {
      const csvContent = `Дата операции;Сумма операции;Валюта операции;Описание
01.01.2024;-1500.00;RUB;Пятёрочка
02.01.2024;50000.00;RUB;Зарплата`;

      mockDb.query.transactions.findFirst.mockResolvedValue(null);

      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnThis(),
      });

      const result = await caller.import.import({
        content: csvContent,
        bankPreset: "tinkoff",
        columnMapping: {
          date: "Дата операции",
          amount: "Сумма операции",
          currency: "Валюта операции",
          description: "Описание",
        },
      });

      expect(result).toHaveProperty("imported");
      expect(result).toHaveProperty("skipped");
      expect(result).toHaveProperty("errors");
      expect(result).toHaveProperty("total");
      expect(result.imported).toBe(2); // Должно импортировать 2 транзакции
    });

    it("should skip duplicates", async () => {
      const csvContent = `Дата;Сумма
01.01.2024;100`;

      mockDb.query.transactions.findFirst.mockResolvedValue({
        id: "existing",
      });

      const result = await caller.import.import({
        content: csvContent,
        columnMapping: {
          date: "Дата",
          amount: "Сумма",
        },
        skipDuplicates: true,
      });

      expect(result.skipped).toBeGreaterThan(0);
    });

    it("should throw on empty CSV", async () => {
      await expect(
        caller.import.import({
          content: "",
          columnMapping: {
            date: "Дата",
            amount: "Сумма",
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe("auth protection", () => {
    it("should reject unauthenticated access", async () => {
      const unauthCaller = appRouter.createCaller({
        db: mockDb as any,
        user: null,
      });

      await expect(unauthCaller.import.getBankPresets()).rejects.toThrow(
        TRPCError,
      );
    });
  });
});
