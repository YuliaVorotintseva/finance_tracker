"use client";

import { Component, type ReactNode } from "react";

import { Button, Card, CardContent } from "@repo/ui";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card className="m-4">
            <CardContent className="p-6 text-center">
              <h2 className="text-xl font-bold text-destructive mb-2">
                Something went wrong
              </h2>
              <p className="text-muted-foreground mb-4">
                {this.state.error?.message || "An unexpected error occurred"}
              </p>
              <Button onClick={() => window.location.reload()}>
                Reload page
              </Button>
            </CardContent>
          </Card>
        )
      );
    }

    return this.props.children;
  }
}
