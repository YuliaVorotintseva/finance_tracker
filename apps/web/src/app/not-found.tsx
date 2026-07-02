"use client";

import Link from "next/link";

import { Button, Card, CardContent } from "@repo/ui";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center">
          <div className="text-6xl font-bold text-muted-foreground mb-4">
            404
          </div>
          <h2 className="text-xl font-bold mb-2">Страница не найдена</h2>
          <p className="text-muted-foreground mb-4">
            Запрашиваемая страница не существует или была перемещена.
          </p>
          <Link href="/dashboard">
            <Button>На главную</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
