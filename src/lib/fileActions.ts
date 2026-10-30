import { exportCanvasImage } from '../export/image';
import { exportMarkdown } from '../export/markdown';
import { exportUnityJson } from '../export/unity';
import { createProject } from '../model/factory';
import { parseProjectText } from '../model/schema';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { downloadText, fileSlug } from './files';
import { strings } from './strings';

const project = () => useProjectStore.getState().project;
const ui = () => useUiStore.getState();

export function saveFile() {
  const name = `${fileSlug(project().name)}.ludograph.json`;
  downloadText(name, `${JSON.stringify(project(), null, 2)}\n`);
  ui().notify(strings.file.saved(name));
}

export function exportMarkdownFile() {
  const name = `${fileSlug(project().name)}-gdd.md`;
  downloadText(name, exportMarkdown(project()), 'text/markdown');
  ui().notify(strings.file.exported(name));
}

export function exportUnityFile() {
  const name = `${fileSlug(project().name)}.unity.json`;
  downloadText(name, exportUnityJson(project()));
  ui().notify(strings.file.exported(name));
}

export async function exportImageFile(kind: 'png' | 'svg', fitView: () => Promise<boolean>) {
  const name = `${fileSlug(project().name)}-${useUiStore.getState().view}.${kind}`;
  try {
    await fitView();
    await exportCanvasImage(kind, name);
    ui().notify(strings.file.exported(name));
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    ui().notify(strings.file.exportFailed(reason));
  }
}

export async function newProject() {
  if (!(await ui().askConfirm(strings.file.confirmNew, strings.file.startNew))) return;
  useProjectStore.getState().loadProject(createProject());
}

export async function openFile(file: File) {
  const result = parseProjectText(await file.text());
  if (!result.ok) {
    ui().showImportErrors(result.errors);
    return;
  }
  const message = strings.file.confirmOpen(result.project.name);
  if (!(await ui().askConfirm(message, strings.file.openAnyway))) return;
  useProjectStore.getState().loadProject(result.project);
}
