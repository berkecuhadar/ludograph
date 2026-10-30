import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { App } from './App';
import { createGraph, createNode, createProject } from './model/factory';
import type { Project } from './model/types';
import { useProjectStore } from './store/projectStore';
import { useUiStore } from './store/uiStore';

// jsdom has no layout engine. These stand-ins are just enough for React Flow to mount.
beforeAll(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globalThis.ResizeObserver ??= Observer as unknown as typeof ResizeObserver;
  globalThis.DOMMatrixReadOnly ??= class {
    m22 = 1;
  } as unknown as typeof DOMMatrixReadOnly;
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  };
});

let root: Root | undefined;
let host: HTMLElement | undefined;

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
});

// A small project with every kind of thing the screen has to draw: a chain from
// mechanic to aesthetic, a node in each outer layer and a node with a graph inside.
function sample(): { project: Project; outerId: string; innerGraphId: string } {
  const project = createProject('Sample game');
  const root = project.graphs[project.rootGraphId];
  if (!root) throw new Error('setup');
  const at = (x: number) => ({ x, y: 0 });
  const vote = createNode('action', at(0), [], { title: 'Vote' });
  const dyn = createNode('dynamic', at(300), [], { title: 'Accusation' });
  const feel = createNode('aesthetic', at(600), [], { title: 'Fellowship' });
  const meta = createNode('mechanic', at(0), [], { title: 'Daily gift', layer: 1 });
  const rep = createNode('progression', at(300), [], { title: 'Reputation' });
  const story = createNode('narrative', at(600), [], { title: 'Trial' });
  const outer = createNode('mechanic', at(900), [], { title: 'Voting' });

  const inner = createGraph('Voting', outer.id);
  inner.nodes.push(createNode('state', at(0), [], { title: 'Count' }));
  outer.childGraphId = inner.id;
  project.graphs[inner.id] = inner;

  root.nodes.push(vote, dyn, feel, meta, rep, story, outer);
  root.edges.push(
    { id: 'e1', kind: 'leadsTo', source: vote.id, target: dyn.id },
    { id: 'e2', kind: 'leadsTo', source: dyn.id, target: feel.id },
    { id: 'e3', kind: 'requires', source: vote.id, target: story.id },
  );
  return { project, outerId: outer.id, innerGraphId: inner.id };
}

function mount() {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  act(() => root?.render(<App />));
  return host;
}

describe('App', () => {
  it('opens with the project on screen', () => {
    useProjectStore.getState().loadProject(sample().project);
    const el = mount();
    expect(el.textContent).toContain('Ludograph');
    expect(el.querySelector('.react-flow')).not.toBeNull();
    expect(el.querySelector('.palette')).not.toBeNull();
    expect(el.querySelector('.sidebar')).not.toBeNull();
    expect(el.querySelector('.breadcrumb')?.textContent).toContain('Main');
  });

  it('opens an empty project without crashing', () => {
    useProjectStore.getState().loadProject(createProject());
    const el = mount();
    expect(el.querySelector('.react-flow')).not.toBeNull();
  });

  it('switches between the three views without crashing', () => {
    useProjectStore.getState().loadProject(sample().project);
    const el = mount();
    for (const view of ['onion', 'mda', 'graph'] as const) {
      act(() => useUiStore.getState().setView(view));
      expect(el.querySelector('.canvas')?.getAttribute('data-view')).toBe(view);
    }
    act(() => useUiStore.getState().setView('onion'));
    expect(el.querySelector('.underlay')).not.toBeNull();
    act(() => useUiStore.getState().setView('graph'));
  });

  it('shows the design path and validation panels', () => {
    useProjectStore.getState().loadProject(sample().project);
    const el = mount();
    act(() => useUiStore.getState().setSidebarTab('path'));
    expect(el.querySelector('.path')?.textContent).toContain('Experience');
    act(() => useUiStore.getState().setSidebarTab('validation'));
    expect(el.querySelector('.validation')).not.toBeNull();
    act(() => useUiStore.getState().setSidebarTab('inspector'));
  });

  it('goes inside a node and back out through the breadcrumb', () => {
    const { project, innerGraphId } = sample();
    useProjectStore.getState().loadProject(project);
    const el = mount();
    act(() => useProjectStore.getState().setActiveGraph(innerGraphId));
    expect(el.querySelector('.breadcrumb')?.textContent).toContain('Voting');
    const back = el.querySelector<HTMLButtonElement>('.breadcrumb button');
    act(() => back?.click());
    expect(useProjectStore.getState().activeGraphId).toBe(project.rootGraphId);
  });
});
