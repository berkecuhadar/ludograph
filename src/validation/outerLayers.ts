import { strings } from '../lib/strings';
import { issue, titleOf, type Issue, type RuleContext } from './types';

export function unestimatedNarrative(ctx: RuleContext): Issue[] {
  return ctx.graph.nodes
    .filter((n) => n.kind === 'narrative' && !n.contentCost)
    .map((n) =>
      issue(
        'unestimatedNarrative',
        'warning',
        ctx,
        [n.id],
        strings.validation.messages.unestimatedNarrative(titleOf(n, ctx)),
      ),
    );
}

export function unscopedOuterLayer(ctx: RuleContext): Issue[] {
  return ctx.graph.nodes
    .filter((n) => (n.layer === 2 || n.layer === 3) && !n.prototypeScope)
    .map((n) =>
      issue(
        'unscopedOuterLayer',
        'info',
        ctx,
        [n.id],
        strings.validation.messages.unscopedOuterLayer(titleOf(n, ctx), n.layer ?? 0),
      ),
    );
}

export function secondaryWithoutHook(ctx: RuleContext): Issue[] {
  return ctx.graph.nodes
    .filter((n) => n.layer === 1 && !n.returnHook?.trim())
    .map((n) =>
      issue(
        'secondaryWithoutHook',
        'info',
        ctx,
        [n.id],
        strings.validation.messages.secondaryWithoutHook(titleOf(n, ctx)),
      ),
    );
}
