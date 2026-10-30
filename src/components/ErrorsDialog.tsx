import { strings } from '../lib/strings';
import { useUiStore } from '../store/uiStore';
import { Modal } from './Modal';
import './ErrorsDialog.css';

export function ErrorsDialog() {
  const open = useUiStore((s) => s.dialog === 'errors');
  const errors = useUiStore((s) => s.importErrors);
  const setDialog = useUiStore((s) => s.setDialog);
  const close = () => setDialog(null);

  return (
    <Modal open={open} title={strings.file.errorsTitle} onClose={close} wide>
      <div className="modal-body">
        <h2>{strings.file.errorsTitle}</h2>
        <p className="muted">{strings.file.errorsIntro}</p>
        <ul className="error-list mono">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
        <div className="dialog-actions">
          <button type="button" onClick={close}>
            {strings.file.close}
          </button>
        </div>
      </div>
    </Modal>
  );
}
