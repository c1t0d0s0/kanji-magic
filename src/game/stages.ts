// --- The 20 stages (requirements 5.4): data only, battle.ts plays them ---
// The enemies are the same in every grade (the kanji are what get harder). Each spawn rule sends
// one enemy at `from` seconds, then one every `every` seconds, `count` times at most. A stage takes
// 2 to 4 minutes (checked by tests/battle.test.ts with a simple player). The enemies of a rule have
// its element: from the 3rd stage most have one, and choosing the units and the kanji that beat it
// makes the battle much easier ('cycle': the last boss changes it every BOSS_ELEMENT_MS).
// From the 6th stage the enemy tower casts magic too (enemyMagic: enemies.ts ENEMY_SPELLS); those
// stages were made a little weaker for it, so that a player who never guards still wins.
// From the 11th the enemies have weak points (enemies.ts tip, counters) and big waves come (waves):
// the way that wins the first 10 (the elements only) does not win there even 2 levels up, a player
// who reads the tips does, and still needs the magic (tests/battle.test.ts with autoplay 'smart').
// Their numbers were chosen so that this holds with the power ±6% too.
import type { Element } from '../spell/elements';
import type { EnemyId, EnemySpell } from './enemies';

export interface Spawn {
    enemy: EnemyId;
    element?: Element | 'cycle';
    from: number;
    every: number;
    count?: number;
}

// The enemy tower casts its magic at `from` seconds, then every `every` seconds, the spells in turn
export interface EnemyMagic {
    from: number;
    every: number;
    spells: readonly EnemySpell[];
}

// A big wave (from the 11th stage): told WAVE.warnMs before `at` seconds, then all of these come
// out one after another (config.ts WAVE.gapMs apart)
export interface Wave {
    at: number;
    enemies: readonly { enemy: EnemyId; element?: Element; count: number }[];
}

export interface Stage {
    id: number;
    name: string;
    // How strong the enemies are (hp and attack)
    power: number;
    enemyBaseHp: number;
    allyBaseHp: number;
    spawns: readonly Spawn[];
    // どんぐり for a clear
    reward: number;
    // The magic gauge fills this many times faster (the tutorial lets the magic come soon)
    manaRate?: number;
    tutorial?: boolean;
    boss?: boolean;
    // From the 6th stage
    enemyMagic?: EnemyMagic;
    // From the 11th stage
    waves?: readonly Wave[];
}

export const STAGES: readonly Stage[] = [
    {
        id: 1, name: '[初|はじ]めての [魔法|まほう]', power: 1.2, enemyBaseHp: 3000, allyBaseHp: 2000, reward: 20, manaRate: 2.5, tutorial: true,
        spawns: [{ enemy: 'zako', from: 6, every: 9 }]
    },
    {
        id: 2, name: 'わすれんぼうの [森|もり]', power: 1.6, enemyBaseHp: 5000, allyBaseHp: 2000, reward: 25,
        spawns: [{ enemy: 'zako', from: 4, every: 7 }, { enemy: 'fast', element: 'wood', from: 40, every: 25 }]
    },
    {
        id: 3, name: 'かちこち [洞窟|どうくつ]', power: 1.9, enemyBaseHp: 6500, allyBaseHp: 2200, reward: 30,
        spawns: [{ enemy: 'zako', element: 'water', from: 3, every: 6 }, { enemy: 'hard', element: 'water', from: 30, every: 30 }, { enemy: 'kasa', element: 'water', from: 22, every: 24 }, { enemy: 'fast', from: 50, every: 22 }]
    },
    {
        id: 4, name: 'ぽいぽい [谷|たに]', power: 2.2, enemyBaseHp: 6500, allyBaseHp: 2200, reward: 35,
        spawns: [{ enemy: 'zako', element: 'fire', from: 3, every: 6 }, { enemy: 'thrower', element: 'fire', from: 20, every: 20 }, { enemy: 'bento', element: 'fire', from: 35, every: 28 }, { enemy: 'hard', from: 60, every: 35 }]
    },
    {
        id: 5, name: 'おおわすれんぼうの [城|しろ]', power: 2.1, enemyBaseHp: 6500, allyBaseHp: 2500, reward: 60, boss: true,
        spawns: [{ enemy: 'zako', element: 'fire', from: 3, every: 7 }, { enemy: 'fast', element: 'fire', from: 20, every: 20 }, { enemy: 'kasa', element: 'fire', from: 28, every: 26 }, { enemy: 'boss', element: 'fire', from: 45, every: 1, count: 1 }, { enemy: 'thrower', element: 'fire', from: 70, every: 25 }]
    },
    {
        id: 6, name: 'はやかぜ [草原|そうげん]', power: 2.7, enemyBaseHp: 9500, allyBaseHp: 2500, reward: 45, enemyMagic: { from: 45, every: 50, spells: ['sleep'] },
        spawns: [{ enemy: 'fast', element: 'wood', from: 3, every: 6 }, { enemy: 'zako', element: 'wood', from: 10, every: 8 }, { enemy: 'kasa', element: 'wood', from: 18, every: 20 }, { enemy: 'yawn', element: 'water', from: 38, every: 30 }]
    },
    {
        id: 7, name: '[岩山|いわやま] [砦|とりで]', power: 3.3, enemyBaseHp: 11000, allyBaseHp: 2800, reward: 50, enemyMagic: { from: 45, every: 50, spells: ['sleep'] },
        spawns: [{ enemy: 'hard', element: 'fire', from: 5, every: 18 }, { enemy: 'zako', element: 'fire', from: 3, every: 6 }, { enemy: 'thrower', element: 'fire', from: 30, every: 20 }, { enemy: 'bento', element: 'fire', from: 42, every: 28 }]
    },
    {
        id: 8, name: '[消|け]しゴムの [雨|あめ]', power: 3.0, enemyBaseHp: 9500, allyBaseHp: 2800, reward: 55, enemyMagic: { from: 45, every: 50, spells: ['sleep'] },
        spawns: [{ enemy: 'thrower', element: 'wood', from: 5, every: 12 }, { enemy: 'zako', element: 'wood', from: 3, every: 6 }, { enemy: 'kasa', element: 'water', from: 20, every: 18 }, { enemy: 'yawn', element: 'wood', from: 36, every: 26 }]
    },
    {
        id: 9, name: 'わすれの [迷宮|めいきゅう]', power: 5.2, enemyBaseHp: 12000, allyBaseHp: 3000, reward: 60, enemyMagic: { from: 45, every: 50, spells: ['sleep'] },
        spawns: [{ enemy: 'zako', element: 'fire', from: 2, every: 5 }, { enemy: 'yawn', element: 'fire', from: 15, every: 22 }, { enemy: 'fast', element: 'water', from: 25, every: 14 }, { enemy: 'bento', element: 'fire', from: 35, every: 20 }]
    },
    {
        id: 10, name: 'にじいろの [大広間|おおひろま]', power: 3.15, enemyBaseHp: 10000, allyBaseHp: 3200, reward: 120, boss: true, enemyMagic: { from: 45, every: 50, spells: ['sleep'] },
        spawns: [
            { enemy: 'zako', element: 'wood', from: 2, every: 7 }, { enemy: 'fast', element: 'water', from: 15, every: 18 }, { enemy: 'kasa', element: 'wood', from: 20, every: 22 }, { enemy: 'bento', element: 'fire', from: 28, every: 26 },
            { enemy: 'boss', element: 'cycle', from: 50, every: 1, count: 1 }, { enemy: 'thrower', element: 'water', from: 60, every: 24 }, { enemy: 'boss', element: 'cycle', from: 150, every: 1, count: 1 }
        ]
    },
    // --- From the 11th: the new enemies, one by one, then all together; the big waves ---
    {
        id: 11, name: 'りんりん [時計台|とけいだい]', power: 5.9, enemyBaseHp: 13500, allyBaseHp: 3200, reward: 65, enemyMagic: { from: 45, every: 50, spells: ['sleep', 'meteor'] },
        waves: [{ at: 70, enemies: [{ enemy: 'bell', element: 'fire', count: 2 }, { enemy: 'fuusen', element: 'fire', count: 2 }, { enemy: 'zako', element: 'water', count: 4 }] }, { at: 140, enemies: [{ enemy: 'bell', element: 'fire', count: 3 }, { enemy: 'fuusen', element: 'fire', count: 2 }, { enemy: 'fast', element: 'wood', count: 3 }] }],
        spawns: [{ enemy: 'zako', element: 'water', from: 2, every: 6 }, { enemy: 'bell', element: 'fire', from: 15, every: 13 }, { enemy: 'fuusen', element: 'fire', from: 24, every: 22 }, { enemy: 'fast', element: 'wood', from: 30, every: 16 }]
    },
    {
        id: 12, name: 'ふかふか [雲|くも]の [道|みち]', power: 5.8, enemyBaseHp: 9000, allyBaseHp: 4400, reward: 70, enemyMagic: { from: 45, every: 50, spells: ['meteor', 'futon', 'sleep'] },
        waves: [{ at: 70, enemies: [{ enemy: 'fluffy', element: 'fire', count: 2 }, { enemy: 'spring', element: 'wood', count: 2 }, { enemy: 'zako', element: 'fire', count: 5 }] }, { at: 140, enemies: [{ enemy: 'fluffy', element: 'fire', count: 3 }, { enemy: 'spring', element: 'wood', count: 3 }, { enemy: 'zako', element: 'fire', count: 4 }] }],
        spawns: [{ enemy: 'zako', element: 'fire', from: 2, every: 6 }, { enemy: 'fluffy', element: 'fire', from: 20, every: 28 }, { enemy: 'spring', element: 'wood', from: 26, every: 22 }]
    },
    {
        id: 13, name: 'ふたごの [沼|ぬま]', power: 4.8, enemyBaseHp: 8000, allyBaseHp: 4600, reward: 75, enemyMagic: { from: 45, every: 50, spells: ['sleep', 'futon', 'meteor'] },
        waves: [{ at: 70, enemies: [{ enemy: 'twin', count: 4 }, { enemy: 'fuusen', element: 'water', count: 2 }] }, { at: 140, enemies: [{ enemy: 'twin', count: 5 }, { enemy: 'fuusen', element: 'water', count: 2 }, { enemy: 'thrower', element: 'water', count: 2 }] }],
        spawns: [{ enemy: 'zako', element: 'water', from: 3, every: 7 }, { enemy: 'twin', from: 6, every: 11 }, { enemy: 'fuusen', element: 'water', from: 20, every: 20 }, { enemy: 'thrower', element: 'water', from: 28, every: 24 }]
    },
    {
        id: 14, name: 'こもりうたの [湖|みずうみ]', power: 6.4, enemyBaseHp: 12000, allyBaseHp: 4000, reward: 80, enemyMagic: { from: 45, every: 50, spells: ['meteor', 'sleep', 'futon'] },
        waves: [{ at: 70, enemies: [{ enemy: 'singer', element: 'fire', count: 2 }, { enemy: 'yawn', element: 'water', count: 2 }, { enemy: 'hard', element: 'water', count: 2 }] }, { at: 140, enemies: [{ enemy: 'singer', element: 'fire', count: 2 }, { enemy: 'fast', element: 'wood', count: 4 }] }],
        spawns: [{ enemy: 'zako', element: 'water', from: 2, every: 6 }, { enemy: 'singer', element: 'fire', from: 16, every: 20 }, { enemy: 'hard', element: 'water', from: 24, every: 26 }, { enemy: 'yawn', element: 'water', from: 32, every: 28 }, { enemy: 'fast', element: 'wood', from: 45, every: 18 }]
    },
    {
        id: 15, name: 'ゆめのまおうの [塔|とう]', power: 4.1, enemyBaseHp: 12000, allyBaseHp: 4200, reward: 130, boss: true, enemyMagic: { from: 45, every: 50, spells: ['sleep', 'futon', 'meteor'] },
        waves: [{ at: 100, enemies: [{ enemy: 'bell', element: 'water', count: 2 }, { enemy: 'ufo', element: 'water', count: 1 }, { enemy: 'zako', element: 'water', count: 4 }] }, { at: 170, enemies: [{ enemy: 'singer', element: 'wood', count: 2 }, { enemy: 'ufo', element: 'water', count: 2 }] }],
        spawns: [{ enemy: 'zako', element: 'water', from: 2, every: 5 }, { enemy: 'bell', element: 'water', from: 20, every: 18 }, { enemy: 'ufo', element: 'water', from: 32, every: 28 }, { enemy: 'king', element: 'wood', from: 50, every: 1, count: 1 }, { enemy: 'singer', element: 'wood', from: 66, every: 28 }]
    },
    {
        id: 16, name: '[真夜中|まよなか]の [町|まち]', power: 4.06, enemyBaseHp: 14000, allyBaseHp: 4200, reward: 85, enemyMagic: { from: 45, every: 50, spells: ['meteor', 'futon', 'sleep'] },
        waves: [{ at: 70, enemies: [{ enemy: 'twin', element: 'water', count: 3 }, { enemy: 'spring', element: 'fire', count: 3 }] }, { at: 140, enemies: [{ enemy: 'fluffy', element: 'water', count: 2 }, { enemy: 'fuusen', element: 'fire', count: 2 }, { enemy: 'twin', element: 'water', count: 3 }] }],
        spawns: [{ enemy: 'spring', element: 'fire', from: 8, every: 14 }, { enemy: 'twin', element: 'water', from: 15, every: 14 }, { enemy: 'fuusen', element: 'fire', from: 24, every: 20 }, { enemy: 'fluffy', element: 'water', from: 35, every: 30 }]
    },
    {
        id: 17, name: '[星降|ほしふ]る [丘|おか]', power: 6.2, enemyBaseHp: 13500, allyBaseHp: 4600, reward: 90, enemyMagic: { from: 45, every: 50, spells: ['futon', 'sleep', 'meteor'] },
        waves: [{ at: 70, enemies: [{ enemy: 'twin', element: 'fire', count: 3 }, { enemy: 'ufo', element: 'fire', count: 2 }, { enemy: 'zako', element: 'wood', count: 4 }] }, { at: 140, enemies: [{ enemy: 'fluffy', element: 'fire', count: 2 }, { enemy: 'ufo', element: 'fire', count: 2 }, { enemy: 'twin', element: 'fire', count: 3 }] }],
        spawns: [{ enemy: 'zako', element: 'wood', from: 2, every: 6 }, { enemy: 'twin', element: 'fire', from: 14, every: 16 }, { enemy: 'fluffy', element: 'fire', from: 24, every: 26 }, { enemy: 'ufo', element: 'fire', from: 32, every: 28 }]
    },
    {
        id: 18, name: '[眠|ねむ]りの [海|うみ]', power: 5.8, enemyBaseHp: 13500, allyBaseHp: 4200, reward: 95, enemyMagic: { from: 45, every: 50, spells: ['sleep', 'meteor', 'futon'] },
        waves: [{ at: 70, enemies: [{ enemy: 'fluffy', element: 'wood', count: 2 }, { enemy: 'twin', element: 'wood', count: 2 }, { enemy: 'fuusen', element: 'wood', count: 2 }] }, { at: 140, enemies: [{ enemy: 'singer', element: 'wood', count: 2 }, { enemy: 'spring', element: 'wood', count: 4 }] }],
        spawns: [{ enemy: 'spring', element: 'wood', from: 6, every: 14 }, { enemy: 'fluffy', element: 'wood', from: 15, every: 26 }, { enemy: 'twin', element: 'wood', from: 25, every: 22 }, { enemy: 'fuusen', element: 'wood', from: 30, every: 22 }, { enemy: 'singer', element: 'wood', from: 40, every: 28 }]
    },
    {
        id: 19, name: 'わすれ[山脈|さんみゃく]', power: 7.6, enemyBaseHp: 14000, allyBaseHp: 5200, reward: 100, enemyMagic: { from: 45, every: 50, spells: ['meteor', 'sleep', 'futon'] },
        waves: [{ at: 70, enemies: [{ enemy: 'bell', element: 'wood', count: 3 }, { enemy: 'yawn', element: 'wood', count: 2 }, { enemy: 'ufo', element: 'wood', count: 2 }] }, { at: 140, enemies: [{ enemy: 'hard', element: 'wood', count: 2 }, { enemy: 'bell', element: 'wood', count: 3 }, { enemy: 'singer', element: 'wood', count: 2 }] }, { at: 210, enemies: [{ enemy: 'bell', element: 'wood', count: 3 }, { enemy: 'ufo', element: 'wood', count: 2 }, { enemy: 'singer', element: 'wood', count: 2 }] }],
        spawns: [
            { enemy: 'zako', element: 'water', from: 2, every: 6 }, { enemy: 'bell', element: 'wood', from: 12, every: 18 }, { enemy: 'yawn', element: 'wood', from: 20, every: 26 },
            { enemy: 'ufo', element: 'wood', from: 28, every: 28 }, { enemy: 'singer', element: 'wood', from: 34, every: 24 }
        ]
    },
    {
        id: 20, name: '[夢|ゆめ]の [果|は]て', power: 3.43, enemyBaseHp: 15000, allyBaseHp: 4200, reward: 200, boss: true, enemyMagic: { from: 45, every: 50, spells: ['futon', 'meteor', 'sleep'] },
        waves: [{ at: 100, enemies: [{ enemy: 'twin', element: 'fire', count: 2 }, { enemy: 'bell', element: 'wood', count: 2 }, { enemy: 'fuusen', element: 'fire', count: 2 }] }, { at: 200, enemies: [{ enemy: 'singer', element: 'water', count: 2 }, { enemy: 'ufo', element: 'water', count: 2 }, { enemy: 'twin', element: 'fire', count: 2 }] }],
        spawns: [
            { enemy: 'zako', element: 'water', from: 2, every: 7 }, { enemy: 'twin', element: 'fire', from: 15, every: 26 }, { enemy: 'bell', element: 'wood', from: 25, every: 24 },
            { enemy: 'ufo', element: 'water', from: 35, every: 30 }, { enemy: 'king', element: 'cycle', from: 50, every: 1, count: 1 }, { enemy: 'singer', element: 'water', from: 70, every: 30 }, { enemy: 'boss', element: 'cycle', from: 150, every: 1, count: 1 }
        ]
    },
    // --- Stages 21–30: Sky, Storm, Starry Realms, and Cosmic Grand Finale ---
    {
        id: 21, name: '[虹|にじ]の [雲海|うんかい]', power: 6.8, enemyBaseHp: 16000, allyBaseHp: 5600, reward: 110, enemyMagic: { from: 45, every: 50, spells: ['sleep', 'futon', 'meteor'] },
        waves: [{ at: 70, enemies: [{ enemy: 'twin', element: 'fire', count: 3 }, { enemy: 'fuusen', element: 'fire', count: 2 }, { enemy: 'kasa', element: 'wood', count: 3 }] }, { at: 140, enemies: [{ enemy: 'fluffy', element: 'fire', count: 2 }, { enemy: 'ufo', element: 'fire', count: 2 }, { enemy: 'fuusen', element: 'fire', count: 2 }] }],
        spawns: [{ enemy: 'kasa', element: 'wood', from: 2, every: 7 }, { enemy: 'twin', element: 'fire', from: 14, every: 16 }, { enemy: 'fuusen', element: 'fire', from: 20, every: 22 }, { enemy: 'fluffy', element: 'fire', from: 26, every: 28 }, { enemy: 'ufo', element: 'fire', from: 36, every: 30 }]
    },
    {
        id: 22, name: '[空|そら][飛|と]ぶ [広場|ひろば]', power: 7.0, enemyBaseHp: 16000, allyBaseHp: 5400, reward: 115, enemyMagic: { from: 45, every: 50, spells: ['meteor', 'sleep', 'futon'] },
        waves: [{ at: 70, enemies: [{ enemy: 'twin', element: 'fire', count: 3 }, { enemy: 'fluffy', element: 'fire', count: 2 }, { enemy: 'bento', element: 'wood', count: 2 }] }, { at: 140, enemies: [{ enemy: 'twin', element: 'fire', count: 3 }, { enemy: 'ufo', element: 'fire', count: 2 }, { enemy: 'bell', element: 'wood', count: 2 }] }],
        spawns: [{ enemy: 'zako', element: 'wood', from: 2, every: 6 }, { enemy: 'bento', element: 'wood', from: 14, every: 22 }, { enemy: 'twin', element: 'fire', from: 16, every: 16 }, { enemy: 'fluffy', element: 'fire', from: 24, every: 26 }, { enemy: 'ufo', element: 'fire', from: 34, every: 28 }]
    },
    {
        id: 23, name: '[時計|とけい]の [迷宮|めいきゅう]', power: 6.8, enemyBaseHp: 16500, allyBaseHp: 5800, reward: 120, enemyMagic: { from: 45, every: 50, spells: ['futon', 'meteor', 'sleep'] },
        waves: [{ at: 70, enemies: [{ enemy: 'bell', element: 'wood', count: 3 }, { enemy: 'ufo', element: 'water', count: 2 }, { enemy: 'fast', element: 'fire', count: 3 }] }, { at: 140, enemies: [{ enemy: 'bell', element: 'wood', count: 3 }, { enemy: 'singer', element: 'water', count: 2 }, { enemy: 'ufo', element: 'water', count: 2 }] }],
        spawns: [{ enemy: 'zako', element: 'fire', from: 2, every: 6 }, { enemy: 'bell', element: 'wood', from: 14, every: 18 }, { enemy: 'fast', element: 'fire', from: 22, every: 20 }, { enemy: 'ufo', element: 'water', from: 28, every: 28 }, { enemy: 'singer', element: 'water', from: 36, every: 26 }]
    },
    {
        id: 24, name: '[氷|こおり]の [洞窟|どうくつ]', power: 6.4, enemyBaseHp: 17000, allyBaseHp: 5800, reward: 125, enemyMagic: { from: 45, every: 50, spells: ['sleep', 'meteor', 'futon'] },
        waves: [{ at: 70, enemies: [{ enemy: 'fluffy', element: 'wood', count: 2 }, { enemy: 'twin', element: 'wood', count: 3 }, { enemy: 'hard', element: 'wood', count: 2 }] }, { at: 140, enemies: [{ enemy: 'ufo', element: 'wood', count: 2 }, { enemy: 'fluffy', element: 'wood', count: 3 }, { enemy: 'spring', element: 'wood', count: 3 }] }],
        spawns: [{ enemy: 'hard', element: 'wood', from: 4, every: 20 }, { enemy: 'spring', element: 'wood', from: 12, every: 20 }, { enemy: 'fluffy', element: 'wood', from: 18, every: 24 }, { enemy: 'twin', element: 'wood', from: 22, every: 20 }, { enemy: 'ufo', element: 'wood', from: 34, every: 30 }]
    },
    {
        id: 25, name: '[大|おお]わすれ [火山|かざん]', power: 4.3, enemyBaseHp: 17000, allyBaseHp: 6000, reward: 220, boss: true, enemyMagic: { from: 45, every: 50, spells: ['meteor', 'futon', 'sleep'] },
        waves: [{ at: 95, enemies: [{ enemy: 'bell', element: 'wood', count: 2 }, { enemy: 'ufo', element: 'water', count: 2 }, { enemy: 'twin', element: 'fire', count: 2 }] }, { at: 180, enemies: [{ enemy: 'singer', element: 'water', count: 2 }, { enemy: 'ufo', element: 'water', count: 2 }, { enemy: 'bell', element: 'wood', count: 2 }] }],
        spawns: [
            { enemy: 'zako', element: 'water', from: 2, every: 7 }, { enemy: 'twin', element: 'fire', from: 16, every: 24 }, { enemy: 'bell', element: 'wood', from: 24, every: 24 },
            { enemy: 'ufo', element: 'water', from: 36, every: 32 }, { enemy: 'boss', element: 'cycle', from: 50, every: 1, count: 1 }, { enemy: 'singer', element: 'water', from: 68, every: 30 }, { enemy: 'boss', element: 'cycle', from: 150, every: 1, count: 1 }
        ]
    },
    {
        id: 26, name: '[嵐|あらし]の [海|うみ]', power: 6.8, enemyBaseHp: 17500, allyBaseHp: 6000, reward: 135, enemyMagic: { from: 45, every: 50, spells: ['sleep', 'futon', 'meteor'] },
        waves: [{ at: 70, enemies: [{ enemy: 'twin', element: 'fire', count: 3 }, { enemy: 'fuusen', element: 'fire', count: 2 }, { enemy: 'kasa', element: 'wood', count: 3 }] }, { at: 140, enemies: [{ enemy: 'twin', element: 'fire', count: 4 }, { enemy: 'spring', element: 'wood', count: 3 }, { enemy: 'fuusen', element: 'fire', count: 2 }] }],
        spawns: [{ enemy: 'kasa', element: 'wood', from: 2, every: 8 }, { enemy: 'twin', element: 'fire', from: 12, every: 16 }, { enemy: 'spring', element: 'wood', from: 18, every: 18 }, { enemy: 'fuusen', element: 'fire', from: 24, every: 22 }]
    },
    {
        id: 27, name: '[星空|ほしぞら]の [町|まち]', power: 5.5, enemyBaseHp: 17500, allyBaseHp: 6200, reward: 140, enemyMagic: { from: 45, every: 50, spells: ['futon', 'sleep', 'meteor'] },
        waves: [{ at: 70, enemies: [{ enemy: 'bell', element: 'wood', count: 3 }, { enemy: 'ufo', element: 'water', count: 2 }, { enemy: 'yawn', element: 'fire', count: 2 }] }, { at: 140, enemies: [{ enemy: 'singer', element: 'fire', count: 2 }, { enemy: 'ufo', element: 'water', count: 2 }, { enemy: 'bell', element: 'wood', count: 3 }] }],
        spawns: [{ enemy: 'zako', element: 'water', from: 2, every: 6 }, { enemy: 'bell', element: 'wood', from: 14, every: 20 }, { enemy: 'yawn', element: 'fire', from: 22, every: 26 }, { enemy: 'ufo', element: 'water', from: 30, every: 30 }, { enemy: 'singer', element: 'fire', from: 36, every: 26 }]
    },
    {
        id: 28, name: '[眠|ねむ]りの [雪原|せつげん]', power: 6.4, enemyBaseHp: 20000, allyBaseHp: 6000, reward: 150, enemyMagic: { from: 45, every: 50, spells: ['meteor', 'sleep', 'futon'] },
        waves: [{ at: 70, enemies: [{ enemy: 'fluffy', element: 'wood', count: 2 }, { enemy: 'twin', element: 'wood', count: 3 }, { enemy: 'fuusen', element: 'wood', count: 3 }] }, { at: 140, enemies: [{ enemy: 'fluffy', element: 'wood', count: 3 }, { enemy: 'spring', element: 'wood', count: 4 }, { enemy: 'twin', element: 'wood', count: 3 }] }],
        spawns: [{ enemy: 'spring', element: 'wood', from: 6, every: 14 }, { enemy: 'fluffy', element: 'wood', from: 14, every: 22 }, { enemy: 'twin', element: 'wood', from: 20, every: 18 }, { enemy: 'fuusen', element: 'wood', from: 26, every: 20 }]
    },
    {
        id: 29, name: '[夢|ゆめ]の [回廊|かいろう]', power: 5.2, enemyBaseHp: 19000, allyBaseHp: 6600, reward: 160, enemyMagic: { from: 45, every: 50, spells: ['futon', 'meteor', 'sleep'] },
        waves: [{ at: 70, enemies: [{ enemy: 'twin', element: 'fire', count: 3 }, { enemy: 'fluffy', element: 'fire', count: 2 }, { enemy: 'ufo', element: 'fire', count: 2 }] }, { at: 140, enemies: [{ enemy: 'bell', element: 'wood', count: 2 }, { enemy: 'fluffy', element: 'fire', count: 2 }, { enemy: 'singer', element: 'fire', count: 2 }] }, { at: 210, enemies: [{ enemy: 'twin', element: 'fire', count: 3 }, { enemy: 'ufo', element: 'fire', count: 2 }, { enemy: 'fluffy', element: 'fire', count: 2 }] }],
        spawns: [
            { enemy: 'zako', element: 'wood', from: 2, every: 6 }, { enemy: 'twin', element: 'fire', from: 12, every: 16 }, { enemy: 'fluffy', element: 'fire', from: 18, every: 24 },
            { enemy: 'bell', element: 'wood', from: 26, every: 26 }, { enemy: 'ufo', element: 'fire', from: 36, every: 32 }, { enemy: 'singer', element: 'fire', from: 44, every: 32 }
        ]
    },
    {
        id: 30, name: 'わすれの [宇宙|うちゅう]', power: 5.75, enemyBaseHp: 20000, allyBaseHp: 7000, reward: 300, boss: true, enemyMagic: { from: 45, every: 50, spells: ['meteor', 'futon', 'sleep'] },
        waves: [
            { at: 95, enemies: [{ enemy: 'twin', element: 'fire', count: 2 }, { enemy: 'bell', element: 'wood', count: 2 }, { enemy: 'fuusen', element: 'fire', count: 2 }] },
            { at: 185, enemies: [{ enemy: 'singer', element: 'water', count: 2 }, { enemy: 'ufo', element: 'water', count: 2 }, { enemy: 'bell', element: 'wood', count: 2 }] },
            { at: 255, enemies: [{ enemy: 'twin', element: 'fire', count: 2 }, { enemy: 'ufo', element: 'water', count: 2 }, { enemy: 'bell', element: 'wood', count: 2 }] }
        ],
        spawns: [
            { enemy: 'zako', element: 'water', from: 2, every: 7 }, { enemy: 'twin', element: 'fire', from: 16, every: 24 }, { enemy: 'bell', element: 'wood', from: 24, every: 24 },
            { enemy: 'ufo', element: 'water', from: 36, every: 32 }, { enemy: 'king', element: 'cycle', from: 50, every: 1, count: 1 }, { enemy: 'singer', element: 'water', from: 70, every: 30 }, { enemy: 'boss', element: 'cycle', from: 150, every: 1, count: 1 }
        ]
    }
];

// The kinds of enemies of a stage with their elements, once each (shown before the battle)
export function stageEnemies(stage: Stage): { enemy: EnemyId; element: Element | 'cycle' | null }[] {
    const seen = new Set<string>();
    const out: { enemy: EnemyId; element: Element | 'cycle' | null }[] = [];
    for (const r of [...stage.spawns, ...(stage.waves ?? []).flatMap(w => w.enemies)]) {
        const key = `${r.enemy}:${r.element ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ enemy: r.enemy, element: r.element ?? null });
    }
    return out;
}

// The kinds of enemies that appear in any of the given cleared stage IDs
export function seenEnemies(clearedStageIds: Iterable<number>): Set<EnemyId> {
    const cleared = new Set(clearedStageIds);
    const seen = new Set<EnemyId>();
    for (const s of STAGES) {
        if (!cleared.has(s.id)) continue;
        for (const r of s.spawns) seen.add(r.enemy);
        for (const w of s.waves ?? []) for (const e of w.enemies) seen.add(e.enemy);
    }
    return seen;
}

export function stageById(id: number): Stage {
    const s = STAGES.find(st => st.id === id);
    if (!s) throw new Error(`no stage ${id}`);
    return s;
}
