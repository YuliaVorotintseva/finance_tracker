import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["income", "expense", "subscription", "transfer"],
  }).notNull(),
  color: text("color").notNull().default("#6366f1"),
  icon: text("icon"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bankConnections = pgTable("bank_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  institutionId: text("institution_id").notNull(),
  institutionName: text("institution_name").notNull(),
  encryptedAccessToken: text("encrypted_access_token").notNull(),
  encryptedRefreshToken: text("encrypted_refresh_token"),
  status: text("status", { enum: ["active", "expired", "error"] })
    .default("active")
    .notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bankAccounts = pgTable(
  "bank_accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    connectionId: uuid("connection_id")
      .notNull()
      .references(() => bankConnections.id, { onDelete: "cascade" }),
    externalAccountId: text("external_account_id").notNull(),
    name: text("name"),
    iban: text("iban"),
    currency: text("currency").notNull(),
    currentBalance: numeric("current_balance", { precision: 14, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    externalIdIdx: uniqueIndex("bank_accounts_external_idx").on(
      table.connectionId,
      table.externalAccountId,
    ),
  }),
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => bankAccounts.id, { onDelete: "cascade" }),
    externalTransactionId: text("external_transaction_id").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull(),
    bookedAt: timestamp("booked_at", { mode: "date" }).notNull(),
    valueDate: timestamp("value_date", { mode: "date" }).notNull(),
    description: text("description").notNull(),
    merchantName: text("merchant_name"),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    isPending: boolean("is_pending").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    // КРИТИЧНО: защита от дублей при повторной синхронизации
    externalTxIdx: uniqueIndex("transactions_external_idx").on(
      table.accountId,
      table.externalTransactionId,
    ),
    dateIdx: index("transactions_date_idx").on(table.accountId, table.bookedAt),
    categoryIdx: index("transactions_category_idx").on(table.categoryId),
  }),
);
