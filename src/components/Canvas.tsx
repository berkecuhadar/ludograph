import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type FinalConnectionState,
  type NodeChange,
  type OnBeforeDelete,
  type OnSelectionChangeFunc,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useState } from 'react';
import { strings } from '../lib/strings';
import { allowedEdgeKinds, explainNoEdge } from '../model/edgeRules';
import { countInsideNodes } from '../model/graphOps';
import type { Graph } from '../model/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore, type SelectRequest } from '../store/uiStore';
import { edgeColor, edgeLineStyle, edgeMarker } from './edgeStyle';
import { EdgeLegend } from './EdgeLegend';
import { GameNodeView, type GameFlowNode } from './GameNodeView';

const nodeTypes = { game: GameNodeView };
const DELETE_KEYS = ['Backspace', 'Delete'];

// Rebuild React Flow's nodes from the graph, keeping what it tracks itself
// (measured size, selection, drag state) for nodes that already exist.
// When `select` is given, exactly those nodes end up selected.
function toFlowNodes(
  graph: Graph | undefined,
  prev: GameFlowNode[],
  select?: ReadonlySet<string>,
): GameFlowNode[] {
  if (!graph) return [];
  const old = new Map(prev.map((n) => [n.id, n]));
  return graph.nodes.map((n) => {
    const node: GameFlowNode = {
      ...old.get(n.id),
      id: n.id,
      type: 'game',
      position: n.position,
      data: { node: n },
    };
    if (select) node.selected = select.has(n.id);
    return node;
  });
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
    style: edgeLineStyle(e.kind),
    markerEnd: edgeMarker(e.kind),
    labelStyle: { fill: edgeColor(e.kind), fontWeight: 600 },
  }));
}

export function Canvas() {
  const graph = useProjectStore((s) => s.project.graphs[s.activeGraphId]);
  const moveNodes = useProjectStore((s) => s.moveNodes);
  const removeNodes = useProjectStore((s) => s.removeNodes);
  const removeEdges = useProjectStore((s) => s.removeEdges);
  const openNode = useProjectStore((s) => s.openNode);
  const setSelection = useUiStore((s) => s.setSelection);
  const selectRequest = useUiStore((s) => s.selectRequest);
  const focusRequest = useUiStore((s) => s.focusRequest);
  const startConnect = useUiStore((s) => s.startConnect);
  const notify = useUiStore((s) => s.notify);
  const { fitView } = useReactFlow();

  // React Flow keeps its own copy (measured sizes, selection, drag state).
  // The project store is the source of truth, so we copy from it whenever it changes.
  const [nodes, setNodes] = useState<GameFlowNode[]>(() => toFlowNodes(graph, []));
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(graph, []));
  const [syncedGraph, setSyncedGraph] = useState(graph);
  // Starts at null so a request made just before this canvas opened (search, validation) still applies.
  const [syncedRequest, setSyncedRequest] = useState<SelectRequest | null>(null);
  if (graph !== syncedGraph || selectRequest !== syncedRequest) {
    const select =
      selectRequest !== syncedRequest && selectRequest ? new Set(selectRequest.ids) : undefined;
    setSyncedGraph(graph);
    setSyncedRequest(selectRequest);
    setNodes(toFlowNodes(graph, nodes, select));
    setEdges(toFlowEdges(graph, edges));
  }

  // A fresh canvas has nothing selected.
  useEffect(() => setSelection([], []), [setSelection]);

  useEffect(() => {
    if (!focusRequest) return;
    const timer = setTimeout(() => {
      void fitView({ nodes: [{ id: focusRequest.nodeId }], duration: 300, maxZoom: 1.2 });
      useUiStore.setState({ focusRequest: null });
    }, 60);
    return () => clearTimeout(timer);
  }, [focusRequest, fitView]);

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

  const findNodes = (a: string, b: string) => {
    const { project, activeGraphId } = useProjectStore.getState();
    const g = project.graphs[activeGraphId];
    return {
      project,
      graph: g,
      from: g?.nodes.find((n) => n.id === a),
      to: g?.nodes.find((n) => n.id === b),
    };
  };

  const isValidConnection = useCallback((connection: Edge | Connection) => {
    const { project, graph: g, from, to } = findNodes(connection.source, connection.target);
    if (!g || !from || !to || from.id === to.id) return false;
    return allowedEdgeKinds(from, to, project.customKinds, g.edges).length > 0;
  }, []);

  const onConnect = useCallback(
    (connection: Connection) =>
      startConnect({ source: connection.source, target: connection.target }),
    [startConnect],
  );

  // Dropping on a node that can't take the edge: say why.
  const onConnectEnd = useCallback(
    (_event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      if (state.isValid !== false || !state.fromNode || !state.toNode) return;
      const { project, from, to } = findNodes(state.fromNode.id, state.toNode.id);
      if (from && to) notify(explainNoEdge(from, to, project.customKinds));
    },
    [notify],
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

  // Deleting a node also deletes whatever is inside it, so ask first.
  const onBeforeDelete: OnBeforeDelete<GameFlowNode, Edge> = useCallback(
    async ({ nodes: doomed, edges: doomedEdges }) => {
      const { project, activeGraphId } = useProjectStore.getState();
      const ids = new Set(doomed.map((n) => n.id));
      const gameNodes = project.graphs[activeGraphId]?.nodes.filter((n) => ids.has(n.id)) ?? [];
      if (countInsideNodes(project, gameNodes) === 0) return { nodes: doomed, edges: doomedEdges };
      const withInside = gameNodes.filter((n) => countInsideNodes(project, [n]) > 0).length;
      const ok = await useUiStore
        .getState()
        .askConfirm(strings.confirm.removeWithInside(withInside), strings.confirm.ok);
      return ok ? { nodes: doomed, edges: doomedEdges } : false;
    },
    [],
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
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onSelectionChange={onSelectionChange}
        onBeforeDelete={onBeforeDelete}
        onNodeDoubleClick={(_event, node) => openNode(node.id)}
        zoomOnDoubleClick={false}
        deleteKeyCode={DELETE_KEYS}
        colorMode="system"
        fitView
        minZoom={0.1}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
        <Panel position="bottom-left" className="legend-panel">
          <EdgeLegend />
        </Panel>
      </ReactFlow>
    </div>
  );
}
