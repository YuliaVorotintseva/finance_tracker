import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;

  if (!key) {
    throw new Error(
      "ENCRYPTION_KEY environment variable is not set. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }

  if (key.length !== 64) {
    throw new Error(
      `ENCRYPTION_KEY must be 64 hex characters (32 bytes). Got ${key.length} characters.`,
    );
  }

  return Buffer.from(key, "hex");
}

export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty string");
  }

  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) {
    throw new Error("Cannot decrypt empty string");
  }

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error(
      "Invalid encrypted text format. Expected iv:authTag:ciphertext",
    );
  }

  const [ivHex, authTagHex, encrypted] = parts;

  try {
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex!, "hex");
    const authTag = Buffer.from(authTagHex!, "hex");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted!, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error: unknown) {
    console.error(error);
    throw new Error(
      "Failed to decrypt data. The data may be corrupted or the encryption key has changed.",
    );
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  if (!value) return false;
  const parts = value.split(":");
  return (
    parts.length === 3 &&
    parts[0]!.length === IV_LENGTH * 2 &&
    parts[1]!.length === AUTH_TAG_LENGTH * 2
  );
}
