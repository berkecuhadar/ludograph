import { GRAPH_SOURCES, pillarsToCreate } from '../gdd/fromGraph';
import { parseOpenGdd, toOpenGdd } from '../gdd/openGdd';
import { emptyGdd, hasContent } from '../gdd/sections';
import { applyTemplate, type Template } from '../gdd/templates';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { downloadText, fileSlug } from './files';
import { strings } from './strings';

const store = () => useProjectStore.getState();
const ui = () => useUiStore.getState();
const t = strings.document;

// Fills a field with text built from the graph. Asks before replacing text you wrote.
export async function pullFromGraph(fieldId: string) {
  const source = GRAPH_SOURCES[fieldId];
  if (!source) return;
  const text = source.build(store().project);
  if (!text) {
    ui().notify(t.nothingToPull);
    return;
  }
  const current = (store().project.gdd?.values[fieldId] ?? '').trim();
  if (current && current !== text && !(await ui().askConfirm(t.confirmReplace, t.replace))) return;
  store().setGddValue(fieldId, text);
}

// One pillar node for each pillar in the pillars line that does not have one yet.
export function createPillarNodes() {
  const { project } = store();
  const titles = pillarsToCreate(project, project.gdd?.values.pillars ?? '');
  ui().notify(t.createdPillars(store().addPillarNodes(titles)));
}

export async function startFromTemplate(template: Template, mode: 'full' | 'skeleton') {
  if (
    hasContent(store().project.gdd) &&
    !(await ui().askConfirm(t.confirmTemplate, t.useTemplate))
  ) {
    return;
  }
  store().setGdd(applyTemplate(template, mode));
  ui().setDialog(null);
}

export async function importOpenGddFile(file: File) {
  const result = parseOpenGdd(await file.text());
  if (!result.ok) {
    ui().showImportErrors([result.error]);
    return;
  }
  if (hasContent(store().project.gdd) && !(await ui().askConfirm(t.confirmImport, t.replace))) {
    return;
  }
  store().setGdd(result.gdd);
  ui().notify(t.importDone);
}

export function exportOpenGddFile() {
  const { project } = store();
  const name = `${fileSlug(project.gdd?.values.title || project.name)}.opengdd.json`;
  downloadText(name, toOpenGdd(project.gdd ?? emptyGdd()));
  ui().notify(t.exported(name));
}
