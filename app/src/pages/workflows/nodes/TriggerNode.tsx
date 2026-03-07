import { Handle, Position, NodeProps } from '@xyflow/react';
import { useTheme } from '../../../contexts/ThemeContext';

const TRIGGER_TYPES = [
  { value: 'CRM_LEAD_CREATED', label: 'CRM Lead Created' },
  { value: 'INVOICE_OVERDUE', label: 'Invoice Overdue' },
  { value: 'STOCK_BELOW_THRESHOLD', label: 'Stock Below Threshold' },
  { value: 'FORM_SUBMITTED', label: 'Form Submitted' },
  { value: 'TASK_COMPLETED', label: 'Task Completed' },
  { value: 'DEAL_WON', label: 'Deal Won' },
];

export default function TriggerNode({ data, selected }: NodeProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        border: selected ? '2px solid #3b82f6' : '2px solid #1d4ed8',
        borderRadius: 8,
        minWidth: 200,
        backgroundColor: theme.colors.surface,
        boxShadow: selected ? '0 0 0 3px rgba(59,130,246,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#1d4ed8',
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
        <span>⚡</span>
        <span>TRIGGER</span>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px' }}>
        <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>
          Event Type
        </label>
        <select
          value={(data.triggerType as string) || 'CRM_LEAD_CREATED'}
          onChange={(e) => {
            if (typeof data.onChange === 'function') {
              (data.onChange as (val: string) => void)(e.target.value);
            }
          }}
          style={{
            width: '100%',
            padding: '5px 8px',
            fontSize: 12,
            borderRadius: 4,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.background,
            color: theme.colors.text,
            outline: 'none',
          }}
        >
          {TRIGGER_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Source handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#1d4ed8', width: 10, height: 10, border: '2px solid #fff' }}
      />
    </div>
  );
}
