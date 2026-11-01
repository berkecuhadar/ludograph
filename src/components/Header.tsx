import { useReactFlow } from '@xyflow/react';
import { useRef } from 'react';
import {
  exportImageFile,
  exportMarkdownFile,
  exportUnityFile,
  newProject,
  openFile,
  saveFile,
} from '../lib/fileActions';
import { strings } from '../lib/strings';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { Menu, type MenuItem } from './Menu';
import './Toolbar.css';

export function Header() {
  const projectName = useProjectStore((s) => s.project.name);
  const setProjectName = useProjectStore((s) => s.setProjectName);
  const canUndo = useProjectStore((s) => s.past.length > 0);
  const canRedo = useProjectStore((s) => s.future.length > 0);
  const undo = useProjectStore((s) => s.undo);
  const redo = useProjectStore((s) => s.redo);
  const setDialog = useUiStore((s) => s.setDialog);
  const mode = useUiStore((s) => s.mode);
  const setMode = useUiStore((s) => s.setMode);
  const { fitView } = useReactFlow();
  const fileInput = useRef<HTMLInputElement>(null);
  const t = strings.file;

  // The pictures are of the canvas, so they only make sense in the graph editor.
  const imageItems: MenuItem[] =
    mode === 'graph'
      ? [
          {
            label: t.exportPng,
            onSelect: () =>
              void exportImageFile('png', () => fitView({ padding: 0.1, duration: 0 })),
          },
          {
            label: t.exportSvg,
            onSelect: () =>
              void exportImageFile('svg', () => fitView({ padding: 0.1, duration: 0 })),
          },
        ]
      : [];

  const items: MenuItem[] = [
    { label: t.new, onSelect: () => void newProject() },
    { label: t.open, onSelect: () => fileInput.current?.click() },
    { label: t.save, onSelect: saveFile },
    { label: t.importUnity, onSelect: () => setDialog('unityImport'), separator: true },
    { label: t.exportMarkdown, onSelect: exportMarkdownFile, separator: true },
    { label: t.exportUnity, onSelect: exportUnityFile },
    ...imageItems,
  ];

  return (
    <header className="app-header">
      <strong>{strings.app.name}</strong>
      <Menu label={t.menu} items={items} />
      <div className="segmented" role="group" aria-label={strings.document.modeLabel}>
        {(['graph', 'document'] as const).map((m) => (
          <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
            {strings.document[m]}
          </button>
        ))}
      </div>
      <input
        className="project-name"
        type="text"
        value={projectName}
        aria-label={t.projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
      <input
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) void openFile(file);
        }}
      />
      <span className="app-spacer" />
      <button type="button" onClick={() => setDialog('search')}>
        {strings.header.search}
      </button>
      <button type="button" onClick={undo} disabled={!canUndo}>
        {strings.header.undo}
      </button>
      <button type="button" onClick={redo} disabled={!canRedo}>
        {strings.header.redo}
      </button>
      <button type="button" onClick={() => setDialog('settings')}>
        {strings.header.settings}
      </button>
      <button type="button" onClick={() => setDialog('help')}>
        {strings.header.help}
      </button>
    </header>
  );
}
