// --- Numbers to tune the game, in one place ---
import type { SpellGrade } from './spell/grade';

// かんぺき: written in the right order, and every measure within this part of its limit
// (shape, strokes and worst of limitsFor). To be tuned with children's writing (Phase 1)
export const PERFECT_MARGIN = 0.75;

// How strong the spell is, for each result
export const SPELL_MULTIPLIER: Record<SpellGrade, number> = { perfect: 1.5, success: 1, close: 0.5, fail: 0 };

// The part of the magic gauge given back
export const MANA_REFUND: Record<SpellGrade, number> = { perfect: 0.2, success: 0, close: 0, fail: 0.5 };

// When as many strokes as the model has are written, the spell goes off after this time
export const AUTO_CONFIRM_MS = 800;

// How long the model is shown after a spell that was not かんぺき (a tap skips it)
export const MODEL_SHOW_MS = 3000;

// --- The magic circle (SpellOverlay) ---
// The time to write: from SPELL_SECONDS.min for 1 stroke to SPELL_SECONDS.max for the kanji with
// the most strokes (MAX_STROKES), in a straight line between them
export const SPELL_SECONDS = { min: 10, max: 30 };
// The most strokes of the 1,026 kanji (checked by tests/effects.test.ts)
export const MAX_STROKES = 20;
// How long かんぺき (and a kanji traced to the end) is shown before the circle closes (a tap skips it)
export const PERFECT_SHOW_MS = 1500;

// --- The spells (spell/effects.ts) ---
// Power = base × SPELL_MULTIPLIER × (1 + strokes × STROKE_BONUS): a kanji of many strokes is stronger
export const STROKE_BONUS = 0.05;
// The base of each group. What the power makes larger: the damage (ほのお, ふしぎ), how far the
// enemies are pushed back (みず, in px of the lane), how long they stop (き), how much harm the
// shield takes (かね) and how much the attack grows (ことば: 0.5 → ×1.5)
export const SPELL_BASE = {
    fire: { damage: 300 },
    water: { push: 160 },
    wood: { ms: 5000 },
    metal: { shield: 200, ms: 10000 },
    word: { boost: 0.5, ms: 10000 },
    wonder: { damage: 180 }
} as const;

// --- The battle (game/battle.ts) ---
// The lane: the enemy base on the left, ours on the right, in px of a field 1000 wide
export const LANE = { width: 1000, enemyBase: 70, allyBase: 930 };
// The steps of the game per second (the loop runs at this rate whatever the screen does)
export const STEPS_PER_SECOND = 60;
// While the magic circle is open the battle goes this fast
export const SPELL_SLOW = 0.1;
// Money: what it starts with, and for each level of the wallet how fast it grows (per second),
// how much it holds, and what the next level costs (null: the last)
export const START_MONEY = 100;
export const WALLET = [
    { rate: 18, cap: 500, next: 80 },
    { rate: 24, cap: 750, next: 160 },
    { rate: 30, cap: 1000, next: 260 },
    { rate: 38, cap: 1300, next: 380 },
    { rate: 48, cap: 1700, next: null }
] as const;
// The magic gauge: full at MANA_MAX; it fills by itself (per second) and when an enemy falls
export const MANA_MAX = 100;
export const MANA_PER_SECOND = 2.2;
// The spells hurt the boss less, and push it back less
export const BOSS_SPELL_RESIST = 0.5;

// --- The units: levels and evolutions ---
export const MAX_LEVEL = 10;
// The level a unit takes its 2nd and 3rd look at
export const EVOLVE_AT = [4, 8] as const;
// Each level makes hp and attack this much stronger (of the level 1); each evolution a bit more
export const LEVEL_GROWTH = 0.18;
export const EVOLVE_BONUS = 0.25;
// どんぐり (the material to make units stronger) needed to go from a level to the next
export const upgradeCost = (level: number) => 10 * level;

// --- The rewards ---
// For each かんぺき in a battle won, this much more どんぐり
export const PERFECT_BONUS = 5;
// The first clear of a stage gives the reward this many times
export const FIRST_CLEAR_TIMES = 2;
// ★★: our base kept at least this part of its hp. ★★★: a かんぺき too
export const STAR_BASE_HP = 0.6;
