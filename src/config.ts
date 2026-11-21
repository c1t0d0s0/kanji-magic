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
// The base of each group. 炎・水・木 and ふしぎ hurt every enemy (by the elements: AFFINITY); 水 pushes
// them back too (px of the lane), 木 stops them (ms). かね: the harm the shield takes; ことば: how
// much the attack grows (0.5 → ×1.5). The power makes all of these larger but the times of かね・ことば
export const SPELL_BASE = {
    fire: { damage: 340 },
    water: { damage: 240, push: 140 },
    wood: { damage: 240, ms: 4000 },
    metal: { shield: 200, ms: 10000 },
    word: { boost: 0.5, ms: 10000 },
    wonder: { damage: 200 }
} as const;

// The elements (spell/elements.ts): ×strong on the element it beats, ×weak on the one that beats it
export const AFFINITY = {
    spell: { strong: 2, weak: 0.5 },
    unit: { strong: 2, weak: 0.5 }
} as const;
// --- The spells sent in Morse code (src/morse/) ---
// The speed: a dot is 1200 / WPM ms (100 ms), a dash 3 dots. Slow, for children
export const MORSE_WPM = 12;
// 電鍵: a key held longer than this many dots is a dash (morse-master TappingQuiz)
export const MORSE_DASH_AT = 1.8;
// A letter is taken after no keying for this many dots, counted from the release of the 電鍵 or
// from the start of the paddle's last symbol (so after a dash, 2 more: its length), as morse-master
// FreeKeyer. Enter takes it at once, and so does a code no letter goes on from (MORSE_TAKE_FINAL)
export const MORSE_LETTER_GAP = { dot: 3.5, dash: 5.5 };
// A code that no longer code begins with (C, F, L, P, Q, X, Y and the numbers): taken at once, as
// nothing more can be keyed for it. Any other (T: M may follow) waits for the gap
export const MORSE_TAKE_FINAL = true;
// The time to send a word: base + each letter (FIRE1A: 30 s). Numbers are 5 symbols long
export const MORSE_SECONDS = { base: 6, perChar: 4 };
// The wrong letters (they are sent again) still allowed for かんぺき and せいこう
export const MORSE_MISSES = { perfect: 0, success: 2 };

// The 3 kanji to choose from: the time to choose (then the best one is taken)
export const CHOICE_SECONDS = 15;
// The boss of the last stage changes its element this often
export const BOSS_ELEMENT_MS = 30000;

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
// Against the enemies of a stage stronger than this power (from the 11th), the spells hurt and
// shield more (the square root of power / this: battle.ts spellGrowth): else, the enemies grown,
// the magic would not count any more
export const SPELL_GROWS_FROM = 3.5;
// --- The enemy's magic (the enemy tower casts it, from the 6th stage: stages.ts enemyMagic) ---
// It is told this long (ms of the battle) before it goes off. sleep: ours on the field stop
// (not those with a barrier); meteor: ours lose this part of their max hp (the barrier takes it)
// and our base this part of its max (none while the barrier lasts); futon: every enemy gets a
// barrier of this × the stage's power. When the barrier stops it, this part of the magic gauge comes
// back (まもり is not lost)
export const ENEMY_MAGIC = {
    warnMs: 8000,
    sleep: { ms: 1500 },
    meteor: { unit: 0.12, base: 0.025 },
    futon: { shield: 60 },
    blockRefund: 0.5
} as const;

// --- The big waves (from the 11th stage: stages.ts waves) ---
// Told this long (ms of the battle) before; the enemies of a wave come out this far apart
export const WAVE = { warnMs: 10000, gapMs: 600 } as const;

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
