import { vi, type Mock } from "vitest";

type MockFn = Mock<(...args: any[]) => any>;

interface MockDatabase {
  query: {
    users: {
      findFirst: MockFn;
      findMany: MockFn;
    };
    categories: {
      findFirst: MockFn;
      findMany: MockFn;
    };
    transactions: {
      findFirst: MockFn;
      findMany: MockFn;
    };
    bankConnections: {
      findFirst: MockFn;
      findMany: MockFn;
    };
  };
  select: MockFn;
  from: MockFn;
  where: MockFn;
  insert: MockFn;
  values: MockFn;
  update: MockFn;
  set: MockFn;
  delete: MockFn;
  returning: MockFn;
  orderBy: MockFn;
  limit: MockFn;
  leftJoin: MockFn;
  innerJoin: MockFn;
  groupBy: MockFn;
  execute: MockFn;
}

export const mockDb: MockDatabase = {
  query: {
    users: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    categories: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    transactions: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    bankConnections: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  returning: vi.fn().mockResolvedValue([]),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  innerJoin: vi.fn().mockReturnThis(),
  groupBy: vi.fn().mockReturnThis(),
  execute: vi.fn(),
};

export const db: MockDatabase = mockDb;
