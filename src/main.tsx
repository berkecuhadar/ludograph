import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadInitialProject, startAutosave } from './lib/persistence';
import { useProjectStore } from './store/projectStore';
import { useUiStore } from './store/uiStore';
import './styles/tokens.css';
import './styles/base.css';
import './styles/forms.css';

// Open what was saved last time, or an empty project the first time.
const initial = loadInitialProject();
useProjectStore.getState().loadProject(initial.project);
if (initial.notice) useUiStore.getState().notify(initial.notice);
startAutosave();

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
