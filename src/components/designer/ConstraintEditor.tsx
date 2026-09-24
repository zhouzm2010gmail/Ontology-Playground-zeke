import type { ChangeEvent } from 'react';
import type { Property, PropertyConstraint } from '../../data/ontology';
import { Plus, Trash2 } from 'lucide-react';

interface ConstraintEditorProps {
  property: Property;
  onChange: (updates: Partial<Property>) => void;
}

export function ConstraintEditor({ property, onChange }: ConstraintEditorProps) {
  const constraints = property.constraints || [];

  const handleToggleRequired = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ isRequired: e.target.checked });
  };

  const handleAddConstraint = () => {
    const newConstraint: PropertyConstraint = {
      id: `cst-${Date.now()}`,
      name: '新规则',
      type: property.type === 'string' ? 'pattern' : 'range',
      severity: 'error',
      message: '请满足数据质量约束',
      ...(property.type === 'string'
        ? { pattern: '' }
        : { range: { min: 0 } }),
    };
    onChange({ constraints: [...constraints, newConstraint] });
  };

  const handleUpdateConstraint = (index: number, updates: Partial<PropertyConstraint>) => {
    const next = [...constraints];
    next[index] = { ...next[index], ...updates };
    onChange({ constraints: next });
  };

  const handleRemoveConstraint = (index: number) => {
    onChange({ constraints: constraints.filter((_, idx) => idx !== index) });
  };

  return (
    <div className="designer-constraint-box">
      <div className="designer-constraint-header">
        <label className="designer-checkbox-label">
          <input
            type="checkbox"
            checked={!!property.isRequired}
            onChange={handleToggleRequired}
          />
          <span style={{ fontWeight: 600 }}>设为必填属性 (Required)</span>
        </label>

        <button
          type="button"
          className="designer-add-btn small"
          onClick={handleAddConstraint}
        >
          <Plus size={11} /> 添加校验规则
        </button>
      </div>

      {constraints.length === 0 ? (
        <div className="designer-field-hint" style={{ marginTop: 6 }}>
          暂无自定义校验规则，点击“添加校验规则”配置数据契约。
        </div>
      ) : (
        <div className="designer-constraint-list">
          {constraints.map((c, idx) => (
            <div key={c.id || idx} className="designer-constraint-item">
              <div className="designer-form-row">
                <input
                  type="text"
                  className="designer-input-sm"
                  placeholder="规则名称"
                  value={c.name || ''}
                  onChange={(e) => handleUpdateConstraint(idx, { name: e.target.value })}
                  style={{ flex: 1.2 }}
                />

                <select
                  className="designer-select-sm"
                  value={c.type}
                  onChange={(e) =>
                    handleUpdateConstraint(idx, {
                      type: e.target.value as PropertyConstraint['type'],
                    })
                  }
                  style={{ flex: 1 }}
                >
                  <option value="range">数值范围 (Range)</option>
                  <option value="pattern">正则表达式 (Pattern)</option>
                  <option value="length">字符长度 (Length)</option>
                  <option value="custom">自定义 (Custom)</option>
                </select>

                <select
                  className="designer-select-sm"
                  value={c.severity}
                  onChange={(e) =>
                    handleUpdateConstraint(idx, {
                      severity: e.target.value as PropertyConstraint['severity'],
                    })
                  }
                  style={{ flex: 0.9 }}
                >
                  <option value="error">🔴 阻断 (Error)</option>
                  <option value="warning">🟡 警告 (Warning)</option>
                  <option value="info">🔵 提示 (Info)</option>
                </select>

                <button
                  type="button"
                  className="designer-delete-btn small"
                  onClick={() => handleRemoveConstraint(idx)}
                  title="删除规则"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* 规则类型具体配置 */}
              {c.type === 'range' && (
                <div className="designer-form-row" style={{ marginTop: 4 }}>
                  <input
                    type="number"
                    className="designer-input-sm"
                    placeholder="最小值 (Min)"
                    value={c.range?.min ?? ''}
                    onChange={(e) =>
                      handleUpdateConstraint(idx, {
                        range: {
                          ...c.range,
                          min: e.target.value === '' ? undefined : Number(e.target.value),
                        },
                      })
                    }
                  />
                  <input
                    type="number"
                    className="designer-input-sm"
                    placeholder="最大值 (Max)"
                    value={c.range?.max ?? ''}
                    onChange={(e) =>
                      handleUpdateConstraint(idx, {
                        range: {
                          ...c.range,
                          max: e.target.value === '' ? undefined : Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              )}

              {c.type === 'pattern' && (
                <div style={{ marginTop: 4 }}>
                  <input
                    type="text"
                    className="designer-input-sm"
                    placeholder="正则表达式 (例如: ^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$)"
                    value={c.pattern || ''}
                    onChange={(e) => handleUpdateConstraint(idx, { pattern: e.target.value })}
                  />
                </div>
              )}

              {c.type === 'length' && (
                <div className="designer-form-row" style={{ marginTop: 4 }}>
                  <input
                    type="number"
                    className="designer-input-sm"
                    placeholder="最小字符数 (Min Length)"
                    value={c.length?.min ?? ''}
                    onChange={(e) =>
                      handleUpdateConstraint(idx, {
                        length: {
                          ...c.length,
                          min: e.target.value === '' ? undefined : Number(e.target.value),
                        },
                      })
                    }
                  />
                  <input
                    type="number"
                    className="designer-input-sm"
                    placeholder="最大字符数 (Max Length)"
                    value={c.length?.max ?? ''}
                    onChange={(e) =>
                      handleUpdateConstraint(idx, {
                        length: {
                          ...c.length,
                          max: e.target.value === '' ? undefined : Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>
              )}

              {c.type === 'custom' && (
                <div style={{ marginTop: 4 }}>
                  <input
                    type="text"
                    className="designer-input-sm"
                    placeholder="自定义表达式校验逻辑"
                    value={c.customExpression || ''}
                    onChange={(e) =>
                      handleUpdateConstraint(idx, { customExpression: e.target.value })
                    }
                  />
                </div>
              )}

              {/* 错误提示消息 */}
              <div style={{ marginTop: 4 }}>
                <input
                  type="text"
                  className="designer-input-sm"
                  placeholder="未满足校验时的错误提示消息 (Message)"
                  value={c.message || ''}
                  onChange={(e) => handleUpdateConstraint(idx, { message: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
