import { describe, it, expect } from "vitest";
import { serializeDates } from "./date";

describe("serializeDates", () => {
  it("should convert Date to ISO string", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    const result = serializeDates(date);

    expect(result).toBe("2024-01-15T10:30:00.000Z");
  });

  it("should handle null and undefined", () => {
    expect(serializeDates(null)).toBeNull();
    expect(serializeDates(undefined)).toBeUndefined();
  });

  it("should pass through primitives unchanged", () => {
    expect(serializeDates("string")).toBe("string");
    expect(serializeDates(123)).toBe(123);
    expect(serializeDates(true)).toBe(true);
    expect(serializeDates(false)).toBe(false);
  });

  it("should convert Date in array", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    const result = serializeDates([date, "text", 42]);

    expect(result).toEqual(["2024-01-15T10:30:00.000Z", "text", 42]);
  });

  it("should convert Date in object", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    const result = serializeDates({
      id: "123",
      createdAt: date,
      name: "test",
    });

    expect(result).toEqual({
      id: "123",
      createdAt: "2024-01-15T10:30:00.000Z",
      name: "test",
    });
  });

  it("should handle nested objects with Dates", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    const result = serializeDates({
      user: {
        id: "1",
        profile: {
          createdAt: date,
        },
      },
    });

    expect(result).toEqual({
      user: {
        id: "1",
        profile: {
          createdAt: "2024-01-15T10:30:00.000Z",
        },
      },
    });
  });

  it("should handle array of objects with Dates", () => {
    const date1 = new Date("2024-01-15T10:30:00.000Z");
    const date2 = new Date("2024-02-20T12:00:00.000Z");

    const result = serializeDates([
      { id: "1", createdAt: date1 },
      { id: "2", createdAt: date2 },
    ]);

    expect(result).toEqual([
      { id: "1", createdAt: "2024-01-15T10:30:00.000Z" },
      { id: "2", createdAt: "2024-02-20T12:00:00.000Z" },
    ]);
  });

  it("should handle empty array", () => {
    expect(serializeDates([])).toEqual([]);
  });

  it("should handle empty object", () => {
    expect(serializeDates({})).toEqual({});
  });

  it("should handle deeply nested structures", () => {
    const date = new Date("2024-01-15T10:30:00.000Z");
    const result = serializeDates({
      level1: {
        level2: {
          level3: {
            level4: {
              date,
            },
          },
        },
      },
    });

    expect(result).toEqual({
      level1: {
        level2: {
          level3: {
            level4: {
              date: "2024-01-15T10:30:00.000Z",
            },
          },
        },
      },
    });
  });
});
