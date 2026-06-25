"use server";

import { eq } from "drizzle-orm";

import { db } from "@repo/db";
import { users } from "@repo/db/schema";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/schemas";
import { signIn } from "@/lib/auth";

export async function registerUser(formData: FormData) {
  const data = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: "Некорректные данные",
      fields: parsed.error.flatten().fieldErrors,
    };
  }

  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
  });

  if (existingUser) {
    return { error: "Пользователь с таким email уже существует" };
  }

  const hashedPassword = await hashPassword(parsed.data.password);

  try {
    await db.insert(users).values({
      email: parsed.data.email,
      name: parsed.data.name,
      password: hashedPassword,
    });
  } catch (error) {
    console.error("Database error:", error);
    return { error: "Ошибка при создании пользователя" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
    return { success: true };
  } catch (error) {
    console.error("Sign in error:", error);
    return { error: "Ошибка при входе после регистрации" };
  }
}
