// --- The 10 stages (requirements 5.4): data only, battle.ts plays them ---
// The enemies are the same in every grade (the kanji are what get harder). Each spawn rule sends
// one enemy at `from` seconds, then one every `every` seconds, `count` times at most. A stage takes
// 2 to 4 minutes (checked by tests/battle.test.ts with a simple player).
import type { EnemyId } from './enemies';

export interface Spawn {
    enemy: EnemyId;
    from: number;
    every: number;
    count?: number;
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
}

export const STAGES: readonly Stage[] = [
    {
        id: 1, name: '[初|はじ]めての [魔法|まほう]', power: 1.2, enemyBaseHp: 3000, allyBaseHp: 2000, reward: 20, manaRate: 2.5, tutorial: true,
        spawns: [{ enemy: 'zako', from: 6, every: 9 }]
    },
    {
        id: 2, name: 'わすれんぼうの [森|もり]', power: 1.6, enemyBaseHp: 5000, allyBaseHp: 2000, reward: 25,
        spawns: [{ enemy: 'zako', from: 4, every: 7 }, { enemy: 'fast', from: 40, every: 25 }]
    },
    {
        id: 3, name: 'かちこち [洞窟|どうくつ]', power: 1.9, enemyBaseHp: 6500, allyBaseHp: 2200, reward: 30,
        spawns: [{ enemy: 'zako', from: 3, every: 6 }, { enemy: 'hard', from: 30, every: 30 }, { enemy: 'fast', from: 50, every: 22 }]
    },
    {
        id: 4, name: 'ぽいぽい [谷|たに]', power: 2.2, enemyBaseHp: 6500, allyBaseHp: 2200, reward: 35,
        spawns: [{ enemy: 'zako', from: 3, every: 6 }, { enemy: 'thrower', from: 20, every: 20 }, { enemy: 'hard', from: 60, every: 35 }]
    },
    {
        id: 5, name: 'おおわすれんぼうの [城|しろ]', power: 2.2, enemyBaseHp: 6500, allyBaseHp: 2500, reward: 60, boss: true,
        spawns: [{ enemy: 'zako', from: 3, every: 7 }, { enemy: 'fast', from: 20, every: 20 }, { enemy: 'boss', from: 45, every: 1, count: 1 }, { enemy: 'thrower', from: 70, every: 25 }]
    },
    {
        id: 6, name: 'はやかぜ [草原|そうげん]', power: 2.7, enemyBaseHp: 9500, allyBaseHp: 2500, reward: 45,
        spawns: [{ enemy: 'fast', from: 3, every: 6 }, { enemy: 'zako', from: 10, every: 8 }, { enemy: 'hard', from: 40, every: 30 }]
    },
    {
        id: 7, name: '[岩山|いわやま] [砦|とりで]', power: 3.0, enemyBaseHp: 11000, allyBaseHp: 2800, reward: 50,
        spawns: [{ enemy: 'hard', from: 5, every: 18 }, { enemy: 'zako', from: 3, every: 6 }, { enemy: 'thrower', from: 30, every: 20 }]
    },
    {
        id: 8, name: '[消|け]しゴムの [雨|あめ]', power: 3.3, enemyBaseHp: 9500, allyBaseHp: 2800, reward: 55,
        spawns: [{ enemy: 'thrower', from: 5, every: 12 }, { enemy: 'zako', from: 3, every: 6 }, { enemy: 'fast', from: 30, every: 15 }]
    },
    {
        id: 9, name: 'わすれの [迷宮|めいきゅう]', power: 3.6, enemyBaseHp: 10000, allyBaseHp: 3000, reward: 60,
        spawns: [{ enemy: 'zako', from: 2, every: 5 }, { enemy: 'hard', from: 15, every: 22 }, { enemy: 'fast', from: 25, every: 14 }, { enemy: 'thrower', from: 35, every: 18 }]
    },
    {
        id: 10, name: '[最後|さいご]の [戦|たたか]い', power: 3.8, enemyBaseHp: 11000, allyBaseHp: 3200, reward: 120, boss: true,
        spawns: [
            { enemy: 'zako', from: 2, every: 5 }, { enemy: 'fast', from: 15, every: 15 }, { enemy: 'hard', from: 25, every: 25 },
            { enemy: 'boss', from: 50, every: 1, count: 1 }, { enemy: 'thrower', from: 60, every: 18 }, { enemy: 'boss', from: 150, every: 1, count: 1 }
        ]
    }
];

export function stageById(id: number): Stage {
    const s = STAGES.find(st => st.id === id);
    if (!s) throw new Error(`no stage ${id}`);
    return s;
}
