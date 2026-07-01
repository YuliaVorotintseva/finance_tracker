import { describe, it, expect } from "vitest";
import { api } from "./client";

describe("api client", () => {
  it("should export api client", () => {
    expect(api).toBeDefined();
  });

  it("should have categories router", () => {
    expect(api.categories).toBeDefined();
    expect(typeof api.categories.list).toBe("function");
    expect(typeof api.categories.listByType).toBe("function");
    expect(typeof api.categories.create).toBe("function");
    expect(typeof api.categories.update).toBe("function");
    expect(typeof api.categories.delete).toBe("function");
  });

  it("should have transactions router", () => {
    expect(api.transactions).toBeDefined();
    expect(typeof api.transactions.list).toBe("function");
    expect(typeof api.transactions.create).toBe("function");
    expect(typeof api.transactions.delete).toBe("function");
    expect(typeof api.transactions.getStats).toBe("function");
  });

  it("should have bankConnections router", () => {
    expect(api.bankConnections).toBeDefined();
    expect(typeof api.bankConnections.list).toBe("function");
    expect(typeof api.bankConnections.create).toBe("function");
    expect(typeof api.bankConnections.delete).toBe("function");
  });

  it("should have import router", () => {
    expect(api.import).toBeDefined();
    expect(typeof api.import.getBankPresets).toBe("function");
    expect(typeof api.import.parse).toBe("function");
    expect(typeof api.import.import).toBe("function");
  });
});
