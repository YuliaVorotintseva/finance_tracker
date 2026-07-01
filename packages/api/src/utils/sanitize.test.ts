import { describe, it, expect } from "vitest";
import { sanitizeString, isValidEmail } from "./sanitize";

describe("sanitizeString", () => {
  it("should remove HTML tags", () => {
    expect(sanitizeString("<script>alert(1)</script>")).toBe("alert(1)");
    expect(sanitizeString("<b>bold</b>")).toBe("bold");
    expect(sanitizeString('<div class="test">content</div>')).toBe("content");
  });

  it("should remove javascript: protocol", () => {
    expect(sanitizeString("javascript:alert(1)")).toBe("alert(1)");
    expect(sanitizeString("JAVASCRIPT:void(0)")).toBe("void(0)");
  });

  it("should remove event handlers", () => {
    expect(sanitizeString("onload=alert(1)")).toBe("alert(1)");
    expect(sanitizeString('onclick="test"')).toBe('"test"');
    expect(sanitizeString("onmouseover=foo")).toBe("foo");
  });

  it("should trim whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
    expect(sanitizeString("\n\ttest\n")).toBe("test");
  });

  it("should preserve safe content", () => {
    expect(sanitizeString("Hello World")).toBe("Hello World");
    expect(sanitizeString("Test 123")).toBe("Test 123");
    expect(sanitizeString("user@email.com")).toBe("user@email.com");
  });

  it("should handle empty string", () => {
    expect(sanitizeString("")).toBe("");
  });

  it("should handle complex XSS attempts", () => {
    const xss = "<img src=x onerror=alert(1)>";
    const result = sanitizeString(xss);
    expect(result).not.toContain("<");
    expect(result).not.toContain("onerror");
  });
});

describe("isValidEmail", () => {
  it("should accept valid emails", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
    expect(isValidEmail("user.name@example.com")).toBe(true);
    expect(isValidEmail("user+tag@example.com")).toBe(true);
    expect(isValidEmail("user@subdomain.example.com")).toBe(true);
    expect(isValidEmail("user123@example.co.uk")).toBe(true);
  });

  it("should reject invalid emails", () => {
    expect(isValidEmail("")).toBe(false);
    expect(isValidEmail("invalid")).toBe(false);
    expect(isValidEmail("invalid@")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("user@")).toBe(false);
    expect(isValidEmail("user @example.com")).toBe(false);
    expect(isValidEmail("user@example")).toBe(false);
  });

  it("should reject too long emails", () => {
    const long = "a".repeat(250) + "@example.com";
    expect(isValidEmail(long)).toBe(false);
  });

  it("should accept emails up to 254 chars", () => {
    const localPart = "a".repeat(240);
    const email = `${localPart}@example.com`;
    expect(isValidEmail(email)).toBe(true);
  });

  it("should handle multiple HTML tags", () => {
    expect(sanitizeString("<p>test</p><div>content</div>")).toBe("testcontent");
  });

  it("should handle nested tags", () => {
    expect(sanitizeString("<div><span>nested</span></div>")).toBe("nested");
  });

  it("should handle mixed case protocols", () => {
    expect(sanitizeString("JaVaScRiPt:alert(1)")).toBe("alert(1)");
  });

  it("should handle multiple event handlers", () => {
    expect(sanitizeString("onclick=test onmouseover=foo")).toBe("test foo");
  });

  it("should handle whitespace variations", () => {
    expect(sanitizeString("  \t\n  test  \n\t  ")).toBe("test");
  });
});

describe("isValidEmail - additional coverage", () => {
  it("should reject emails with spaces", () => {
    expect(isValidEmail("user @example.com")).toBe(false);
    expect(isValidEmail("user@ example.com")).toBe(false);
  });

  it("should reject emails with special characters", () => {
    expect(isValidEmail("user@example!.com")).toBe(false);
    expect(isValidEmail("user@exam ple.com")).toBe(false);
  });

  it("should accept emails with subdomains", () => {
    expect(isValidEmail("user@sub.example.com")).toBe(true);
    expect(isValidEmail("user@deep.sub.example.com")).toBe(true);
  });

  it("should accept emails with numbers", () => {
    expect(isValidEmail("user123@example.com")).toBe(true);
    expect(isValidEmail("user@example123.com")).toBe(true);
  });

  it("should reject emails without TLD", () => {
    expect(isValidEmail("user@localhost")).toBe(false);
    expect(isValidEmail("user@example")).toBe(false);
  });
});
