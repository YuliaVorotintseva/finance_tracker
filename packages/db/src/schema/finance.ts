import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  boolean,
  index,
  uniqueIndex,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
]);

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
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
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
  lastSyncedAt: timestamp("last_synced_at", { mode: "string" }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
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
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
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
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    accountId: uuid("account_id").references(() => bankAccounts.id, {
      onDelete: "set null",
    }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),

    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("RUB"),
    type: transactionTypeEnum("type").notNull(),

    occurredAt: timestamp("occurred_at", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),

    description: text("description"),
    merchantName: text("merchant_name"),
    notes: text("notes"),

    source: text("source", { enum: ["manual", "bank_sync"] })
      .default("manual")
      .notNull(),
    isPending: boolean("is_pending").default(false).notNull(),
  },
  (table) => ({
    userDateIdx: index("transactions_user_date_idx").on(
      table.userId,
      table.occurredAt,
    ),
    categoryIdx: index("transactions_category_idx").on(table.categoryId),
    typeIdx: index("transactions_type_idx").on(table.type),
  }),
);

export const categorizationRules = pgTable(
  "categorization_rules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    priority: numeric("priority").notNull().default("0"), // Чем выше число, тем раньше проверяется
    isActive: boolean("is_active").default(true).notNull(),

    conditions: jsonb("conditions").$type<RuleCondition[]>().notNull(),

    // Логика применения условий
    logic: text("logic", { enum: ["AND", "OR"] })
      .default("AND")
      .notNull(),

    targetCategoryId: uuid("target_category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),

    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => ({
    userIdx: index("categorization_rules_user_idx").on(table.userId),
    categoryIdx: index("categorization_rules_category_idx").on(
      table.targetCategoryId,
    ),
  }),
);

export interface RuleCondition {
  field: "description" | "merchantName" | "amount";
  operator: "contains" | "equals" | "greater_than" | "less_than" | "regex";
  value: string | number;
}
