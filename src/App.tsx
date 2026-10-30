import { ReactFlowProvider } from '@xyflow/react';
import { Breadcrumb } from './components/Breadcrumb';
import { Canvas } from './components/Canvas';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ConnectDialog } from './components/ConnectDialog';
import { ErrorsDialog } from './components/ErrorsDialog';
import { Header } from './components/Header';
import { HelpDialog } from './components/HelpDialog';
import { Notice } from './components/Notice';
import { Palette } from './components/Palette';
import { QuickAdd } from './components/QuickAdd';
import { SearchDialog } from './components/SearchDialog';
import { SettingsDialog } from './components/settings/SettingsDialog';
import { Shortcuts } from './components/Shortcuts';
import { Sidebar } from './components/Sidebar';
import { ValidationRunner } from './components/ValidationRunner';
import { useProjectStore } from './store/projectStore';
import { useUiStore } from './store/uiStore';

export function App() {
  // The canvas is keyed by graph and view, so each one opens fresh and fitted to its content.
  const activeGraphId = useProjectStore((s) => s.activeGraphId);
  const view = useUiStore((s) => s.view);

  return (
    <ReactFlowProvider>
      <div className="app">
        <Header />
        <Breadcrumb />
        <div className="app-body">
          <Palette />
          <Canvas key={`${activeGraphId}:${view}`} />
          <Sidebar />
        </div>
      </div>
      <ValidationRunner />
      <Shortcuts />
      <QuickAdd />
      <SearchDialog />
      <HelpDialog />
      <SettingsDialog />
      <ConnectDialog />
      <ConfirmDialog />
      <ErrorsDialog />
      <Notice />
    </ReactFlowProvider>
  );
}
