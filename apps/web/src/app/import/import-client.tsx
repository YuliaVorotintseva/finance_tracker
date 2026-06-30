"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  Input,
  Label,
  Badge,
} from "@repo/ui";
import { trpc } from "@/lib/trcp-client";

type Step = "upload" | "preview" | "mapping" | "importing" | "done";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
  total: number;
}

export function ImportClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [fileContent, setFileContent] = useState<string>("");
  const [, setFileName] = useState<string>("");
  const [bankPreset, setBankPreset] = useState<string>("custom");
  const [delimiter, setDelimiter] = useState<string>(";");
  const [skipRows, setSkipRows] = useState<number>(0);
  const [categoryId, setCategoryId] = useState<string>("");

  const [columnMapping, setColumnMapping] = useState({
    date: "",
    amount: "",
    currency: "",
    description: "",
    merchantName: "",
    type: "",
  });

  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [preview, setPreview] = useState<any[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const utils = trpc.useUtils();
  const { data: categories } = trpc.categories.list.useQuery();
  const parseMutation = trpc.import.parse.useMutation();
  const importMutation = trpc.import.import.useMutation();

  const handleFileUpload = useCallback(
    async (file: File) => {
      setFileName(file.name);

      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target?.result as string;
        setFileContent(content);

        const lowerName = file.name.toLowerCase();
        if (lowerName.includes("sber") || lowerName.includes("сбер")) {
          setBankPreset("sberbank");
        } else if (
          lowerName.includes("tinkoff") ||
          lowerName.includes("тинькофф")
        ) {
          setBankPreset("tinkoff");
        } else if (lowerName.includes("alfa") || lowerName.includes("альфа")) {
          setBankPreset("alfa");
        } else if (lowerName.includes("vtb") || lowerName.includes("втб")) {
          setBankPreset("vtb");
        }

        try {
          const result = await parseMutation.mutateAsync({
            content,
            bankPreset: bankPreset as any,
          });

          setDetectedHeaders(result.headers);
          setPreview(result.preview);
          setTotalRows(result.totalRows);
          setDelimiter(result.delimiter);

          const autoMapping: any = {};
          result.headers.forEach((h) => {
            const lower = h.toLowerCase();
            if (lower.includes("дата") || lower.includes("date"))
              autoMapping.date = h;
            if (lower.includes("сумма") || lower.includes("amount"))
              autoMapping.amount = h;
            if (lower.includes("валюта") || lower.includes("currency"))
              autoMapping.currency = h;
            if (lower.includes("описание") || lower.includes("description"))
              autoMapping.description = h;
            if (
              lower.includes("контрагент") ||
              lower.includes("получатель") ||
              lower.includes("merchant")
            ) {
              autoMapping.merchantName = h;
            }
          });

          setColumnMapping((prev) => ({ ...prev, ...autoMapping }));
          setStep("preview");
        } catch (error) {
          console.error("Parse error:", error);
          alert("Не удалось прочитать файл. Проверьте формат CSV.");
        }
      };

      reader.readAsText(file, "UTF-8");
    },
    [bankPreset, parseMutation],
  );

  const handleReparse = async () => {
    try {
      const result = await parseMutation.mutateAsync({
        content: fileContent,
        delimiter,
        skipRows,
        columnMapping,
      });

      setDetectedHeaders(result.headers);
      setPreview(result.preview);
      setTotalRows(result.totalRows);
    } catch (error) {
      console.error("Reparse error:", error);
      alert("Ошибка при повторном парсинге");
    }
  };

  const handleImport = async () => {
    setStep("importing");

    try {
      const result = await importMutation.mutateAsync({
        content: fileContent,
        delimiter,
        skipRows,
        columnMapping,
        categoryId: categoryId || undefined,
        skipDuplicates: true,
      });

      setImportResult(result);
      setStep("done");

      utils.transactions.list.invalidate();
      utils.transactions.getStats.invalidate();
    } catch (error) {
      console.error("Import error:", error);
      alert("Ошибка при импорте");
      setStep("preview");
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith(".csv") || file.type === "text/csv")) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload],
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Импорт транзакций</h1>
        <p className="text-muted-foreground mt-2">
          Загрузите CSV выписку из вашего банка
        </p>
      </div>

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle>Загрузите CSV файл</CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="border-2 border-dashed rounded-lg p-12 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
              <div className="text-4xl mb-4">📄</div>
              <p className="text-lg font-medium mb-2">
                Перетащите CSV файл сюда
              </p>
              <p className="text-sm text-muted-foreground">
                или нажмите для выбора файла
              </p>
            </div>

            <div className="mt-6">
              <Label>Выберите ваш банк (для автонастройки)</Label>
              <Select
                value={bankPreset}
                onChange={(e) => setBankPreset(e.target.value)}
                options={[
                  { value: "custom", label: "Другой банк" },
                  { value: "sberbank", label: "Сбербанк" },
                  { value: "tinkoff", label: "Тинькофф" },
                  { value: "alfa", label: "Альфа-Банк" },
                  { value: "vtb", label: "ВТБ" },
                ]}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {(step === "preview" || step === "mapping") && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Настройки импорта</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Разделитель</Label>
                  <Select
                    value={delimiter}
                    onChange={(e) => setDelimiter(e.target.value)}
                    options={[
                      { value: ";", label: "Точка с запятой (;)" },
                      { value: ",", label: "Запятая (,)" },
                      { value: "\t", label: "Табуляция" },
                    ]}
                  />
                </div>
                <div>
                  <Label>Пропустить строк</Label>
                  <Input
                    type="number"
                    min="0"
                    value={skipRows}
                    onChange={(e) => setSkipRows(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label>Категория по умолчанию</Label>
                  <Select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    options={[
                      { value: "", label: "Без категории" },
                      ...(categories || []).map((c) => ({
                        value: c.id,
                        label: c.name,
                      })),
                    ]}
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Маппинг колонок</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Дата *</Label>
                    <Select
                      value={columnMapping.date}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          date: e.target.value,
                        })
                      }
                      options={[
                        { value: "", label: "— не выбрано —" },
                        ...detectedHeaders.map((h) => ({ value: h, label: h })),
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Сумма *</Label>
                    <Select
                      value={columnMapping.amount}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          amount: e.target.value,
                        })
                      }
                      options={[
                        { value: "", label: "— не выбрано —" },
                        ...detectedHeaders.map((h) => ({ value: h, label: h })),
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Валюта</Label>
                    <Select
                      value={columnMapping.currency}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          currency: e.target.value,
                        })
                      }
                      options={[
                        { value: "", label: "— не выбрано —" },
                        ...detectedHeaders.map((h) => ({ value: h, label: h })),
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Описание</Label>
                    <Select
                      value={columnMapping.description}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          description: e.target.value,
                        })
                      }
                      options={[
                        { value: "", label: "— не выбрано —" },
                        ...detectedHeaders.map((h) => ({ value: h, label: h })),
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Мерчант</Label>
                    <Select
                      value={columnMapping.merchantName}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          merchantName: e.target.value,
                        })
                      }
                      options={[
                        { value: "", label: "— не выбрано —" },
                        ...detectedHeaders.map((h) => ({ value: h, label: h })),
                      ]}
                    />
                  </div>
                  <div>
                    <Label>Тип (доход/расход)</Label>
                    <Select
                      value={columnMapping.type}
                      onChange={(e) =>
                        setColumnMapping({
                          ...columnMapping,
                          type: e.target.value,
                        })
                      }
                      options={[
                        { value: "", label: "— авто (по знаку суммы) —" },
                        ...detectedHeaders.map((h) => ({ value: h, label: h })),
                      ]}
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleReparse}
                  disabled={!columnMapping.date || !columnMapping.amount}
                >
                  Обновить предпросмотр
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Предпросмотр</CardTitle>
                <Badge variant="secondary">Всего строк: {totalRows}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {preview.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Нет данных для предпросмотра. Проверьте настройки.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Дата</th>
                        <th className="px-3 py-2 text-left">Сумма</th>
                        <th className="px-3 py-2 text-left">Тип</th>
                        <th className="px-3 py-2 text-left">Описание</th>
                        <th className="px-3 py-2 text-left">Мерчант</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((tx, i) => (
                        <tr key={i} className="border-b">
                          <td className="px-3 py-2">
                            {new Date(tx.date).toLocaleDateString("ru-RU")}
                          </td>
                          <td
                            className={`px-3 py-2 font-semibold ${
                              tx.type === "income"
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {tx.type === "income" ? "+" : "-"}
                            {tx.amount} {tx.currency}
                          </td>
                          <td className="px-3 py-2">
                            <Badge
                              variant={
                                tx.type === "income" ? "default" : "secondary"
                              }
                            >
                              {tx.type === "income" ? "Доход" : "Расход"}
                            </Badge>
                          </td>
                          <td className="px-3 py-2">{tx.description || "—"}</td>
                          <td className="px-3 py-2">
                            {tx.merchantName || "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("upload")}>
              Назад
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                !columnMapping.date ||
                !columnMapping.amount ||
                preview.length === 0
              }
            >
              Импортировать {totalRows} транзакций
            </Button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-lg">Импортируем транзакции...</p>
          </CardContent>
        </Card>
      )}

      {step === "done" && importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Импорт завершен</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-3xl font-bold text-green-600">
                  {importResult.imported}
                </div>
                <p className="text-sm text-muted-foreground">Импортировано</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-3xl font-bold text-yellow-600">
                  {importResult.skipped}
                </div>
                <p className="text-sm text-muted-foreground">
                  Пропущено (дубликаты)
                </p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <div className="text-3xl font-bold text-red-600">
                  {importResult.errors.length}
                </div>
                <p className="text-sm text-muted-foreground">Ошибок</p>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Ошибки:</h3>
                <div className="max-h-40 overflow-y-auto text-sm">
                  {importResult.errors.slice(0, 10).map((err, i) => (
                    <div key={i} className="text-red-600">
                      Строка {err.row}: {err.message}
                    </div>
                  ))}
                  {importResult.errors.length > 10 && (
                    <div className="text-muted-foreground">
                      ... и еще {importResult.errors.length - 10} ошибок
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => router.push("/transactions")}>
                Перейти к транзакциям
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload");
                  setFileContent("");
                  setImportResult(null);
                }}
              >
                Импортировать еще
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
