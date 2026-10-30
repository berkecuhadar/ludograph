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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { strings } from '../lib/strings';
import { allowedEdgeKinds, explainNoEdge } from '../model/edgeRules';
import { countInsideNodes } from '../model/graphOps';
import type { GameNode, Graph, Point } from '../model/types';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore } from '../store/settingsStore';
import { useUiStore, type SelectRequest } from '../store/uiStore';
import { computeLayout } from '../views/computeLayout';
import { computeDisplay } from '../views/display';
import { classifyMda } from '../views/mdaLayout';
import { classifyOnion } from '../views/onionLayout';
import { AutoLayoutButton } from './AutoLayoutButton';
import { DisplayContext } from './displayContext';
import { EdgeLegend } from './EdgeLegend';
import { edgeColor, edgeLineStyle, edgeMarker, WARNING_COLOR } from './edgeStyle';
import { FilterBar } from './FilterBar';
import { GameNodeView, type GameFlowNode } from './GameNodeView';
import { ViewSwitcher } from './ViewSwitcher';
import { ViewUnderlay } from './ViewUnderlay';

const nodeTypes = { game: GameNodeView };
const DELETE_KEYS = ['Backspace', 'Delete'];

// Rebuild React Flow's nodes from the graph, keeping what it tracks itself
// (measured size, selection, drag state) for nodes that already exist.
// When `select` is given, exactly those nodes end up selected.
function toFlowNodes(
  graph: Graph | undefined,
  prev: GameFlowNode[],
  positions: Record<string, Point> | null,
  select?: ReadonlySet<string>,
): GameFlowNode[] {
  if (!graph) return [];
  const old = new Map(prev.map((n) => [n.id, n]));
  return graph.nodes.map((n) => {
    const node: GameFlowNode = {
      ...old.get(n.id),
      id: n.id,
      type: 'game',
      position: positions?.[n.id] ?? n.position,
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
  }));
}

export function Canvas() {
  const project = useProjectStore((s) => s.project);
  const graph = useProjectStore((s) => s.project.graphs[s.activeGraphId]);
  const moveNodes = useProjectStore((s) => s.moveNodes);
  const setViewPositions = useProjectStore((s) => s.setViewPositions);
  const updateNodes = useProjectStore((s) => s.updateNodes);
  const removeNodes = useProjectStore((s) => s.removeNodes);
  const removeEdges = useProjectStore((s) => s.removeEdges);
  const openNode = useProjectStore((s) => s.openNode);

  const view = useUiStore((s) => s.view);
  const pathStep = useUiStore((s) => s.pathStep);
  const filter = useUiStore((s) => s.filter);
  const selectedNodeIds = useUiStore((s) => s.selectedNodeIds);
  const draggingIds = useUiStore((s) => s.draggingIds);
  const setDraggingIds = useUiStore((s) => s.setDraggingIds);
  const setSelection = useUiStore((s) => s.setSelection);
  const selectRequest = useUiStore((s) => s.selectRequest);
  const focusRequest = useUiStore((s) => s.focusRequest);
  const startConnect = useUiStore((s) => s.startConnect);
  const notify = useUiStore((s) => s.notify);
  const onionHeuristic = useSettingsStore((s) => s.onionHeuristic);
  const { fitView } = useReactFlow();

  const live = useMemo(() => new Set(draggingIds), [draggingIds]);
  const layout = useMemo(
    () => computeLayout(view, graph?.nodes ?? [], project.viewPositions, live),
    [view, graph, project.viewPositions, live],
  );

  const display = useMemo(
    () =>
      computeDisplay({
        nodes: graph?.nodes ?? [],
        edges: graph?.edges ?? [],
        view,
        pathStep,
        filter,
        coreOnly: project.coreOnly === true,
        selectedNodeIds,
        onionHeuristic,
      }),
    [graph, view, pathStep, filter, project.coreOnly, selectedNodeIds, onionHeuristic],
  );

  // React Flow keeps its own copy (measured sizes, selection, drag state).
  // The project store is the source of truth, so we copy from it whenever it changes.
  const [nodes, setNodes] = useState<GameFlowNode[]>(() =>
    toFlowNodes(graph, [], layout.positions),
  );
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(graph, []));
  const [syncedLayout, setSyncedLayout] = useState(layout);
  // Starts at null so a request made just before this canvas opened (search, validation) still applies.
  const [syncedRequest, setSyncedRequest] = useState<SelectRequest | null>(null);
  if (layout !== syncedLayout || selectRequest !== syncedRequest) {
    const select =
      selectRequest !== syncedRequest && selectRequest ? new Set(selectRequest.ids) : undefined;
    setSyncedLayout(layout);
    setSyncedRequest(selectRequest);
    setNodes(toFlowNodes(graph, nodes, layout.positions, select));
    setEdges(toFlowEdges(graph, edges));
  }

  // Edge colors and fading depend on the view, so they are applied on top of the synced edges.
  const displayEdges = useMemo(() => {
    const kinds = new Map(graph?.edges.map((e) => [e.id, e.kind]));
    return edges.map((e) => {
      const kind = kinds.get(e.id) ?? 'feeds';
      const warn = display.warnEdges.has(e.id);
      const inChain = display.chain?.edges.has(e.id) === true;
      const faded = !inChain && (display.dimmed.has(e.source) || display.dimmed.has(e.target));
      const color = warn ? WARNING_COLOR : edgeColor(kind);
      const style = { ...edgeLineStyle(kind, color), opacity: faded ? 0.2 : 1 };
      if (warn || inChain) style.strokeWidth = (style.strokeWidth as number) + 1;
      return {
        ...e,
        style,
        markerEnd: edgeMarker(kind, color),
        labelStyle: { fill: color, fontWeight: 600 },
        zIndex: warn || inChain ? 10 : 0,
      };
    });
  }, [edges, graph, display]);

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
      const moved: Record<string, Point> = {};
      const removed: string[] = [];
      for (const change of changes) {
        if (change.type === 'position' && change.position) moved[change.id] = change.position;
        else if (change.type === 'remove') removed.push(change.id);
      }
      if (Object.keys(moved).length > 0) {
        if (view === 'graph') moveNodes(moved);
        else setViewPositions(view, moved);
      }
      if (removed.length > 0) removeNodes(removed);
    },
    [view, moveNodes, setViewPositions, removeNodes],
  );

  // In the Onion and MDA views, dropping a node somewhere changes what it is.
  const onNodeDragStart = useCallback(
    (_event: unknown, _node: GameFlowNode, dragged: GameFlowNode[]) => {
      if (view !== 'graph') setDraggingIds(dragged.map((n) => n.id));
    },
    [view, setDraggingIds],
  );

  const onNodeDragStop = useCallback(
    (_event: unknown, _node: GameFlowNode, dragged: GameFlowNode[]) => {
      if (view === 'graph') return;
      const patches: Record<string, Partial<GameNode>> = {};
      const byId = new Map(graph?.nodes.map((n) => [n.id, n]));
      for (const flowNode of dragged) {
        const current = byId.get(flowNode.id);
        if (!current) continue;
        if (view === 'onion' && layout.onion) {
          const layer = classifyOnion(flowNode.position, layout.onion) ?? undefined;
          if (layer !== current.layer) patches[current.id] = { layer };
        } else if (view === 'mda' && layout.mda) {
          const mda = classifyMda(flowNode.position, layout.mda);
          if (mda !== current.mda) patches[current.id] = { mda };
        }
      }
      if (Object.keys(patches).length > 0) updateNodes(patches);
      setDraggingIds([]);
    },
    [view, graph, layout, updateNodes, setDraggingIds],
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
    const { project: p, activeGraphId } = useProjectStore.getState();
    const g = p.graphs[activeGraphId];
    return {
      project: p,
      graph: g,
      from: g?.nodes.find((n) => n.id === a),
      to: g?.nodes.find((n) => n.id === b),
    };
  };

  const isValidConnection = useCallback((connection: Edge | Connection) => {
    const { project: p, graph: g, from, to } = findNodes(connection.source, connection.target);
    if (!g || !from || !to || from.id === to.id) return false;
    return allowedEdgeKinds(from, to, p.customKinds, g.edges).length > 0;
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
      const { project: p, from, to } = findNodes(state.fromNode.id, state.toNode.id);
      if (from && to) notify(explainNoEdge(from, to, p.customKinds));
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
      const { project: p, activeGraphId } = useProjectStore.getState();
      const ids = new Set(doomed.map((n) => n.id));
      const gameNodes = p.graphs[activeGraphId]?.nodes.filter((n) => ids.has(n.id)) ?? [];
      if (countInsideNodes(p, gameNodes) === 0) return { nodes: doomed, edges: doomedEdges };
      const withInside = gameNodes.filter((n) => countInsideNodes(p, [n]) > 0).length;
      const ok = await useUiStore
        .getState()
        .askConfirm(strings.confirm.removeWithInside(withInside), strings.confirm.ok);
      return ok ? { nodes: doomed, edges: doomedEdges } : false;
    },
    [],
  );

  return (
    <div className="canvas" data-view={view}>
      <ViewUnderlay layout={layout} />
      <DisplayContext.Provider value={display}>
        <ReactFlow
          nodes={nodes}
          edges={displayEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
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
          minZoom={0.05}
        >
          {view === 'graph' && <Background />}
          <Controls />
          <MiniMap pannable zoomable />
          <Panel position="top-center" className="canvas-toolbar">
            <ViewSwitcher />
            <FilterBar />
            {view === 'graph' && <AutoLayoutButton />}
          </Panel>
          <Panel position="bottom-left" className="legend-panel">
            <EdgeLegend />
          </Panel>
        </ReactFlow>
      </DisplayContext.Provider>
    </div>
  );
}
