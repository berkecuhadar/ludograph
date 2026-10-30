import { describe, expect, it } from 'vitest';
import { createNode } from './factory';
import { patchNode } from './graphOps';

describe('patchNode', () => {
  it('applies a patch and keeps the id', () => {
    const node = createNode('note', { x: 0, y: 0 });
    const next = patchNode(node, { id: 'other', title: 'Hello' });
    expect(next.id).toBe(node.id);
    expect(next.title).toBe('Hello');
  });

  it('removes an optional field when it is patched with undefined', () => {
    const node = createNode('mechanic', { x: 0, y: 0 });
    expect(node.layer).toBe(0);
    const next = patchNode(node, { layer: undefined });
    expect('layer' in next).toBe(false);
  });

  it('does not let a required field be unset', () => {
    const node = createNode('note', { x: 0, y: 0 }, [], { title: 'Keep me' });
    expect(patchNode(node, { title: undefined }).title).toBe('Keep me');
  });
});
