import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { router, protectedProcedure } from "../trpc";
import { transactions } from "@repo/db/schema";
import {
  parseCsv,
  importAllTransactions,
  BANK_PRESETS,
  ColumnMappingSchema,
} from "../utils/csv-parser";
import { serializeDates } from "../utils/date";

export const importRouter = router({
  getBankPresets: protectedProcedure.query(() => {
    return Object.entries(BANK_PRESETS).map(([key, preset]) => ({
      key,
      name: preset.name,
      delimiter: preset.delimiter,
    }));
  }),

  parse: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        bankPreset: z
          .enum(["sberbank", "tinkoff", "alfa", "vtb", "custom"])
          .optional(),
        delimiter: z.string().optional(),
        skipRows: z.number().min(0).optional(),
        columnMapping: ColumnMappingSchema.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        let options: Parameters<typeof parseCsv>[1] = {};

        if (input.bankPreset && input.bankPreset !== "custom") {
          const preset = BANK_PRESETS[input.bankPreset];
          options = {
            delimiter: preset.delimiter,
            skipRows: preset.skipRows,
            columnMapping: Object.fromEntries(
              Object.entries(preset.columnMapping).filter(
                ([_, v]) => v !== null,
              ),
            ) as any,
          };
        }

        if (input.delimiter) options.delimiter = input.delimiter;
        if (input.skipRows !== undefined) options.skipRows = input.skipRows;
        if (input.columnMapping) options.columnMapping = input.columnMapping;

        const result = parseCsv(input.content, options);

        return serializeDates({
          headers: result.headers,
          preview: result.preview,
          totalRows: result.totalRows,
          delimiter: result.delimiter,
          detectedColumns: result.headers,
        });
      } catch (error) {
        console.error("CSV parse error:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error ? error.message : "Failed to parse CSV",
        });
      }
    }),

  import: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        bankPreset: z
          .enum(["sberbank", "tinkoff", "alfa", "vtb", "custom"])
          .optional(),
        delimiter: z.string().optional(),
        skipRows: z.number().min(0).optional(),
        columnMapping: ColumnMappingSchema,
        categoryId: z.string().uuid().optional(),
        skipDuplicates: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const options: {
          delimiter?: string;
          skipRows?: number;
          columnMapping: any;
        } = {
          columnMapping: input.columnMapping,
        };

        if (input.bankPreset && input.bankPreset !== "custom") {
          const preset = BANK_PRESETS[input.bankPreset];
          options.delimiter = preset.delimiter;
          options.skipRows = preset.skipRows;
        }

        if (input.delimiter) options.delimiter = input.delimiter;
        if (input.skipRows !== undefined) options.skipRows = input.skipRows;

        const parsedTransactions = importAllTransactions(
          input.content,
          options,
        );

        if (parsedTransactions.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Не удалось распознать ни одной транзакции. Проверьте маппинг колонок.",
          });
        }

        let imported = 0;
        let skipped = 0;
        const errors: { row: number; message: string }[] = [];

        for (let i = 0; i < parsedTransactions.length; i++) {
          const tx = parsedTransactions[i];

          try {
            if (input.skipDuplicates) {
              const existing = await ctx.db.query.transactions.findFirst({
                where: and(
                  eq(transactions.userId, ctx.user.id),
                  eq(transactions.occurredAt, tx!.date),
                  eq(transactions.amount, tx!.amount),
                  eq(transactions.description, tx!.description || ""),
                ),
              });

              if (existing) {
                skipped++;
                continue;
              }
            }

            await ctx.db.insert(transactions).values({
              userId: ctx.user.id,
              amount: tx!.amount,
              currency: tx!.currency,
              type: tx!.type,
              occurredAt: tx!.date,
              description: tx!.description,
              merchantName: tx!.merchantName || null,
              categoryId: input.categoryId || null,
              source: "manual",
            });

            imported++;
          } catch (error) {
            errors.push({
              row: i + 1,
              message: error instanceof Error ? error.message : "Unknown error",
            });
          }
        }

        return {
          imported,
          skipped,
          errors,
          total: parsedTransactions.length,
        };
      } catch (error) {
        console.error("Import error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to import transactions",
        });
      }
    }),
});
