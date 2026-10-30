import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useState } from 'react';
import type { Graph } from '../model/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { GameNodeView, type GameFlowNode } from './GameNodeView';

const nodeTypes = { game: GameNodeView };
const DELETE_KEYS = ['Backspace', 'Delete'];

// Rebuild React Flow's nodes from the graph, keeping what it tracks itself
// (measured size, selection, drag state) for nodes that already exist.
function toFlowNodes(graph: Graph | undefined, prev: GameFlowNode[]): GameFlowNode[] {
  if (!graph) return [];
  const old = new Map(prev.map((n) => [n.id, n]));
  return graph.nodes.map((n) => ({
    ...old.get(n.id),
    id: n.id,
    type: 'game',
    position: n.position,
    data: { node: n },
  }));
}

function toFlowEdges(graph: Graph | undefined, prev: Edge[]): Edge[] {
  if (!graph) return [];
  const old = new Map(prev.map((e) => [e.id, e]));
  return graph.edges.map((e) => ({
    ...old.get(e.id),
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
  }));
}

export function Canvas() {
  const graph = useProjectStore((s) => s.project.graphs[s.activeGraphId]);
  const moveNodes = useProjectStore((s) => s.moveNodes);
  const removeNodes = useProjectStore((s) => s.removeNodes);
  const removeEdges = useProjectStore((s) => s.removeEdges);
  const addEdge = useProjectStore((s) => s.addEdge);
  const setSelection = useUiStore((s) => s.setSelection);

  // React Flow keeps its own copy (measured sizes, selection, drag state).
  // The project store is the source of truth, so we copy from it whenever it changes.
  const [nodes, setNodes] = useState<GameFlowNode[]>(() => toFlowNodes(graph, []));
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(graph, []));
  const [syncedGraph, setSyncedGraph] = useState(graph);
  if (graph !== syncedGraph) {
    setSyncedGraph(graph);
    setNodes(toFlowNodes(graph, nodes));
    setEdges(toFlowEdges(graph, edges));
  }

  const onNodesChange = useCallback(
    (changes: NodeChange<GameFlowNode>[]) => {
      setNodes((ns) => applyNodeChanges(changes, ns));
      const moved: Record<string, { x: number; y: number }> = {};
      const removed: string[] = [];
      for (const change of changes) {
        if (change.type === 'position' && change.position) moved[change.id] = change.position;
        else if (change.type === 'remove') removed.push(change.id);
      }
      if (Object.keys(moved).length > 0) moveNodes(moved);
      if (removed.length > 0) removeNodes(removed);
    },
    [moveNodes, removeNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((es) => applyEdgeChanges(changes, es));
      const removed = changes.flatMap((c) => (c.type === 'remove' ? [c.id] : []));
      if (removed.length > 0) removeEdges(removed);
    },
    [removeEdges],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      // Placeholder until the edge kind picker lands.
      addEdge({ kind: 'feeds', source: connection.source, target: connection.target });
    },
    [addEdge],
  );

  const onSelectionChange: OnSelectionChangeFunc = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }) => {
      setSelection(
        selectedNodes.map((n) => n.id),
        selectedEdges.map((e) => e.id),
      );
    },
    [setSelection],
  );

  return (
    <div className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        deleteKeyCode={DELETE_KEYS}
        colorMode="system"
        fitView
        minZoom={0.2}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
