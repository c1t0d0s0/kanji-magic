// --- The 20 stages (requirements 5.4): data only, battle.ts plays them ---
// The enemies are the same in every grade (the kanji are what get harder). Each spawn rule sends
// one enemy at `from` seconds, then one every `every` seconds, `count` times at most. A stage takes
// 2 to 4 minutes (checked by tests/battle.test.ts with a simple player). The enemies of a rule have
// its element: from the 3rd stage most have one, and choosing the units and the kanji that beat it
// makes the battle much easier ('cycle': the last boss changes it every BOSS_ELEMENT_MS).
import type { Element } from '../spell/elements';
import type { EnemyId } from './enemies';

export interface Spawn {
    enemy: EnemyId;
    element?: Element | 'cycle';
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
        spawns: [{ enemy: 'zako', from: 4, every: 7 }, { enemy: 'fast', element: 'wood', from: 40, every: 25 }]
    },
    {
        id: 3, name: 'かちこち [洞窟|どうくつ]', power: 1.9, enemyBaseHp: 6500, allyBaseHp: 2200, reward: 30,
        spawns: [{ enemy: 'zako', element: 'water', from: 3, every: 6 }, { enemy: 'hard', element: 'water', from: 30, every: 30 }, { enemy: 'fast', from: 50, every: 22 }]
    },
    {
        id: 4, name: 'ぽいぽい [谷|たに]', power: 2.2, enemyBaseHp: 6500, allyBaseHp: 2200, reward: 35,
        spawns: [{ enemy: 'zako', element: 'fire', from: 3, every: 6 }, { enemy: 'thrower', element: 'fire', from: 20, every: 20 }, { enemy: 'hard', from: 60, every: 35 }]
    },
    {
        id: 5, name: 'おおわすれんぼうの [城|しろ]', power: 2.2, enemyBaseHp: 6500, allyBaseHp: 2500, reward: 60, boss: true,
        spawns: [{ enemy: 'zako', element: 'wood', from: 3, every: 7 }, { enemy: 'fast', element: 'fire', from: 20, every: 20 }, { enemy: 'boss', element: 'fire', from: 45, every: 1, count: 1 }, { enemy: 'thrower', element: 'wood', from: 70, every: 25 }]
    },
    {
        id: 6, name: 'はやかぜ [草原|そうげん]', power: 2.7, enemyBaseHp: 9500, allyBaseHp: 2500, reward: 45,
        spawns: [{ enemy: 'fast', element: 'wood', from: 3, every: 6 }, { enemy: 'zako', element: 'wood', from: 10, every: 8 }, { enemy: 'hard', element: 'water', from: 40, every: 30 }]
    },
    {
        id: 7, name: '[岩山|いわやま] [砦|とりで]', power: 3.3, enemyBaseHp: 11000, allyBaseHp: 2800, reward: 50,
        spawns: [{ enemy: 'hard', element: 'fire', from: 5, every: 18 }, { enemy: 'zako', element: 'fire', from: 3, every: 6 }, { enemy: 'thrower', element: 'fire', from: 30, every: 20 }]
    },
    {
        id: 8, name: '[消|け]しゴムの [雨|あめ]', power: 3.3, enemyBaseHp: 9500, allyBaseHp: 2800, reward: 55,
        spawns: [{ enemy: 'thrower', element: 'wood', from: 5, every: 12 }, { enemy: 'zako', element: 'wood', from: 3, every: 6 }, { enemy: 'fast', element: 'water', from: 30, every: 15 }]
    },
    {
        id: 9, name: 'わすれの [迷宮|めいきゅう]', power: 3.6, enemyBaseHp: 10000, allyBaseHp: 3000, reward: 60,
        spawns: [{ enemy: 'zako', element: 'fire', from: 2, every: 5 }, { enemy: 'hard', element: 'wood', from: 15, every: 22 }, { enemy: 'fast', element: 'water', from: 25, every: 14 }, { enemy: 'thrower', element: 'fire', from: 35, every: 18 }]
    },
    {
        id: 10, name: 'にじいろの [大広間|おおひろま]', power: 2.6, enemyBaseHp: 11000, allyBaseHp: 3200, reward: 120, boss: true,
        spawns: [
            { enemy: 'zako', element: 'wood', from: 2, every: 7 }, { enemy: 'fast', element: 'water', from: 15, every: 18 }, { enemy: 'hard', element: 'fire', from: 25, every: 30 },
            { enemy: 'boss', element: 'cycle', from: 50, every: 1, count: 1 }, { enemy: 'thrower', element: 'water', from: 60, every: 24 }, { enemy: 'boss', element: 'cycle', from: 150, every: 1, count: 1 }
        ]
    },
    // --- From the 11th: the new enemies, one by one, then all together ---
    {
        id: 11, name: 'りんりん [時計台|とけいだい]', power: 4.6, enemyBaseHp: 11000, allyBaseHp: 3200, reward: 65,
        spawns: [{ enemy: 'zako', element: 'water', from: 2, every: 6 }, { enemy: 'bell', element: 'fire', from: 15, every: 18 }, { enemy: 'fast', element: 'wood', from: 30, every: 16 }]
    },
    {
        id: 12, name: 'ふかふか [雲|くも]の [道|みち]', power: 4.8, enemyBaseHp: 11500, allyBaseHp: 3200, reward: 70,
        spawns: [{ enemy: 'zako', element: 'fire', from: 2, every: 6 }, { enemy: 'fluffy', element: 'fire', from: 20, every: 28 }, { enemy: 'thrower', element: 'wood', from: 30, every: 20 }]
    },
    {
        id: 13, name: 'ふたごの [沼|ぬま]', power: 5.2, enemyBaseHp: 12000, allyBaseHp: 3400, reward: 75,
        spawns: [{ enemy: 'zako', element: 'wood', from: 3, every: 7 }, { enemy: 'twin', element: 'wood', from: 6, every: 13 }, { enemy: 'hard', element: 'water', from: 40, every: 30 }]
    },
    {
        id: 14, name: 'こもりうたの [湖|みずうみ]', power: 6.0, enemyBaseHp: 12000, allyBaseHp: 3400, reward: 80,
        spawns: [{ enemy: 'zako', element: 'water', from: 2, every: 6 }, { enemy: 'singer', element: 'water', from: 20, every: 25 }, { enemy: 'hard', element: 'water', from: 30, every: 28 }, { enemy: 'fast', element: 'fire', from: 45, every: 18 }]
    },
    {
        id: 15, name: 'ゆめのまおうの [塔|とう]', power: 3, enemyBaseHp: 12000, allyBaseHp: 3600, reward: 130, boss: true,
        spawns: [{ enemy: 'zako', element: 'fire', from: 2, every: 4 }, { enemy: 'bell', element: 'water', from: 20, every: 18 }, { enemy: 'king', element: 'wood', from: 50, every: 1, count: 1 }, { enemy: 'singer', element: 'fire', from: 70, every: 30 }]
    },
    {
        id: 16, name: '[真夜中|まよなか]の [町|まち]', power: 7.2, enemyBaseHp: 13000, allyBaseHp: 3600, reward: 85,
        spawns: [{ enemy: 'fast', element: 'water', from: 3, every: 6 }, { enemy: 'twin', element: 'water', from: 15, every: 14 }, { enemy: 'thrower', element: 'water', from: 25, every: 20 }, { enemy: 'fluffy', element: 'fire', from: 35, every: 30 }]
    },
    {
        id: 17, name: '[星降|ほしふ]る [丘|おか]', power: 3.9, enemyBaseHp: 13500, allyBaseHp: 3800, reward: 90,
        spawns: [{ enemy: 'zako', element: 'wood', from: 2, every: 5 }, { enemy: 'bell', element: 'fire', from: 12, every: 16 }, { enemy: 'singer', element: 'water', from: 30, every: 26 }, { enemy: 'hard', element: 'fire', from: 40, every: 28 }]
    },
    {
        id: 18, name: '[眠|ねむ]りの [海|うみ]', power: 6.2, enemyBaseHp: 14000, allyBaseHp: 3800, reward: 95,
        spawns: [{ enemy: 'fast', element: 'fire', from: 3, every: 6 }, { enemy: 'fluffy', element: 'water', from: 15, every: 26 }, { enemy: 'twin', element: 'wood', from: 25, every: 15 }, { enemy: 'singer', element: 'water', from: 40, every: 28 }]
    },
    {
        id: 19, name: 'わすれ[山脈|さんみゃく]', power: 5.5, enemyBaseHp: 14500, allyBaseHp: 4000, reward: 100,
        spawns: [
            { enemy: 'zako', element: 'fire', from: 2, every: 5 }, { enemy: 'bell', element: 'water', from: 12, every: 18 }, { enemy: 'twin', element: 'wood', from: 20, every: 16 },
            { enemy: 'fluffy', element: 'fire', from: 35, every: 30 }, { enemy: 'singer', element: 'wood', from: 45, every: 30 }
        ]
    },
    {
        id: 20, name: '[夢|ゆめ]の [果|は]て', power: 3.8, enemyBaseHp: 15000, allyBaseHp: 4200, reward: 200, boss: true,
        spawns: [
            { enemy: 'zako', element: 'water', from: 2, every: 7 }, { enemy: 'twin', element: 'fire', from: 15, every: 18 }, { enemy: 'bell', element: 'wood', from: 25, every: 24 },
            { enemy: 'king', element: 'cycle', from: 50, every: 1, count: 1 }, { enemy: 'singer', element: 'water', from: 70, every: 30 }, { enemy: 'boss', element: 'cycle', from: 150, every: 1, count: 1 }
        ]
    }
];

// The kinds of enemies of a stage with their elements, once each (shown before the battle)
export function stageEnemies(stage: Stage): { enemy: EnemyId; element: Element | 'cycle' | null }[] {
    const seen = new Set<string>();
    const out: { enemy: EnemyId; element: Element | 'cycle' | null }[] = [];
    for (const r of stage.spawns) {
        const key = `${r.enemy}:${r.element ?? ''}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ enemy: r.enemy, element: r.element ?? null });
    }
    return out;
}

export function stageById(id: number): Stage {
    const s = STAGES.find(st => st.id === id);
    if (!s) throw new Error(`no stage ${id}`);
    return s;
}
