import { strings } from '../lib/strings';
import { useUiStore } from '../store/uiStore';
import { Modal } from './Modal';
import './HelpDialog.css';

export function HelpDialog() {
  const open = useUiStore((s) => s.dialog === 'help');
  const setDialog = useUiStore((s) => s.setDialog);
  const close = () => setDialog(null);

  return (
    <Modal open={open} title={strings.help.title} onClose={close}>
      <div className="modal-body help">
        <h2>{strings.help.title}</h2>
        <dl>
          {strings.help.shortcuts.map((s) => (
            <div key={s.keys} className="help-row">
              <dt>
                <kbd>{s.keys}</kbd>
              </dt>
              <dd>{s.label}</dd>
            </div>
          ))}
        </dl>
        <p className="help-note">{strings.help.note}</p>
        <button type="button" onClick={close}>
          {strings.help.close}
        </button>
      </div>
    </Modal>
  );
}
