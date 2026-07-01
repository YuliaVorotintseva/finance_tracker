import { z } from "zod";

export interface ParsedTransaction {
  date: string;
  amount: string;
  currency: string;
  description: string;
  merchantName?: string;
  category?: string;
  type: "income" | "expense" | "transfer";
  raw: Record<string, string>;
}

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
  preview: ParsedTransaction[];
  totalRows: number;
  encoding: string;
  delimiter: string;
}

export const BANK_PRESETS = {
  sberbank: {
    name: "Сбербанк",
    delimiter: ";",
    encoding: "windows-1251",
    skipRows: 1,
    columnMapping: {
      date: "Дата",
      amount: "Сумма",
      currency: "Валюта",
      description: "Описание",
      merchantName: "Получатель",
      type: null,
    },
  },
  tinkoff: {
    name: "Тинькофф",
    delimiter: ";",
    encoding: "utf-8",
    skipRows: 0,
    columnMapping: {
      date: "Дата операции",
      amount: "Сумма операции",
      currency: "Валюта операции",
      description: "Описание",
      merchantName: "Категория",
      type: null,
    },
  },
  alfa: {
    name: "Альфа-Банк",
    delimiter: ";",
    encoding: "utf-8",
    skipRows: 0,
    columnMapping: {
      date: "Дата",
      amount: "Сумма",
      currency: "Валюта",
      description: "Назначение платежа",
      merchantName: "Контрагент",
      type: null,
    },
  },
  vtb: {
    name: "ВТБ",
    delimiter: ";",
    encoding: "windows-1251",
    skipRows: 0,
    columnMapping: {
      date: "Дата проводки",
      amount: "Сумма в валюте счета",
      currency: "Валюта",
      description: "Описание",
      merchantName: "Контрагент",
      type: null,
    },
  },
  custom: {
    name: "Другой банк",
    delimiter: ",",
    encoding: "utf-8",
    skipRows: 0,
    columnMapping: {
      date: null,
      amount: null,
      currency: null,
      description: null,
      merchantName: null,
      type: null,
    },
  },
} as const;

export type BankPresetKey = keyof typeof BANK_PRESETS;

export const ColumnMappingSchema = z.object({
  date: z.string(),
  amount: z.string(),
  currency: z.string().optional(),
  description: z.string().optional(),
  merchantName: z.string().optional(),
  type: z.string().optional(),
});

export type ColumnMapping = z.infer<typeof ColumnMappingSchema>;

const detectDelimiter = (text: string): string => {
  const firstLine = text.split("\n")[0] || "";
  const counts = {
    ",": (firstLine.match(/,/g) || []).length,
    ";": (firstLine.match(/;/g) || []).length,
    "\t": (firstLine.match(/\t/g) || []).length,
  };

  return Object.entries(counts).reduce((a, b) => (a[1] > b[1] ? a : b))[0];
};

const parseCsvLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
};

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  const cleaned = dateStr.trim();

  // DD.MM.YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    // UTC
    return new Date(
      Date.UTC(parseInt(year!), parseInt(month!) - 1, parseInt(day!)),
    );
  }

  // YYYY-MM-DD
  const ymdMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return new Date(
      Date.UTC(parseInt(year!), parseInt(month!) - 1, parseInt(day!)),
    );
  }

  // DD/MM/YYYY
  const dmySlashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmySlashMatch) {
    const [, day, month, year] = dmySlashMatch;
    return new Date(
      Date.UTC(parseInt(year!), parseInt(month!) - 1, parseInt(day!)),
    );
  }

  const date = new Date(cleaned);
  if (!isNaN(date.getTime())) return date;

  return null;
}

const parseAmount = (
  amountStr: string,
): {
  value: string;
  type: "income" | "expense";
} | null => {
  if (!amountStr) return null;

  let cleaned = amountStr.replace(/[^\d.,\-+]/g, "").trim();

  if (!cleaned) return null;

  let type: "income" | "expense" = "expense";
  if (cleaned.startsWith("+") || cleaned.startsWith("-")) {
    type = cleaned.startsWith("+") ? "income" : "expense";
    cleaned = cleaned.slice(1);
  }

  cleaned = cleaned.replace(",", ".");

  const value = parseFloat(cleaned);
  if (isNaN(value)) return null;

  if (value < 0) {
    type = "expense";
    return { value: Math.abs(value).toFixed(2), type };
  }

  return { value: Math.abs(value).toFixed(2), type };
};

const detectCurrency = (
  currencyStr: string | undefined,
  amountStr: string,
): string => {
  if (currencyStr) {
    const upper = currencyStr.trim().toUpperCase();
    if (["RUB", "USD", "EUR", "GBP", "BYN", "KZT", "UAH"].includes(upper)) {
      return upper;
    }
    if (upper.includes("РУБ")) return "RUB";
    if (upper.includes("USD") || upper.includes("$")) return "USD";
    if (upper.includes("EUR") || upper.includes("€")) return "EUR";
  }

  if (amountStr.includes("₽") || amountStr.includes("руб")) return "RUB";
  if (amountStr.includes("$")) return "USD";
  if (amountStr.includes("€")) return "EUR";

  return "RUB";
};

export function parseCsv(
  content: string,
  options: {
    delimiter?: string;
    skipRows?: number;
    columnMapping?: ColumnMapping;
    previewLimit?: number;
  } = {},
): CsvParseResult {
  const { skipRows = 0, columnMapping, previewLimit = 10 } = options;

  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((line) => line.trim());

  if (lines.length === 0) {
    throw new Error("CSV файл пуст");
  }

  const dataLines = lines.slice(skipRows);

  if (dataLines.length === 0) {
    throw new Error("Нет данных для импорта после пропуска строк");
  }

  const delimiter = options.delimiter || detectDelimiter(dataLines[0]!);

  const headers = parseCsvLine(dataLines[0]!, delimiter);

  const rows: Record<string, string>[] = [];
  for (let i = 1; i < dataLines.length; i++) {
    const values = parseCsvLine(dataLines[i]!, delimiter);
    if (values.length === 0 || values.every((v) => !v)) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });
    rows.push(row);
  }

  const mapping = columnMapping || autoDetectMapping(headers);

  const preview: ParsedTransaction[] = [];
  const limit = Math.min(previewLimit, rows.length);

  for (let i = 0; i < limit; i++) {
    const row = rows[i];
    const parsed = mapRowToTransaction(row!, mapping);
    if (parsed) preview.push(parsed);
  }

  return {
    headers,
    rows,
    preview,
    totalRows: rows.length,
    encoding: "utf-8",
    delimiter,
  };
}

const autoDetectMapping = (headers: string[]): ColumnMapping => {
  const normalized = headers.map((h) => h.toLowerCase().trim());

  const findHeader = (keywords: string[]): string | null => {
    for (const keyword of keywords) {
      const index = normalized.findIndex((h) => h.includes(keyword));
      if (index !== -1) return headers[index] ?? null;
    }
    return null;
  };

  return {
    date:
      findHeader(["дата", "date", "дата проводки", "дата операции"]) ||
      headers[0]!,
    amount: findHeader(["сумма", "amount", "сумма в валюте"]) || headers[1]!,
    currency: findHeader(["валюта", "currency"]) || undefined,
    description:
      findHeader(["описание", "description", "назначение", "комментарий"]) ||
      undefined,
    merchantName:
      findHeader([
        "контрагент",
        "получатель",
        "merchant",
        "продавец",
        "категория",
      ]) || undefined,
    type: findHeader(["тип", "type", "доход/расход"]) || undefined,
  };
};

const mapRowToTransaction = (
  row: Record<string, string>,
  mapping: ColumnMapping,
): ParsedTransaction | null => {
  try {
    const dateStr = mapping.date ? row[mapping.date] : null;
    const amountStr = mapping.amount ? row[mapping.amount] : null;

    if (!dateStr || !amountStr) return null;

    const date = parseDate(dateStr);
    if (!date) return null;

    const parsedAmount = parseAmount(amountStr);
    if (!parsedAmount) return null;

    const currency = detectCurrency(
      mapping.currency ? row[mapping.currency] : undefined,
      amountStr,
    );

    const description = mapping.description
      ? row[mapping.description] || ""
      : "";
    const merchantName = mapping.merchantName
      ? row[mapping.merchantName] || undefined
      : undefined;

    let type: "income" | "expense" | "transfer" = parsedAmount.type;
    if (mapping.type && row[mapping.type]) {
      const typeStr = row[mapping.type]!.toLowerCase();
      if (
        typeStr.includes("доход") ||
        typeStr.includes("income") ||
        typeStr.includes("поступление")
      ) {
        type = "income";
      } else if (
        typeStr.includes("расход") ||
        typeStr.includes("expense") ||
        typeStr.includes("списание")
      ) {
        type = "expense";
      } else if (typeStr.includes("перевод") || typeStr.includes("transfer")) {
        type = "transfer";
      }
    }

    return {
      date: date.toISOString(),
      amount: parsedAmount.value,
      currency,
      description,
      merchantName,
      type,
      raw: row,
    };
  } catch (error) {
    console.error("Failed to parse row:", error, row);
    return null;
  }
};

export const importAllTransactions = (
  content: string,
  options: {
    delimiter?: string;
    skipRows?: number;
    columnMapping: ColumnMapping;
  },
): ParsedTransaction[] => {
  const result = parseCsv(content, {
    ...options,
    previewLimit: Infinity,
  });

  const transactions: ParsedTransaction[] = [];

  for (const row of result.rows) {
    const parsed = mapRowToTransaction(row, options.columnMapping);
    if (parsed) transactions.push(parsed);
  }

  return transactions;
};
