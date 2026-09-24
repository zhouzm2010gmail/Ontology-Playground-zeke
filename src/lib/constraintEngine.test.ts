import { describe, it, expect } from 'vitest';
import { validatePropertyValue, validateInstances } from './constraintEngine';
import { cosmicCoffeeOntology, sampleInstances, type PropertyConstraint } from '../data/ontology';

describe('constraintEngine', () => {
  describe('validatePropertyValue', () => {
    it('validates range constraints correctly', () => {
      const constraint: PropertyConstraint = {
        id: 'c1',
        type: 'range',
        severity: 'error',
        message: 'Must be between 0 and 100',
        range: { min: 0, max: 100 },
      };

      expect(validatePropertyValue(50, constraint, 'score').valid).toBe(true);
      expect(validatePropertyValue(0, constraint, 'score').valid).toBe(true);
      expect(validatePropertyValue(100, constraint, 'score').valid).toBe(true);

      expect(validatePropertyValue(-1, constraint, 'score').valid).toBe(false);
      expect(validatePropertyValue(101, constraint, 'score').valid).toBe(false);
    });

    it('validates pattern regex correctly', () => {
      const constraint: PropertyConstraint = {
        id: 'c2',
        type: 'pattern',
        severity: 'error',
        message: 'Invalid email format',
        pattern: '^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$',
      };

      expect(validatePropertyValue('test@example.com', constraint, 'email').valid).toBe(true);
      expect(validatePropertyValue('not-an-email', constraint, 'email').valid).toBe(false);
    });

    it('validates length constraint correctly', () => {
      const constraint: PropertyConstraint = {
        id: 'c3',
        type: 'length',
        severity: 'warning',
        message: 'Name length must be between 2 and 10',
        length: { min: 2, max: 10 },
      };

      expect(validatePropertyValue('Alice', constraint, 'name').valid).toBe(true);
      expect(validatePropertyValue('A', constraint, 'name').valid).toBe(false);
      expect(validatePropertyValue('VeryLongNameExceedingMax', constraint, 'name').valid).toBe(false);
    });
  });

  describe('validateInstances', () => {
    it('validates cosmicCoffeeOntology sampleInstances without errors', () => {
      const report = validateInstances(cosmicCoffeeOntology, sampleInstances);
      expect(report.summary.errors).toBe(0);
      expect(report.summary.passed).toBe(true);
    });

    it('detects violations on dirty sample data', () => {
      const dirtyInstances = [
        {
          id: 'cust-bad',
          entityTypeId: 'customer',
          values: {
            customerId: 'INVALID-ID', // 不符合 CUST-\d{3}
            name: 'A', // 长度小于2
            email: 'bad-email', // 邮箱格式非法
          },
        },
      ];

      const report = validateInstances(cosmicCoffeeOntology, dirtyInstances);
      expect(report.summary.passed).toBe(false);
      expect(report.summary.errors).toBeGreaterThan(0);
      expect(report.violations.some((v) => v.propertyName === 'email')).toBe(true);
    });
  });
});
