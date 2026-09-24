import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Key, Zap, Shield } from 'lucide-react';
import { useDesignerStore, ENTITY_COLORS, ENTITY_ICONS, fabricIQNameError } from '../../store/designerStore';
import type { Property } from '../../data/ontology';
import { ComputedPropertyEditor } from './ComputedPropertyEditor';
import { ConstraintEditor } from './ConstraintEditor';

const PROPERTY_TYPES: Property['type'][] = [
  'string', 'integer', 'decimal', 'double', 'date', 'datetime', 'boolean', 'enum',
];

export function EntityForm() {
  const {
    ontology,
    selectedEntityId,
    addEntity,
    updateEntity,
    removeEntity,
    selectEntity,
    addProperty,
    updateProperty,
    removeProperty,
    moveProperty,
  } = useDesignerStore();

  const [expandedEntities, setExpandedEntities] = useState<Set<string>>(new Set());
  const [expandedComputedProps, setExpandedComputedProps] = useState<Record<string, boolean>>({});
  const [expandedConstraintProps, setExpandedConstraintProps] = useState<Record<string, boolean>>({});
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // When an entity is selected externally (e.g. graph click), expand and scroll to it
  useEffect(() => {
    if (selectedEntityId && !expandedEntities.has(selectedEntityId)) {
      setExpandedEntities((prev) => new Set(prev).add(selectedEntityId));
    }
    if (selectedEntityId) {
      // Delay scroll slightly so the card expands first
      requestAnimationFrame(() => {
        cardRefs.current.get(selectedEntityId)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  }, [selectedEntityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleExpand = (id: string) => {
    setExpandedEntities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddEntity = () => {
    addEntity();
    // Auto-expand the new entity (prepended at index 0)
    const latest = useDesignerStore.getState().ontology.entityTypes;
    if (latest.length > 0) {
      const newId = latest[0].id;
      setExpandedEntities((prev) => new Set(prev).add(newId));
    }
  };

  return (
    <div className="designer-entity-list">
      <div className="designer-section-header">
        <h3>Entity Types ({ontology.entityTypes.length})</h3>
        <button className="designer-add-btn" onClick={handleAddEntity} title="Add entity type">
          <Plus size={14} /> Add
        </button>
      </div>

      {ontology.entityTypes.length === 0 && (
        <div className="designer-empty">No entity types yet. Click "Add" to create one.</div>
      )}

      {ontology.entityTypes.map((entity) => {
        const isExpanded = expandedEntities.has(entity.id);
        const isSelected = selectedEntityId === entity.id;

        return (
          <div
            key={entity.id}
            ref={(el) => { if (el) cardRefs.current.set(entity.id, el); else cardRefs.current.delete(entity.id); }}
            className={`designer-entity-card ${isSelected ? 'selected' : ''}`}
          >
            {/* Header row */}
            <div
              className="designer-entity-header"
              onClick={() => {
                selectEntity(entity.id);
                toggleExpand(entity.id);
              }}
            >
              <button className="designer-expand-btn" aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              <span
                className="designer-entity-icon"
                style={{ backgroundColor: entity.color + '30', color: entity.color }}
              >
                {entity.icon}
              </span>
              <span className="designer-entity-name">{entity.name || 'Unnamed'}</span>
              <span className="designer-entity-badge">{entity.properties.length} props</span>
              <button
                className="designer-delete-btn"
                onClick={(e) => { e.stopPropagation(); removeEntity(entity.id); }}
                title="Delete entity"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Expanded editor */}
            {isExpanded && (
              <div className="designer-entity-body">
                {/* Name */}
                <label className="designer-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={entity.name}
                    onChange={(e) => updateEntity(entity.id, { name: e.target.value })}
                    placeholder="Entity name"
                  />
                  {entity.name && fabricIQNameError('Entity type', entity.name) && (
                    <span className="designer-field-hint error">{fabricIQNameError('Entity type', entity.name)}</span>
                  )}
                </label>

                {/* Description */}
                <label className="designer-field">
                  <span>Description</span>
                  <textarea
                    rows={2}
                    value={entity.description}
                    onChange={(e) => updateEntity(entity.id, { description: e.target.value })}
                    placeholder="What does this entity represent?"
                  />
                </label>

                {/* Icon picker */}
                <div className="designer-field">
                  <span>Icon</span>
                  <div className="designer-icon-grid">
                    {ENTITY_ICONS.map((icon) => (
                      <button
                        key={icon}
                        className={`designer-icon-btn ${entity.icon === icon ? 'active' : ''}`}
                        onClick={() => updateEntity(entity.id, { icon })}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color picker */}
                <div className="designer-field">
                  <span>Color</span>
                  <div className="designer-color-grid">
                    {ENTITY_COLORS.map((color) => (
                      <button
                        key={color}
                        className={`designer-color-btn ${entity.color === color ? 'active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => updateEntity(entity.id, { color })}
                        aria-label={`Color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Properties */}
                <div className="designer-field">
                  <div className="designer-section-header">
                    <span>Properties ({entity.properties.length})</span>
                    <button
                      className="designer-add-btn small"
                      onClick={() => addProperty(entity.id)}
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>

                  <div className="designer-property-list">
                    {entity.properties.map((prop, idx) => {
                      const propNameErr = prop.name ? fabricIQNameError('Property', prop.name) : null;
                      const idTypeErr = prop.isIdentifier && prop.type !== 'string' && prop.type !== 'integer'
                        ? `Identifier must be string or integer (currently ${prop.type}).`
                        : null;
                      const propKey = `${entity.id}-${idx}`;
                      const isComputedOpen = prop.isComputed && (expandedComputedProps[propKey] ?? true);
                      const isConstraintOpen = !!expandedConstraintProps[propKey];

                      return (
                      <div key={idx} style={{ marginBottom: (isComputedOpen || isConstraintOpen) ? 8 : 2 }}>
                      <div className="designer-property-row">
                        <span
                          className="designer-grip"
                          title="Drag to reorder"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', String(idx));
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
                            if (!isNaN(fromIdx) && fromIdx !== idx) {
                              moveProperty(entity.id, fromIdx, idx);
                            }
                          }}
                        >
                          <GripVertical size={12} />
                        </span>
                        <input
                          className="designer-prop-name"
                          type="text"
                          value={prop.name}
                          onChange={(e) => updateProperty(entity.id, idx, { name: e.target.value })}
                          placeholder="Property name"
                        />
                        <select
                          className="designer-prop-type"
                          value={prop.type}
                          onChange={(e) =>
                            updateProperty(entity.id, idx, { type: e.target.value as Property['type'] })
                          }
                        >
                          {PROPERTY_TYPES.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={`designer-id-btn ${prop.isIdentifier ? 'active' : ''} ${idTypeErr ? 'warning' : ''}`}
                          onClick={() => updateProperty(entity.id, idx, { isIdentifier: !prop.isIdentifier })}
                          title={idTypeErr || (prop.isIdentifier ? 'Remove as identifier' : 'Mark as identifier')}
                        >
                          <Key size={12} />
                        </button>

                        {/* 计算属性开关/展开按钮 */}
                        <button
                          type="button"
                          className={`designer-tool-btn ${prop.isComputed ? 'computed-active' : ''}`}
                          onClick={() => {
                            if (!prop.isComputed) {
                              updateProperty(entity.id, idx, {
                                isComputed: true,
                                expression: prop.expression || {
                                  type: 'aggregation',
                                  aggregation: {
                                    function: 'SUM',
                                    traversal: { relationshipId: '', direction: 'outgoing' },
                                  },
                                },
                              });
                              setExpandedComputedProps((prev) => ({ ...prev, [propKey]: true }));
                            } else {
                              setExpandedComputedProps((prev) => ({ ...prev, [propKey]: !prev[propKey] }));
                            }
                          }}
                          title={prop.isComputed ? '计算属性已开启 (点击折叠/展开)' : '设为计算属性'}
                        >
                          <Zap size={11} />
                          <span>{prop.isComputed ? '⚡' : '算'}</span>
                        </button>

                        {/* 约束规则配置按钮 */}
                        <button
                          type="button"
                          className={`designer-tool-btn ${
                            (prop.constraints && prop.constraints.length > 0) || prop.isRequired
                              ? 'constraint-active'
                              : ''
                          }`}
                          onClick={() => {
                            setExpandedConstraintProps((prev) => ({
                              ...prev,
                              [propKey]: !prev[propKey],
                            }));
                          }}
                          title="数据契约与验证规则配置"
                        >
                          <Shield size={11} />
                          <span>{prop.constraints?.length ? `🛡️${prop.constraints.length}` : '规'}</span>
                        </button>

                        <button
                          type="button"
                          className="designer-delete-btn small"
                          onClick={() => removeProperty(entity.id, idx)}
                          title="Remove property"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      {(propNameErr || idTypeErr) && (
                        <span className="designer-field-hint error">{propNameErr || idTypeErr}</span>
                      )}

                      {/* 计算属性编辑器展开 */}
                      {isComputedOpen && (
                        <ComputedPropertyEditor
                          property={prop}
                          entityId={entity.id}
                          ontology={ontology}
                          onChange={(expr) => updateProperty(entity.id, idx, { expression: expr })}
                        />
                      )}

                      {/* 约束规则编辑器展开 */}
                      {isConstraintOpen && (
                        <ConstraintEditor
                          property={prop}
                          onChange={(updates) => updateProperty(entity.id, idx, updates)}
                        />
                      )}
                      </div>
                      );
                    })}
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
