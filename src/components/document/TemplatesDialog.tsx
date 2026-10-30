import { TEMPLATES } from '../../gdd/templates';
import { startFromTemplate } from '../../lib/documentActions';
import { strings } from '../../lib/strings';
import { useUiStore } from '../../store/uiStore';
import { Modal } from '../Modal';

export function TemplatesDialog() {
  const t = strings.document;
  const open = useUiStore((s) => s.dialog === 'templates');
  const setDialog = useUiStore((s) => s.setDialog);
  const close = () => setDialog(null);

  return (
    <Modal open={open} title={t.templatesTitle} onClose={close} wide>
      <div className="modal-body">
        <h2>{t.templatesTitle}</h2>
        <p className="muted">{t.templatesIntro}</p>
        <ul className="templates">
          {TEMPLATES.map((template) => (
            <li key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <span className="muted"> - {template.genre}</span>
                <p className="muted hint">{template.blurb}</p>
              </div>
              <div className="template-actions">
                <button type="button" onClick={() => void startFromTemplate(template, 'full')}>
                  {t.fillAll}
                </button>
                <button type="button" onClick={() => void startFromTemplate(template, 'skeleton')}>
                  {t.skeleton}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button type="button" onClick={close}>
            {t.close}
          </button>
        </div>
      </div>
    </Modal>
  );
}
