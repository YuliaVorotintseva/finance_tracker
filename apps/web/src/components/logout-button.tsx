"use client";

import { signOut } from "next-auth/react";

import { Button } from "@repo/ui";

export const LogoutButton = () => {
  return (
    <Button
      variant="ghost"
      className="hover:bg-transparent hover:text-destructive"
      onClick={() => signOut({ callbackUrl: "/login" })}
    >
      Выйти
    </Button>
  );
};
