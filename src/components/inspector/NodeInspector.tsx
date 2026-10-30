import { strings } from '../../lib/strings';
import {
  AESTHETIC_TYPES,
  CONTENT_COSTS,
  MDA_AXES,
  PROTOTYPE_SCOPES,
  RESOURCE_ROLES,
  STATUSES,
  type GameNode,
  type Layer,
} from '../../model/types';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { Field, SelectField } from './fields';
import { MarkdownField } from './MarkdownField';
import { OceanEditor } from './OceanEditor';
import { ParamsEditor } from './ParamsEditor';
import { TagsEditor } from './TagsEditor';

const LAYERS: Layer[] = [0, 1, 2, 3];

export function NodeInspector({ node }: { node: GameNode }) {
  const t = strings.inspector;
  const updateNode = useProjectStore((s) => s.updateNode);
  const removeNodes = useProjectStore((s) => s.removeNodes);
  const duplicateNodes = useProjectStore((s) => s.duplicateNodes);
  const requestSelect = useUiStore((s) => s.requestSelect);

  const set = (patch: Partial<GameNode>, coalesceKey?: string) =>
    updateNode(node.id, patch, coalesceKey ? { coalesce: `${coalesceKey}:${node.id}` } : undefined);

  const showScope = node.layer === 2 || node.layer === 3;

  return (
    <div className="inspector-form">
      <Field label={t.nodeTitle}>
        <input
          type="text"
          value={node.title}
          onChange={(e) => set({ title: e.target.value }, 'title')}
        />
      </Field>

      <MarkdownField
        value={node.description}
        onChange={(description) => set({ description }, 'description')}
      />

      <SelectField
        label={t.status}
        value={node.status}
        options={STATUSES}
        labels={strings.status}
        onChange={(status) => status && set({ status })}
      />

      <div className="field-row">
        <SelectField
          label={t.mda}
          value={node.mda}
          options={MDA_AXES}
          labels={strings.mda}
          onChange={(mda) => mda && set({ mda })}
        />
        <Field label={t.layer}>
          <select
            value={node.layer === undefined ? '' : String(node.layer)}
            onChange={(e) =>
              set({ layer: e.target.value === '' ? undefined : (Number(e.target.value) as Layer) })
            }
          >
            <option value="">{t.noLayer}</option>
            {LAYERS.map((l) => (
              <option key={l} value={l}>
                {l} - {strings.layers[l]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {node.kind === 'aesthetic' && (
        <SelectField
          label={t.aestheticType}
          value={node.aestheticType}
          options={AESTHETIC_TYPES}
          labels={strings.aestheticTypes}
          empty={t.none}
          onChange={(aestheticType) => set({ aestheticType })}
        />
      )}

      {node.kind === 'resource' && (
        <SelectField
          label={t.resourceRole}
          value={node.resourceRole}
          options={RESOURCE_ROLES}
          labels={strings.resourceRoles}
          empty={t.none}
          onChange={(resourceRole) => set({ resourceRole })}
        />
      )}

      {node.kind === 'persona' && (
        <OceanEditor ocean={node.ocean} onChange={(ocean) => set({ ocean })} />
      )}

      {node.kind === 'narrative' && (
        <SelectField
          label={t.contentCost}
          value={node.contentCost}
          options={CONTENT_COSTS}
          labels={strings.contentCosts}
          empty={t.none}
          onChange={(contentCost) => set({ contentCost })}
        />
      )}

      {showScope && (
        <SelectField
          label={t.prototypeScope}
          value={node.prototypeScope}
          options={PROTOTYPE_SCOPES}
          labels={strings.prototypeScopes}
          empty={t.none}
          onChange={(prototypeScope) => set({ prototypeScope })}
        />
      )}

      {node.layer === 1 && (
        <Field label={t.returnHook}>
          <textarea
            rows={3}
            value={node.returnHook ?? ''}
            placeholder={t.returnHookPlaceholder}
            onChange={(e) => set({ returnHook: e.target.value }, 'returnHook')}
          />
        </Field>
      )}

      <TagsEditor tags={node.tags} onChange={(tags) => set({ tags })} />
      <ParamsEditor params={node.params} onChange={(params) => set({ params })} />

      <div className="inspector-actions">
        <button type="button" onClick={() => requestSelect(duplicateNodes([node.id]))}>
          {t.duplicate}
        </button>
        <button type="button" className="danger" onClick={() => removeNodes([node.id])}>
          {t.delete}
        </button>
      </div>
    </div>
  );
}
