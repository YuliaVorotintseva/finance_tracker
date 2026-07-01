import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { encrypt, decrypt, isEncrypted } from "./encryption";

describe("Encryption Module", () => {
  const originalKey = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.ENCRYPTION_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey;
  });

  describe("encrypt", () => {
    it("should encrypt a simple string", () => {
      const result = encrypt("hello world");

      expect(result).toBeTruthy();
      expect(result).not.toBe("hello world");
      expect(result.split(":")).toHaveLength(3);
    });

    it("should produce different ciphertext for same input (random IV)", () => {
      const input = "same-input";
      const encrypted1 = encrypt(input);
      const encrypted2 = encrypt(input);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("should handle unicode characters", () => {
      const input = "Hello World!";
      const encrypted = encrypt(input);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(input);
    });

    it("should handle long strings", () => {
      const input = "a".repeat(10000);
      const encrypted = encrypt(input);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(input);
    });

    it("should handle special characters", () => {
      const input = "!@#$%^&*()_+-=[]{}|;:'\",.<>?/`~\\";
      const encrypted = encrypt(input);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(input);
    });

    it("should throw on empty string", () => {
      expect(() => encrypt("")).toThrow("Cannot encrypt empty string");
    });

    it("should throw when ENCRYPTION_KEY is missing", () => {
      const encrypted = encrypt("test");
      delete process.env.ENCRYPTION_KEY;

      expect(() => decrypt(encrypted)).toThrow();
    });

    it("should throw when ENCRYPTION_KEY has wrong length", () => {
      process.env.ENCRYPTION_KEY = "too-short";
      expect(() => encrypt("test")).toThrow(/64 hex characters/);
    });
  });

  describe("decrypt", () => {
    it("should decrypt encrypted text correctly", () => {
      const original = "secret-token-12345";
      const encrypted = encrypt(original);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(original);
    });

    it("should throw on invalid format (missing parts)", () => {
      expect(() => decrypt("invalid")).toThrow("Invalid encrypted text format");
      expect(() => decrypt("part1:part2")).toThrow(
        "Invalid encrypted text format",
      );
    });

    it("should throw on empty string", () => {
      expect(() => decrypt("")).toThrow("Cannot decrypt empty string");
    });

    it("should throw when ENCRYPTION_KEY is missing", () => {
      const encrypted = encrypt("test");
      delete process.env.ENCRYPTION_KEY;

      expect(() => decrypt(encrypted)).toThrow(/ENCRYPTION_KEY/);
    });

    it("should throw when key is different from encryption key", () => {
      const encrypted = encrypt("secret");
      process.env.ENCRYPTION_KEY = "b".repeat(64);

      expect(() => decrypt(encrypted)).toThrow(/Failed to decrypt/);
    });

    it("should throw on corrupted ciphertext", () => {
      const encrypted = encrypt("test");
      const parts = encrypted.split(":");
      const corrupted = `${parts[0]}:${parts[1]}:corrupted`;

      expect(() => decrypt(corrupted)).toThrow();
    });

    it("should throw on tampered auth tag", () => {
      const encrypted = encrypt("test");
      const parts = encrypted.split(":");
      const tampered = `${parts[0]}:00000000000000000000000000000000:${parts[2]}`;

      expect(() => decrypt(tampered)).toThrow();
    });
  });

  describe("isEncrypted", () => {
    it("should return true for valid encrypted strings", () => {
      const encrypted = encrypt("test");
      expect(isEncrypted(encrypted)).toBe(true);
    });

    it("should return false for plain text", () => {
      expect(isEncrypted("plain text")).toBe(false);
      expect(isEncrypted("not-encrypted-string")).toBe(false);
    });

    it("should return false for null/undefined", () => {
      expect(isEncrypted(null)).toBe(false);
      expect(isEncrypted(undefined)).toBe(false);
    });

    it("should return false for empty string", () => {
      expect(isEncrypted("")).toBe(false);
    });

    it("should return false for malformed encrypted strings", () => {
      expect(isEncrypted("part1:part2")).toBe(false);
      expect(isEncrypted("short:short:short")).toBe(false);
    });
  });

  describe("roundtrip integration", () => {
    const testCases = [
      "simple string",
      "12345",
      "special!@#$%^&*()",
      "Привет мир",
      "a".repeat(1000),
      "token_with_underscores-and-dashes",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0",
    ];

    testCases.forEach((input) => {
      it(`should correctly roundtrip: "${input.slice(0, 30)}${input.length > 30 ? "..." : ""}"`, () => {
        const encrypted = encrypt(input);
        const decrypted = decrypt(encrypted);

        expect(decrypted).toBe(input);
        expect(isEncrypted(encrypted)).toBe(true);
        expect(isEncrypted(decrypted)).toBe(false);
      });
    });
  });
});
