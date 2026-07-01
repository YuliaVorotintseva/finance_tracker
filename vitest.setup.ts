import { beforeAll, afterAll } from "vitest";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "a".repeat(64);
  process.env.NODE_ENV = "test";
});

afterAll(() => {
  delete process.env.ENCRYPTION_KEY;
  delete process.env.NODE_ENV;
});
