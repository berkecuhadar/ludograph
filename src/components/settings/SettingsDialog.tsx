import { strings } from '../../lib/strings';
import { useSettingsStore } from '../../store/settingsStore';
import { useUiStore } from '../../store/uiStore';
import { Modal } from '../Modal';
import { CustomKindsEditor } from './CustomKindsEditor';
import './SettingsDialog.css';

function ValidationSettings() {
  const t = strings.settings;
  const onionHeuristic = useSettingsStore((s) => s.onionHeuristic);
  const heavyCoreLimit = useSettingsStore((s) => s.heavyCoreLimit);
  const update = useSettingsStore((s) => s.update);

  return (
    <section className="settings-section">
      <h3>{t.validation}</h3>
      <label className="check">
        <input
          type="checkbox"
          checked={onionHeuristic}
          onChange={(e) => update({ onionHeuristic: e.target.checked })}
        />
        {t.onionHeuristic}
      </label>
      <p className="muted hint">{t.onionHeuristicHint}</p>
      <label className="field">
        <span className="field-label">{t.heavyCoreLimit}</span>
        <input
          type="number"
          min={1}
          value={heavyCoreLimit}
          onChange={(e) => {
            const value = Math.floor(Number(e.target.value));
            if (value >= 1) update({ heavyCoreLimit: value });
          }}
        />
      </label>
      <p className="muted hint">{t.heavyCoreLimitHint}</p>
    </section>
  );
}

export function SettingsDialog() {
  const open = useUiStore((s) => s.dialog === 'settings');
  const setDialog = useUiStore((s) => s.setDialog);
  const close = () => setDialog(null);

  return (
    <Modal open={open} title={strings.settings.title} onClose={close} wide>
      <div className="modal-body settings">
        <h2>{strings.settings.title}</h2>
        <ValidationSettings />
        <CustomKindsEditor />
        <button type="button" onClick={close}>
          {strings.settings.close}
        </button>
      </div>
    </Modal>
  );
}
