import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Play, ArrowLeft, Plus } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import TriggerNode from './nodes/TriggerNode';
import ConditionNode from './nodes/ConditionNode';
import ActionNode from './nodes/ActionNode';

const nodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
};

const INITIAL_NODES: Node[] = [
  {
    id: 'trigger-1',
    type: 'trigger',
    position: { x: 200, y: 80 },
    data: { triggerType: 'CRM_LEAD_CREATED' },
  },
];

const PALETTE_ITEMS = [
  { type: 'trigger', label: '⚡ Trigger', color: '#1d4ed8', description: 'Start the workflow' },
  { type: 'condition', label: '? Condition', color: '#d97706', description: 'Branch on a condition' },
  { type: 'action', label: '▶ Action', color: '#16a34a', description: 'Perform an action' },
];

let nodeIdCounter = 10;

export default function WorkflowBuilderPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { organization } = useAuthStore();
  const orgSlug = organization?.slug || '';
  const isNew = !workflowId || workflowId === 'new';

  const [name, setName] = useState('New Workflow');
  const [description, setDescription] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  // Load existing workflow
  const { data: existingWorkflow } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      const res = await api.get(`/workflows/${workflowId}`);
      return res.data;
    },
    enabled: !isNew,
  });

  useEffect(() => {
    if (existingWorkflow) {
      setName(existingWorkflow.name || 'Workflow');
      setDescription(existingWorkflow.description || '');
      if (existingWorkflow.nodes?.length) setNodes(existingWorkflow.nodes);
      if (existingWorkflow.edges?.length) setEdges(existingWorkflow.edges);
    }
  }, [existingWorkflow, setNodes, setEdges]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNew) {
        const res = await api.post('/workflows', { name, description, nodes, edges });
        return res.data;
      } else {
        const res = await api.put(`/workflows/${workflowId}`, { name, description, nodes, edges });
        return res.data;
      }
    },
    onSuccess: (data) => {
      toast.success('Workflow saved');
      if (isNew && data.id) {
        navigate(`/org/${orgSlug}/workflows/${data.id}/edit`, { replace: true });
      }
    },
    onError: () => {
      toast.error('Failed to save workflow');
    },
  });

  // Execute mutation
  const executeMutation = useMutation({
    mutationFn: async () => {
      const id = isNew ? null : workflowId;
      if (!id) {
        toast.error('Save the workflow before running it');
        throw new Error('Not saved');
      }
      const res = await api.post(`/workflows/${id}/execute`, {});
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Execution ${data.status} — ${data.stepsLog?.length || 0} steps`);
    },
    onError: (err: any) => {
      if (err.message !== 'Not saved') toast.error('Execution failed');
    },
  });

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Add a node from the palette
  const addNode = (type: string) => {
    const id = `${type}-${++nodeIdCounter}`;
    const newNode: Node = {
      id,
      type,
      position: { x: 200 + Math.random() * 100, y: 250 + Math.random() * 100 },
      data:
        type === 'trigger'
          ? { triggerType: 'CRM_LEAD_CREATED' }
          : type === 'condition'
          ? { field: '', operator: 'equals', value: '' }
          : { actionType: 'SEND_EMAIL', label: '' },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Update selected node data
  const updateNodeData = (key: string, value: string) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, [key]: value } }
          : n,
      ),
    );
    setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, [key]: value } } : null);
  };

  const deleteSelectedNode = () => {
    if (!selectedNode) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id));
    setSelectedNode(null);
  };

  return (
    <div style={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', backgroundColor: theme.colors.background }}>
      {/* Top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 16px',
          borderBottom: `1px solid ${theme.colors.border}`,
          backgroundColor: theme.colors.surface,
          flexShrink: 0,
        }}
      >
        <button
          onClick={() => navigate(`/org/${orgSlug}/workflows`)}
          style={{ color: theme.colors.textSecondary, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div style={{ width: 1, height: 20, backgroundColor: theme.colors.border }} />

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            flex: 1,
            maxWidth: 280,
            padding: '4px 8px',
            fontSize: 14,
            fontWeight: 600,
            borderRadius: 4,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: 'transparent',
            color: theme.colors.text,
            outline: 'none',
          }}
          placeholder="Workflow name..."
        />

        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{
            flex: 2,
            padding: '4px 8px',
            fontSize: 12,
            borderRadius: 4,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: 'transparent',
            color: theme.colors.textSecondary,
            outline: 'none',
          }}
          placeholder="Description (optional)..."
        />

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            onClick={() => executeMutation.mutate()}
            disabled={executeMutation.isPending || isNew}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              fontSize: 13,
              borderRadius: 6,
              border: '1px solid #bbf7d0',
              backgroundColor: '#f0fdf4',
              color: '#16a34a',
              cursor: isNew ? 'not-allowed' : 'pointer',
              opacity: isNew ? 0.5 : 1,
            }}
          >
            <Play className="h-4 w-4" />
            Run
          </button>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              fontSize: 13,
              borderRadius: 6,
              backgroundColor: theme.colors.primary,
              color: '#fff',
              cursor: 'pointer',
              border: 'none',
            }}
          >
            <Save className="h-4 w-4" />
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Main area: palette + canvas + properties */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left palette */}
        <div
          style={{
            width: 180,
            flexShrink: 0,
            borderRight: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.surface,
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            overflowY: 'auto',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: theme.colors.textSecondary, padding: '0 4px', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Add Nodes
          </div>
          {PALETTE_ITEMS.map((item) => (
            <button
              key={item.type}
              onClick={() => addNode(item.type)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                padding: '8px 10px',
                borderRadius: 6,
                border: `2px solid ${item.color}22`,
                backgroundColor: `${item.color}11`,
                color: item.color,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = `${item.color}22`; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${item.color}11`; }}
            >
              <span style={{ fontSize: 13, fontWeight: 700 }}>{item.label}</span>
              <span style={{ fontSize: 10, color: theme.colors.textSecondary }}>{item.description}</span>
            </button>
          ))}

          <div style={{ height: 1, backgroundColor: theme.colors.border, margin: '4px 0' }} />
          <div style={{ fontSize: 10, color: theme.colors.textSecondary, padding: '0 4px', lineHeight: 1.5 }}>
            Click a node type to add it to the canvas. Drag nodes to reposition. Connect handles to wire them together.
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            deleteKeyCode="Delete"
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color={theme.colors.border} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'trigger') return '#1d4ed8';
                if (n.type === 'condition') return '#d97706';
                return '#16a34a';
              }}
              style={{ backgroundColor: theme.colors.surface, border: `1px solid ${theme.colors.border}` }}
            />
          </ReactFlow>
        </div>

        {/* Right properties panel */}
        {selectedNode && (
          <div
            style={{
              width: 240,
              flexShrink: 0,
              borderLeft: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.surface,
              padding: '12px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Node Properties
            </div>

            <div>
              <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 3 }}>
                Node ID
              </label>
              <div style={{ fontSize: 12, color: theme.colors.text, padding: '4px 8px', borderRadius: 4, backgroundColor: theme.colors.background }}>
                {selectedNode.id}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 3 }}>
                Type
              </label>
              <div style={{ fontSize: 12, color: theme.colors.text, padding: '4px 8px', borderRadius: 4, backgroundColor: theme.colors.background, textTransform: 'capitalize' }}>
                {selectedNode.type}
              </div>
            </div>

            {/* Dynamic data fields */}
            {selectedNode.type === 'trigger' && (
              <div>
                <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 3 }}>
                  Trigger Type
                </label>
                <div style={{ fontSize: 12, color: theme.colors.text, padding: '4px 8px', borderRadius: 4, backgroundColor: theme.colors.background }}>
                  {(selectedNode.data.triggerType as string) || 'CRM_LEAD_CREATED'}
                </div>
              </div>
            )}

            {selectedNode.type === 'condition' && (
              <>
                <div>
                  <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 3 }}>Field</label>
                  <input
                    type="text"
                    value={(selectedNode.data.field as string) || ''}
                    onChange={(e) => updateNodeData('field', e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', fontSize: 12, borderRadius: 4, border: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.background, color: theme.colors.text, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 3 }}>Value</label>
                  <input
                    type="text"
                    value={(selectedNode.data.value as string) || ''}
                    onChange={(e) => updateNodeData('value', e.target.value)}
                    style={{ width: '100%', padding: '5px 8px', fontSize: 12, borderRadius: 4, border: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.background, color: theme.colors.text, outline: 'none', boxSizing: 'border-box' }}
                  />
                </div>
              </>
            )}

            {selectedNode.type === 'action' && (
              <div>
                <label style={{ fontSize: 11, color: theme.colors.textSecondary, display: 'block', marginBottom: 3 }}>Action Type</label>
                <div style={{ fontSize: 12, color: theme.colors.text, padding: '4px 8px', borderRadius: 4, backgroundColor: theme.colors.background }}>
                  {(selectedNode.data.actionType as string) || 'SEND_EMAIL'}
                </div>
              </div>
            )}

            <button
              onClick={deleteSelectedNode}
              style={{
                marginTop: 'auto',
                padding: '7px 12px',
                fontSize: 12,
                borderRadius: 6,
                border: '1px solid #fca5a5',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                cursor: 'pointer',
              }}
            >
              Delete Node
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
