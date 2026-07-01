import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../index";
import { mockDb } from "../__mocks__/db";

vi.mock("@repo/db", () => ({
  db: mockDb,
}));

vi.mock("@repo/db/schema", () => ({
  categories: {
    id: "id",
    userId: "userId",
    name: "name",
    type: "type",
    color: "color",
    createdAt: "createdAt",
  },
}));

const VALID_UUID = "11111111-1111-1111-1111-111111111111";
const NON_EXISTENT_UUID = "22222222-2222-2222-2222-222222222222";

describe("Categories Router", () => {
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
    it("should return user categories", async () => {
      const mockCategories = [
        {
          id: "1",
          name: "Продукты",
          type: "expense",
          userId: "user-1",
          color: "#f00",
          createdAt: new Date(),
        },
        {
          id: "2",
          name: "Зарплата",
          type: "income",
          userId: "user-1",
          color: "#0f0",
          createdAt: new Date(),
        },
      ];
      mockDb.orderBy.mockResolvedValueOnce(mockCategories);

      const result = await caller.categories.list();

      expect(result).toHaveLength(2);
      expect(result[0]!.name).toBe("Продукты");
    });

    it("should return empty array when no categories", async () => {
      mockDb.orderBy.mockResolvedValueOnce([]);

      const result = await caller.categories.list();

      expect(result).toEqual([]);
    });
  });

  describe("listByType", () => {
    it("should filter by type", async () => {
      const mockCategories = [
        { id: "1", name: "Продукты", type: "expense", userId: "user-1" },
      ];
      mockDb.orderBy.mockResolvedValueOnce(mockCategories);

      const result = await caller.categories.listByType("expense");

      expect(result).toHaveLength(1);
    });
  });

  describe("create", () => {
    it("should create new category", async () => {
      mockDb.query.categories.findFirst.mockResolvedValueOnce(null);
      const newCategory = {
        id: "new-id",
        name: "Кафе",
        type: "expense",
        color: "#ff0000",
        userId: "user-1",
        createdAt: new Date(),
      };
      mockDb.returning.mockResolvedValueOnce([newCategory]);

      const result = await caller.categories.create({
        name: "Кафе",
        type: "expense",
        color: "#ff0000",
      });

      expect(result!.name).toBe("Кафе");
      expect(result!.id).toBe("new-id");
    });

    it("should throw CONFLICT on duplicate name", async () => {
      mockDb.query.categories.findFirst.mockResolvedValueOnce({
        id: "existing",
        name: "Кафе",
      });

      await expect(
        caller.categories.create({
          name: "Кафе",
          type: "expense",
          color: "#ff0000",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should validate input", async () => {
      await expect(
        caller.categories.create({
          name: "a",
          type: "expense",
          color: "#ff0000",
        }),
      ).rejects.toThrow();
    });

    it("should validate color format", async () => {
      await expect(
        caller.categories.create({
          name: "Test",
          type: "expense",
          color: "invalid",
        }),
      ).rejects.toThrow();
    });
  });

  describe("update", () => {
    it("should update existing category", async () => {
      const updated = { id: VALID_UUID, name: "Новое имя", userId: "user-1" };
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await caller.categories.update({
        id: VALID_UUID,
        data: { name: "Новое имя" },
      });

      expect(result.name).toBe("Новое имя");
    });

    it("should throw NOT_FOUND if category does not exist", async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        caller.categories.update({
          id: NON_EXISTENT_UUID,
          data: { name: "Test" },
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should delete existing category", async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: VALID_UUID }]);

      const result = await caller.categories.delete({ id: VALID_UUID });

      expect(result.success).toBe(true);
    });

    it("should throw NOT_FOUND if category does not exist", async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        caller.categories.delete({ id: NON_EXISTENT_UUID }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("auth protection", () => {
    it("should reject unauthenticated access", async () => {
      const unauthCaller = appRouter.createCaller({
        db: mockDb as any,
        user: null,
      });

      await expect(unauthCaller.categories.list()).rejects.toThrow(TRPCError);
    });
  });
});
