import { Plus, Trash2, Shield } from 'lucide-react';
import { useDesignerStore } from '../../store/designerStore';
import type { Relationship, RelationshipConstraint } from '../../data/ontology';

const CARDINALITY_OPTIONS: Relationship['cardinality'][] = [
  'one-to-one', 'one-to-many', 'many-to-one', 'many-to-many',
];

const CARDINALITY_LABELS: Record<Relationship['cardinality'], string> = {
  'one-to-one': '1 : 1',
  'one-to-many': '1 : N',
  'many-to-one': 'N : 1',
  'many-to-many': 'N : N',
};

export function RelationshipForm() {
  const {
    ontology,
    selectedRelationshipId,
    addRelationship,
    updateRelationship,
    removeRelationship,
    selectRelationship,
    addRelationshipAttribute,
    updateRelationshipAttribute,
    removeRelationshipAttribute,
  } = useDesignerStore();

  const entities = ontology.entityTypes;

  const handleAdd = () => {
    if (entities.length < 1) return;
    // Default the target to a second entity when one exists; otherwise create a
    // self-referencing relationship on the only entity (Fabric supports these).
    const from = entities[0].id;
    const to = entities[1]?.id ?? entities[0].id;
    addRelationship(from, to);
  };

  return (
    <div className="designer-relationship-list">
      <div className="designer-section-header">
        <h3>Relationships ({ontology.relationships.length})</h3>
        <button
          className="designer-add-btn"
          onClick={handleAdd}
          disabled={entities.length < 1}
          title={entities.length < 1 ? 'Create at least one entity to add a relationship' : 'Add relationship'}
        >
          <Plus size={14} /> Add
        </button>
      </div>

      {ontology.relationships.length === 0 && (
        <div className="designer-empty">
          {entities.length < 1
            ? 'Create at least one entity first.'
            : 'No relationships yet. Click "Add" to create one.'}
        </div>
      )}

      {ontology.relationships.map((rel) => {
        const isSelected = selectedRelationshipId === rel.id;
        const fromEntity = entities.find((e) => e.id === rel.from);
        const toEntity = entities.find((e) => e.id === rel.to);

        return (
          <div
            key={rel.id}
            className={`designer-rel-card ${isSelected ? 'selected' : ''}`}
            onClick={() => selectRelationship(rel.id)}
          >
            <div className="designer-rel-header">
              <span className="designer-rel-flow">
                {fromEntity?.icon ?? '?'} {fromEntity?.name ?? '???'}
                <span className="designer-rel-arrow"> → </span>
                {toEntity?.icon ?? '?'} {toEntity?.name ?? '???'}
              </span>
              <button
                className="designer-delete-btn"
                onClick={(e) => { e.stopPropagation(); removeRelationship(rel.id); }}
                title="Delete relationship"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {isSelected && (
              <div className="designer-rel-body">
                {/* Name */}
                <label className="designer-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={rel.name}
                    onChange={(e) => updateRelationship(rel.id, { name: e.target.value })}
                    placeholder="Relationship name"
                  />
                </label>

                {/* Source / Target */}
                <div className="designer-field-row">
                  <label className="designer-field">
                    <span>From</span>
                    <select
                      value={rel.from}
                      onChange={(e) => updateRelationship(rel.id, { from: e.target.value })}
                    >
                      {entities.map((e) => (
                        <option key={e.id} value={e.id}>{e.icon} {e.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="designer-field">
                    <span>To</span>
                    <select
                      value={rel.to}
                      onChange={(e) => updateRelationship(rel.id, { to: e.target.value })}
                    >
                      {entities.map((e) => (
                        <option key={e.id} value={e.id}>{e.icon} {e.name}</option>
                      ))}
                    </select>
                  </label>
                </div>

                {/* Cardinality */}
                <label className="designer-field">
                  <span>Cardinality</span>
                  <select
                    value={rel.cardinality}
                    onChange={(e) =>
                      updateRelationship(rel.id, { cardinality: e.target.value as Relationship['cardinality'] })
                    }
                  >
                    {CARDINALITY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{CARDINALITY_LABELS[c]}</option>
                    ))}
                  </select>
                </label>

                {/* Description */}
                <label className="designer-field">
                  <span>Description</span>
                  <textarea
                    rows={2}
                    value={rel.description ?? ''}
                    onChange={(e) => updateRelationship(rel.id, { description: e.target.value })}
                    placeholder="Describe this relationship"
                  />
                </label>

                {/* Attributes */}
                <div className="designer-field">
                  <div className="designer-section-header">
                    <span>Attributes ({rel.attributes?.length ?? 0})</span>
                    <button
                      className="designer-add-btn small"
                      onClick={() => addRelationshipAttribute(rel.id)}
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {(rel.attributes ?? []).map((attr, idx) => (
                    <div key={idx} className="designer-property-row">
                      <input
                        className="designer-prop-name"
                        type="text"
                        value={attr.name}
                        onChange={(e) =>
                          updateRelationshipAttribute(rel.id, idx, { name: e.target.value })
                        }
                        placeholder="Attribute name"
                      />
                      <input
                        className="designer-prop-type"
                        type="text"
                        value={attr.type}
                        onChange={(e) =>
                          updateRelationshipAttribute(rel.id, idx, { type: e.target.value })
                        }
                        placeholder="Type"
                      />
                      <button
                        className="designer-delete-btn small"
                        onClick={() => removeRelationshipAttribute(rel.id, idx)}
                        title="Remove attribute"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Constraints */}
                <div className="designer-field">
                  <div className="designer-section-header">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <Shield size={12} />
                      Constraints ({rel.constraints?.length ?? 0})
                    </span>
                    <button
                      type="button"
                      className="designer-add-btn small"
                      onClick={() => {
                        const newCst: RelationshipConstraint = {
                          id: `rel-cst-${Date.now()}`,
                          name: '基数约束',
                          type: 'cardinality-exact',
                          severity: 'error',
                          message: '请满足关联基数契约',
                          cardinalityRange: { min: 1 },
                        };
                        updateRelationship(rel.id, {
                          constraints: [...(rel.constraints || []), newCst],
                        });
                      }}
                    >
                      <Plus size={12} /> Add Rule
                    </button>
                  </div>

                  <div className="designer-constraint-list" style={{ marginTop: 4 }}>
                    {(rel.constraints ?? []).map((c, idx) => (
                      <div key={c.id || idx} className="designer-constraint-item">
                        <div className="designer-form-row">
                          <input
                            type="text"
                            className="designer-input-sm"
                            placeholder="规则名称"
                            value={c.name || ''}
                            onChange={(e) => {
                              const next = [...(rel.constraints || [])];
                              next[idx] = { ...next[idx], name: e.target.value };
                              updateRelationship(rel.id, { constraints: next });
                            }}
                            style={{ flex: 1.2 }}
                          />
                          <select
                            className="designer-select-sm"
                            value={c.type}
                            onChange={(e) => {
                              const next = [...(rel.constraints || [])];
                              next[idx] = {
                                ...next[idx],
                                type: e.target.value as RelationshipConstraint['type'],
                              };
                              updateRelationship(rel.id, { constraints: next });
                            }}
                            style={{ flex: 1 }}
                          >
                            <option value="cardinality-exact">精确基数 (Cardinality)</option>
                            <option value="required">必填关联 (Required)</option>
                            <option value="custom">自定义规则 (Custom)</option>
                          </select>
                          <select
                            className="designer-select-sm"
                            value={c.severity}
                            onChange={(e) => {
                              const next = [...(rel.constraints || [])];
                              next[idx] = {
                                ...next[idx],
                                severity: e.target.value as RelationshipConstraint['severity'],
                              };
                              updateRelationship(rel.id, { constraints: next });
                            }}
                            style={{ flex: 0.9 }}
                          >
                            <option value="error">🔴 Error</option>
                            <option value="warning">🟡 Warning</option>
                            <option value="info">🔵 Info</option>
                          </select>
                          <button
                            type="button"
                            className="designer-delete-btn small"
                            onClick={() => {
                              updateRelationship(rel.id, {
                                constraints: (rel.constraints || []).filter((_, i) => i !== idx),
                              });
                            }}
                            title="Remove constraint"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        {c.type === 'cardinality-exact' && (
                          <div className="designer-form-row" style={{ marginTop: 4 }}>
                            <input
                              type="number"
                              className="designer-input-sm"
                              placeholder="最小实例数 (Min)"
                              value={c.cardinalityRange?.min ?? ''}
                              onChange={(e) => {
                                const next = [...(rel.constraints || [])];
                                next[idx] = {
                                  ...next[idx],
                                  cardinalityRange: {
                                    ...next[idx].cardinalityRange,
                                    min: e.target.value === '' ? undefined : Number(e.target.value),
                                  },
                                };
                                updateRelationship(rel.id, { constraints: next });
                              }}
                            />
                            <input
                              type="number"
                              className="designer-input-sm"
                              placeholder="最大实例数 (Max)"
                              value={c.cardinalityRange?.max ?? ''}
                              onChange={(e) => {
                                const next = [...(rel.constraints || [])];
                                next[idx] = {
                                  ...next[idx],
                                  cardinalityRange: {
                                    ...next[idx].cardinalityRange,
                                    max: e.target.value === '' ? undefined : Number(e.target.value),
                                  },
                                };
                                updateRelationship(rel.id, { constraints: next });
                              }}
                            />
                          </div>
                        )}

                        <div style={{ marginTop: 4 }}>
                          <input
                            type="text"
                            className="designer-input-sm"
                            placeholder="约束校验提示信息 (Message)"
                            value={c.message || ''}
                            onChange={(e) => {
                              const next = [...(rel.constraints || [])];
                              next[idx] = { ...next[idx], message: e.target.value };
                              updateRelationship(rel.id, { constraints: next });
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
