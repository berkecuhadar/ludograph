import { describe, expect, it } from 'vitest';
import { createProject } from '../model/factory';
import { applyBatch } from './batch';
import { parseCSharp, pickNodes, scanUnity } from './unityScan';

const player = `
using UnityEngine;
// class Fake : MonoBehaviour {
/// <summary>
/// Moves the player.
/// </summary>
[RequireComponent(typeof(Rigidbody2D), typeof(Health))]
public class PlayerController : MonoBehaviour
{
    [SerializeField] private Health health;
    string text = "class Nope : MonoBehaviour {";
}
`;
const health = 'public class Health : MonoBehaviour { }';
const weapon = 'public class WeaponData : ScriptableObject { public PlayerController owner; }';
const state = 'public enum GameState { Menu, Playing }\npublic enum Color { Red }';
const plain = 'public class Helper { }';
const files = [
  { path: 'Assets/Scripts/Player.cs', text: player, folder: 'Scripts' },
  { path: 'Assets/Scripts/Health.cs', text: health, folder: 'Scripts' },
  { path: 'Assets/Data/Weapon.cs', text: weapon, folder: 'Data' },
  { path: 'Assets/Scripts/State.cs', text: state, folder: 'Scripts' },
  { path: 'Assets/Scripts/Helper.cs', text: plain, folder: 'Scripts' },
];

describe('parseCSharp', () => {
  it('ignores comments and strings and reads summary and RequireComponent', () => {
    const found = parseCSharp(files[0]!);
    expect(found.map((f) => f.name)).toEqual(['PlayerController']);
    expect(found[0]).toMatchObject({
      summary: 'Moves the player.',
      bases: ['MonoBehaviour'],
      requires: ['Rigidbody2D', 'Health'],
    });
  });
});

describe('scanUnity', () => {
  it('makes nodes for mono behaviours, scriptable objects and state enums', () => {
    const scan = scanUnity(files, createProject('t'), {});
    const byId = Object.fromEntries(scan.batch.nodes!.map((n) => [n.id, n]));
    expect(Object.keys(byId).sort()).toEqual([
      'u_GameState',
      'u_Health',
      'u_PlayerController',
      'u_WeaponData',
    ]);
    expect(byId.u_WeaponData).toMatchObject({ kind: 'entity', tags: ['unity', 'Data'] });
    expect(byId.u_GameState).toMatchObject({ kind: 'state' });
    expect(scan.batch.edges).toEqual([
      { kind: 'requires', from: 'u_PlayerController', to: 'u_Health' },
    ]);
  });

  it('skips classes whose name matches a pattern, with their edges', () => {
    const scan = scanUnity(files, createProject('t'), { skipNames: ['^Health$', 'Data$'] });
    const ids = scan.batch.nodes!.map((n) => n.id);
    expect(ids).not.toContain('u_Health');
    expect(ids).not.toContain('u_WeaponData');
    expect(scan.batch.edges).toEqual([]);
    expect(() => scanUnity(files, createProject('t'), { skipNames: ['('] })).toThrow('skip-name');
  });

  it('adds reference edges and plain classes only when asked', () => {
    const scan = scanUnity(files, createProject('t'), { refs: true, includePlain: true });
    expect(scan.batch.nodes!.some((n) => n.id === 'u_Helper')).toBe(true);
    expect(scan.batch.edges).toContainEqual({
      kind: 'modifies',
      from: 'u_WeaponData',
      to: 'u_PlayerController',
      label: 'ref',
    });
  });

  it('keeps what the designer wrote on a second scan and reports missing classes', () => {
    const first = applyBatch(createProject('t'), scanUnity(files, createProject('t'), {}).batch);
    if (!first.ok) throw new Error(first.errors.join('\n'));
    const edited = applyBatch(first.project, {
      nodes: [{ id: 'u_Health', description: 'Mine.', layer: 1 }],
    });
    if (!edited.ok) throw new Error('setup');

    const without = files.filter((f) => f !== files[1]);
    expect(scanUnity(without, edited.project, {}).missing).toEqual([
      { id: 'u_Health', title: 'Health' },
    ]);

    const final = applyBatch(edited.project, scanUnity(files, edited.project, {}).batch);
    if (!final.ok) throw new Error(final.errors.join('\n'));
    const health = Object.values(final.project.graphs)[0]!.nodes.find((n) => n.id === 'u_Health')!;
    expect(health).toMatchObject({ description: 'Mine.', layer: 1 });
    expect(final.addedNodes).toHaveLength(0);
    expect(final.addedEdges).toBe(0);
  });
});

describe('pickNodes', () => {
  it('drops unticked new nodes and the edges that lose an end', () => {
    const project = createProject('t');
    const scan = scanUnity(files, project, {});
    const picked = pickNodes(scan.batch, project, new Set(['u_PlayerController']));
    expect(picked.nodes!.map((n) => n.id)).toEqual(['u_PlayerController']);
    expect(picked.edges).toEqual([]);

    const both = pickNodes(scan.batch, project, new Set(['u_PlayerController', 'u_Health']));
    expect(both.edges).toHaveLength(1);
  });

  it('keeps existing nodes so their source is refreshed', () => {
    const first = applyBatch(createProject('t'), scanUnity(files, createProject('t'), {}).batch);
    if (!first.ok) throw new Error('setup');
    const scan = scanUnity(files, first.project, {});
    const picked = pickNodes(scan.batch, first.project, new Set());
    expect(picked.nodes).toHaveLength(scan.batch.nodes!.length);
  });
});
