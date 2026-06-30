"use client";

import { useState } from "react";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from "@repo/ui";
import { trpc } from "@/lib/trcp-client";

export function BankConnections() {
  const utils = trpc.useUtils();
  const [isConnecting, setIsConnecting] = useState(false);

  const { data: connections, isLoading } = trpc.bankConnections.list.useQuery();

  const deleteMutation = trpc.bankConnections.delete.useMutation({
    onSuccess: () => utils.bankConnections.list.invalidate(),
  });

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      alert("Open API banking integration not yet implemented");
    } catch (error) {
      console.error("Failed to connect bank:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Банковские подключения</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p>Загрузка...</p>
        ) : connections?.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              У вас нет подключенных банковских аккаунтов
            </p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? "Подключение..." : "Подключить банк"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {connections?.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div>
                  <h3 className="font-semibold">
                    {connection.institutionName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant={
                        connection.status === "active" ? "default" : "secondary"
                      }
                    >
                      {connection.status}
                    </Badge>
                    {connection.lastSyncedAt && (
                      <span className="text-xs text-muted-foreground">
                        Синхронизирован:{" "}
                        {new Date(connection.lastSyncedAt).toLocaleString(
                          "ru-RU",
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteMutation.mutate({ id: connection.id })}
                  disabled={deleteMutation.isPending}
                >
                  Отключить
                </Button>
              </div>
            ))}
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? "Подключение..." : "Добавить ещё банк"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
