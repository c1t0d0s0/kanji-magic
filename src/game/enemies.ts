// --- The enemies: わすれんぼう and its kin (requirements 5.3), sleepy things in nightcaps ---
// that forget; the pictures are in src/art/characters.ts.
// Numbers of a stage of power 1; stages.ts says how strong they are in each stage.
export type EnemyId = 'zako' | 'hard' | 'fast' | 'thrower' | 'boss';

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
}

export const ENEMIES: Record<EnemyId, EnemyType> = {
    zako: { id: 'zako', name: 'わすれんぼう', color: '#b9a6d8', hp: 90, attack: 10, attackMs: 1200, range: 26, speed: 30, size: 32, money: 15, mana: 5, boss: false },
    hard: { id: 'hard', name: 'かちこちわすれ', color: '#8d8a84', hp: 420, attack: 14, attackMs: 1600, range: 28, speed: 18, size: 40, money: 40, mana: 8, boss: false },
    fast: { id: 'fast', name: 'すばしわすれ', color: '#e0b26b', hp: 70, attack: 12, attackMs: 700, range: 24, speed: 75, size: 30, money: 20, mana: 6, boss: false },
    thrower: { id: 'thrower', name: 'ぽいぽいわすれ', color: '#9bb6c9', hp: 120, attack: 18, attackMs: 1800, range: 200, speed: 24, size: 34, money: 35, mana: 8, boss: false },
    boss: { id: 'boss', name: 'おおわすれんぼう', color: '#7a2c4d', hp: 3200, attack: 60, attackMs: 2400, range: 60, speed: 12, size: 72, money: 300, mana: 40, boss: true }
};

// The colour of an enemy of an element (the shape is that of its kind)
export const ELEMENT_BODY = { fire: '#ff9a76', water: '#82b9ff', wood: '#93d16d' } as const;
