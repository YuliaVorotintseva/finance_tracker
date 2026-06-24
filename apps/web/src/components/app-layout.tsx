"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@repo/ui";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Дашборд" },
  { href: "/transactions", label: "Транзакции" },
  { href: "/categories", label: "Категории" },
];

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center gap-6 px-6">
          <Link href="/dashboard" className="text-xl font-bold">
            Finance Tracker
          </Link>
          <div className="flex gap-4">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  pathname === item.href
                    ? "text-primary"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
};
