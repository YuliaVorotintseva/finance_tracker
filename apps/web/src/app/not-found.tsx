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
          <h2 className="text-xl font-bold mb-2">Page not found</h2>
          <p className="text-muted-foreground mb-4">
            The requested page does not exist or has been moved.
          </p>
          <Link href="/dashboard">
            <Button>To the main page</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
