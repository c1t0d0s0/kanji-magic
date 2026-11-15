// --- The enemies: わすれんぼう and its kin (requirements 5.3), sleepy things in nightcaps ---
// that forget; the pictures are in src/art/characters.ts.
// Numbers of a stage of power 1; stages.ts says how strong they are in each stage.
export type EnemyId = 'zako' | 'hard' | 'fast' | 'thrower' | 'boss' | 'bell' | 'fluffy' | 'twin' | 'singer' | 'king';

export const ENEMY_IDS: readonly EnemyId[] = ['zako', 'hard', 'fast', 'thrower', 'boss', 'bell', 'fluffy', 'twin', 'singer', 'king'];

export interface EnemyType {
    id: EnemyId;
    name: string;
    color: string;
    hp: number;
    attack: number;
    attackMs: number;
    range: number;
    speed: number;
    size: number;
    // Given when it falls
    money: number;
    mana: number;
    boss: boolean;
    // Hits all of ours in its range at once (めざまし, まおう)
    area?: boolean;
    // Pushes the one it hits back (px of the lane)
    knockback?: number;
    // Falls into this many わすれんぼう (SPLIT_INTO) where it was (ふたご)
    split?: number;
    // Heals the enemies near it (and itself) this much (of a stage of power 1) every `everyMs` (こもりうた)
    heal?: { amount: number; everyMs: number; range: number };
}

export const ENEMIES: Record<EnemyId, EnemyType> = {
    zako: { id: 'zako', name: 'わすれんぼう', color: '#b9a6d8', hp: 90, attack: 10, attackMs: 1200, range: 26, speed: 30, size: 32, money: 15, mana: 5, boss: false },
    hard: { id: 'hard', name: 'かちこちわすれ', color: '#8d8a84', hp: 420, attack: 14, attackMs: 1600, range: 28, speed: 18, size: 40, money: 40, mana: 8, boss: false },
    fast: { id: 'fast', name: 'すばしわすれ', color: '#e0b26b', hp: 70, attack: 12, attackMs: 700, range: 24, speed: 75, size: 30, money: 20, mana: 6, boss: false },
    thrower: { id: 'thrower', name: 'ぽいぽいわすれ', color: '#9bb6c9', hp: 120, attack: 18, attackMs: 1800, range: 200, speed: 24, size: 34, money: 35, mana: 8, boss: false },
    boss: { id: 'boss', name: 'おおわすれんぼう', color: '#7a2c4d', hp: 3200, attack: 60, attackMs: 2400, range: 60, speed: 12, size: 72, money: 300, mana: 40, boss: true },
    // From the 11th stage: an alarm clock that rings and hits all that are near
    bell: { id: 'bell', name: 'めざましわすれ', color: '#f2c14e', hp: 260, attack: 16, attackMs: 2000, range: 40, speed: 22, size: 38, money: 40, mana: 8, boss: false, area: true },
    // Soft as a futon: hard to hurt, and bounces ours back
    fluffy: { id: 'fluffy', name: 'ふかふかわすれ', color: '#f4f1ea', hp: 700, attack: 8, attackMs: 1500, range: 30, speed: 16, size: 46, money: 50, mana: 10, boss: false, knockback: 45 },
    // Two in one: falls into two わすれんぼう
    twin: { id: 'twin', name: 'ふたごわすれ', color: '#c9a7e8', hp: 220, attack: 12, attackMs: 1300, range: 26, speed: 26, size: 40, money: 30, mana: 6, boss: false, split: 2 },
    // Sings a lullaby that heals the enemies near it; weak itself
    singer: { id: 'singer', name: 'こもりうたわすれ', color: '#ffb3c6', hp: 150, attack: 6, attackMs: 1600, range: 150, speed: 20, size: 34, money: 45, mana: 10, boss: false, heal: { amount: 30, everyMs: 3000, range: 160 } },
    // The king of dreams: throws dream clouds far, on all of ours there
    king: { id: 'king', name: 'ゆめのまおう', color: '#8e7cc3', hp: 3600, attack: 28, attackMs: 2600, range: 170, speed: 10, size: 76, money: 350, mana: 45, boss: true, area: true }
};

// The enemies that come out of a ふたご (the first kind)
export const SPLIT_INTO: EnemyId = 'zako';

// The colour of an enemy of an element (the shape is that of its kind)
export const ELEMENT_BODY = { fire: '#ff9a76', water: '#82b9ff', wood: '#93d16d' } as const;
