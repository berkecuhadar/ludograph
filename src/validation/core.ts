import { strings } from '../lib/strings';
import { issue, titleOf, type Issue, type RuleContext } from './types';

// Mechanics exist, but none of them is in layer 0.
export function emptyCore(ctx: RuleContext): Issue[] {
  const mechanics = ctx.graph.nodes.filter((n) => n.mda === 'mechanics' && n.kind !== 'note');
  if (mechanics.length === 0 || mechanics.some((n) => n.layer === 0)) return [];
  return [issue('emptyCore', 'warning', ctx, [], strings.validation.messages.emptyCore)];
}

// A core mechanic should stay small. Counts mechanic and action nodes in layer 0.
export function heavyCore(ctx: RuleContext): Issue[] {
  const heavy = ctx.graph.nodes.filter(
    (n) => n.layer === 0 && (n.kind === 'mechanic' || n.kind === 'action'),
  );
  if (heavy.length <= ctx.settings.heavyCoreLimit) return [];
  return [
    issue(
      'heavyCore',
      'info',
      ctx,
      heavy.map((n) => n.id),
      strings.validation.messages.heavyCore(heavy.length, ctx.settings.heavyCoreLimit),
    ),
  ];
}

// A core loop has to be fed or triggered by something, and has to feed or trigger something.
export function coreLoopFlow(ctx: RuleContext): Issue[] {
  const m = strings.validation.messages;
  const flows = (kind: string) => kind === 'feeds' || kind === 'triggers';
  return ctx.graph.nodes
    .filter((n) => n.kind === 'coreLoop')
    .flatMap((n) => {
      const hasIn = ctx.graph.edges.some((e) => e.target === n.id && flows(e.kind));
      const hasOut = ctx.graph.edges.some((e) => e.source === n.id && flows(e.kind));
      if (hasIn && hasOut) return [];
      const title = titleOf(n, ctx);
      let message = m.coreLoopFlowBoth(title);
      if (hasOut) message = m.coreLoopFlowIn(title);
      else if (hasIn) message = m.coreLoopFlowOut(title);
      return [issue('coreLoopFlow', 'warning', ctx, [n.id], message)];
    });
}
