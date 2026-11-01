import { useMemo, useRef, useState } from 'react';
import { pickNodes, isSkippedPath, scanUnity, type SourceFile } from '../cli/unityScan';
import { strings } from '../lib/strings';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { Modal } from './Modal';
import './UnityImportDialog.css';

const list = (text: string) =>
  text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

// Reads every C# file of the chosen folder, except the folders that are always skipped.
async function readFolder(files: FileList): Promise<{ name: string; sources: SourceFile[] }> {
  const all = [...files];
  const name = all[0]?.webkitRelativePath.split('/')[0] ?? '';
  const wanted = all.filter((f) => f.name.endsWith('.cs') && !isSkippedPath(f.webkitRelativePath));
  const sources = await Promise.all(
    wanted.map(async (f) => {
      const parts = f.webkitRelativePath.split('/');
      return {
        path: f.webkitRelativePath,
        text: await f.text(),
        ...(parts.length > 2 ? { folder: parts[parts.length - 2] } : {}),
      };
    }),
  );
  return { name, sources };
}

export function UnityImportDialog() {
  const open = useUiStore((s) => s.dialog === 'unityImport');
  const setDialog = useUiStore((s) => s.setDialog);

  return (
    <Modal open={open} title={strings.unity.title} onClose={() => setDialog(null)} wide>
      <UnityImportBody />
    </Modal>
  );
}

// Its state lives only while the dialog is open, so every opening starts clean.
function UnityImportBody() {
  const t = strings.unity;
  const project = useProjectStore((s) => s.project);
  const applyBatch = useProjectStore((s) => s.applyBatch);
  const setActiveGraph = useProjectStore((s) => s.setActiveGraph);
  const autoLayout = useProjectStore((s) => s.autoLayout);
  const setDialog = useUiStore((s) => s.setDialog);
  const notify = useUiStore((s) => s.notify);
  const picker = useRef<HTMLInputElement>(null);

  const [folder, setFolder] = useState<{ name: string; sources: SourceFile[] } | null>(null);
  const [reading, setReading] = useState(false);
  const [includePlain, setIncludePlain] = useState(false);
  const [refs, setRefs] = useState(false);
  const [skipNames, setSkipNames] = useState('');
  const [skipFolders, setSkipFolders] = useState('');
  const rootWasEmpty = (project.graphs[project.rootGraphId]?.nodes.length ?? 0) === 0;
  const [arrange, setArrange] = useState(rootWasEmpty);
  const [unticked, setUnticked] = useState<ReadonlySet<string>>(new Set());
  const [filter, setFilter] = useState('');
  const [problems, setProblems] = useState<string[]>([]);

  const scan = useMemo(() => {
    if (!folder) return null;
    const skipped = list(skipFolders);
    const sources = folder.sources.filter((f) => !isSkippedPath(f.path, skipped));
    try {
      return {
        result: scanUnity(sources, project, { includePlain, refs, skipNames: list(skipNames) }),
        error: null,
      };
    } catch (error) {
      return { result: null, error: error instanceof Error ? error.message : String(error) };
    }
  }, [folder, project, includePlain, refs, skipNames, skipFolders]);

  const result = scan?.result ?? null;
  const existingIds = useMemo(
    () => new Set(Object.values(project.graphs).flatMap((g) => g.nodes.map((n) => n.id))),
    [project],
  );
  const fresh = useMemo(
    () => (result?.batch.nodes ?? []).filter((n) => n.id !== undefined && !existingIds.has(n.id)),
    [result, existingIds],
  );
  const chosen = useMemo(
    () => new Set(fresh.flatMap((n) => (n.id && !unticked.has(n.id) ? [n.id] : []))),
    [fresh, unticked],
  );
  const picked = useMemo(
    () => (result ? pickNodes(result.batch, project, chosen) : null),
    [result, project, chosen],
  );
  const updated = (picked?.nodes?.length ?? 0) - chosen.size;
  const edgeCount = picked?.edges?.length ?? 0;
  const shown = fresh.filter((n) =>
    (n.title ?? '').toLowerCase().includes(filter.trim().toLowerCase()),
  );

  const choose = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setReading(true);
    setUnticked(new Set());
    setProblems([]);
    setFolder(await readFolder(files));
    setReading(false);
  };

  const toggle = (id: string) =>
    setUnticked((old) => {
      const next = new Set(old);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const run = () => {
    if (!picked) return;
    const outcome = applyBatch(picked);
    if (!outcome.ok) {
      setProblems(outcome.errors);
      return;
    }
    if (arrange) {
      setActiveGraph(project.rootGraphId);
      autoLayout();
    }
    notify(t.done(outcome.addedNodes.length, outcome.addedEdges));
    setDialog(null);
  };

  return (
    <div className="modal-body unity-import">
      <h2>{t.title}</h2>
      <p className="muted">{t.intro}</p>

      <div className="unity-folder">
        <button type="button" onClick={() => picker.current?.click()} disabled={reading}>
          {folder ? t.chooseAnother : t.chooseFolder}
        </button>
        <input
          ref={picker}
          type="file"
          className="sr-only"
          tabIndex={-1}
          // Not in the DOM typings, but supported by every current browser.
          {...{ webkitdirectory: '' }}
          onChange={(e) => {
            const files = e.target.files;
            void choose(files).then(() => {
              e.target.value = '';
            });
          }}
        />
        <span className="muted">
          {reading
            ? t.reading
            : folder
              ? folder.sources.length === 0
                ? t.noScripts
                : t.folderSummary(folder.name, folder.sources.length)
              : ''}
        </span>
      </div>

      {folder && folder.sources.length > 0 && (
        <>
          <fieldset className="unity-options">
            <legend>{t.optionsLegend}</legend>
            <label>
              <input
                type="checkbox"
                checked={includePlain}
                onChange={(e) => setIncludePlain(e.target.checked)}
              />{' '}
              {t.includePlain} <span className="muted">{t.includePlainHint}</span>
            </label>
            <label>
              <input type="checkbox" checked={refs} onChange={(e) => setRefs(e.target.checked)} />{' '}
              {t.refs} <span className="muted">{t.refsHint}</span>
            </label>
            <label className="unity-text">
              {t.skipNames}
              <input
                type="text"
                value={skipNames}
                placeholder={t.skipNamesPlaceholder}
                onChange={(e) => setSkipNames(e.target.value)}
              />
            </label>
            <label className="unity-text">
              {t.skipFolders}
              <input
                type="text"
                value={skipFolders}
                placeholder={t.skipFoldersPlaceholder}
                onChange={(e) => setSkipFolders(e.target.value)}
              />
            </label>
            <p className="muted hint">{t.ignoredNote}</p>
          </fieldset>

          {scan?.error && (
            <p className="unity-error" role="alert">
              {scan.error}
            </p>
          )}

          {result && (
            <>
              <p className="unity-summary">
                {t.summary(chosen.size, Math.max(updated, 0), edgeCount)}
              </p>

              {fresh.length === 0 ? (
                <p className="muted">{t.none}</p>
              ) : (
                <>
                  <div className="unity-list-tools">
                    <input
                      type="search"
                      value={filter}
                      placeholder={t.listFilter}
                      aria-label={t.listFilter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                    <button type="button" onClick={() => setUnticked(new Set())}>
                      {t.selectAll}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setUnticked(new Set(fresh.flatMap((n) => (n.id ? [n.id] : []))))
                      }
                    >
                      {t.selectNone}
                    </button>
                  </div>
                  <ul className="unity-list">
                    {shown.map((n) => (
                      <li key={n.id}>
                        <label>
                          <input
                            type="checkbox"
                            checked={n.id !== undefined && chosen.has(n.id)}
                            onChange={() => n.id && toggle(n.id)}
                          />
                          <strong>{n.title}</strong>
                          <span className="muted">
                            {n.kind}
                            {n.tags && n.tags.length > 1 ? ` - ${n.tags.slice(1).join(', ')}` : ''}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              {result.missing.length > 0 && (
                <p className="muted hint">
                  {t.missing(result.missing.map((m) => m.title).join(', '))}
                </p>
              )}
              {result.warnings.length > 0 && (
                <div className="muted hint">
                  <strong>{t.warnings}</strong>
                  <ul>
                    {result.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </>
      )}

      {problems.length > 0 && (
        <div className="unity-error" role="alert">
          <strong>{t.problems}</strong>
          <ul>
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="dialog-actions">
        <label className="unity-arrange">
          <input type="checkbox" checked={arrange} onChange={(e) => setArrange(e.target.checked)} />{' '}
          {t.arrange}
        </label>
        <span className="app-spacer" />
        <button type="button" onClick={() => setDialog(null)}>
          {t.cancel}
        </button>
        <button
          type="button"
          onClick={run}
          disabled={!picked || (chosen.size === 0 && updated <= 0)}
        >
          {t.importButton(chosen.size)}
        </button>
      </div>
    </div>
  );
}
