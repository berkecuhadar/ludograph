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
  useUiStore.setState({ mode: 'graph', dialog: null, view: 'graph' });
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

  it('switches to the document and back without losing either', () => {
    useProjectStore.getState().loadProject(sample().project);
    const el = mount();
    act(() => useUiStore.getState().setMode('document'));
    expect(el.querySelector('.doc-view')).not.toBeNull();
    expect(el.querySelector('.canvas')).toBeNull();
    expect(el.querySelector('.doc-preview h1')?.textContent).toBe('Sample game');

    act(() => useProjectStore.getState().setGddValue('title', 'Cloud Keeper'));
    act(() => useProjectStore.getState().setGddValue('pillars', 'Calm. Curious.'));
    expect(el.querySelector('.doc-preview h1')?.textContent).toBe('Cloud Keeper');
    expect(el.querySelectorAll('.doc-pillars li')).toHaveLength(2);

    act(() => useUiStore.getState().setMode('graph'));
    expect(el.querySelector('.canvas')).not.toBeNull();
    expect(el.querySelector('.doc-view')).toBeNull();
    expect(useProjectStore.getState().project.gdd?.values.title).toBe('Cloud Keeper');
  });

  it('shows the fields of an optional section only when it is switched on', () => {
    useProjectStore.getState().loadProject(createProject('Docs'));
    const el = mount();
    act(() => useUiStore.getState().setMode('document'));
    expect(el.textContent).not.toContain('Backstory and universe');
    const box = [...el.querySelectorAll<HTMLInputElement>('.doc-question input')][0];
    act(() => box?.click());
    expect(useProjectStore.getState().project.gdd?.enabled.story).toBe(true);
    expect(el.textContent).toContain('Backstory and universe');
    expect(el.querySelector('.doc-preview')?.textContent).toContain('Backstory and universe');
  });

  it('opens the templates dialog and offers the three templates', () => {
    useProjectStore.getState().loadProject(createProject('Docs'));
    const el = mount();
    act(() => useUiStore.getState().setMode('document'));
    act(() => useUiStore.getState().setDialog('templates'));
    expect(el.querySelectorAll('.templates li')).toHaveLength(3);
  });

  it('offers a button to pull text from the graph next to the fields that can have it', () => {
    useProjectStore.getState().loadProject(sample().project);
    const el = mount();
    act(() => useUiStore.getState().setMode('document'));
    const buttons = [...el.querySelectorAll('.doc-field-tools button')].map((b) => b.textContent);
    expect(buttons).toContain('From graph');
    expect(buttons).toContain('Create pillar nodes');
  });

  it('imports nodes from a chosen Unity folder', async () => {
    useProjectStore.getState().loadProject(createProject());
    const el = mount();
    act(() => useUiStore.getState().setDialog('unityImport'));

    const code = (name: string, text: string, path: string) => {
      const file = new File([text], name);
      Object.defineProperty(file, 'webkitRelativePath', { value: path });
      return file;
    };
    const files = [
      code('Mover.cs', 'public class Mover : MonoBehaviour { }', 'Assets/Scripts/Mover.cs'),
      code('Ui.cs', 'public class HudUI : MonoBehaviour { }', 'Assets/Scripts/Ui.cs'),
      code('Skip.cs', 'public class Skipped : MonoBehaviour { }', 'Assets/Editor/Skip.cs'),
    ];
    const input = el.querySelector<HTMLInputElement>('.unity-import input[type="file"]');
    expect(input).not.toBeNull();
    Object.defineProperty(input, 'files', { value: files, configurable: true });
    await act(async () => {
      input?.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const labels = [...el.querySelectorAll('.unity-list strong')].map((n) => n.textContent);
    expect(labels.sort()).toEqual(['HudUI', 'Mover']);

    const skip = el.querySelector<HTMLInputElement>('.unity-text input');
    expect(skip).not.toBeNull();
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      set?.call(skip, 'UI$');
      skip?.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect([...el.querySelectorAll('.unity-list strong')].map((n) => n.textContent)).toEqual([
      'Mover',
    ]);

    const buttons = [
      ...el.querySelectorAll<HTMLButtonElement>('.unity-import .dialog-actions button'),
    ];
    await act(async () => buttons[buttons.length - 1]?.click());
    const root_ = useProjectStore.getState().project;
    const titles = root_.graphs[root_.rootGraphId]?.nodes.map((n) => n.title);
    expect(titles).toEqual(['Mover']);
    expect(useUiStore.getState().dialog).toBeNull();
  });
});
