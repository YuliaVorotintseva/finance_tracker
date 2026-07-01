import { describe, it, expect } from "vitest";
import { parseCsv, importAllTransactions, BANK_PRESETS } from "./csv-parser";

describe("CSV Parser", () => {
  describe("parseCsv - basic functionality", () => {
    it("should parse simple CSV with semicolon delimiter", () => {
      const csv = `Дата;Сумма;Валюта;Описание
01.01.2024;-1500.00;RUB;Пятёрочка
02.01.2024;50000.00;RUB;Зарплата`;

      const result = parseCsv(csv);

      expect(result.headers).toEqual(["Дата", "Сумма", "Валюта", "Описание"]);
      expect(result.totalRows).toBe(2);
      expect(result.delimiter).toBe(";");
    });

    it("should parse CSV with comma delimiter", () => {
      const csv = `date,amount,currency
2024-01-01,100.50,USD
2024-01-02,200.75,EUR`;

      const result = parseCsv(csv);

      expect(result.delimiter).toBe(",");
      expect(result.totalRows).toBe(2);
    });

    it("should parse CSV with tab delimiter", () => {
      const csv = `date\tamount
2024-01-01\t100
2024-01-02\t200`;

      const result = parseCsv(csv);

      expect(result.delimiter).toBe("\t");
    });

    it("should throw on empty CSV", () => {
      expect(() => parseCsv("")).toThrow("CSV файл пуст");
    });

    it("should throw when no data after skipRows", () => {
      const csv = `header1,header2`;
      expect(() => parseCsv(csv, { skipRows: 1 })).toThrow(
        "Нет данных для импорта",
      );
    });
  });

  describe("parseCsv - date formats", () => {
    it("should parse DD.MM.YYYY format", () => {
      const csv = `date,amount
15.01.2024,100`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.date).toMatch(/^2024-01-15/);
    });

    it("should parse YYYY-MM-DD format", () => {
      const csv = `date,amount
2024-01-15,100`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.date).toMatch(/^2024-01-15/);
    });

    it("should parse DD/MM/YYYY format", () => {
      const csv = `date,amount
15/01/2024,100`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.date).toMatch(/^2024-01-15/);
    });
  });

  describe("parseCsv - amount parsing", () => {
    it("should detect expense by negative sign", () => {
      const csv = `date,amount
2024-01-01,-1500.00`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.type).toBe("expense");
      expect(result.preview[0]!.amount).toBe("1500.00");
    });

    it("should detect income by positive sign", () => {
      const csv = `date,amount
2024-01-01,+50000.00`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.type).toBe("income");
      expect(result.preview[0]!.amount).toBe("50000.00");
    });

    it("should handle European decimal format (comma)", () => {
      const csv = `date;amount
01.01.2024;1 500,50`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.amount).toBe("1500.50");
    });

    it("should handle amount with spaces", () => {
      const csv = `date,amount
2024-01-01,"1 500 000.00"`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.amount).toBe("1500000.00");
    });
  });

  describe("parseCsv - currency detection", () => {
    it("should detect currency from column", () => {
      const csv = `date,amount,currency
2024-01-01,100,USD
2024-01-02,200,EUR`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.currency).toBe("USD");
      expect(result.preview[1]!.currency).toBe("EUR");
    });

    it("should detect RUB from Russian text", () => {
      const csv = `date,amount
2024-01-01,100 руб`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.currency).toBe("RUB");
    });

    it("should default to RUB when currency not detected", () => {
      const csv = `date,amount
2024-01-01,100`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.currency).toBe("RUB");
    });
  });

  describe("parseCsv - quoted fields", () => {
    it("should handle quoted fields with commas", () => {
      const csv = `name,description
"John","Hello, world"
"Jane","Test"`;

      const result = parseCsv(csv);

      expect(result.rows[0]!.description).toBe("Hello, world");
    });

    it("should handle escaped quotes", () => {
      const csv = `name,description
"John","Test ""quoted"" text"`;

      const result = parseCsv(csv);

      expect(result.rows[0]!.description).toBe('Test "quoted" text');
    });
  });

  describe("parseCsv - skipRows", () => {
    it("should skip specified number of rows", () => {
      const csv = `Информация о счете
Номер: 12345
Дата;Сумма
01.01.2024;100`;

      const result = parseCsv(csv, { skipRows: 2 });

      expect(result.headers).toEqual(["Дата", "Сумма"]);
      expect(result.totalRows).toBe(1);
    });
  });

  describe("parseCsv - column mapping", () => {
    it("should auto-detect columns by Russian names", () => {
      const csv = `Дата операции;Сумма операции;Валюта;Описание;Контрагент
01.01.2024;-100;RUB;Покупка;Магазин`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.amount).toBe("100.00");
      expect(result.preview[0]!.description).toBe("Покупка");
    });

    it("should auto-detect columns by English names", () => {
      const csv = `Date,Amount,Currency,Description,Merchant
2024-01-01,100,USD,Test,Store`;

      const result = parseCsv(csv);

      expect(result.preview[0]!.amount).toBe("100.00");
    });

    it("should use custom column mapping", () => {
      const csv = `col1,col2,col3
01.01.2024,100,test`;

      const result = parseCsv(csv, {
        columnMapping: {
          date: "col1",
          amount: "col2",
          description: "col3",
        },
      });

      expect(result.preview[0]!.amount).toBe("100.00");
      expect(result.preview[0]!.description).toBe("test");
    });
  });

  describe("parseCsv - preview limit", () => {
    it("should limit preview to specified number", () => {
      const csv = `date,amount
2024-01-01,100
2024-01-02,200
2024-01-03,300
2024-01-04,400
2024-01-05,500`;

      const result = parseCsv(csv, { previewLimit: 3 });

      expect(result.preview).toHaveLength(3);
      expect(result.totalRows).toBe(5);
    });
  });

  describe("parseCsv - bank presets", () => {
    it("should have correct Sberbank preset", () => {
      const preset = BANK_PRESETS.sberbank;

      expect(preset.delimiter).toBe(";");
      expect(preset.skipRows).toBe(1);
      expect(preset.columnMapping.date).toBe("Дата");
      expect(preset.columnMapping.amount).toBe("Сумма");
    });

    it("should have correct Tinkoff preset", () => {
      const preset = BANK_PRESETS.tinkoff;

      expect(preset.delimiter).toBe(";");
      expect(preset.skipRows).toBe(0);
      expect(preset.columnMapping.date).toBe("Дата операции");
    });

    it("should have correct Alfa preset", () => {
      const preset = BANK_PRESETS.alfa;

      expect(preset.delimiter).toBe(";");
      expect(preset.columnMapping.merchantName).toBe("Контрагент");
    });

    it("should have correct VTB preset", () => {
      const preset = BANK_PRESETS.vtb;

      expect(preset.encoding).toBe("windows-1251");
      expect(preset.columnMapping.date).toBe("Дата проводки");
    });
  });

  describe("parseCsv - type detection", () => {
    it("should detect type from column with Russian values", () => {
      const csv = `date,amount,type
2024-01-01,100,доход
2024-01-02,200,расход`;

      const result = parseCsv(csv, {
        columnMapping: {
          date: "date",
          amount: "amount",
          type: "type",
        },
      });

      expect(result.preview[0]!.type).toBe("income");
      expect(result.preview[1]!.type).toBe("expense");
    });

    it("should detect transfer type", () => {
      const csv = `date,amount,type
2024-01-01,100,перевод`;

      const result = parseCsv(csv, {
        columnMapping: {
          date: "date",
          amount: "amount",
          type: "type",
        },
      });

      expect(result.preview[0]!.type).toBe("transfer");
    });
  });

  describe("importAllTransactions", () => {
    it("should import all transactions", () => {
      const csv = `date,amount,currency,description
2024-01-01,100,RUB,test1
2024-01-02,200,RUB,test2
2024-01-03,300,RUB,test3`;

      const result = importAllTransactions(csv, {
        columnMapping: {
          date: "date",
          amount: "amount",
          currency: "currency",
          description: "description",
        },
      });

      expect(result).toHaveLength(3);
      expect(result[0]!.description).toBe("test1");
      expect(result[2]!.amount).toBe("300.00");
    });

    it("should skip invalid rows", () => {
      const csv = `date,amount
2024-01-01,100
invalid-date,200
2024-01-03,not-a-number`;

      const result = importAllTransactions(csv, {
        columnMapping: {
          date: "date",
          amount: "amount",
        },
      });

      expect(result).toHaveLength(1);
    });

    it("should handle empty result", () => {
      const csv = `date,amount`;

      const result = importAllTransactions(csv, {
        columnMapping: {
          date: "date",
          amount: "amount",
        },
      });

      expect(result).toHaveLength(0);
    });
  });
});
