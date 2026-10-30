import { useReactFlow } from '@xyflow/react';
import { strings } from '../lib/strings';
import { useProjectStore } from '../store/projectStore';
import './Toolbar.css';

export function AutoLayoutButton() {
  const autoLayout = useProjectStore((s) => s.autoLayout);
  const { fitView } = useReactFlow();

  return (
    <button
      type="button"
      className="toolbar-button"
      title={strings.views.autoLayoutHint}
      onClick={() => {
        autoLayout();
        // Wait for the nodes to move before fitting the view around them.
        setTimeout(() => void fitView({ duration: 300, padding: 0.1 }), 50);
      }}
    >
      {strings.views.autoLayout}
    </button>
  );
}
