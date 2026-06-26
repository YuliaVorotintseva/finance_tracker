import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { eq, and, desc } from 'drizzle-orm';

import { db } from '@repo/db';
import {
  categorizationRules,
  transactions,
  RuleCondition,
} from '@repo/db/schema';

export interface CategorizeJobData {
  userId: string;
  transactionIds: string[];
}

@Injectable()
export class RuleEngineService {
  private readonly logger = new Logger(RuleEngineService.name);

  constructor(
    @InjectQueue('rule-engine')
    private readonly ruleEngineQueue: Queue<CategorizeJobData>,
  ) {}

  async categorizeTransactions(
    userId: string,
    transactionIds: string[],
  ): Promise<void> {
    const rules = await db.query.categorizationRules.findMany({
      where: eq(categorizationRules.userId, userId),
      orderBy: [desc(categorizationRules.priority)],
    });

    if (rules.length === 0) {
      this.logger.log(`No rules found for user ${userId}`);
      return;
    }

    const uncategorizedTransactions = await db.query.transactions.findMany({
      where: and(
        eq(transactions.userId, userId),
        ...transactionIds.map((id) => eq(transactions.id, id)),
      ),
    });

    let categorizedCount = 0;

    for (const transaction of uncategorizedTransactions) {
      const matchedRule = this.findMatchingRule(rules, transaction);

      if (matchedRule) {
        await db
          .update(transactions)
          .set({ categoryId: matchedRule.targetCategoryId })
          .where(eq(transactions.id, transaction.id));

        categorizedCount++;
        this.logger.log(
          `Categorized transaction ${transaction.id} with rule ${matchedRule.id}`,
        );
      }
    }

    this.logger.log(
      `Categorized ${categorizedCount} of ${uncategorizedTransactions.length} transactions`,
    );
  }

  private findMatchingRule(rules: any[], transaction: any): any | null {
    for (const rule of rules) {
      const conditionsMet =
        rule.logic === 'AND'
          ? rule.conditions.every((condition: RuleCondition) =>
              this.evaluateCondition(condition, transaction),
            )
          : rule.conditions.some((condition: RuleCondition) =>
              this.evaluateCondition(condition, transaction),
            );

      if (conditionsMet) {
        return rule;
      }
    }

    return null;
  }

  private evaluateCondition(
    condition: RuleCondition,
    transaction: any,
  ): boolean {
    let fieldValue: string | number | null;

    switch (condition.field) {
      case 'description':
        fieldValue = transaction.description;
        break;
      case 'merchantName':
        fieldValue = transaction.merchantName;
        break;
      case 'amount':
        fieldValue = parseFloat(transaction.amount);
        break;
      default:
        return false;
    }

    if (fieldValue === null) return false;

    switch (condition.operator) {
      case 'contains':
        return String(fieldValue)
          .toLowerCase()
          .includes(String(condition.value).toLowerCase());
      case 'equals':
        return String(fieldValue) === String(condition.value);
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'regex':
        try {
          const regex = new RegExp(condition.value as string, 'i');
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  async scheduleCategorization(
    userId: string,
    transactionIds: string[],
  ): Promise<void> {
    await this.ruleEngineQueue.add(
      'categorize-transactions',
      {
        userId,
        transactionIds,
      },
      {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 500,
        },
      },
    );
  }
}
