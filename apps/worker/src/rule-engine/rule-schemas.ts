import { z } from 'zod';

import type { RuleCondition } from '@repo/db/schema';

export const RuleConditionSchema: z.ZodType<RuleCondition> = z.object({
  field: z.enum(['description', 'merchantName', 'amount']),
  operator: z.enum([
    'contains',
    'equals',
    'greater_than',
    'less_than',
    'regex',
  ]),
  value: z.union([z.string(), z.number()]),
});

export const RuleSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  priority: z.number().int().min(0),
  conditions: z.array(RuleConditionSchema).min(1),
  logic: z.enum(['AND', 'OR']).default('AND'),
  targetCategoryId: z.string().uuid(),
});

export type Rule = z.infer<typeof RuleSchema>;

export const TransactionForRuleSchema = z.object({
  id: z.string().uuid(),
  description: z.string(),
  merchantName: z.string().nullable(),
  amount: z.string(),
  type: z.enum(['income', 'expense', 'transfer']),
});

export type TransactionForRule = z.infer<typeof TransactionForRuleSchema>;
