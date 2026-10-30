import type { Gdd } from '../model/types';

// The written design document. Field and section ids are the same as in OpenGDD,
// so files from that tool can be imported.

export type FieldDef = {
  id: string;
  label: string;
  hint: string;
  placeholder?: string;
  /** A single line. Everything else is a text area. */
  line?: boolean;
  rows?: number;
};

export type BlockDef = { id: string; title: string; fields: FieldDef[] };
export type GroupDef = BlockDef & { question: string };

// The one-pager: always open.
export const CORE_BLOCKS: BlockDef[] = [
  {
    id: 'identity',
    title: 'Identity',
    fields: [
      { id: 'title', line: true, label: 'Working title', hint: '', placeholder: 'Game title' },
      {
        id: 'mantra',
        line: true,
        label: 'Game identity',
        hint: 'One sentence you will use to settle design arguments.',
        placeholder: 'Stylized action platformer about a meatball fighting the dinner table.',
      },
      {
        id: 'pillars',
        line: true,
        label: 'Design pillars',
        hint: 'Up to three words or phrases for the feeling you want players to have.',
        placeholder: 'Fast. Action-packed. Mayhem.',
      },
    ],
  },
  {
    id: 'game',
    title: 'The game',
    fields: [
      {
        id: 'summary',
        rows: 3,
        label: 'Summary',
        hint: 'What is it about and how does it play? Genre, story and mechanics in under 75 words.',
      },
      {
        id: 'genrePlatform',
        line: true,
        label: 'Genre and platform',
        hint: '',
        placeholder: 'Co-op Survival / PC (Steam)',
      },
      {
        id: 'audience',
        rows: 2,
        label: 'Audience',
        hint: 'Who plays it, and what else do they play? How do you know they would buy it?',
      },
      {
        id: 'coreLoop',
        rows: 2,
        label: 'Core loop',
        hint: 'The handful of actions the player repeats.',
        placeholder: 'Explore → Collect → Return → Upgrade',
      },
      {
        id: 'features',
        rows: 3,
        label: 'Features',
        hint: 'The three to five things that make it different.',
      },
    ],
  },
  {
    id: 'feel',
    title: 'Look and feel',
    fields: [
      {
        id: 'interface',
        rows: 2,
        label: 'Controls and interface',
        hint: 'Input method, bindings, how the player talks to the game.',
      },
      {
        id: 'art',
        rows: 2,
        label: 'Art style',
        hint: 'Point at games and images with the aesthetic you want.',
      },
      {
        id: 'music',
        rows: 2,
        label: 'Music and sound',
        hint: 'The sound you are after and the emotion it should trigger.',
      },
    ],
  },
  {
    id: 'plan',
    title: 'Plan',
    fields: [
      {
        id: 'roadmap',
        rows: 3,
        label: 'Roadmap and launch criteria',
        hint: 'Milestones with dates. What has to be true before you ship?',
      },
    ],
  },
];

// Optional sections, each opened by answering a question with yes.
export const GROUPS: GroupDef[] = [
  {
    id: 'story',
    title: 'Story',
    question: 'Does the game have a story?',
    fields: [
      {
        id: 'lore',
        rows: 3,
        label: 'Backstory and universe',
        hint: 'How did the world get here? Where does the player come in?',
      },
      {
        id: 'plot',
        rows: 3,
        label: 'Main plot',
        hint: 'Beginning, middle and end. What are the turning points?',
      },
      {
        id: 'cutscenes',
        rows: 2,
        label: 'How it is told',
        hint: 'Cutscenes, dialogue, environmental storytelling, text?',
      },
    ],
  },
  {
    id: 'characters',
    title: 'Characters',
    question: 'Are there characters, NPCs or enemies?',
    fields: [
      {
        id: 'player',
        rows: 3,
        label: 'Player character',
        hint: 'Who is the player? Abilities, classes, looks.',
      },
      {
        id: 'npcs',
        rows: 3,
        label: 'Supporting characters',
        hint: 'The NPCs that matter and what they do.',
      },
      {
        id: 'enemies',
        rows: 3,
        label: 'Enemies and bosses',
        hint: 'Types, behavior, and the question each one asks the player.',
      },
    ],
  },
  {
    id: 'world',
    title: 'World and levels',
    question: 'Are there several locations, levels or a world to explore?',
    fields: [
      {
        id: 'setting',
        rows: 2,
        label: 'Setting',
        hint: 'Where and when does it take place?',
      },
      {
        id: 'worldStructure',
        rows: 2,
        label: 'World structure',
        hint: 'Linear levels, open world, hub and missions?',
      },
      {
        id: 'levels',
        rows: 3,
        label: 'Locations and levels',
        hint: 'What each one is for and what is unique about it.',
      },
    ],
  },
  {
    id: 'progression',
    title: 'Progression and difficulty',
    question: 'Does the player progress (goals, levels, rising difficulty)?',
    fields: [
      {
        id: 'objectives',
        rows: 2,
        label: 'Objectives',
        hint: 'The main goal and the secondary ones.',
      },
      {
        id: 'progression',
        rows: 3,
        label: 'Progression',
        hint: 'How does the player move on, and how does getting stronger change the world?',
      },
      {
        id: 'difficulty',
        rows: 2,
        label: 'Difficulty',
        hint: 'How does it ramp up? Are there difficulty settings?',
      },
    ],
  },
  {
    id: 'mechanics',
    title: 'Mechanics',
    question: 'Are there mechanics or rules that need their own write-up?',
    fields: [
      {
        id: 'rules',
        rows: 3,
        label: 'Rules and limits',
        hint: 'What the player can and cannot do.',
      },
      {
        id: 'movement',
        rows: 2,
        label: 'Movement',
        hint: 'How the player moves, and how the physics feel.',
      },
      {
        id: 'interaction',
        rows: 3,
        label: 'Interaction and special systems',
        hint: 'What can be interacted with? Combat, inventory, crafting.',
      },
    ],
  },
  {
    id: 'economy',
    title: 'Economy',
    question: 'Is there currency, resources or crafting?',
    fields: [
      {
        id: 'economy',
        rows: 4,
        label: 'Currencies and resources',
        hint: 'What exists, how is it earned and spent, how is it balanced?',
      },
    ],
  },
  {
    id: 'multiplayer',
    title: 'Multiplayer',
    question: 'Do several players play at once?',
    fields: [
      {
        id: 'coop',
        rows: 4,
        label: 'Multiplayer design',
        hint: 'Player count, communication, roles, death and revival rules.',
      },
    ],
  },
  {
    id: 'risk',
    title: 'Risk and reward',
    question: 'Do death, loss or risk-versus-reward matter to the design?',
    fields: [
      {
        id: 'risk',
        rows: 4,
        label: 'Risk and reward',
        hint: 'What does failure cost? Why is taking the risk tempting?',
      },
    ],
  },
  {
    id: 'visuals',
    title: 'Visual and audio detail',
    question: 'Do you want to spell out visual and audio design in detail?',
    fields: [
      {
        id: 'visualSystem',
        rows: 3,
        label: 'Visual system',
        hint: 'Palette, animation, camera, effects.',
      },
      {
        id: 'audioSystem',
        rows: 3,
        label: 'Audio system',
        hint: 'Music structure, sound effects, voice, adaptive audio.',
      },
    ],
  },
  {
    id: 'ui',
    title: 'Menus and HUD',
    question: 'Will menus and interface be designed in their own right?',
    fields: [
      {
        id: 'ui',
        rows: 4,
        label: 'Menus and HUD',
        hint: 'Menu flow, on-screen readouts, accessibility options.',
      },
    ],
  },
  {
    id: 'assets',
    title: 'Asset list',
    question: 'Do you want an asset list?',
    fields: [
      {
        id: 'assets',
        rows: 4,
        label: 'Asset list',
        hint: 'Models, sprites and sounds needed. Who makes them, or are they bought?',
      },
    ],
  },
  {
    id: 'business',
    title: 'Business model',
    question: 'Are you planning how the game earns money?',
    fields: [
      {
        id: 'monetization',
        rows: 4,
        label: 'Monetization',
        hint: 'Premium, F2P, ads, DLC? Price and expectations.',
      },
    ],
  },
  {
    id: 'tech',
    title: 'Technical',
    question: 'Do you want to pin down technical requirements?',
    fields: [
      {
        id: 'techSpecs',
        rows: 4,
        label: 'Technical specs',
        hint: 'Engine, target platforms, minimum specs, known technical risks.',
      },
    ],
  },
  {
    id: 'marketing',
    title: 'Marketing',
    question: 'Will you write a marketing and launch plan?',
    fields: [
      {
        id: 'marketing',
        rows: 4,
        label: 'Marketing and launch',
        hint: 'Positioning, wishlist strategy, demo, community.',
      },
    ],
  },
];

export const CORE_FIELD_IDS = CORE_BLOCKS.flatMap((b) => b.fields.map((f) => f.id));
export const GROUP_FIELD_IDS = GROUPS.flatMap((g) => g.fields.map((f) => f.id));
export const ALL_FIELD_IDS = [...CORE_FIELD_IDS, ...GROUP_FIELD_IDS];

// Shown at the top of the document and in its file name instead of the field blocks.
export const HEADER_FIELD_IDS = ['title', 'mantra', 'pillars'];

export function emptyGdd(): Gdd {
  return {
    values: Object.fromEntries(ALL_FIELD_IDS.map((id) => [id, ''])),
    enabled: Object.fromEntries(GROUPS.map((g) => [g.id, false])),
    custom: [],
  };
}

// Pillars are written as a short run of words: "Fast. Action-packed. Mayhem."
export function splitPillars(text: string): string[] {
  return text
    .split(/[.,;·\n]/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function hasContent(gdd: Gdd | undefined): boolean {
  if (!gdd) return false;
  return (
    Object.values(gdd.values).some((v) => v.trim() !== '') ||
    gdd.custom.some((c) => c.title.trim() !== '' || c.body.trim() !== '')
  );
}
