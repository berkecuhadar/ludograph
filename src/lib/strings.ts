// All user-facing text lives here so a Turkish map can be added later.
export const strings = {
  app: {
    name: 'Ludograph',
    tagline: 'A visual editor for game design.',
  },
  project: {
    untitled: 'Untitled game',
    rootGraph: 'Main',
  },
  copySuffix: 'copy',
  header: {
    undo: 'Undo',
    redo: 'Redo',
  },
  palette: {
    title: 'Add node',
    secondaryMechanic: 'Secondary mechanic',
    groups: {
      experience: 'Experience',
      mechanics: 'Mechanics',
      outer: 'Outer layers',
      other: 'Other',
      custom: 'Custom',
    },
  },
  status: {
    idea: 'Idea',
    designed: 'Designed',
    prototyped: 'Prototyped',
    implemented: 'Implemented',
    cut: 'Cut',
  },
  mda: {
    mechanics: 'Mechanics',
    dynamics: 'Dynamics',
    aesthetics: 'Aesthetics',
  },
  layers: {
    0: 'Core mechanic',
    1: 'Secondary mechanic',
    2: 'Progression',
    3: 'Narrative',
  },
  kinds: {
    pillar: 'Pillar',
    aesthetic: 'Aesthetic',
    persona: 'Persona',
    dynamic: 'Dynamic',
    coreLoop: 'Core loop',
    mechanic: 'Mechanic',
    subMechanic: 'Sub-mechanic',
    action: 'Action',
    resource: 'Resource',
    item: 'Item',
    entity: 'Entity',
    state: 'State',
    event: 'Event',
    rule: 'Rule',
    progression: 'Progression',
    narrative: 'Narrative',
    note: 'Note',
  },
} as const;
