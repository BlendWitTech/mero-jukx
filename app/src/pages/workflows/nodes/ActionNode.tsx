import { Handle, Position, NodeProps } from '@xyflow/react';
import { useTheme } from '../../../contexts/ThemeContext';

const ACTION_TYPES = [
  { value: 'SEND_EMAIL', label: 'Send Email' },
  { value: 'SEND_SMS', label: 'Send SMS' },
  { value: 'SEND_WHATSAPP', label: 'Send WhatsApp' },
  { value: 'ASSIGN_TO_USER', label: 'Assign to User' },
  { value: 'CREATE_TASK', label: 'Create Task' },
  { value: 'SEND_NOTIFICATION', label: 'Send Notification' },
  { value: 'CREATE_PURCHASE_REQUEST', label: 'Create Purchase Request' },
  { value: 'UPDATE_DEAL_STAGE', label: 'Update Deal Stage' },
];

export default function ActionNode({ data, selected }: NodeProps) {
  const { theme } = useTheme();

  return (
    <div
      style={{
        border: selected ? '2px solid #16a34a' : '2px solid #166534',
        borderRadius: 8,
        minWidth: 200,
        backgroundColor: theme.colors.surface,
        boxShadow: selected ? '0 0 0 3px rgba(22,163,74,0.3)' : '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Target handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: '#16a34a', width: 10, height: 10, border: '2px solid #fff' }}
      />

      {/* Header */}
      <div
        style={{
          backgroundColor: '#16a34a',
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
        <span>▶</span>
        <span>ACTION</span>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px' }}>
        <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 4 }}>
          Action Type
        </label>
        <select
          value={(data.actionType as string) || 'SEND_EMAIL'}
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
          {ACTION_TYPES.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>

        {/* Optional label/note */}
        <div style={{ marginTop: 6 }}>
          <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 3 }}>
            Label (optional)
          </label>
          <input
            type="text"
            value={(data.label as string) || ''}
            onChange={(e) => {
              if (typeof data.onLabelChange === 'function') {
                (data.onLabelChange as (val: string) => void)(e.target.value);
              }
            }}
            placeholder="Describe this action..."
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

      {/* Source handle for chaining */}
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: '#16a34a', width: 10, height: 10, border: '2px solid #fff' }}
      />
    </div>
  );
}
