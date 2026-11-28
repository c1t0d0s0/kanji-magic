import { describe, expect, it } from 'vitest';
import { AFFINITY, BOSS_ELEMENT_MS, BOSS_SPELL_RESIST, ENEMY_MAGIC, LANE, MANA_MAX, MANA_REFUND, MAX_LEVEL, START_MONEY, WALLET, WAVE } from '../src/config';
import {
    BURN_MS, canSummon, castSpell, createBattle, enemyMagicSoon, guarded, manaFull, rewardOf, spellRating, spellTips, starsOf, startSpell, step, summon, upgradeWallet, waveEnemies,
    waveSoon, type Battle
} from '../src/game/battle';
import { ENEMIES, ENEMY_IDS, SPLIT_INTO } from '../src/game/enemies';
import { STAGES, seenEnemies, stageById, type Stage } from '../src/game/stages';
import { UNITS, formOf, levelPower, unitStats, unlockedUnits } from '../src/game/units';
import { effectOfGroup, spellEffect } from '../src/spell/effects';
import type { Element } from '../src/spell/elements';
import { autoplay } from './helpers/autoplay';

const DT = 1000 / 60;
const run = (b: Battle, ms: number) => {
    for (let t = 0; t < ms; t += DT) step(b, DT);
};
// A stage with no enemies, to test one thing at a time
const quiet: Stage = { id: 99, name: 'test', power: 1, enemyBaseHp: 1000, allyBaseHp: 1000, reward: 10, spawns: [] };
const enemyAt = (b: Battle, x: number, id: keyof typeof ENEMIES = 'zako', element: Element | null = null) => {
    const e = ENEMIES[id];
    b.fighters.push({
        id: b.nextId++, side: 'enemy', kind: id, form: 0, element, color: e.color, size: e.size, boss: e.boss, x, hp: e.hp, maxHp: e.hp,
        attack: e.attack, attackMs: e.attackMs, range: e.range, speed: e.speed, knockback: 0, area: false, wait: 0, stopMs: 0,
        shield: 0, hurtMs: 0, fighting: false, money: e.money, mana: e.mana
    });
    return b.fighters[b.fighters.length - 1];
};

describe('stages and units', () => {
    it('has 30 stages; the 1st is the tutorial, bosses come every 5th', () => {
        expect(STAGES.map(s => s.id)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
        expect(STAGES[0].tutorial).toBe(true);
        for (const s of STAGES) {
            expect(s.spawns.some(r => ENEMIES[r.enemy].boss), `stage ${s.id}`).toBe(s.id % 5 === 0);
            expect(s.boss ?? false).toBe(s.id % 5 === 0);
        }
    });

    it('has 16 kinds of enemies, each seen in some stage', () => {
        expect(ENEMY_IDS).toHaveLength(16);
        expect(Object.keys(ENEMIES).sort()).toEqual([...ENEMY_IDS].sort());
        const seen = new Set(STAGES.flatMap(s => [...s.spawns.map(r => r.enemy), ...(s.waves ?? []).flatMap(w => w.enemies.map(e => e.enemy))]));
        for (const id of ENEMY_IDS) expect(seen.has(id), id).toBe(true);
    });

    it('seenEnemies returns only enemies from cleared stages (spawns and waves)', () => {
        expect([...seenEnemies([])]).toEqual([]);
        expect([...seenEnemies([1])]).toEqual(['zako']);
        const st3 = seenEnemies([1, 2, 3]);
        expect(st3.has('kasa')).toBe(true);
        expect(st3.has('boss')).toBe(false);
        const all = seenEnemies(STAGES.map(s => s.id));
        expect(all.size).toBe(ENEMY_IDS.length);
    });

    it('gives 2 units at first, more as the stages are cleared up to 10', () => {
        expect(unlockedUnits(0)).toEqual(['purun', 'kaeru']);
        expect(unlockedUnits(2)).toContain('neko');
        expect(unlockedUnits(4)).toContain('pengin');
        expect(unlockedUnits(6)).toEqual(['purun', 'kaeru', 'neko', 'pengin', 'kaba']);
        expect(unlockedUnits(8)).toContain('usagi');
        expect(unlockedUnits(11)).toContain('fukurou');
        expect(unlockedUnits(14)).toContain('zou');
        expect(unlockedUnits(17)).toContain('tanuki');
        expect(unlockedUnits(20)).toHaveLength(10);
    });

    it('evolves twice, getting stronger with each level', () => {
        expect([1, 4, 5, 9, 10, 15].map(formOf)).toEqual([0, 0, 1, 1, 2, 2]);
        for (let l = 2; l <= MAX_LEVEL; l++) expect(levelPower(l)).toBeGreaterThan(levelPower(l - 1));
        for (const u of Object.values(UNITS)) {
            expect(new Set(u.forms.map(f => f.name)).size).toBe(3);
            expect(unitStats(u.id, MAX_LEVEL).hp).toBeGreaterThan(unitStats(u.id, 1).hp);
        }
    });
});

describe('money and units', () => {
    it('money grows up to the cap of the wallet; a bigger wallet grows it faster and holds more', () => {
        const b = createBattle(quiet, [{ id: 'purun', level: 1 }]);
        expect(b.money).toBe(START_MONEY);
        run(b, 1000);
        expect(b.money).toBeCloseTo(START_MONEY + WALLET[0].rate, 0);
        run(b, 120000);
        expect(b.money).toBe(WALLET[0].cap);
        expect(upgradeWallet(b)).toBe(true);
        expect(b.money).toBe(WALLET[0].cap - WALLET[0].next!);
        run(b, 120000);
        expect(b.money).toBe(WALLET[1].cap);
    });

    it('a unit costs money and waits before it can be sent again', () => {
        const b = createBattle(quiet, [{ id: 'kaeru', level: 1 }]);
        expect(canSummon(b, 'kaeru')).toBe(false);
        run(b, 3000);
        expect(summon(b, 'kaeru')).toBe(true);
        expect(b.fighters).toHaveLength(1);
        expect(canSummon(b, 'kaeru')).toBe(false);
        b.money = 1000;
        expect(canSummon(b, 'kaeru')).toBe(false);
        run(b, UNITS.kaeru.cooldownMs + 100);
        expect(canSummon(b, 'kaeru')).toBe(true);
        expect(canSummon(b, 'kaba')).toBe(false);
    });

    it('our units walk to the enemy base and break it: the battle is won', () => {
        const b = createBattle({ ...quiet, enemyBaseHp: 100 }, [{ id: 'kaeru', level: 1 }]);
        b.money = 1000;
        expect(summon(b, 'kaeru')).toBe(true);
        run(b, 60000);
        expect(b.result).toBe('win');
        expect(b.events).toContain('win');
        expect(starsOf(b, 0)).toBe(2);
        expect(starsOf(b, 1)).toBe(3);
    });

    it('enemies left alone break our base: the battle is lost', () => {
        const b = createBattle({ ...quiet, allyBaseHp: 50, spawns: [{ enemy: 'zako', from: 0, every: 5 }] }, []);
        run(b, 60000);
        expect(b.result).toBe('lose');
        expect(starsOf(b, 3)).toBe(0);
    });

    it('a fallen enemy gives money and magic', () => {
        const b = createBattle(quiet, []);
        const e = enemyAt(b, 500);
        e.hp = 0;
        const before = b.money;
        step(b, DT);
        expect(b.money).toBeGreaterThan(before + ENEMIES.zako.money - 1);
        expect(b.mana).toBeGreaterThanOrEqual(ENEMIES.zako.mana);
        expect(b.kills).toBe(1);
    });
});

describe('the magic', () => {
    it('the gauge fills with time; the button spends it all', () => {
        const b = createBattle(quiet, []);
        expect(manaFull(b)).toBe(false);
        run(b, 60000);
        expect(manaFull(b)).toBe(true);
        expect(startSpell(b)).toBe(true);
        expect(b.mana).toBe(0);
        expect(startSpell(b)).toBe(false);
    });

    it('かんぺき gives back 20% of the gauge and ふはつ 50%; ふはつ does nothing else', () => {
        for (const g of ['perfect', 'fail'] as const) {
            const b = createBattle(quiet, []);
            const e = enemyAt(b, 500);
            castSpell(b, spellEffect('火', g, 4), g);
            expect(b.mana).toBe(MANA_REFUND[g] * MANA_MAX);
            if (g === 'fail') expect(e.hp).toBe(e.maxHp);
        }
    });

    it('ほのお hurts every enemy; the boss less', () => {
        const b = createBattle(quiet, []);
        const a = enemyAt(b, 300, 'hard'), c = enemyAt(b, 600, 'hard'), boss = enemyAt(b, 400, 'boss');
        const e = spellEffect('火', 'success', 4)!;
        castSpell(b, e, 'success');
        const dmg = e.kind === 'attack' ? e.damage : 0;
        expect(a.maxHp - a.hp).toBe(dmg);
        expect(c.maxHp - c.hp).toBe(dmg);
        expect(boss.maxHp - boss.hp).toBe(dmg / 2);
    });

    it('みず pushes the enemies back to their side', () => {
        const b = createBattle(quiet, []);
        const e = enemyAt(b, 600, 'hard');
        castSpell(b, spellEffect('海', 'success', 9), 'success');
        expect(e.hp).toBeLessThan(e.maxHp);
        expect(e.x).toBeLessThan(600);
        expect(e.x).toBeGreaterThanOrEqual(LANE.enemyBase);
    });

    it('き stops the enemies for a while', () => {
        const b = createBattle(quiet, []);
        const e = enemyAt(b, 300, 'hard');
        castSpell(b, spellEffect('森', 'success', 12), 'success');
        expect(e.hp).toBeLessThan(e.maxHp);
        run(b, 2000);
        expect(e.x).toBe(300);
        run(b, 10000);
        expect(e.x).toBeGreaterThan(300);
    });

    it('かね puts a barrier on our units (and on those sent while it lasts)', () => {
        const b = createBattle(quiet, [{ id: 'purun', level: 1 }, { id: 'kaeru', level: 1 }]);
        b.money = 1000;
        summon(b, 'purun');
        castSpell(b, spellEffect('銀', 'success', 14), 'success');
        expect(b.fighters[0].shield).toBeGreaterThan(0);
        run(b, 3000);
        summon(b, 'kaeru');
        expect(b.fighters[1].shield).toBeGreaterThan(0);
        run(b, 10000);
        expect(b.fighters.every(f => f.shield === 0)).toBe(true);
    });

    it('ことば makes our attack stronger for a while', () => {
        const hitWith = (boost: boolean) => {
            const b = createBattle(quiet, [{ id: 'kaeru', level: 1 }]);
            b.money = 1000;
            summon(b, 'kaeru');
            const u = b.fighters[0];
            const e = enemyAt(b, u.x - u.size / 2 - 20, 'boss');
            if (boost) castSpell(b, spellEffect('語', 'success', 14), 'success');
            run(b, 1500);
            return e.maxHp - e.hp;
        };
        expect(hitWith(true)).toBeGreaterThan(hitWith(false));
    });
});

describe('a whole stage (a simple player)', () => {
    // Levels a child may have reached at each stage
    const levelAt = (id: number) => 1 + Math.floor((id - 1) / 2);

    // To the 10th the elements are enough; from the 11th the tips have to be read too (choose 'smart')
    const wayOf = (id: number) => (id <= 10 ? 'best' : 'smart') as 'best' | 'smart';

    it('each stage is won with spells that succeed, chosen by the elements (and the tips), in 1 to 6 minutes', () => {
        for (const s of STAGES) {
            const b = autoplay(s, { spell: 'success', level: levelAt(s.id), choose: wayOf(s.id) });
            expect(b.result, `stage ${s.id}`).toBe('win');
            expect(b.time, `stage ${s.id}`).toBeGreaterThan(55000);
            expect(b.time, `stage ${s.id}`).toBeLessThan(360000);
        }
    }, 300000);

    it('from the 11th, the way that won the first 10 does not win, even 2 levels up', () => {
        for (const s of STAGES.filter(st => st.id >= 11)) {
            for (const level of [levelAt(s.id), Math.min(MAX_LEVEL, levelAt(s.id) + 2)]) {
                expect(autoplay(s, { spell: 'success', level }).result, `stage ${s.id} Lv${level}`).not.toBe('win');
            }
        }
    }, 300000);

    it('from the 11th, a stage is won when its power is a little other, too', () => {
        for (const s of STAGES.filter(st => st.id >= 11)) {
            for (const k of [0.97, 1.03]) {
                const b = autoplay({ ...s, power: s.power * k }, { spell: 'success', level: levelAt(s.id), choose: 'smart' });
                expect(b.result, `stage ${s.id} ×${k}`).toBe('win');
            }
        }
    }, 300000);

    it('doing nothing loses every stage', () => {
        for (const s of STAGES) expect(autoplay(s, { spell: null, level: 1, idle: true }).result, `stage ${s.id}`).toBe('lose');
    }, 300000);

    it('the last stages need the magic', () => {
        const without = STAGES.filter(s => s.id >= 8).map(s => autoplay(s, { spell: null, level: levelAt(s.id), choose: wayOf(s.id) }).result);
        expect(without.every(r => r !== 'win')).toBe(true);
    }, 300000);

    it('choosing by the elements wins the later stages sooner (or at all)', () => {
        for (const s of STAGES.filter(st => st.id >= 5 && st.id <= 9)) {
            const best = autoplay(s, { spell: 'success', choose: 'best', level: levelAt(s.id) });
            const worst = autoplay(s, { spell: 'success', choose: 'worst', level: levelAt(s.id) });
            expect(best.result, `stage ${s.id}`).toBe('win');
            if (worst.result === 'win') expect(best.time, `stage ${s.id}`).toBeLessThan(worst.time * 0.9);
        }
    }, 300000);

    it('the same battle plays the same way', () => {
        const a = autoplay(stageById(3), { spell: 'success', level: 2 });
        const b = autoplay(stageById(3), { spell: 'success', level: 2 });
        expect(a.time).toBe(b.time);
        expect(a.allyBase.hp).toBe(b.allyBase.hp);
    });
});

describe('the elements', () => {
    it('a spell hurts ×2 the element it beats, ×0.5 the one that beats it; no element ×1', () => {
        const b = createBattle(quiet, []);
        const fire = enemyAt(b, 300, 'boss', 'fire'), wood = enemyAt(b, 400, 'boss', 'wood'), water = enemyAt(b, 500, 'boss', 'water'), none = enemyAt(b, 600, 'boss');
        const e = spellEffect('海', 'success', 9)!;
        castSpell(b, e, 'success');
        const dmg = (e.kind === 'attack' ? e.damage : 0) * BOSS_SPELL_RESIST;
        expect(fire.maxHp - fire.hp).toBeCloseTo(dmg * AFFINITY.spell.strong);
        expect(wood.maxHp - wood.hp).toBeCloseTo(dmg * AFFINITY.spell.weak);
        expect(water.maxHp - water.hp).toBeCloseTo(dmg);
        expect(none.maxHp - none.hp).toBeCloseTo(dmg);
        expect(b.fx.some(f => f.kind === 'good')).toBe(false);
    });

    it('says よく きいた！ when most were of the element it beats', () => {
        const b = createBattle(quiet, []);
        enemyAt(b, 300, 'boss', 'wood');
        enemyAt(b, 400, 'boss', 'wood');
        enemyAt(b, 500, 'boss', 'water');
        // Before: how the cards would show it
        expect(spellRating(b, 'fire')).toBe('good');
        expect(spellRating(b, 'water')).toBe('weak');
        castSpell(b, spellEffect('火', 'success', 4), 'success');
        expect(b.fx.some(f => f.kind === 'good')).toBe(true);
    });

    it('a unit hurts more the element it beats, and is hurt more by the one that beats it', () => {
        const hit = (unitEl: 'water' | 'wood', foeEl: Element | null) => {
            const b = createBattle(quiet, [{ id: unitEl === 'water' ? 'kaba' : 'kaeru', level: 1 }]);
            b.money = 5000;
            summon(b, unitEl === 'water' ? 'kaba' : 'kaeru');
            const u = b.fighters[0];
            const e = enemyAt(b, u.x - u.size / 2 - 30, 'boss', foeEl);
            e.attack = 0;
            run(b, 3000);
            return e.maxHp - e.hp;
        };
        expect(hit('water', 'fire')).toBeCloseTo(hit('water', null) * AFFINITY.unit.strong);
        expect(hit('water', 'wood')).toBeCloseTo(hit('water', null) * AFFINITY.unit.weak);
        expect(UNITS.kaba.element).toBe('water');
    });

    it('the last boss changes its element every BOSS_ELEMENT_MS', () => {
        const b = createBattle({ ...quiet, spawns: [{ enemy: 'boss', element: 'cycle', from: 0, every: 1, count: 1 }] }, []);
        step(b, DT);
        const boss = b.fighters[0];
        const seen = [boss.element];
        for (let i = 0; i < 2; i++) {
            run(b, BOSS_ELEMENT_MS);
            seen.push(boss.element);
        }
        expect(new Set(seen).size).toBe(3);
        expect(b.fx.some(f => f.kind === 'change')).toBe(true);
    });
});

describe('the new enemies', () => {
    // One enemy of a kind, sent by the stage as in a battle (with all it can do)
    const sendOne = (id: keyof typeof ENEMIES, deck: { id: 'kaba' | 'kaeru' | 'purun'; level: number }[] = []) => {
        const b = createBattle({ ...quiet, enemyBaseHp: 1e6, allyBaseHp: 1e6, spawns: [{ enemy: id, from: 0, every: 1, count: 1 }] }, deck);
        step(b, DT);
        return { b, e: b.fighters.find(f => f.kind === id)! };
    };

    it('ふたご falls into two わすれんぼう where it was', () => {
        const { b, e } = sendOne('twin');
        e.x = 400;
        e.hp = 0;
        step(b, DT);
        const minis = b.fighters.filter(f => f.kind === SPLIT_INTO);
        expect(minis).toHaveLength(ENEMIES.twin.split!);
        for (const m of minis) expect(Math.abs(m.x - 400)).toBeLessThan(40);
        expect(b.fx.some(f => f.kind === 'split')).toBe(true);
        // They do not split again
        for (const m of minis) m.hp = 0;
        step(b, DT);
        expect(b.fighters).toHaveLength(0);
    });

    it('こもりうた heals the enemies near it, not those far off', () => {
        const { b, e } = sendOne('singer');
        e.x = 300;
        e.speed = 0;
        const near = enemyAt(b, 380, 'hard'), far = enemyAt(b, 300 + ENEMIES.singer.heal!.range + 100, 'hard');
        near.speed = far.speed = 0;
        near.hp = far.hp = 100;
        run(b, ENEMIES.singer.heal!.everyMs + 100);
        expect(near.hp).toBe(100 + ENEMIES.singer.heal!.amount);
        expect(far.hp).toBe(100);
        expect(b.fx.some(f => f.kind === 'heal')).toBe(true);
    });

    it('めざまし hits all of ours near it at once; ふかふか pushes ours back', () => {
        const hits = (id: 'bell' | 'zako') => {
            const b = createBattle({ ...quiet, enemyBaseHp: 1e6, allyBaseHp: 1e6, spawns: [] }, [{ id: 'kaba', level: 1 }, { id: 'purun', level: 1 }]);
            b.money = 1e5;
            summon(b, 'kaba');
            run(b, 5000);
            summon(b, 'purun');
            const ours = b.fighters.filter(f => f.side === 'ally');
            for (const o of ours) {
                o.speed = 0;
                o.attack = 0;
                o.x = 420;
            }
            const e = enemyAt(b, 420 - 60, id);
            e.area = ENEMIES[id].area ?? false;
            e.wait = 0;
            step(b, DT);
            return ours.filter(o => o.hp < o.maxHp).length;
        };
        expect(hits('bell')).toBe(2);
        expect(hits('zako')).toBe(1);

        const { b, e } = sendOne('fluffy', [{ id: 'purun', level: 1 }]);
        b.money = 1e5;
        e.x = 400;
        e.speed = 0;
        e.wait = 0;
        summon(b, 'purun');
        const u = b.fighters.find(f => f.side === 'ally')!;
        u.speed = 0;
        u.x = 400 + (u.size + e.size) / 2 + 10;
        const before = u.x;
        step(b, DT);
        expect(u.x).toBeCloseTo(before + ENEMIES.fluffy.knockback!);
    });

    it('ゆめのまおう is a boss that throws far, on all of ours there', () => {
        expect(ENEMIES.king.boss).toBe(true);
        expect(ENEMIES.king.area).toBe(true);
        expect(ENEMIES.king.range).toBeGreaterThan(100);
    });

    // One of ours (level 1) right in front of an enemy that does not move, and the harm of its first hit
    const firstHit = (id: keyof typeof ENEMIES, unit: 'purun' | 'kaeru' | 'neko' | 'pengin' | 'kaba') => {
        const { b, e } = sendOne(id, [{ id: unit, level: 1 } as never]);
        b.money = 1e5;
        e.x = 400;
        e.speed = 0;
        e.attack = 0;
        summon(b, unit);
        const u = b.fighters.find(f => f.side === 'ally')!;
        u.x = 400 + (u.size + e.size) / 2 + 2;
        u.wait = 0;
        const hp = e.hp, x = e.x;
        step(b, DT);
        return { harm: hp - e.hp, moved: e.x - x, plain: UNITS[unit].attack };
    };

    it('ふかふか: only カバ and タヌキ hurt it well (the others a little), and it is not pushed back', () => {
        expect(ENEMIES.fluffy.counters).toEqual(['kaba', 'tanuki']);
        expect(firstHit('fluffy', 'kaba').harm).toBeCloseTo(UNITS.kaba.attack * ENEMIES.fluffy.bane!);
        const kaeru = firstHit('fluffy', 'kaeru');
        expect(kaeru.harm).toBeCloseTo(UNITS.kaeru.attack * ENEMIES.fluffy.soft!);
        expect(firstHit('fluffy', 'pengin').moved).toBe(0);
        expect(firstHit('zako', 'pengin').moved).toBeLessThan(0);
        // The spells are not softened; the water does not push it, the wood stops it
        const b = createBattle(quiet, []);
        const e = enemyAt(b, 500, 'fluffy');
        e.heavy = true;
        e.soft = { part: ENEMIES.fluffy.soft!, bane: 2, except: ['kaba'] };
        e.hp = e.maxHp = 5000;
        const water = spellEffect('海', 'success', 9)!;
        castSpell(b, water, 'success');
        expect(e.x).toBe(500);
        expect(e.maxHp - e.hp).toBe(water.kind === 'attack' ? water.damage : -1);
        castSpell(b, spellEffect('森', 'success', 12), 'success');
        expect(e.stopMs).toBeGreaterThan(0);
        expect(spellTips(b, 'water').some(t => !t.good)).toBe(true);
    });

    it('ふたご: the カバ hurts it well; the fire burns it, and a burnt one does not part', () => {
        expect(firstHit('twin', 'kaba').harm).toBeGreaterThan(firstHit('twin', 'pengin').harm * 2);
        const { b, e } = sendOne('twin');
        e.x = 400;
        e.speed = 0;
        e.hp = e.maxHp = 5000;
        expect(spellTips(b, 'fire').map(t => t.good)).toEqual([true]);
        castSpell(b, spellEffect('火', 'success', 4), 'success');
        expect(e.burnMs).toBe(BURN_MS);
        e.hp = 0;
        step(b, DT);
        expect(b.fighters.filter(f => f.kind === SPLIT_INTO)).toHaveLength(0);
        // Burnt long ago: it parts
        const again = sendOne('twin');
        again.e.hp = again.e.maxHp = 5000;
        again.e.speed = 0;
        castSpell(again.b, spellEffect('火', 'success', 4), 'success');
        run(again.b, BURN_MS + 100);
        again.e.hp = 0;
        step(again.b, DT);
        expect(again.b.fighters.filter(f => f.kind === SPLIT_INTO)).toHaveLength(ENEMIES.twin.split!);
    });

    it('ふかふか and ふたご take the ネコ\'s shots: it cannot hit the base over them', () => {
        const b = createBattle({ ...quiet, enemyBaseHp: 1e6, allyBaseHp: 1e6, spawns: [] }, [{ id: 'neko', level: 1 }]);
        b.money = 1e5;
        summon(b, 'neko');
        const u = b.fighters[0];
        u.x = LANE.enemyBase + 150;
        u.speed = 0;
        u.wait = 0;
        const wall = enemyAt(b, LANE.enemyBase + 60, 'twin');
        wall.soft = { part: ENEMIES.twin.soft!, bane: 2, except: ['kaba'] };
        wall.speed = 0;
        wall.attack = 0;
        step(b, DT);
        expect(b.enemyBase.hp).toBe(1e6);
        expect(wall.hp).toBeLessThan(wall.maxHp);
    });

    it('the ネコ aims first at a こもりうた in its reach', () => {
        const b = createBattle({ ...quiet, enemyBaseHp: 1e6, allyBaseHp: 1e6, spawns: [] }, [{ id: 'neko', level: 1 }]);
        b.money = 1e5;
        summon(b, 'neko');
        const u = b.fighters[0];
        u.x = 600;
        u.speed = 0;
        u.wait = 0;
        const front = enemyAt(b, 560, 'hard'), singer = enemyAt(b, 420, 'singer');
        singer.heal = { ...ENEMIES.singer.heal! };
        front.speed = singer.speed = 0;
        step(b, DT);
        expect(singer.hp).toBeLessThan(singer.maxHp);
        expect(front.hp).toBe(front.maxHp);
    });

    it('a こもりうた stopped by the wood does not sing', () => {
        const { b, e } = sendOne('singer');
        e.x = 300;
        e.speed = 0;
        const near = enemyAt(b, 380, 'hard');
        near.speed = 0;
        near.hp = 100;
        expect(spellTips(b, 'wood').map(t => t.good)).toEqual([true]);
        e.stopMs = ENEMIES.singer.heal!.everyMs * 2;
        run(b, ENEMIES.singer.heal!.everyMs + 100);
        expect(near.hp).toBe(100);
    });

    it('めざまし and ゆめのまおう startle the ones they hit: they stop a while', () => {
        expect(ENEMIES.bell.stun).toBeGreaterThan(0);
        expect(ENEMIES.king.stun).toBeGreaterThan(0);
        const { b, e } = sendOne('bell', [{ id: 'purun', level: 1 }]);
        b.money = 1e5;
        e.x = 400;
        e.speed = 0;
        e.wait = 0;
        summon(b, 'purun');
        const u = b.fighters.find(f => f.side === 'ally')!;
        u.speed = 0;
        u.x = 400 + (u.size + e.size) / 2 + 10;
        step(b, DT);
        expect(u.stopMs).toBeGreaterThan(ENEMIES.bell.stun! - 100);
        expect(u.startled).toBe(true);
    });

    it('from the 11th the enemies have tips, and the units good against them are taken from the deck', () => {
        for (const id of ['bell', 'fluffy', 'twin', 'singer', 'fuusen', 'spring', 'ufo', 'king'] as const) {
            expect(ENEMIES[id].tip, id).toBeTruthy();
            expect(ENEMIES[id].counters?.length, id).toBeGreaterThan(0);
        }
        for (const id of ['zako', 'hard', 'fast', 'thrower', 'boss', 'kasa', 'bento', 'yawn'] as const) expect(ENEMIES[id].tip, id).toBeUndefined();
    });

    it('flying and anti-air: ground melee passes under flyers, antiAir/flying hit them (with bonus), and spells hit all', () => {
        // Ground melee (kaeru) cannot hit flying enemy (kasa) and walks right underneath
        const b1 = createBattle({ ...quiet, enemyBaseHp: 1e6, allyBaseHp: 1e6, spawns: [{ enemy: 'kasa', from: 0, every: 1, count: 1 }] }, [{ id: 'kaeru', level: 1 }]);
        b1.money = 1e5;
        step(b1, DT);
        const flyer = b1.fighters.find(f => f.kind === 'kasa')!;
        flyer.x = 500;
        flyer.speed = 0;
        flyer.attack = 0;
        summon(b1, 'kaeru');
        const kaeru = b1.fighters.find(f => f.kind === 'kaeru')!;
        kaeru.x = 550;
        run(b1, 3000);
        expect(flyer.hp).toBe(flyer.maxHp);
        expect(kaeru.x).toBeLessThan(flyer.x);

        // Anti-air specialist (usagi) hits flying enemy with antiAirBonus
        const b2 = createBattle({ ...quiet, enemyBaseHp: 1e6, allyBaseHp: 1e6, spawns: [{ enemy: 'kasa', from: 0, every: 1, count: 1 }] }, [{ id: 'usagi', level: 1 }]);
        b2.money = 1e5;
        step(b2, DT);
        const kasa2 = b2.fighters.find(f => f.kind === 'kasa')!;
        kasa2.x = 500;
        kasa2.hp = kasa2.maxHp = 5000;
        kasa2.speed = 0;
        kasa2.attack = 0;
        summon(b2, 'usagi');
        const usagi = b2.fighters.find(f => f.kind === 'usagi')!;
        usagi.x = 540;
        usagi.wait = 0;
        step(b2, DT);
        expect(kasa2.maxHp - kasa2.hp).toBeCloseTo(UNITS.usagi.attack * UNITS.usagi.antiAirBonus!);

        // Spells hit flying enemies too
        castSpell(b2, spellEffect('火', 'success', 4), 'success');
        expect(kasa2.hp).toBeLessThan(kasa2.maxHp - UNITS.usagi.attack);

        // Ground melee enemy (zako) cannot hit flying ally (fukurou), while antiAir enemy (thrower) can
        const b3 = createBattle({ ...quiet, enemyBaseHp: 1e6, allyBaseHp: 1e6, spawns: [{ enemy: 'zako', from: 0, every: 1, count: 1 }] }, [{ id: 'fukurou', level: 1 }]);
        b3.money = 1e5;
        step(b3, DT);
        const zako = b3.fighters.find(f => f.kind === 'zako')!;
        zako.x = 450;
        zako.wait = 0;
        summon(b3, 'fukurou');
        const owl = b3.fighters.find(f => f.kind === 'fukurou')!;
        owl.x = 470;
        owl.speed = 0;
        owl.attack = 0;
        run(b3, 1500);
        expect(owl.hp).toBe(owl.maxHp);
        expect(zako.x).toBeGreaterThan(owl.x);
    });

    it('boss and ally KOs fire distinct comical sound events and screen shake', () => {
        const b = createBattle({ ...quiet, spawns: [{ enemy: 'boss', from: 0, every: 1, count: 1 }] }, [{ id: 'purun', level: 1 }]);
        b.money = 1e5;
        step(b, DT);
        summon(b, 'purun');
        const boss = b.fighters.find(f => f.kind === 'boss')!;
        const ally = b.fighters.find(f => f.kind === 'purun')!;
        boss.hp = 0;
        ally.hp = 0;
        b.events.length = 0;
        step(b, DT);
        expect(b.events).toContain('bossFall');
        expect(b.events).toContain('allyFall');
        expect(b.shakeMs).toBeGreaterThan(0);
    });
});

describe('the big waves', () => {
    const waveStage: Stage = { ...quiet, waves: [{ at: 20, enemies: [{ enemy: 'zako', count: 3 }, { enemy: 'fast', element: 'fire', count: 2 }] }] };

    it('come from the 11th stage on, never before', () => {
        for (const s of STAGES) expect((s.waves?.length ?? 0) > 0, `stage ${s.id}`).toBe(s.id >= 11);
    });

    it('are told WAVE.warnMs before, then come out one after another', () => {
        const b = createBattle(waveStage, []);
        run(b, 20000 - WAVE.warnMs - 500);
        expect(waveSoon(b)).toBeNull();
        run(b, 1000);
        expect(waveSoon(b)?.index).toBe(0);
        run(b, WAVE.warnMs - 500 + DT);
        expect(b.fighters).toHaveLength(1);
        run(b, WAVE.gapMs * 4 + DT);
        expect(b.fighters.map(f => f.kind)).toEqual(waveEnemies(waveStage.waves![0]).map(e => e.enemy));
        expect(waveEnemies(waveStage.waves![0]).map(e => e.enemy)).toEqual(['zako', 'fast', 'zako', 'fast', 'zako']);
        expect(waveSoon(b)).toBeNull();
    });
});

describe('the magic of the enemy tower', () => {
    const levelAt = (id: number) => 1 + Math.floor((id - 1) / 2);
    const magicStage = (spells: Stage['enemyMagic'] extends infer M ? M extends { spells: infer S } ? S : never : never): Stage =>
        ({ ...quiet, enemyMagic: { from: 20, every: 30, spells } });

    it('comes from the 6th stage on, never in the first 5', () => {
        for (const s of STAGES) expect(!!s.enemyMagic, `stage ${s.id}`).toBe(s.id >= 6);
        const b = createBattle(stageById(5), []);
        run(b, 200000);
        expect(b.enemyCasts).toBe(0);
    });

    it('is told ENEMY_MAGIC.warnMs before, then goes off, the spells in turn', () => {
        const b = createBattle(magicStage(['sleep', 'meteor']), []);
        run(b, 20000 - ENEMY_MAGIC.warnMs - 500);
        expect(enemyMagicSoon(b)).toBeNull();
        run(b, 1000);
        expect(enemyMagicSoon(b)?.spell).toBe('sleep');
        run(b, ENEMY_MAGIC.warnMs);
        expect(b.enemyCasts).toBe(1);
        run(b, 30000 - ENEMY_MAGIC.warnMs);
        expect(enemyMagicSoon(b)?.spell).toBe('meteor');
    });

    it('ねむりの きり stops ours, but not those with a barrier', () => {
        const b = createBattle(magicStage(['sleep']), [{ id: 'purun', level: 1 }]);
        b.money = 1000;
        summon(b, 'purun');
        run(b, 19000);
        // The first one gets the barrier; the second is sent after, with none
        castSpell(b, effectOfGroup('metal', 'success', 6), 'success');
        b.cooldowns.purun = 0;
        summon(b, 'purun');
        const [withBarrier, without] = b.fighters;
        without.shield = 0;
        run(b, 1100);
        expect(b.enemyCasts).toBe(1);
        expect(withBarrier.stopMs).toBe(0);
        expect(without.stopMs).toBeGreaterThan(0);
    });

    it('まくら ながれぼし hurts our base, unless a barrier (まもり) is up; a block gives back gauge', () => {
        const hit = createBattle(magicStage(['meteor']), []);
        run(hit, 20100);
        expect(hit.allyBase.hp).toBeCloseTo(hit.allyBase.max * (1 - ENEMY_MAGIC.meteor.base));
        const kept = createBattle(magicStage(['meteor']), []);
        run(kept, 15000);
        castSpell(kept, effectOfGroup('metal', 'success', 6), 'success');
        expect(guarded(kept)).toBe(true);
        const mana = kept.mana;
        run(kept, 5100);
        expect(kept.allyBase.hp).toBe(kept.allyBase.max);
        expect(kept.mana).toBeGreaterThan(mana + ENEMY_MAGIC.blockRefund * MANA_MAX - 1);
    });

    it('ふとん バリア puts a barrier on the enemies; a spell breaks it', () => {
        const b = createBattle(magicStage(['futon']), []);
        const e = enemyAt(b, 400);
        e.speed = 0;
        run(b, 20100);
        expect(e.shield).toBe(Math.round(ENEMY_MAGIC.futon.shield * b.stage.power));
        castSpell(b, spellEffect('火', 'success', 6), 'success');
        expect(e.shield).toBe(0);
        expect(e.hp).toBeLessThan(e.maxHp);
    });

    it('is won without まもり too; with it, more of our base is left', () => {
        let guard = 0, none = 0;
        for (const s of STAGES.filter(st => st.enemyMagic)) {
            const choose = s.id <= 10 ? 'best' : 'smart';
            const g = autoplay(s, { spell: 'success', level: levelAt(s.id), choose });
            const n = autoplay(s, { spell: 'success', level: levelAt(s.id), choose, guard: false });
            expect(n.result, `stage ${s.id}`).toBe('win');
            guard += g.allyBase.hp / g.allyBase.max;
            none += n.allyBase.hp / n.allyBase.max;
        }
        expect(guard).toBeGreaterThan(none);
    }, 300000);
});

describe('rewards', () => {
    it('more for the first clear and for each かんぺき, nothing for a loss', () => {
        const s = stageById(2);
        expect(rewardOf(s, true, false, 0)).toBe(s.reward);
        expect(rewardOf(s, true, true, 0)).toBe(s.reward * 2);
        expect(rewardOf(s, true, false, 2)).toBe(s.reward + 10);
        expect(rewardOf(s, false, true, 2)).toBe(0);
    });
});
