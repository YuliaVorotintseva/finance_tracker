import { describe, it, expect } from 'vitest';

function evaluateCondition(
  condition: { field: string; operator: string; value: string | number },
  transaction: Record<string, any>,
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

  if (fieldValue === null || fieldValue === undefined) return false;

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
        return new RegExp(condition.value as string, 'i').test(
          String(fieldValue),
        );
      } catch {
        return false;
      }
    default:
      return false;
  }
}

describe('Rule Engine - evaluateCondition', () => {
  const transaction = {
    description: 'Покупка продуктов в Пятёрочке',
    merchantName: 'Пятёрочка',
    amount: '1500.50',
  };

  describe('contains operator', () => {
    it('should match when field contains value (case insensitive)', () => {
      expect(
        evaluateCondition(
          { field: 'description', operator: 'contains', value: 'пятёрочк' },
          transaction,
        ),
      ).toBe(true);
    });

    it('should not match when field does not contain value', () => {
      expect(
        evaluateCondition(
          { field: 'description', operator: 'contains', value: 'магнит' },
          transaction,
        ),
      ).toBe(false);
    });
  });

  describe('equals operator', () => {
    it('should match exact value', () => {
      expect(
        evaluateCondition(
          { field: 'merchantName', operator: 'equals', value: 'Пятёрочка' },
          transaction,
        ),
      ).toBe(true);
    });

    it('should not match different value', () => {
      expect(
        evaluateCondition(
          { field: 'merchantName', operator: 'equals', value: 'Магнит' },
          transaction,
        ),
      ).toBe(false);
    });
  });

  describe('greater_than operator', () => {
    it('should match when amount is greater', () => {
      expect(
        evaluateCondition(
          { field: 'amount', operator: 'greater_than', value: 1000 },
          transaction,
        ),
      ).toBe(true);
    });

    it('should not match when amount is less', () => {
      expect(
        evaluateCondition(
          { field: 'amount', operator: 'greater_than', value: 2000 },
          transaction,
        ),
      ).toBe(false);
    });
  });

  describe('less_than operator', () => {
    it('should match when amount is less', () => {
      expect(
        evaluateCondition(
          { field: 'amount', operator: 'less_than', value: 2000 },
          transaction,
        ),
      ).toBe(true);
    });
  });

  describe('regex operator', () => {
    it('should match regex pattern', () => {
      expect(
        evaluateCondition(
          { field: 'description', operator: 'regex', value: 'пятёрочк|магнит' },
          transaction,
        ),
      ).toBe(true);
    });

    it('should handle invalid regex gracefully', () => {
      expect(
        evaluateCondition(
          { field: 'description', operator: 'regex', value: '[invalid' },
          transaction,
        ),
      ).toBe(false);
    });
  });

  describe('null handling', () => {
    it('should return false for null field', () => {
      expect(
        evaluateCondition(
          { field: 'merchantName', operator: 'contains', value: 'test' },
          { ...transaction, merchantName: null },
        ),
      ).toBe(false);
    });
  });
});
