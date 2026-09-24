import type { Ontology, EntityInstance, PropertyConstraint } from '../data/ontology';

export interface ValidationViolation {
  instanceId: string;
  entityTypeId: string;
  propertyName?: string;
  relationshipId?: string;
  constraintId: string;
  constraintName?: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  actualValue: unknown;
}

export interface ValidationReport {
  timestamp: string;
  totalInstancesChecked: number;
  violations: ValidationViolation[];
  summary: {
    totalViolations: number;
    errors: number;
    warnings: number;
    infos: number;
    passed: boolean;
  };
}

/**
 * 校验单项属性值是否符合属性约束
 */
export function validatePropertyValue(
  value: unknown,
  constraint: PropertyConstraint,
  propertyName: string
): { valid: boolean; message?: string } {
  // 空值不校验具体规则（由 isRequired 规则处理）
  if (value === null || value === undefined || value === '') {
    return { valid: true };
  }

  switch (constraint.type) {
    case 'range': {
      if (typeof value !== 'number' && isNaN(Number(value))) {
        return { valid: false, message: `属性 ${propertyName} 的值不是有效数字` };
      }
      const num = Number(value);
      if (constraint.range) {
        const { min, max, exclusiveMin, exclusiveMax } = constraint.range;
        if (min !== undefined) {
          if (exclusiveMin ? num <= min : num < min) {
            return { valid: false, message: constraint.message };
          }
        }
        if (max !== undefined) {
          if (exclusiveMax ? num >= max : num > max) {
            return { valid: false, message: constraint.message };
          }
        }
      }
      return { valid: true };
    }

    case 'pattern': {
      if (!constraint.pattern) return { valid: true };
      try {
        const regex = new RegExp(constraint.pattern);
        if (!regex.test(String(value))) {
          return { valid: false, message: constraint.message };
        }
      } catch {
        return { valid: true };
      }
      return { valid: true };
    }

    case 'length': {
      const len = String(value).length;
      if (constraint.length) {
        const { min, max } = constraint.length;
        if (min !== undefined && len < min) {
          return { valid: false, message: constraint.message };
        }
        if (max !== undefined && len > max) {
          return { valid: false, message: constraint.message };
        }
      }
      return { valid: true };
    }

    case 'custom':
      // 简单安全校验
      return { valid: true };

    default:
      return { valid: true };
  }
}

/**
 * 校验给定的一组实例数据是否满足本体契约约束
 */
export function validateInstances(
  ontology: Ontology,
  instances: EntityInstance[]
): ValidationReport {
  const violations: ValidationViolation[] = [];
  const entityTypeMap = new Map(ontology.entityTypes.map((e) => [e.id, e]));

  for (const inst of instances) {
    const entityType = entityTypeMap.get(inst.entityTypeId);
    if (!entityType) continue;

    for (const prop of entityType.properties) {
      const val = inst.values[prop.name];

      // 1. 必填约束校验
      if (prop.isRequired) {
        if (val === null || val === undefined || val === '') {
          violations.push({
            instanceId: inst.id,
            entityTypeId: inst.entityTypeId,
            propertyName: prop.name,
            constraintId: `req-${prop.name}`,
            constraintName: '必填约束',
            severity: 'error',
            message: `属性 "${prop.name}" 为必填项，当前值为空`,
            actualValue: val,
          });
        }
      }

      // 2. 自定义约束规则校验
      if (prop.constraints && prop.constraints.length > 0) {
        for (const c of prop.constraints) {
          const res = validatePropertyValue(val, c, prop.name);
          if (!res.valid) {
            violations.push({
              instanceId: inst.id,
              entityTypeId: inst.entityTypeId,
              propertyName: prop.name,
              constraintId: c.id,
              constraintName: c.name || c.type,
              severity: c.severity,
              message: res.message || c.message,
              actualValue: val,
            });
          }
        }
      }
    }
  }

  const errors = violations.filter((v) => v.severity === 'error').length;
  const warnings = violations.filter((v) => v.severity === 'warning').length;
  const infos = violations.filter((v) => v.severity === 'info').length;

  return {
    timestamp: new Date().toISOString(),
    totalInstancesChecked: instances.length,
    violations,
    summary: {
      totalViolations: violations.length,
      errors,
      warnings,
      infos,
      passed: errors === 0,
    },
  };
}
