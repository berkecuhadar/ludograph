import { useMemo } from 'react';
import { allNodes, STEP_ORDER, summarizeStep, type StepId } from '../designPath/steps';
import { strings } from '../lib/strings';
import type { DesignOrder } from '../model/types';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import './DesignPathPanel.css';

const ORDERS: DesignOrder[] = ['outsideIn', 'coreFirst'];

function stepLabel(step: StepId, order: DesignOrder): string {
  const label = strings.designPath.stepLabels[step];
  const isCheck = order === 'coreFirst' && (step === 'experience' || step === 'personas');
  return isCheck ? `${label} (${strings.designPath.check})` : label;
}

export function DesignPathPanel() {
  const t = strings.designPath;
  const project = useProjectStore((s) => s.project);
  const setDesignOrder = useProjectStore((s) => s.setDesignOrder);
  const setCoreOnly = useProjectStore((s) => s.setCoreOnly);
  const pathStep = useUiStore((s) => s.pathStep);
  const setPathStep = useUiStore((s) => s.setPathStep);

  const order = project.designOrder;
  const nodes = useMemo(() => allNodes(project), [project]);
  const rows = useMemo(
    () => STEP_ORDER[order].map((step) => ({ step, summary: summarizeStep(step, nodes) })),
    [order, nodes],
  );

  return (
    <div className="path">
      <fieldset className="path-order">
        <legend className="field-label">{t.order}</legend>
        {ORDERS.map((o) => (
          <label key={o}>
            <input
              type="radio"
              name="design-order"
              checked={order === o}
              onChange={() => setDesignOrder(o)}
            />
            {t.orders[o]}
          </label>
        ))}
        <p className="muted hint">{t.orderHints[order]}</p>
      </fieldset>

      <label className="check">
        <input
          type="checkbox"
          checked={project.coreOnly === true}
          onChange={(e) => setCoreOnly(e.target.checked)}
        />
        {t.coreOnly}
      </label>
      <p className="muted hint">{t.coreOnlyHint}</p>

      <ol className="steps">
        {rows.map(({ step, summary }, i) => {
          const active = pathStep === step;
          return (
            <li key={step} data-active={active} data-done={summary.complete}>
              <div className="step-head">
                <span className="step-number">{i + 1}</span>
                <strong>{stepLabel(step, order)}</strong>
                <span className="step-count">{summary.count}</span>
              </div>
              <ul className="step-notes">
                {summary.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
                {summary.complete && <li className="step-ok">{t.complete}</li>}
              </ul>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => setPathStep(active ? null : step)}
              >
                {active ? t.unfocus : t.focus}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
