import { useEffect } from 'react';
import { useProjectStore } from '../store/projectStore';
import { useSettingsStore } from '../store/settingsStore';
import { useValidationStore } from '../store/validationStore';
import { runValidation } from '../validation';

const DEBOUNCE_MS = 300;

// Re-runs validation a moment after the project or the settings stop changing.
export function ValidationRunner() {
  const project = useProjectStore((s) => s.project);
  const onionHeuristic = useSettingsStore((s) => s.onionHeuristic);
  const heavyCoreLimit = useSettingsStore((s) => s.heavyCoreLimit);
  const setIssues = useValidationStore((s) => s.setIssues);

  useEffect(() => {
    const timer = setTimeout(
      () => setIssues(runValidation(project, { onionHeuristic, heavyCoreLimit })),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [project, onionHeuristic, heavyCoreLimit, setIssues]);

  return null;
}
