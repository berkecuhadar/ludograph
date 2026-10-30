import { describe, expect, it } from 'vitest';
import { coreLoopFlow, emptyCore, heavyCore } from './core';
import { personaWithoutOcean, unsupportedAesthetic, vagueExperience } from './experience';
import { danglingMechanic, resourceFlow } from './flow';
import { crossesOnion, onionHeuristic } from './onionHeuristic';
import { secondaryWithoutHook, unestimatedNarrative, unscopedOuterLayer } from './outerLayers';
import { duplicateTitles, implementedRequiresIdea, orphan, requiresCycle } from './structure';
import { ctxOf, e, n } from './testkit';

describe('onionHeuristic', () => {
  it('flags a core node that requires an outer layer, at every distance', () => {
    const core = n('mechanic');
    for (const outer of [n('mechanic', { layer: 1 }), n('item'), n('narrative')]) {
      const found = onionHeuristic(ctxOf([core, outer], [e('requires', core, outer)]));
      expect(found).toHaveLength(1);
      expect(found[0]?.severity).toBe('warning');
      expect(found[0]?.nodeIds).toEqual([core.id, outer.id]);
    }
  });

  it('flags layer 1 requiring 2 or 3, and 2 requiring 3', () => {
    const secondary = n('mechanic', { layer: 1 });
    const prog = n('progression');
    const story = n('narrative');
    expect(onionHeuristic(ctxOf([secondary, prog], [e('requires', secondary, prog)]))).toHaveLength(
      1,
    );
    expect(onionHeuristic(ctxOf([prog, story], [e('requires', prog, story)]))).toHaveLength(1);
  });

  it('accepts requiring the same layer or an inner one', () => {
    const core = n('mechanic');
    const other = n('mechanic');
    const story = n('narrative');
    expect(onionHeuristic(ctxOf([core, other], [e('requires', core, other)]))).toEqual([]);
    expect(onionHeuristic(ctxOf([story, core], [e('requires', story, core)]))).toEqual([]);
  });

  it('only looks at requires edges between nodes that have a layer', () => {
    const core = n('mechanic');
    const story = n('narrative');
    const pillar = n('pillar');
    expect(onionHeuristic(ctxOf([core, story], [e('feeds', core, story)]))).toEqual([]);
    expect(crossesOnion(core, pillar)).toBe(false);
    expect(crossesOnion(pillar, core)).toBe(false);
  });

  it('can be switched off', () => {
    const core = n('mechanic');
    const story = n('narrative');
    const ctx = ctxOf([core, story], [e('requires', core, story)], { onionHeuristic: false });
    expect(onionHeuristic(ctx)).toEqual([]);
  });
});

describe('experience rules', () => {
  it('flags an aesthetic described in under 30 characters', () => {
    const vague = n('aesthetic', { description: 'fun and exciting' });
    const clear = n('aesthetic', {
      description: 'Players laughing together while a round falls apart in an unexpected way.',
    });
    const found = vagueExperience(ctxOf([vague, clear]));
    expect(found.map((i) => i.nodeIds[0])).toEqual([vague.id]);
    expect(found[0]?.severity).toBe('info');
  });

  it('flags a persona with any OCEAN value missing and names what is missing', () => {
    const partial = n('persona', { ocean: { o: 50, c: 50, e: 50, a: 50 } });
    const full = n('persona', { ocean: { o: 1, c: 2, e: 3, a: 4, n: 5 } });
    const found = personaWithoutOcean(ctxOf([partial, full]));
    expect(found).toHaveLength(1);
    expect(found[0]?.message).toContain('Neuroticism');
    expect(found[0]?.severity).toBe('info');
  });

  it('flags an aesthetic or pillar that no mechanic reaches', () => {
    const mech = n('mechanic');
    const dyn = n('dynamic');
    const supported = n('aesthetic');
    const lonely = n('aesthetic');
    const pillar = n('pillar');
    const found = unsupportedAesthetic(
      ctxOf(
        [mech, dyn, supported, lonely, pillar],
        [e('leadsTo', mech, dyn), e('leadsTo', dyn, supported)],
      ),
    );
    expect(found.map((i) => i.nodeIds[0]).sort()).toEqual([lonely.id, pillar.id].sort());
  });

  it('counts a direct serves edge from a mechanic', () => {
    const mech = n('mechanic');
    const pillar = n('pillar');
    expect(unsupportedAesthetic(ctxOf([mech, pillar], [e('serves', mech, pillar)]))).toEqual([]);
  });

  it('does not count a dynamic that nothing leads to', () => {
    const dyn = n('dynamic');
    const aesthetic = n('aesthetic');
    expect(
      unsupportedAesthetic(ctxOf([dyn, aesthetic], [e('leadsTo', dyn, aesthetic)])),
    ).toHaveLength(1);
  });
});

describe('outer layer rules', () => {
  it('flags narrative without a content cost', () => {
    const missing = n('narrative');
    const done = n('narrative', { contentCost: 'high' });
    const found = unestimatedNarrative(ctxOf([missing, done]));
    expect(found.map((i) => i.nodeIds[0])).toEqual([missing.id]);
    expect(found[0]?.severity).toBe('warning');
  });

  it('flags layer 2 and 3 nodes without a prototype scope', () => {
    const progression = n('progression');
    const story = n('narrative', { prototypeScope: 'stub' });
    const core = n('mechanic');
    const found = unscopedOuterLayer(ctxOf([progression, story, core]));
    expect(found.map((i) => i.nodeIds[0])).toEqual([progression.id]);
    expect(found[0]?.severity).toBe('info');
  });

  it('flags a secondary mechanic with an empty return hook', () => {
    const blank = n('mechanic', { layer: 1, returnHook: '   ' });
    const none = n('mechanic', { layer: 1 });
    const fine = n('mechanic', { layer: 1, returnHook: 'daily boosters' });
    const core = n('mechanic');
    const found = secondaryWithoutHook(ctxOf([blank, none, fine, core]));
    expect(found.map((i) => i.nodeIds[0]).sort()).toEqual([blank.id, none.id].sort());
  });
});

describe('core rules', () => {
  it('warns when there are mechanics but nothing in layer 0', () => {
    const found = emptyCore(ctxOf([n('narrative'), n('mechanic', { layer: 1 })]));
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe('warning');
    expect(found[0]?.nodeIds).toEqual([]);
  });

  it('is quiet with a core, with no mechanics at all, or with only notes', () => {
    expect(emptyCore(ctxOf([n('mechanic'), n('narrative')]))).toEqual([]);
    expect(emptyCore(ctxOf([n('pillar'), n('aesthetic')]))).toEqual([]);
    expect(emptyCore(ctxOf([n('note')]))).toEqual([]);
    expect(emptyCore(ctxOf([]))).toEqual([]);
  });

  it('notes a heavy core above the limit, counting only mechanics and actions', () => {
    const many = [...Array(4)].map(() => n('mechanic'));
    const actions = [n('action'), n('action')];
    const others = [n('state'), n('rule'), n('entity')];
    const found = heavyCore(ctxOf([...many, ...actions, ...others]));
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe('info');
    expect(found[0]?.nodeIds).toHaveLength(6);
    expect(heavyCore(ctxOf([...many, ...others]))).toEqual([]);
  });

  it('uses the limit from settings', () => {
    const four = [...Array(4)].map(() => n('mechanic'));
    expect(heavyCore(ctxOf(four, [], { heavyCoreLimit: 3 }))).toHaveLength(1);
    expect(heavyCore(ctxOf(four, [], { heavyCoreLimit: 4 }))).toEqual([]);
  });

  it('wants a core loop to be fed and to feed something', () => {
    const a = n('state');
    const loop = n('coreLoop');
    const b = n('state');
    expect(
      coreLoopFlow(ctxOf([a, loop, b], [e('feeds', a, loop), e('triggers', loop, b)])),
    ).toEqual([]);
    expect(coreLoopFlow(ctxOf([a, loop], [e('feeds', a, loop)]))[0]?.message).toContain(
      'does not feed',
    );
    expect(coreLoopFlow(ctxOf([loop, b], [e('triggers', loop, b)]))[0]?.message).toContain(
      'nothing that feeds',
    );
    expect(coreLoopFlow(ctxOf([loop]))[0]?.message).toContain('and does not');
    expect(coreLoopFlow(ctxOf([a, loop], [e('requires', a, loop)]))).toHaveLength(1);
  });
});

describe('structure rules', () => {
  it('flags nodes without edges, ignoring notes', () => {
    const a = n('mechanic');
    const b = n('mechanic');
    const lonely = n('mechanic');
    const note = n('note');
    const found = orphan(ctxOf([a, b, lonely, note], [e('feeds', a, b)]));
    expect(found.map((i) => i.nodeIds[0])).toEqual([lonely.id]);
  });

  it('finds a requires loop and reports it as an error', () => {
    const a = n('mechanic');
    const b = n('mechanic');
    const c = n('mechanic');
    const found = requiresCycle(
      ctxOf([a, b, c], [e('requires', a, b), e('requires', b, c), e('requires', c, a)]),
    );
    expect(found).toHaveLength(1);
    expect(found[0]?.severity).toBe('error');
    expect([...(found[0]?.nodeIds ?? [])].sort()).toEqual([a.id, b.id, c.id].sort());
  });

  it('finds a self loop and two separate loops', () => {
    const a = n('mechanic');
    const b = n('mechanic');
    const c = n('mechanic');
    const d = n('mechanic');
    expect(requiresCycle(ctxOf([a], [e('requires', a, a)]))).toHaveLength(1);
    const two = requiresCycle(
      ctxOf(
        [a, b, c, d],
        [e('requires', a, b), e('requires', b, a), e('requires', c, d), e('requires', d, c)],
      ),
    );
    expect(two).toHaveLength(2);
  });

  it('does not report a chain, a diamond or loops in other edge kinds', () => {
    const a = n('mechanic');
    const b = n('mechanic');
    const c = n('mechanic');
    const d = n('mechanic');
    const chain = [e('requires', a, b), e('requires', b, c)];
    const diamond = [
      e('requires', a, b),
      e('requires', a, c),
      e('requires', b, d),
      e('requires', c, d),
    ];
    expect(requiresCycle(ctxOf([a, b, c], chain))).toEqual([]);
    expect(requiresCycle(ctxOf([a, b, c, d], diamond))).toEqual([]);
    expect(requiresCycle(ctxOf([a, b], [e('feeds', a, b), e('feeds', b, a)]))).toEqual([]);
  });

  it('flags an implemented node that requires an idea or a cut node', () => {
    const built = n('mechanic', { status: 'implemented' });
    const idea = n('mechanic', { status: 'idea' });
    const cut = n('mechanic', { status: 'cut' });
    const ready = n('mechanic', { status: 'prototyped' });
    const found = implementedRequiresIdea(
      ctxOf(
        [built, idea, cut, ready],
        [e('requires', built, idea), e('requires', built, cut), e('requires', built, ready)],
      ),
    );
    expect(found).toHaveLength(2);
    expect(found[0]?.severity).toBe('warning');
    const notBuilt = n('mechanic', { status: 'designed' });
    expect(
      implementedRequiresIdea(ctxOf([notBuilt, idea], [e('requires', notBuilt, idea)])),
    ).toEqual([]);
  });

  it('flags duplicate titles, ignoring case, spacing and empty titles', () => {
    const a = n('mechanic', { title: 'Vote' });
    const b = n('mechanic', { title: ' vote ' });
    const c = n('mechanic', { title: 'Speak' });
    const blank1 = n('note', { title: '' });
    const blank2 = n('note', { title: '' });
    const found = duplicateTitles(ctxOf([a, b, c, blank1, blank2]));
    expect(found).toHaveLength(1);
    expect(found[0]?.nodeIds).toEqual([a.id, b.id]);
    expect(found[0]?.severity).toBe('info');
  });
});

describe('flow rules', () => {
  it('flags a mechanic that never leads to a dynamic or aesthetic', () => {
    const lonely = n('mechanic');
    const sub = n('subMechanic');
    const reaches = n('mechanic');
    const dyn = n('dynamic');
    const found = danglingMechanic(
      ctxOf([lonely, sub, reaches, dyn], [e('leadsTo', reaches, dyn)]),
    );
    expect(found.map((i) => i.nodeIds[0]).sort()).toEqual([lonely.id, sub.id].sort());
  });

  it('follows leads-to chains through other mechanics', () => {
    const a = n('mechanic');
    const b = n('mechanic');
    const aesthetic = n('aesthetic');
    const found = danglingMechanic(
      ctxOf([a, b, aesthetic], [e('leadsTo', a, b), e('leadsTo', b, aesthetic)]),
    );
    expect(found).toEqual([]);
  });

  it('does not count other edge kinds as a path', () => {
    const a = n('mechanic');
    const dyn = n('dynamic');
    expect(danglingMechanic(ctxOf([a, dyn], [e('triggers', a, dyn)]))).toHaveLength(1);
  });

  it('flags a resource that is never produced or never consumed', () => {
    const lonely = n('resource');
    const fedOnly = n('resource');
    const usedOnly = n('resource');
    const balanced = n('resource');
    const src = n('mechanic');
    const sink = n('mechanic');
    const found = resourceFlow(
      ctxOf(
        [lonely, fedOnly, usedOnly, balanced, src, sink],
        [
          e('feeds', src, fedOnly),
          e('feeds', usedOnly, sink),
          e('feeds', src, balanced),
          e('feeds', balanced, sink),
        ],
      ),
    );
    const messages = found.map((i) => i.message).join('\n');
    expect(found).toHaveLength(4);
    expect(messages).toContain('never produced');
    expect(messages).toContain('never consumed');
    expect(new Set(found.map((i) => i.id)).size).toBe(4);
  });

  it('lets resource roles stand in for edges', () => {
    const source = n('resource', { resourceRole: 'source' });
    const sink = n('resource', { resourceRole: 'sink' });
    const found = resourceFlow(ctxOf([source, sink]));
    expect(found).toHaveLength(2);
    const messages = found.map((i) => i.message).join('\n');
    expect(messages).toContain('never consumed');
    expect(messages).toContain('never produced');
  });
});
