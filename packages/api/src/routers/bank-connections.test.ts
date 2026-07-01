import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "../index";
import { mockDb } from "../__mocks__/db";

vi.mock("@repo/db", () => ({
  db: mockDb,
}));

vi.mock("@repo/db/schema", () => ({
  bankConnections: {
    id: "id",
    userId: "userId",
    institutionId: "institutionId",
    institutionName: "institutionName",
    encryptedAccessToken: "encryptedAccessToken",
    encryptedRefreshToken: "encryptedRefreshToken",
    status: "status",
    lastSyncedAt: "lastSyncedAt",
    createdAt: "createdAt",
  },
  bankAccounts: {
    id: "id",
    connectionId: "connectionId",
  },
}));

vi.mock("@repo/crypto", () => ({
  encrypt: vi.fn((text: string) => `encrypted:${text}`),
  decrypt: vi.fn((text: string) => {
    if (text === "corrupted-token") {
      throw new Error("Failed to decrypt");
    }
    return text.replace("encrypted:", "");
  }),
  isEncrypted: vi.fn((text: string) => text.startsWith("encrypted:")),
}));

const VALID_UUID = "11111111-1111-1111-1111-111111111111";
const NON_EXISTENT_UUID = "33333333-3333-3333-3333-333333333333";

describe("Bank Connections Router", () => {
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
    it("should return user bank connections", async () => {
      const mockConnections = [
        {
          id: "1",
          userId: "user-1",
          institutionId: "sberbank",
          institutionName: "Сбербанк",
          encryptedAccessToken: "encrypted:token",
          status: "active",
          accounts: [],
        },
      ];
      mockDb.query.bankConnections.findMany.mockResolvedValueOnce(
        mockConnections,
      );

      const result = await caller.bankConnections.list();

      expect(result).toHaveLength(1);
      expect(result[0]!.institutionName).toBe("Сбербанк");
      expect(result[0]).not.toHaveProperty("encryptedAccessToken");
    });

    it("should return empty array when no connections", async () => {
      mockDb.query.bankConnections.findMany.mockResolvedValueOnce([]);

      const result = await caller.bankConnections.list();

      expect(result).toEqual([]);
    });

    it("should return multiple connections", async () => {
      const mockConnections = [
        {
          id: "1",
          userId: "user-1",
          institutionId: "sberbank",
          institutionName: "Сбербанк",
          encryptedAccessToken: "encrypted:token1",
          status: "active",
          accounts: [],
        },
        {
          id: "2",
          userId: "user-1",
          institutionId: "tinkoff",
          institutionName: "Тинькофф",
          encryptedAccessToken: "encrypted:token2",
          status: "expired",
          accounts: [],
        },
        {
          id: "3",
          userId: "user-1",
          institutionId: "alfa",
          institutionName: "Альфа-Банк",
          encryptedAccessToken: "encrypted:token3",
          status: "error",
          accounts: [],
        },
      ];
      mockDb.query.bankConnections.findMany.mockResolvedValueOnce(
        mockConnections,
      );

      const result = await caller.bankConnections.list();

      expect(result).toHaveLength(3);
      expect(result[0]!.status).toBe("active");
      expect(result[1]!.status).toBe("expired");
      expect(result[2]!.status).toBe("error");
    });

    it("should include accounts in response", async () => {
      const mockConnections = [
        {
          id: "1",
          userId: "user-1",
          institutionId: "sberbank",
          institutionName: "Сбербанк",
          encryptedAccessToken: "encrypted:token",
          status: "active",
          accounts: [
            { id: "acc-1", name: "Основной счёт", iban: "RU1234567890" },
            { id: "acc-2", name: "Накопительный", iban: "RU0987654321" },
          ],
        },
      ];
      mockDb.query.bankConnections.findMany.mockResolvedValueOnce(
        mockConnections,
      );

      const result = await caller.bankConnections.list();

      expect(result[0]!.accounts).toHaveLength(2);
    });

    it("should handle connections without accounts", async () => {
      const mockConnections = [
        {
          id: "1",
          userId: "user-1",
          institutionId: "sberbank",
          institutionName: "Сбербанк",
          encryptedAccessToken: "encrypted:token",
          status: "active",
          accounts: [],
        },
      ];
      mockDb.query.bankConnections.findMany.mockResolvedValueOnce(
        mockConnections,
      );

      const result = await caller.bankConnections.list();

      expect(result[0]!.accounts).toEqual([]);
    });

    it("should not expose encrypted tokens in response", async () => {
      const mockConnections = [
        {
          id: "1",
          userId: "user-1",
          institutionId: "sberbank",
          institutionName: "Сбербанк",
          encryptedAccessToken: "encrypted:super-secret-access-token",
          encryptedRefreshToken: "encrypted:super-secret-refresh-token",
          status: "active",
          accounts: [],
        },
      ];
      mockDb.query.bankConnections.findMany.mockResolvedValueOnce(
        mockConnections,
      );

      const result = await caller.bankConnections.list();

      expect(result[0]).not.toHaveProperty("encryptedAccessToken");
      expect(result[0]).not.toHaveProperty("encryptedRefreshToken");
    });
  });

  describe("create", () => {
    it("should create new bank connection", async () => {
      const newConnection = {
        id: VALID_UUID,
        userId: "user-1",
        institutionId: "tinkoff",
        institutionName: "Тинькофф",
        status: "active",
      };
      mockDb.returning.mockResolvedValueOnce([newConnection]);

      const result = await caller.bankConnections.create({
        institutionId: "tinkoff",
        institutionName: "Тинькофф",
        accessToken: "test-token",
        refreshToken: "test-refresh",
      });

      expect(result.institutionName).toBe("Тинькофф");
      expect(result.status).toBe("active");
    });

    it("should create connection without refresh token", async () => {
      const newConnection = {
        id: VALID_UUID,
        userId: "user-1",
        institutionId: "alfa",
        institutionName: "Альфа-Банк",
        status: "active",
      };
      mockDb.returning.mockResolvedValueOnce([newConnection]);

      const result = await caller.bankConnections.create({
        institutionId: "alfa",
        institutionName: "Альфа-Банк",
        accessToken: "test-token",
      });

      expect(result.institutionName).toBe("Альфа-Банк");
    });

    it("should throw on empty institutionId", async () => {
      await expect(
        caller.bankConnections.create({
          institutionId: "",
          institutionName: "Test",
          accessToken: "token",
        }),
      ).rejects.toThrow();
    });

    it("should throw on empty institutionName", async () => {
      await expect(
        caller.bankConnections.create({
          institutionId: "test",
          institutionName: "",
          accessToken: "token",
        }),
      ).rejects.toThrow();
    });

    it("should throw on empty accessToken", async () => {
      await expect(
        caller.bankConnections.create({
          institutionId: "test",
          institutionName: "Test",
          accessToken: "",
        }),
      ).rejects.toThrow();
    });

    it("should encrypt access token before saving", async () => {
      const { encrypt } = await import("@repo/crypto");
      const newConnection = {
        id: VALID_UUID,
        userId: "user-1",
        institutionId: "test",
        institutionName: "Test",
        status: "active",
      };
      mockDb.returning.mockResolvedValueOnce([newConnection]);

      await caller.bankConnections.create({
        institutionId: "test",
        institutionName: "Test",
        accessToken: "my-secret-token",
      });

      expect(encrypt).toHaveBeenCalledWith("my-secret-token");
    });

    it("should encrypt refresh token when provided", async () => {
      const { encrypt } = await import("@repo/crypto");
      const newConnection = {
        id: VALID_UUID,
        userId: "user-1",
        institutionId: "test",
        institutionName: "Test",
        status: "active",
      };
      mockDb.returning.mockResolvedValueOnce([newConnection]);

      await caller.bankConnections.create({
        institutionId: "test",
        institutionName: "Test",
        accessToken: "access-token",
        refreshToken: "refresh-token",
      });

      expect(encrypt).toHaveBeenCalledWith("refresh-token");
    });

    it("should handle database error gracefully", async () => {
      mockDb.returning.mockRejectedValueOnce(new Error("Database error"));

      await expect(
        caller.bankConnections.create({
          institutionId: "test",
          institutionName: "Test",
          accessToken: "token",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("delete", () => {
    it("should delete existing connection", async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: VALID_UUID }]);

      const result = await caller.bankConnections.delete({ id: VALID_UUID });

      expect(result.success).toBe(true);
    });

    it("should throw NOT_FOUND if connection does not exist", async () => {
      mockDb.returning.mockResolvedValueOnce([]);

      await expect(
        caller.bankConnections.delete({ id: NON_EXISTENT_UUID }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw on invalid UUID format", async () => {
      await expect(
        caller.bankConnections.delete({ id: "not-a-uuid" }),
      ).rejects.toThrow();
    });
  });

  describe("getDecryptedToken", () => {
    it("should return decrypted access token", async () => {
      const mockConnection = {
        id: VALID_UUID,
        userId: "user-1",
        institutionId: "sberbank",
        institutionName: "Сбербанк",
        encryptedAccessToken: "encrypted:access-token-123",
        encryptedRefreshToken: "encrypted:refresh-token-456",
        status: "active",
      };
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(
        mockConnection,
      );

      const result = await caller.bankConnections.getDecryptedToken({
        connectionId: VALID_UUID,
        tokenType: "access",
      });

      expect(result.token).toBe("access-token-123");
      expect(result.institutionName).toBe("Сбербанк");
      expect(result.status).toBe("active");
    });

    it("should return decrypted refresh token", async () => {
      const mockConnection = {
        id: VALID_UUID,
        userId: "user-1",
        institutionId: "sberbank",
        institutionName: "Сбербанк",
        encryptedAccessToken: "encrypted:access-token",
        encryptedRefreshToken: "encrypted:refresh-token-456",
        status: "active",
      };
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(
        mockConnection,
      );

      const result = await caller.bankConnections.getDecryptedToken({
        connectionId: VALID_UUID,
        tokenType: "refresh",
      });

      expect(result.token).toBe("refresh-token-456");
    });

    it("should throw NOT_FOUND if connection does not exist", async () => {
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(null);

      await expect(
        caller.bankConnections.getDecryptedToken({
          connectionId: NON_EXISTENT_UUID,
          tokenType: "access",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw NOT_FOUND if refresh token is missing", async () => {
      const mockConnection = {
        id: VALID_UUID,
        userId: "user-1",
        institutionId: "sberbank",
        institutionName: "Сбербанк",
        encryptedAccessToken: "encrypted:access-token",
        encryptedRefreshToken: null,
        status: "active",
      };
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(
        mockConnection,
      );

      await expect(
        caller.bankConnections.getDecryptedToken({
          connectionId: VALID_UUID,
          tokenType: "refresh",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw INTERNAL_SERVER_ERROR on decrypt failure", async () => {
      const mockConnection = {
        id: VALID_UUID,
        userId: "user-1",
        institutionId: "sberbank",
        institutionName: "Сбербанк",
        encryptedAccessToken: "corrupted-token",
        encryptedRefreshToken: null,
        status: "active",
      };
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(
        mockConnection,
      );

      await expect(
        caller.bankConnections.getDecryptedToken({
          connectionId: VALID_UUID,
          tokenType: "access",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw on invalid connectionId format", async () => {
      await expect(
        caller.bankConnections.getDecryptedToken({
          connectionId: "not-a-uuid",
          tokenType: "access",
        }),
      ).rejects.toThrow();
    });

    it("should throw on invalid tokenType", async () => {
      await expect(
        caller.bankConnections.getDecryptedToken({
          connectionId: VALID_UUID,
          tokenType: "invalid" as any,
        }),
      ).rejects.toThrow();
    });

    it("should not return token for another user connection", async () => {
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(null);

      await expect(
        caller.bankConnections.getDecryptedToken({
          connectionId: VALID_UUID,
          tokenType: "access",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("updateTokens", () => {
    it("should update access token", async () => {
      const mockConnection = {
        id: VALID_UUID,
        userId: "user-1",
        institutionId: "sberbank",
        institutionName: "Сбербанк",
        encryptedAccessToken: "encrypted:old-access",
        encryptedRefreshToken: "encrypted:old-refresh",
        status: "active",
      };
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(
        mockConnection,
      );

      const updated = {
        id: VALID_UUID,
        lastSyncedAt: new Date().toISOString(),
      };
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await caller.bankConnections.updateTokens({
        connectionId: VALID_UUID,
        accessToken: "new-access-token",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBe(VALID_UUID);
    });

    it("should update both tokens", async () => {
      const mockConnection = {
        id: VALID_UUID,
        userId: "user-1",
        institutionId: "sberbank",
        institutionName: "Сбербанк",
        encryptedAccessToken: "encrypted:old-access",
        encryptedRefreshToken: "encrypted:old-refresh",
        status: "active",
      };
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(
        mockConnection,
      );

      const updated = { id: VALID_UUID };
      mockDb.returning.mockResolvedValueOnce([updated]);

      const result = await caller.bankConnections.updateTokens({
        connectionId: VALID_UUID,
        accessToken: "new-access",
        refreshToken: "new-refresh",
      });

      expect(result.success).toBe(true);
    });

    it("should throw NOT_FOUND if connection does not exist", async () => {
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(null);

      await expect(
        caller.bankConnections.updateTokens({
          connectionId: NON_EXISTENT_UUID,
          accessToken: "new-token",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should throw on empty accessToken", async () => {
      await expect(
        caller.bankConnections.updateTokens({
          connectionId: VALID_UUID,
          accessToken: "",
        }),
      ).rejects.toThrow();
    });

    it("should encrypt new tokens before saving", async () => {
      const { encrypt } = await import("@repo/crypto");
      const mockConnection = {
        id: VALID_UUID,
        userId: "user-1",
        encryptedAccessToken: "encrypted:old",
        encryptedRefreshToken: null,
        status: "active",
      };
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(
        mockConnection,
      );
      mockDb.returning.mockResolvedValueOnce([{ id: VALID_UUID }]);

      await caller.bankConnections.updateTokens({
        connectionId: VALID_UUID,
        accessToken: "brand-new-access-token",
        refreshToken: "brand-new-refresh-token",
      });

      expect(encrypt).toHaveBeenCalledWith("brand-new-access-token");
      expect(encrypt).toHaveBeenCalledWith("brand-new-refresh-token");
    });

    it("should throw on invalid connectionId format", async () => {
      await expect(
        caller.bankConnections.updateTokens({
          connectionId: "not-a-uuid",
          accessToken: "token",
        }),
      ).rejects.toThrow();
    });

    it("should not update tokens for another user connection", async () => {
      mockDb.query.bankConnections.findFirst.mockResolvedValueOnce(null);

      await expect(
        caller.bankConnections.updateTokens({
          connectionId: VALID_UUID,
          accessToken: "new-token",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });

  describe("auth protection", () => {
    it("should reject unauthenticated access to list", async () => {
      const unauthCaller = appRouter.createCaller({
        db: mockDb as any,
        user: null,
      });

      await expect(unauthCaller.bankConnections.list()).rejects.toThrow(
        TRPCError,
      );
    });

    it("should reject unauthenticated access to create", async () => {
      const unauthCaller = appRouter.createCaller({
        db: mockDb as any,
        user: null,
      });

      await expect(
        unauthCaller.bankConnections.create({
          institutionId: "test",
          institutionName: "Test",
          accessToken: "token",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject unauthenticated access to delete", async () => {
      const unauthCaller = appRouter.createCaller({
        db: mockDb as any,
        user: null,
      });

      await expect(
        unauthCaller.bankConnections.delete({ id: VALID_UUID }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject unauthenticated access to getDecryptedToken", async () => {
      const unauthCaller = appRouter.createCaller({
        db: mockDb as any,
        user: null,
      });

      await expect(
        unauthCaller.bankConnections.getDecryptedToken({
          connectionId: VALID_UUID,
          tokenType: "access",
        }),
      ).rejects.toThrow(TRPCError);
    });

    it("should reject unauthenticated access to updateTokens", async () => {
      const unauthCaller = appRouter.createCaller({
        db: mockDb as any,
        user: null,
      });

      await expect(
        unauthCaller.bankConnections.updateTokens({
          connectionId: VALID_UUID,
          accessToken: "token",
        }),
      ).rejects.toThrow(TRPCError);
    });
  });
});
