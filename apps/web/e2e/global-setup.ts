import { type FullConfig } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "../.env") });

import { db } from "@repo/db";
import { users } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function globalSetup(_: FullConfig) {
  const TEST_EMAIL = "test@example.com";
  const TEST_PASSWORD = "Password123!";

  try {
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, TEST_EMAIL),
    });

    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 12);

      await db.insert(users).values({
        email: TEST_EMAIL,
        name: "Test User",
        password: hashedPassword,
      });

      console.log("Test user created:", TEST_EMAIL);
    } else {
      console.log("Test user already exists:", TEST_EMAIL);
    }
  } catch (error) {
    console.error("Failed to create test user:", error);
    throw error;
  }
}

export default globalSetup;
