import type { ComputedExpression, Ontology, Property } from '../../data/ontology';
import { Calculator, GitBranch, Split } from 'lucide-react';

interface ComputedPropertyEditorProps {
  property: Property;
  entityId: string;
  ontology: Ontology;
  onChange: (expression: ComputedExpression | undefined) => void;
}

export function ComputedPropertyEditor({
  property,
  entityId,
  ontology,
  onChange,
}: ComputedPropertyEditorProps) {
  const expr = property.expression || {
    type: 'aggregation',
    aggregation: {
      function: 'SUM',
      traversal: {
        relationshipId: '',
        direction: 'outgoing',
      },
      targetProperty: '',
    },
  };

  // 筛选与当前实体相关的关系
  const relatedRelationships = ontology.relationships.filter(
    (r) => r.from === entityId || r.to === entityId
  );

  const handleTypeChange = (type: ComputedExpression['type']) => {
    if (type === 'aggregation') {
      const firstRel = relatedRelationships[0];
      const dir = firstRel ? (firstRel.from === entityId ? 'outgoing' : 'incoming') : 'outgoing';
      onChange({
        type: 'aggregation',
        aggregation: {
          function: 'SUM',
          traversal: {
            relationshipId: firstRel ? firstRel.id : '',
            direction: dir,
          },
          targetProperty: '',
        },
      });
    } else if (type === 'conditional') {
      onChange({
        type: 'conditional',
        conditional: {
          condition: 'value >= 100',
          thenValue: 'VIP',
          elseValue: 'Regular',
        },
      });
    } else {
      onChange({
        type: 'formula',
        formula: '',
      });
    }
  };

  // 获取当前选中关系的目标实体
  const currentRelId = expr.aggregation?.traversal.relationshipId || (relatedRelationships[0]?.id ?? '');
  const selectedRel = ontology.relationships.find((r) => r.id === currentRelId);
  const targetEntityId = selectedRel
    ? selectedRel.from === entityId
      ? selectedRel.to
      : selectedRel.from
    : null;
  const targetEntity = ontology.entityTypes.find((e) => e.id === targetEntityId);

  return (
    <div className="designer-computed-box">
      <div className="designer-computed-tabs">
        <button
          type="button"
          className={`designer-tab-btn ${expr.type === 'aggregation' ? 'active' : ''}`}
          onClick={() => handleTypeChange('aggregation')}
        >
          <GitBranch size={12} />
          关系聚合 (Aggregation)
        </button>
        <button
          type="button"
          className={`designer-tab-btn ${expr.type === 'formula' ? 'active' : ''}`}
          onClick={() => handleTypeChange('formula')}
        >
          <Calculator size={12} />
          自身公式 (Formula)
        </button>
        <button
          type="button"
          className={`designer-tab-btn ${expr.type === 'conditional' ? 'active' : ''}`}
          onClick={() => handleTypeChange('conditional')}
        >
          <Split size={12} />
          条件判断 (Conditional)
        </button>
      </div>

      {expr.type === 'aggregation' && (
        <div className="designer-computed-form">
          <div className="designer-form-row">
            <label>
              <span>聚合函数</span>
              <select
                value={expr.aggregation?.function || 'SUM'}
                onChange={(e) =>
                  onChange({
                    ...expr,
                    aggregation: {
                      ...expr.aggregation!,
                      function: e.target.value as any,
                    },
                  })
                }
              >
                <option value="SUM">SUM (求和)</option>
                <option value="AVG">AVG (平均)</option>
                <option value="COUNT">COUNT (计数)</option>
                <option value="MIN">MIN (最小值)</option>
                <option value="MAX">MAX (最大值)</option>
              </select>
            </label>

            <label>
              <span>关联关系</span>
              <select
                value={currentRelId}
                onChange={(e) => {
                  const rel = ontology.relationships.find((r) => r.id === e.target.value);
                  const dir = rel && rel.from === entityId ? 'outgoing' : 'incoming';
                  onChange({
                    ...expr,
                    aggregation: {
                      ...expr.aggregation!,
                      traversal: {
                        relationshipId: e.target.value,
                        direction: dir,
                      },
                      targetProperty: '',
                    },
                  });
                }}
              >
                {relatedRelationships.length === 0 ? (
                  <option value="">当前实体无关联关系</option>
                ) : (
                  relatedRelationships.map((r) => {
                    const isOut = r.from === entityId;
                    const other = ontology.entityTypes.find((e) => e.id === (isOut ? r.to : r.from));
                    return (
                      <option key={r.id} value={r.id}>
                        {isOut ? '→' : '←'} {r.name} ({other?.name || other?.id})
                      </option>
                    );
                  })
                )}
              </select>
            </label>
          </div>

          {expr.aggregation?.function !== 'COUNT' && (
            <label className="designer-field-compact">
              <span>目标属性 (来自 {targetEntity?.name || '关联实体'})</span>
              <select
                value={expr.aggregation?.targetProperty || ''}
                onChange={(e) =>
                  onChange({
                    ...expr,
                    aggregation: {
                      ...expr.aggregation!,
                      targetProperty: e.target.value,
                    },
                  })
                }
              >
                <option value="">-- 选择目标属性 --</option>
                {targetEntity?.properties.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}

      {expr.type === 'formula' && (
        <div className="designer-computed-form">
          <label className="designer-field-compact">
            <span>数学/逻辑表达式 (可引用当前实体属性)</span>
            <input
              type="text"
              placeholder='例如: (price - costPrice) / price'
              value={expr.formula || ''}
              onChange={(e) =>
                onChange({
                  ...expr,
                  formula: e.target.value,
                })
              }
            />
          </label>
          <div className="designer-field-hint">
            支持基本运算符 <code>+</code>, <code>-</code>, <code>*</code>, <code>/</code> 及属性名称引用。
          </div>
        </div>
      )}

      {expr.type === 'conditional' && (
        <div className="designer-computed-form">
          <label className="designer-field-compact">
            <span>判断条件 (Condition)</span>
            <input
              type="text"
              placeholder='例如: totalLifetimeValue >= 3000'
              value={expr.conditional?.condition || ''}
              onChange={(e) =>
                onChange({
                  ...expr,
                  conditional: {
                    condition: e.target.value,
                    thenValue: expr.conditional?.thenValue || '',
                    elseValue: expr.conditional?.elseValue || '',
                  },
                })
              }
            />
          </label>
          <div className="designer-form-row">
            <label>
              <span>满足时值 (Then)</span>
              <input
                type="text"
                placeholder='例如: "Platinum"'
                value={expr.conditional?.thenValue || ''}
                onChange={(e) =>
                  onChange({
                    ...expr,
                    conditional: {
                      ...expr.conditional!,
                      thenValue: e.target.value,
                    },
                  })
                }
              />
            </label>
            <label>
              <span>不满足时值 (Else)</span>
              <input
                type="text"
                placeholder='例如: "Gold"'
                value={expr.conditional?.elseValue || ''}
                onChange={(e) =>
                  onChange({
                    ...expr,
                    conditional: {
                      ...expr.conditional!,
                      elseValue: e.target.value,
                    },
                  })
                }
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
