// --- The enemies: わすれんぼう and its kin (requirements 5.3), sleepy things in nightcaps ---
// that forget; the pictures are in src/art/characters.ts.
import type { UnitId } from './units';
// Numbers of a stage of power 1; stages.ts says how strong they are in each stage.
export type EnemyId =
    | 'zako' | 'hard' | 'fast' | 'thrower' | 'boss' | 'kasa' | 'bento' | 'yawn'
    | 'bell' | 'fluffy' | 'twin' | 'singer' | 'fuusen' | 'spring' | 'ufo' | 'king';

export const ENEMY_IDS: readonly EnemyId[] = [
    'zako', 'hard', 'fast', 'thrower', 'boss', 'kasa', 'bento', 'yawn',
    'bell', 'fluffy', 'twin', 'singer', 'fuusen', 'spring', 'ufo', 'king'
];

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
    // Flies high above the lane: only flying or antiAir allies (and spells) can hit it
    flying?: boolean;
    // Can hit flying allies
    antiAir?: boolean;
    // Knockback multiplier (e.g. kasa blows back farther)
    kbVuln?: number;
    // Hits all of ours in its range at once (めざまし, UFO, まおう)
    area?: boolean;
    // Pushes the one it hits back (px of the lane)
    knockback?: number;
    // Falls into this many わすれんぼう (SPLIT_INTO) where it was (ふたご)
    split?: number;
    // Heals the enemies near it (and itself) this much (of a stage of power 1) every `everyMs` (こもりうた)
    heal?: { amount: number; everyMs: number; range: number };
    // ふかふか, ふたご, etc.: our units other than `counters` do only this part of their harm, and the
    // `counters` this many times (not the spells)
    soft?: number;
    bane?: number;
    // Those of ours it hits stop this long (ms), startled (めざまし, UFO, ゆめのまおう)
    stun?: number;
    // Not pushed back, by the water spell or by a unit (heavy)
    heavy?: boolean;
    // How to beat it, for the child (with [kanji|reading] marks), and the units good against it
    tip?: string;
    counters?: readonly UnitId[];
}

export const ENEMIES: Record<EnemyId, EnemyType> = {
    zako: { id: 'zako', name: 'わすれんぼう', color: '#b9a6d8', hp: 90, attack: 10, attackMs: 1200, range: 26, speed: 30, size: 32, money: 15, mana: 5, boss: false },
    hard: { id: 'hard', name: 'かちこちわすれ', color: '#8d8a84', hp: 420, attack: 14, attackMs: 1600, range: 28, speed: 18, size: 40, money: 40, mana: 8, boss: false },
    fast: { id: 'fast', name: 'すばしわすれ', color: '#e0b26b', hp: 70, attack: 12, attackMs: 700, range: 24, speed: 75, size: 30, money: 20, mana: 6, boss: false },
    thrower: { id: 'thrower', name: 'ぽいぽいわすれ', color: '#9bb6c9', hp: 120, attack: 18, attackMs: 1800, range: 200, speed: 24, size: 34, money: 35, mana: 8, boss: false, antiAir: true },
    boss: { id: 'boss', name: 'おおわすれんぼう', color: '#7a2c4d', hp: 3200, attack: 60, attackMs: 2400, range: 60, speed: 12, size: 72, money: 300, mana: 40, boss: true, antiAir: true },
    // Early-to-mid newcomers: a flying umbrella one, a lunchbox thrower with bonus money, and a giant yawner
    kasa: { id: 'kasa', name: 'かさばりわすれ', color: '#9ad4e8', hp: 85, attack: 11, attackMs: 1300, range: 36, speed: 34, size: 34, money: 25, mana: 7, boss: false, flying: true, antiAir: true, kbVuln: 1.6 },
    bento: { id: 'bento', name: 'おべんとうわすれ', color: '#f2b880', hp: 170, attack: 16, attackMs: 1700, range: 170, speed: 22, size: 36, money: 48, mana: 9, boss: false, antiAir: true },
    yawn: { id: 'yawn', name: 'あくびわすれ', color: '#b5c4e8', hp: 310, attack: 15, attackMs: 1800, range: 40, speed: 19, size: 42, money: 38, mana: 8, boss: false, knockback: 25 },
    // From the 11th stage: an alarm clock that rings and hits all that are near
    bell: { id: 'bell', name: 'めざましわすれ', color: '#f2c14e', hp: 260, attack: 24, attackMs: 2000, range: 40, speed: 22, size: 38, money: 40, mana: 8, boss: false, area: true, stun: 1200,
        tip: 'ジリリで [味方|みかた]が [止|と]まる。ネコや ゾウで [遠|とお]くから', counters: ['neko', 'zou'] },
    // Soft as a futon: hard to hurt, and bounces ours back
    fluffy: { id: 'fluffy', name: 'ふかふかわすれ', color: '#f4f1ea', hp: 700, attack: 8, attackMs: 1500, range: 30, speed: 16, size: 46, money: 50, mana: 10, boss: false, knockback: 45, soft: 0.1, bane: 2, heavy: true,
        tip: 'カバや タヌキが よく きく。[水|みず]で おせない', counters: ['kaba', 'tanuki'] },
    // Two in one: falls into two わすれんぼう
    twin: { id: 'twin', name: 'ふたごわすれ', color: '#c9a7e8', hp: 220, attack: 20, attackMs: 1300, range: 26, speed: 26, size: 40, money: 30, mana: 6, boss: false, split: 2, soft: 0.15, bane: 2,
        tip: 'カバや タヌキが よく きく。[炎|ほのお]で もやすと わかれない', counters: ['kaba', 'tanuki'] },
    // Sings a lullaby that heals the enemies near it; weak itself
    singer: { id: 'singer', name: 'こもりうたわすれ', color: '#ffb3c6', hp: 100, attack: 6, attackMs: 1600, range: 150, speed: 20, size: 34, money: 45, mana: 10, boss: false, antiAir: true, heal: { amount: 50, everyMs: 3000, range: 160 },
        tip: 'ネコや ゾウが ねらう。[木|き]で とめると うたえない', counters: ['neko', 'zou'] },
    // Floating on balloons, tossing paper planes from the sky
    fuusen: { id: 'fuusen', name: 'ふうせんわすれ', color: '#ffb5d8', hp: 170, attack: 20, attackMs: 1650, range: 160, speed: 28, size: 36, money: 45, mana: 9, boss: false, flying: true, antiAir: true, soft: 0.25, bane: 2,
        tip: '[空|そら]を とぶよ。ウサギ・フクロウ・ゾウ・ネコで おとそう', counters: ['usagi', 'fukurou', 'zou', 'neko'] },
    // Bouncing wildly on a mattress spring, knocking ours back
    spring: { id: 'spring', name: 'ばねまくらわすれ', color: '#f7c873', hp: 230, attack: 20, attackMs: 1000, range: 30, speed: 70, size: 36, money: 42, mana: 8, boss: false, knockback: 50, soft: 0.2, bane: 2,
        tip: 'びょんびょん はねて おしてくる。ウサギや ペンギン・フクロウで', counters: ['usagi', 'pengin', 'fukurou'] },
    // A sleepy alien in a pillow-shaped UFO: shoots area stun beams from the sky
    ufo: { id: 'ufo', name: 'ねぼけUFOわすれ', color: '#9c89d9', hp: 520, attack: 26, attackMs: 2100, range: 120, speed: 22, size: 46, money: 70, mana: 12, boss: false, flying: true, antiAir: true, area: true, stun: 800, soft: 0.2, bane: 2,
        tip: '[空|そら]の ビームで [止|と]まる。ゾウ・ブタ・フクロウ・ウサギで', counters: ['zou', 'buta', 'fukurou', 'usagi'] },
    // The king of dreams: throws dream clouds far, on all of ours there
    king: { id: 'king', name: 'ゆめのまおう', color: '#8e7cc3', hp: 3600, attack: 36, attackMs: 2600, range: 170, speed: 10, size: 76, money: 350, mana: 45, boss: true, antiAir: true, area: true, stun: 1500,
        tip: '[味方|みかた]が [止|と]まる。ネコや ゾウなら とどかない', counters: ['neko', 'zou'] }
};

// The enemies that come out of a ふたご (the first kind)
export const SPLIT_INTO: EnemyId = 'zako';

// The colour of an enemy of an element (the shape is that of its kind)
export const ELEMENT_BODY = { fire: '#ff9a76', water: '#82b9ff', wood: '#93d16d' } as const;

// --- The magic of the enemy tower (from the 6th stage: stages.ts enemyMagic, numbers ENEMY_MAGIC) ---
// It is told ENEMY_MAGIC.warnMs before; まもり (the barrier of かね) stops the first two
export type EnemySpell = 'sleep' | 'meteor' | 'futon';

export interface EnemySpellInfo {
    // With [kanji|reading] marks (learning/furi.ts)
    name: string;
    does: string;
    // The barrier stops it
    blockable: boolean;
}

export const ENEMY_SPELLS: Record<EnemySpell, EnemySpellInfo> = {
    sleep: { name: 'ねむりの きり', does: '[味方|みかた]が しばらく [止|と]まる', blockable: true },
    meteor: { name: 'まくら ながれぼし', does: '[味方|みかた]と [城|しろ]に ダメージ', blockable: true },
    futon: { name: 'ふとん バリア', does: '[敵|てき]が バリアで [守|まも]られる', blockable: false }
};
