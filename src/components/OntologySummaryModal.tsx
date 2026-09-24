import { motion } from 'framer-motion';
import { X, FileText, Copy, Check, Shield } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useState } from 'react';

interface OntologySummaryModalProps {
  onClose: () => void;
}

export function OntologySummaryModal({ onClose }: OntologySummaryModalProps) {
  const { currentOntology } = useAppStore();
  const [copied, setCopied] = useState(false);

  // 全局统计指标
  const totalEntities = currentOntology.entityTypes.length;
  const totalRelationships = currentOntology.relationships.length;
  const totalComputed = currentOntology.entityTypes.flatMap(e => e.properties).filter(p => p.isComputed).length;
  const totalConstraints = 
    currentOntology.entityTypes.flatMap(e => e.properties).flatMap(p => p.constraints || []).length +
    currentOntology.relationships.flatMap(r => r.constraints || []).length;

  const generateTextSummary = () => {
    const lines: string[] = [];
    
    lines.push(`# ${currentOntology.name}`);
    lines.push('');
    lines.push(currentOntology.description);
    lines.push('');
    lines.push(`> 📊 统计: ${totalEntities} 实体 | ${totalRelationships} 关系 | ⚡ ${totalComputed} 计算属性 | 🛡️ ${totalConstraints} 验证规则`);
    lines.push('');
    lines.push('---');
    lines.push('');
    
    // Entities section
    lines.push('## Entities');
    lines.push('');
    currentOntology.entityTypes.forEach(entity => {
      lines.push(`### ${entity.icon} ${entity.name}`);
      lines.push(`${entity.description}`);
      lines.push('');
      lines.push('**Properties:**');
      entity.properties.forEach(prop => {
        const identifier = prop.isIdentifier ? ' [ID]' : '';
        const computed = prop.isComputed ? ' ⚡[Computed]' : '';
        const required = prop.isRequired ? ' [Required]' : '';
        lines.push(`- **${prop.name}** (${prop.type})${identifier}${computed}${required}: ${prop.description || ''}`);
        if (prop.constraints && prop.constraints.length > 0) {
          prop.constraints.forEach(c => {
            lines.push(`  - 🛡️ 约束 (${c.type}): ${c.message}`);
          });
        }
      });
      lines.push('');
    });
    
    // Relationships section
    lines.push('## Relationships');
    lines.push('');
    currentOntology.relationships.forEach(rel => {
      const fromEntity = currentOntology.entityTypes.find(e => e.id === rel.from);
      const toEntity = currentOntology.entityTypes.find(e => e.id === rel.to);
      lines.push(`### ${rel.name}`);
      lines.push(`**${fromEntity?.name || rel.from}** → **${toEntity?.name || rel.to}** (${rel.cardinality})`);
      lines.push(`${rel.description || ''}`);
      if (rel.constraints && rel.constraints.length > 0) {
        rel.constraints.forEach(c => {
          lines.push(`  - 🛡️ 关系契约: ${c.message}`);
        });
      }
      lines.push('');
    });
    
    return lines.join('\n');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generateTextSummary());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal-content ontology-summary-modal"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={20} style={{ color: 'var(--accent)' }} />
            <h2>Ontology Summary</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="icon-btn" 
              onClick={handleCopy} 
              title="Copy to clipboard"
              style={{ background: copied ? 'var(--ms-green)' : 'var(--bg-tertiary)' }}
            >
              {copied ? <Check size={18} color="white" /> : <Copy size={18} />}
            </button>
            <button className="modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="summary-content">
          <div className="summary-section">
            <h3>{currentOntology.name}</h3>
            <p className="summary-description">{currentOntology.description}</p>
          </div>

          {/* 四大关键统计指标 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>实体类型</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ms-blue)' }}>{totalEntities}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>关联关系</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ms-green)' }}>{totalRelationships}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(168, 85, 247, 0.25)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#c084fc', marginBottom: 2 }}>⚡ 计算属性</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#c084fc' }}>{totalComputed}</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(59, 130, 246, 0.25)', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#60a5fa', marginBottom: 2 }}>🛡️ 验证规则</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#60a5fa' }}>{totalConstraints}</div>
            </div>
          </div>

          <div className="summary-section">
            <h4>Entities ({currentOntology.entityTypes.length})</h4>
            <div className="summary-entities">
              {currentOntology.entityTypes.map(entity => (
                <div key={entity.id} className="summary-entity-card">
                  <div className="entity-card-header">
                    <span className="entity-icon-large" style={{ background: entity.color }}>
                      {entity.icon}
                    </span>
                    <div>
                      <strong>{entity.name}</strong>
                      <p>{entity.description}</p>
                    </div>
                  </div>
                  <div className="entity-properties">
                    {entity.properties.map(prop => (
                      <div key={prop.name} className="property-row">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <span className="prop-name">{prop.name}</span>
                          {prop.isIdentifier && <span className="prop-id-badge">ID</span>}
                          {prop.isComputed && (
                            <span className="property-computed-badge" style={{ margin: 0 }}>⚡ 计算</span>
                          )}
                          {prop.isRequired && (
                            <span className="property-required-badge" style={{ margin: 0 }}>必填</span>
                          )}
                          {prop.constraints && prop.constraints.length > 0 && (
                            <span className="property-constraints-badge" style={{ margin: 0 }}>
                              🛡️ {prop.constraints.length}
                            </span>
                          )}
                        </div>
                        <span className="prop-type">{prop.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-section">
            <h4>Relationships ({currentOntology.relationships.length})</h4>
            <div className="summary-relationships">
              {currentOntology.relationships.map(rel => {
                const fromEntity = currentOntology.entityTypes.find(e => e.id === rel.from);
                const toEntity = currentOntology.entityTypes.find(e => e.id === rel.to);
                return (
                  <div key={rel.id} className="summary-relationship-card">
                    <div className="relationship-flow-row">
                      <span className="rel-entity">{fromEntity?.icon} {fromEntity?.name}</span>
                      <span className="rel-arrow">
                        <span className="rel-label">{rel.name}</span>
                        →
                      </span>
                      <span className="rel-entity">{toEntity?.icon} {toEntity?.name}</span>
                    </div>
                    <div className="relationship-meta">
                      <span className="cardinality-badge">{rel.cardinality}</span>
                      <span className="rel-description">{rel.description}</span>
                      {rel.constraints && rel.constraints.length > 0 && (
                        <span style={{ fontSize: 11, color: '#60a5fa', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Shield size={11} /> {rel.constraints[0].message}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
