import { useRef } from 'react';
import { exportOpenGddFile, importOpenGddFile } from '../../lib/documentActions';
import { strings } from '../../lib/strings';
import { useUiStore } from '../../store/uiStore';
import { DocumentForm } from './DocumentForm';
import { DocumentPreview } from './DocumentPreview';
import './DocumentView.css';

export function DocumentView() {
  const t = strings.document;
  const setDialog = useUiStore((s) => s.setDialog);
  const fileInput = useRef<HTMLInputElement>(null);

  return (
    <div className="doc-view">
      <div className="doc-toolbar">
        <button type="button" onClick={() => setDialog('templates')}>
          {t.templates}
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          {t.importFile}
        </button>
        <button type="button" onClick={exportOpenGddFile}>
          {t.exportFile}
        </button>
        <button type="button" onClick={() => window.print()}>
          {t.print}
        </button>
        <span className="muted doc-note">{t.markdownHint}</span>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) void importOpenGddFile(file);
          }}
        />
      </div>
      <div className="doc-panes">
        <div className="doc-scroll">
          <DocumentForm />
        </div>
        <div className="doc-scroll doc-preview-pane">
          <DocumentPreview />
        </div>
      </div>
    </div>
  );
}
