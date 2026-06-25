"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  LoadingSpinner,
} from "@repo/ui";
import { registerSchema, type RegisterInput } from "@/lib/schemas";
import { registerUser } from "./actions";
import { PasswordStrength } from "./password-strength";
import { PasswordInput } from "./password-input";

export const RegisterForm = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onChange",
  });

  const password = form.watch("password");

  const onSubmit = async (data: RegisterInput) => {
    setIsSubmitting(true);
    setError("");

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("email", data.email);
    formData.append("password", data.password);
    formData.append("confirmPassword", data.confirmPassword);

    const result = await registerUser(formData);

    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      router.push("/dashboard");
      router.refresh();
    }

    setIsSubmitting(false);
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary">
          <svg
            className="h-6 w-6 text-primary-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        </div>
        <CardTitle className="text-2xl font-bold">Создать аккаунт</CardTitle>
        <p className="text-sm text-muted-foreground">
          Заполните форму для регистрации
        </p>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Имя</Label>
            <Input
              id="name"
              placeholder="Иван Иванов"
              autoComplete="name"
              disabled={isSubmitting}
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              disabled={isSubmitting}
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <PasswordInput
              id="password"
              label="Пароль"
              placeholder="••••••••"
              register={form.register("password")}
              error={form.formState.errors.password?.message}
            />
            <PasswordStrength password={password} />
          </div>

          <div className="space-y-2">
            <PasswordInput
              id="confirmPassword"
              label="Подтвердите пароль"
              placeholder="••••••••"
              register={form.register("confirmPassword")}
              error={form.formState.errors.confirmPassword?.message}
            />
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !form.formState.isValid}
          >
            {isSubmitting ? (
              <>
                <LoadingSpinner />
                Регистрация...
              </>
            ) : (
              "Зарегистрироваться"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link href="/login" className="text-primary hover:underline">
            Уже есть аккаунт? Войти
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};
