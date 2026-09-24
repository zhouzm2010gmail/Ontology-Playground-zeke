import { useRef, useEffect, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { Database, ArrowRight, Key, Link2, Layers, Box, GitBranch, Zap, Shield, ShieldCheck, ChevronDown, ChevronRight, AlertCircle, Info } from 'lucide-react';
import type { ComputedExpression, PropertyConstraint, RelationshipConstraint, Ontology } from '../data/ontology';

export function InspectorPanel() {
  const { currentOntology, dataBindings, selectedEntityId, selectedRelationshipId, showDataBindings } = useAppStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const [expandedConstraints, setExpandedConstraints] = useState<Record<string, boolean>>({});
  const [showValidationSummary, setShowValidationSummary] = useState(true);

  useEffect(() => {
    if ((selectedEntityId || selectedRelationshipId) && panelRef.current) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedEntityId, selectedRelationshipId]);

  const toggleConstraint = (propName: string) => {
    setExpandedConstraints(prev => ({
      ...prev,
      [propName]: !prev[propName]
    }));
  };

  /** 格式化表达式展示 */
  const renderExpressionText = (expr: ComputedExpression | undefined, ontology: Ontology) => {
    if (!expr) return '无表达式';

    if (expr.type === 'aggregation' && expr.aggregation) {
      const { function: fn, traversal, targetProperty } = expr.aggregation;
      const rel = ontology.relationships.find(r => r.id === traversal.relationshipId);
      const relName = rel ? rel.name : traversal.relationshipId;
      const otherEntityId = traversal.direction === 'outgoing' ? rel?.to : rel?.from;
      const otherEntity = ontology.entityTypes.find(e => e.id === otherEntityId);
      const targetLabel = targetProperty ? `.${targetProperty}` : '';
      const dirArrow = traversal.direction === 'outgoing' ? '→' : '←';

      return `${fn}(${dirArrow} ${relName} ${dirArrow} ${otherEntity?.name || 'Entity'}${targetLabel})`;
    }

    if (expr.type === 'conditional' && expr.conditional) {
      return `IF ${expr.conditional.condition} THEN "${expr.conditional.thenValue}" ELSE "${expr.conditional.elseValue}"`;
    }

    if (expr.type === 'formula' && expr.formula) {
      return expr.formula;
    }

    return '自定义计算表达式';
  };

  /** 渲染单条约束详情标签 */
  const renderConstraintItem = (c: PropertyConstraint | RelationshipConstraint) => {
    const severityClass = 
      c.severity === 'error' ? 'constraint-severity-error' :
      c.severity === 'warning' ? 'constraint-severity-warning' : 'constraint-severity-info';

    const severityIcon = 
      c.severity === 'error' ? <AlertCircle size={12} color="#ef4444" /> :
      c.severity === 'warning' ? <AlertCircle size={12} color="#f59e0b" /> :
      <Info size={12} color="#3b82f6" />;

    return (
      <div key={c.id} className={`constraint-badge-pill ${severityClass}`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {severityIcon}
          <span style={{ fontWeight: 600 }}>{c.name || c.type}</span>
          <span style={{ opacity: 0.85 }}>: {c.message}</span>
        </div>
      </div>
    );
  };

  if (!selectedEntityId && !selectedRelationshipId) {
    return (
      <div ref={panelRef} className="inspector-panel">
        <div className="panel-header">
          <h3 className="panel-title">Inspector</h3>
        </div>
        <div className="inspector-empty">
          <div className="inspector-empty-icon">🔍</div>
          <div className="inspector-empty-title">Select an Element</div>
          <div className="inspector-empty-text">
            Click on an entity type or relationship in the graph to inspect its properties, data bindings, and connections.
          </div>
        </div>
      </div>
    );
  }

  if (selectedRelationshipId) {
    const relationship = currentOntology.relationships.find(r => r.id === selectedRelationshipId);
    if (!relationship) return null;

    const fromEntity = currentOntology.entityTypes.find(e => e.id === relationship.from);
    const toEntity = currentOntology.entityTypes.find(e => e.id === relationship.to);

    return (
      <div ref={panelRef} className="inspector-panel">
        <div className="panel-header">
          <h3 className="panel-title">Relationship</h3>
        </div>
        <div className="inspector-content">
          <div className="relationship-header">
            <div className="relationship-icon">
              <GitBranch size={24} />
            </div>
            <div className="entity-info">
              <h2>{relationship.name}</h2>
              <p>{relationship.description}</p>
            </div>
          </div>

          <div className="relationship-flow">
            <div className="relationship-entity">
              <div className="relationship-entity-icon">{fromEntity?.icon}</div>
              <div className="relationship-entity-name">{fromEntity?.name}</div>
            </div>
            <div className="relationship-arrow">
              <div className="relationship-arrow-name">{relationship.name}</div>
              <ArrowRight size={24} />
            </div>
            <div className="relationship-entity">
              <div className="relationship-entity-icon">{toEntity?.icon}</div>
              <div className="relationship-entity-name">{toEntity?.name}</div>
            </div>
          </div>

          <div className="inspector-section">
            <div className="section-title">
              <Layers size={14} />
              Cardinality
            </div>
            <div className="cardinality-badge">{relationship.cardinality}</div>
          </div>

          {relationship.constraints && relationship.constraints.length > 0 && (
            <div className="inspector-section">
              <div className="section-title">
                <Shield size={14} />
                Relationship Constraints ({relationship.constraints.length})
              </div>
              <div className="constraint-sublist">
                {relationship.constraints.map(c => renderConstraintItem(c))}
              </div>
            </div>
          )}

          {relationship.attributes && relationship.attributes.length > 0 && (
            <div className="inspector-section">
              <div className="section-title">
                <Box size={14} />
                Relationship Attributes
              </div>
              <div className="property-list">
                {relationship.attributes.map(attr => (
                  <div key={attr.name} className="property-item">
                    <div>
                      <span className="property-name">{attr.name}</span>
                    </div>
                    <span className="property-type">{attr.type}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const entity = currentOntology.entityTypes.find(e => e.id === selectedEntityId);
  if (!entity) return null;

  const binding = dataBindings.find(b => b.entityTypeId === selectedEntityId);
  const entityRelationships = currentOntology.relationships.filter(
    r => r.from === selectedEntityId || r.to === selectedEntityId
  );

  const staticProperties = entity.properties.filter(p => !p.isComputed);
  const computedProperties = entity.properties.filter(p => p.isComputed);

  // 计算约束统计
  const allPropertyConstraints = entity.properties.flatMap(p => p.constraints || []);
  const errorCount = allPropertyConstraints.filter(c => c.severity === 'error').length;
  const warningCount = allPropertyConstraints.filter(c => c.severity === 'warning').length;
  const infoCount = allPropertyConstraints.filter(c => c.severity === 'info').length;

  return (
    <div ref={panelRef} className="inspector-panel">
      <div className="panel-header">
        <h3 className="panel-title">Entity Type</h3>
      </div>
      <div className="inspector-content">
        <div className="entity-header">
          <div className="entity-icon" style={{ backgroundColor: entity.color + '20', color: entity.color }}>
            {entity.icon}
          </div>
          <div className="entity-info">
            <h2>{entity.name}</h2>
            <p>{entity.description}</p>
          </div>
        </div>

        {/* 属性区 */}
        <div className="inspector-section">
          <div className="section-title">
            <Key size={14} />
            Properties ({entity.properties.length})
            {computedProperties.length > 0 && (
              <span className="property-computed-badge">⚡ {computedProperties.length}</span>
            )}
          </div>

          <div className="property-list">
            {/* 静态基础属性 */}
            {staticProperties.map(prop => {
              const hasConstraints = prop.constraints && prop.constraints.length > 0;
              const isExpanded = expandedConstraints[prop.name] ?? hasConstraints;

              return (
                <div key={prop.name} className="property-item" style={{ flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                      <span className="property-name">{prop.name}</span>
                      {prop.isIdentifier && <span className="property-identifier">ID</span>}
                      {prop.isRequired && <span className="property-required-badge">必填</span>}
                      {prop.unit && <span className="property-type">({prop.unit})</span>}
                      {hasConstraints && (
                        <span 
                          className="property-constraints-badge" 
                          onClick={() => toggleConstraint(prop.name)}
                          title="点击展开/收起约束规则"
                        >
                          <Shield size={11} />
                          {prop.constraints!.length}
                          {isExpanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                        </span>
                      )}
                    </div>
                    <span className="property-type">{prop.type}</span>
                  </div>

                  {prop.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{prop.description}</div>
                  )}

                  {hasConstraints && isExpanded && (
                    <div className="constraint-sublist">
                      {prop.constraints!.map(c => renderConstraintItem(c))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 计算属性分隔与列表 */}
            {computedProperties.length > 0 && (
              <>
                <div className="property-divider">
                  <span>⚡ 计算与派生属性 ({computedProperties.length})</span>
                </div>

                {computedProperties.map(prop => (
                  <div key={prop.name} className="property-item property-item-computed">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
                        <Zap size={14} color="#a855f7" />
                        <span className="property-name" style={{ color: '#c084fc' }}>{prop.name}</span>
                        <span className="property-computed-badge">⚡ Computed</span>
                        {prop.unit && <span className="property-type">({prop.unit})</span>}
                      </div>
                      <span className="property-type">{prop.type}</span>
                    </div>

                    {prop.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{prop.description}</div>
                    )}

                    {/* 表达式详情 */}
                    <div className="property-expression-box">
                      <span style={{ color: '#a855f7', fontWeight: 600 }}>Expr:</span>
                      <code>{renderExpressionText(prop.expression, currentOntology)}</code>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* 关联关系区 */}
        <div className="inspector-section">
          <div className="section-title">
            <GitBranch size={14} />
            Relationships ({entityRelationships.length})
          </div>
          <div className="property-list">
            {entityRelationships.map(rel => {
              const isOutgoing = rel.from === selectedEntityId;
              const otherEntityId = isOutgoing ? rel.to : rel.from;
              const otherEntity = currentOntology.entityTypes.find(e => e.id === otherEntityId);
              const hasRelConstraints = rel.constraints && rel.constraints.length > 0;
              
              return (
                <div key={rel.id} className="property-item rel-item">
                  <div className="rel-item-row">
                    {isOutgoing ? (
                      <>
                        <span className="property-name">{rel.name}</span>
                        <ArrowRight size={12} className="rel-item-arrow" />
                        <span className="rel-item-entity">{otherEntity?.icon} {otherEntity?.name}</span>
                      </>
                    ) : (
                      <>
                        <span className="rel-item-entity">{otherEntity?.icon} {otherEntity?.name}</span>
                        <ArrowRight size={12} className="rel-item-arrow" />
                        <span className="property-name">{rel.name}</span>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 2 }}>
                    <div className="rel-item-cardinality">{rel.cardinality}</div>
                    {hasRelConstraints && (
                      <span style={{ fontSize: 11, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Shield size={11} /> 约束: {rel.constraints![0].message}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 验证与数据契约统计摘要 */}
        {allPropertyConstraints.length > 0 && (
          <div className="inspector-section">
            <div 
              className="section-title" 
              style={{ cursor: 'pointer', justifyContent: 'space-between' }}
              onClick={() => setShowValidationSummary(!showValidationSummary)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={14} color="#107C10" />
                Data Contract ({allPropertyConstraints.length} Rules)
              </div>
              {showValidationSummary ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>

            {showValidationSummary && (
              <div className="validation-summary-card">
                <div className="validation-stat-row">
                  <span>总验证规则</span>
                  <span style={{ fontWeight: 600 }}>{allPropertyConstraints.length} 条</span>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  {errorCount > 0 && (
                    <span className="validation-stat-pill constraint-severity-error">
                      🔴 阻断 (Error): {errorCount}
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="validation-stat-pill constraint-severity-warning">
                      🟡 警告 (Warning): {warningCount}
                    </span>
                  )}
                  {infoCount > 0 && (
                    <span className="validation-stat-pill constraint-severity-info">
                      🔵 提示 (Info): {infoCount}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {(showDataBindings || binding) && binding && (
          <div className="inspector-section">
            <div className="section-title">
              <Link2 size={14} />
              Data Bindings
            </div>
            <div className="binding-card">
              <div className="binding-source">
                <div className="binding-source-icon">
                  <Database size={16} />
                </div>
                <div className="binding-source-info">
                  <div className="binding-source-name">{binding.source}</div>
                  <div className="binding-source-table">{binding.table}</div>
                </div>
              </div>
              <div>
                {Object.entries(binding.columnMappings).map(([prop, column]) => (
                  <div
                    key={prop}
                    className="column-mapping"
                  >
                    <span className="column-property">{prop}</span>
                    <span className="column-arrow">→</span>
                    <span className="column-source">{column}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
