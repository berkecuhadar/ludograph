import { strings } from '../lib/strings';
import { useUiStore } from '../store/uiStore';
import { Modal } from './Modal';

export function ConfirmDialog() {
  const open = useUiStore((s) => s.dialog === 'confirm');
  const confirm = useUiStore((s) => s.confirm);
  const resolve = useUiStore((s) => s.resolveConfirm);

  return (
    <Modal open={open} title={confirm?.message ?? ''} onClose={() => resolve(false)}>
      <div className="modal-body">
        <p>{confirm?.message}</p>
        <div className="dialog-actions">
          <button type="button" onClick={() => resolve(false)}>
            {strings.confirm.cancel}
          </button>
          <button type="button" className="danger" autoFocus onClick={() => resolve(true)}>
            {confirm?.okLabel ?? strings.confirm.ok}
          </button>
        </div>
      </div>
    </Modal>
  );
}
