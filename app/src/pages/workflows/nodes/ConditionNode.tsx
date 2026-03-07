import { Handle, Position, NodeProps } from '@xyflow/react';
import { useTheme } from '../../../contexts/ThemeContext';

const OPERATORS = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '≠' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
  { value: 'contains', label: 'contains' },
];

export default function ConditionNode({ data, selected }: NodeProps) {
  const { theme } = useTheme();

  const handleChange = (key: string, value: string) => {
    if (typeof data.onChange === 'function') {
      (data.onChange as (key: string, val: string) => void)(key, value);
    }
  };

  return (
    <div
      style={{
        border: selected ? '2px solid #d97706' : '2px solid #92400e',
        borderRadius: 8,
        minWidth: 220,
        backgroundColor: theme.colors.surface,
        boxShadow: selected ? '0 0 0 3px rgba(217,119,6,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#d97706', width: 10, height: 10, border: '2px solid #fff' }}
      />

      {/* Header */}
      <div
        style={{
          backgroundColor: '#d97706',
          color: '#fff',
          padding: '8px 12px',
          borderRadius: '6px 6px 0 0',
          fontSize: 12,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>?</span>
        <span>CONDITION</span>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div>
          <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 3 }}>
            Field
          </label>
          <input
            type="text"
            value={(data.field as string) || ''}
            onChange={(e) => handleChange('field', e.target.value)}
            placeholder="e.g. amount"
            style={{
              width: '100%',
              padding: '5px 8px',
              fontSize: 12,
              borderRadius: 4,
              border: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: '0 0 80px' }}>
            <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 3 }}>
              Operator
            </label>
            <select
              value={(data.operator as string) || 'equals'}
              onChange={(e) => handleChange('operator', e.target.value)}
              style={{
                width: '100%',
                padding: '5px 6px',
                fontSize: 12,
                borderRadius: 4,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                outline: 'none',
              }}
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 3 }}>
              Value
            </label>
            <input
              type="text"
              value={(data.value as string) || ''}
              onChange={(e) => handleChange('value', e.target.value)}
              placeholder="e.g. 1000"
              style={{
                width: '100%',
                padding: '5px 8px',
                fontSize: 12,
                borderRadius: 4,
                border: `1px solid ${theme.colors.border}`,
                backgroundColor: theme.colors.background,
                color: theme.colors.text,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>
      </div>

      {/* True output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ background: '#16a34a', width: 10, height: 10, border: '2px solid #fff', left: '30%' }}
      />
      <div style={{ fontSize: 9, color: '#16a34a', position: 'absolute', bottom: -18, left: 'calc(30% - 10px)' }}>
        True
      </div>

      {/* False output handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ background: '#dc2626', width: 10, height: 10, border: '2px solid #fff', left: '70%' }}
      />
      <div style={{ fontSize: 9, color: '#dc2626', position: 'absolute', bottom: -18, left: 'calc(70% - 10px)' }}>
        False
      </div>
    </div>
  );
}
