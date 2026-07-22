"use client";

import { useEffect } from "react";

import { Button, Card, CardContent } from "@repo/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardContent className="p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2">Error occurred</h2>
          <p className="text-muted-foreground mb-4">
            We're already working on a fix. Please try again.
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={reset}>Try again</Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/dashboard")}
            >
              To the main page
            </Button>
          </div>
          {process.env.NODE_ENV === "development" && (
            <details className="mt-4 text-left text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                {error.message}
                {"\n"}
                {error.stack}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
