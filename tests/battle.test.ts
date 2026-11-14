import { describe, expect, it } from 'vitest';
import { LANE, MANA_MAX, MANA_REFUND, START_MONEY, WALLET } from '../src/config';
import {
    canSummon, castSpell, createBattle, manaFull, rewardOf, starsOf, startSpell, step, summon, upgradeWallet, type Battle
} from '../src/game/battle';
import { ENEMIES } from '../src/game/enemies';
import { STAGES, stageById, type Stage } from '../src/game/stages';
import { UNITS, formOf, levelPower, unitStats, unlockedUnits } from '../src/game/units';
import { spellEffect } from '../src/spell/effects';
import { autoplay } from './helpers/autoplay';

const DT = 1000 / 60;
const run = (b: Battle, ms: number) => {
    for (let t = 0; t < ms; t += DT) step(b, DT);
};
// A stage with no enemies, to test one thing at a time
const quiet: Stage = { id: 99, name: 'test', power: 1, enemyBaseHp: 1000, allyBaseHp: 1000, reward: 10, spawns: [] };
const enemyAt = (b: Battle, x: number, id: keyof typeof ENEMIES = 'zako') => {
    const e = ENEMIES[id];
    b.fighters.push({
        id: b.nextId++, side: 'enemy', kind: id, form: 0, color: e.color, size: e.size, boss: e.boss, x, hp: e.hp, maxHp: e.hp,
        attack: e.attack, attackMs: e.attackMs, range: e.range, speed: e.speed, knockback: 0, area: false, wait: 0, stopMs: 0,
        shield: 0, hurtMs: 0, fighting: false, money: e.money, mana: e.mana
    });
    return b.fighters[b.fighters.length - 1];
};

describe('stages and units', () => {
    it('has 10 stages; the 1st is the tutorial, bosses come in the 5th and the 10th', () => {
        expect(STAGES.map(s => s.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
        expect(STAGES[0].tutorial).toBe(true);
        for (const s of STAGES) {
            expect(s.spawns.some(r => r.enemy === 'boss'), `stage ${s.id}`).toBe(s.id === 5 || s.id === 10);
            expect(s.boss ?? false).toBe(s.id === 5 || s.id === 10);
        }
    });

    it('gives 2 or 3 units at first, more as the stages are cleared', () => {
        expect(unlockedUnits(0)).toEqual(['purun', 'kaeru']);
        expect(unlockedUnits(2)).toContain('neko');
        expect(unlockedUnits(4)).toContain('pengin');
        expect(unlockedUnits(6)).toEqual(['purun', 'kaeru', 'neko', 'pengin', 'kaba']);
    });

    it('evolves twice, getting stronger with each level', () => {
        expect([1, 3, 4, 7, 8, 10].map(formOf)).toEqual([0, 0, 1, 1, 2, 2]);
        for (let l = 2; l <= 10; l++) expect(levelPower(l)).toBeGreaterThan(levelPower(l - 1));
        for (const u of Object.values(UNITS)) {
            expect(new Set(u.forms.map(f => f.name)).size).toBe(3);
            expect(unitStats(u.id, 10).hp).toBeGreaterThan(unitStats(u.id, 1).hp);
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
        const dmg = e.kind === 'damage' ? e.damage : 0;
        expect(a.maxHp - a.hp).toBe(dmg);
        expect(c.maxHp - c.hp).toBe(dmg);
        expect(boss.maxHp - boss.hp).toBe(dmg / 2);
    });

    it('みず pushes the enemies back to their side', () => {
        const b = createBattle(quiet, []);
        const e = enemyAt(b, 600);
        castSpell(b, spellEffect('海', 'success', 9), 'success');
        expect(e.x).toBeLessThan(600);
        expect(e.x).toBeGreaterThanOrEqual(LANE.enemyBase);
    });

    it('き stops the enemies for a while', () => {
        const b = createBattle(quiet, []);
        const e = enemyAt(b, 300);
        castSpell(b, spellEffect('森', 'success', 12), 'success');
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

    it('each stage is won with spells that succeed, in 1 to 5 minutes', () => {
        for (const s of STAGES) {
            const b = autoplay(s, { spell: 'success', level: levelAt(s.id) });
            expect(b.result, `stage ${s.id}`).toBe('win');
            expect(b.time, `stage ${s.id}`).toBeGreaterThan(55000);
            expect(b.time, `stage ${s.id}`).toBeLessThan(300000);
        }
    }, 120000);

    it('doing nothing loses every stage', () => {
        for (const s of STAGES) expect(autoplay(s, { spell: null, level: 1, idle: true }).result, `stage ${s.id}`).toBe('lose');
    }, 60000);

    it('the later stages need the magic', () => {
        const without = STAGES.filter(s => s.id >= 7).map(s => autoplay(s, { spell: null, level: levelAt(s.id) }).result);
        expect(without.every(r => r !== 'win')).toBe(true);
    }, 120000);

    it('the same battle plays the same way', () => {
        const a = autoplay(stageById(3), { spell: 'success', level: 2 });
        const b = autoplay(stageById(3), { spell: 'success', level: 2 });
        expect(a.time).toBe(b.time);
        expect(a.allyBase.hp).toBe(b.allyBase.hp);
    });
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
