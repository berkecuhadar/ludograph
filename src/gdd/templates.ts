import type { Gdd } from '../model/types';
import { emptyGdd } from './sections';

// Three starting points, taken from OpenGDD. Each one is a made-up example game,
// so it shows what a filled-in document looks like for that genre.
export type Template = {
  id: string;
  name: string;
  genre: string;
  /** Short description for the picker. */
  blurb: string;
  values: Record<string, string>;
  /** Optional sections the template fills in and switches on. */
  groups: string[];
};

export const TEMPLATES: Template[] = [
  {
    id: 'actionPlatformer',
    name: 'Fast action platformer',
    genre: 'Action',
    blurb: 'Precision movement, one hit per attempt, a speed grade at the end of each level.',
    groups: ['story', 'risk'],
    values: {
      title: 'Neon Severance (Fast Action Platformer)',
      mantra: 'Every death is a lesson, every dash is a signature.',
      pillars: 'Speed. Precision. Flow.',
      summary:
        'A precision-dash 2D action platformer set in a cyberpunk underworld, built around millisecond-tight timing and a single-life-per-attempt structure.',
      genrePlatform: 'Fast-Paced Action Platformer / PC, Switch',
      audience:
        'Platformer players who enjoy Celeste, Hollow Knight and Dead Cells and have a taste for speedrunning.',
      coreLoop:
        "Enter the level → Chain dash-and-slash combos through hazards and enemies → Hold the rhythm through checkpoints → Test what you've learned in the boss arena → Unlock a new ability and chase the speedrun clock.",
      features:
        '• Millisecond-tight dash-and-slash system\n• A boss and an S-to-D speed grade at the end of every district\n• Instant respawn with no loading screens\n• Built-in timer and ghost replay for speedrunners',
      interface:
        'Gamepad-first design, near-invisible HUD (only a dash cooldown indicator persists), and an end-of-level speed grade from S to D.',
      art: 'Hand-drawn pixel-art character animation, parallax neon cityscape layers, synthwave boss themes, screen-shake and chromatic aberration hit-feedback.',
      music:
        "Synthwave and darkwave; the music carries each level's tempo and adds layers in boss fights. Dash and hit sounds feel rhythmic.",
      roadmap:
        "Month 1-2: Polish movement and dash feel in a single room; this is the heart of the game, so don't move on until it feels right. Month 3-6: 3 districts and 3 bosses. Month 7: Demo and Steam Next Fest prep. Month 8-10: Remaining districts, polish, launch.",
      lore: 'A former assassin, memory-wiped by one of the five mega-corps ruling the city, tears through corporate towers one by one to reclaim their identity. Each district peels back a fragment of the past they were made to forget.',
      risk: "One hit ends the run, but checkpoints are generous, so the real cost is time. Deaths tally into a visible death counter at each level's end, a quiet second objective for completionists.",
    },
  },
  {
    id: 'roguelike',
    name: 'Roguelike deckbuilder',
    genre: 'Strategy',
    blurb: 'Cards and relics reshuffled every run, permadeath, a branching floor map.',
    groups: ['risk', 'business'],
    values: {
      title: 'Endless Descent (Roguelike Deckbuilder)',
      mantra: 'Every run is a new deck, every death a new lesson.',
      pillars: 'Replayability. Tactical depth. Risk.',
      summary:
        'A permadeath-driven dungeon roguelike deckbuilder where your entire strategy is rebuilt from scratch each run through freshly shuffled cards and relics.',
      genrePlatform: 'Roguelike Deckbuilder / PC, Mobile',
      audience: 'Players of Slay the Spire and Balatro who love deckbuilding and optimizing.',
      coreLoop:
        'Enter a floor → Resolve tactical card-based combat → Choose a card/relic/gold reward → Chart a route on the branching floor map → Beat the boss or die, then restart with meta-progression upgrades.',
      features:
        '• Cards and relics reshuffled every run\n• A branching floor map\n• Persistent meta-progression\n• End-of-run statistics',
      interface:
        'Card hand view with energy/mana meter, drag-and-drop targeting system, node-based floor map (combat/event/shop/rest icons), end-of-run statistics summary.',
      art: 'Readable card design and bold, simple iconography; stylized 2D character and enemy illustrations. A card must be understood at a glance.',
      music:
        'Dynamic music: calm on the map, rhythmic in combat, layered for bosses. Playing a card has to sound satisfying.',
      roadmap:
        'Month 1: Card and combat prototype (playtest it on paper first). Month 2-4: First 3 bosses, 40 cards, floor map. Month 5: Closed beta and balancing. Month 6-8: 100 cards, a second character, meta-progression. Month 9: Early Access.',
      risk: 'Permadeath: dying ends the run completely, wiping all run-specific card and relic progress. Only meta-progression persists: new starting characters and expansions to the core card pool.',
      monetization:
        'Premium one-time purchase; cosmetic card-back skins and character outfits as optional DLC, following a purely cosmetic marketplace model that never touches gameplay.',
    },
  },
  {
    id: 'cozySim',
    name: 'Cozy life sim',
    genre: 'Simulation',
    blurb: 'No timers, planting and harvesting, small interactions with neighbors.',
    groups: ['business'],
    values: {
      title: 'Little Farm Diary (Cozy Sim)',
      mantra: 'No rush, no worry, just a good day on a small farm.',
      pillars: 'Calm. Warmth. Small wins.',
      summary:
        'A pressure-free, self-paced cozy farm-life sim built around planting, tending, and small everyday interactions with neighbors.',
      genrePlatform: 'Cozy Life Sim / Mobile, PC',
      audience:
        'Fans of Stardew Valley and Animal Crossing, across a wide age range, who play to unwind.',
      coreLoop:
        'Start the day, check the daily to-dos → Plant, water, harvest → Have a small interaction with a townsperson (gift/chat) → Organize inventory, customize house/farm → End the day and carry progress into the next season.',
      features:
        '• A timer-free, pressure-free day cycle\n• Planting, tending and harvesting\n• Small interactions with neighbors\n• Home and farm decoration',
      interface:
        'Soft-transition menus, drag-and-drop inventory and home decoration, a daily to-do widget, and a timer-free day cycle that never rushes the player.',
      art: 'Pastel color palette, hand-drawn character portraits, seasonal ambient scores (piano/acoustic-led), ambient birdsong and wind sound design.',
      music:
        "Seasonal piano and acoustic pieces with birdsong and wind. Short loops that don't tire the ear when they repeat.",
      roadmap:
        'Month 1-3: Planting and harvest loop, one season. Month 4-8: Neighbors, gifting, all 4 seasons. Month 9-12: Decoration, save system, polish. Month 13: Launch. Content volume is large; one season and 3 neighbors can be enough for a first release.',
      monetization:
        "Free to play with optional cosmetic packs (home decor, outfits) and a one-time 'supporter pack' that removes ads and unlocks all content. It is a model that never touches gameplay balance.",
    },
  },
];

// "full" fills every field. "skeleton" keeps only the genre line and opens the
// sections that fit, so you write the rest yourself.
export function applyTemplate(template: Template, mode: 'full' | 'skeleton'): Gdd {
  const gdd = emptyGdd();
  for (const [id, value] of Object.entries(template.values)) {
    if (mode === 'full' || id === 'genrePlatform') gdd.values[id] = value;
  }
  for (const group of template.groups) gdd.enabled[group] = true;
  return gdd;
}
