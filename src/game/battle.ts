// --- The battle: money, the magic gauge, the units, the enemies and the two bases ---
// Plain state and functions, no Vue (requirements 2: the battle is not reactive) and no time of its
// own: loop.ts calls step() with a fixed step, so the same inputs play the same battle (the tests
// play whole stages). Our base is on the right, the enemy's on the left; our units go left.
// What happens for the sound and the pictures is told by `events` (emptied by the screen) and `fx`.
import {
    BOSS_SPELL_RESIST, FIRST_CLEAR_TIMES, LANE, MANA_MAX, MANA_PER_SECOND, MANA_REFUND, PERFECT_BONUS, STAR_BASE_HP, START_MONEY, WALLET
} from '../config';
import type { SpellEffect, SpellGroup } from '../spell/effects';
import type { SpellGrade } from '../spell/grade';
import { ENEMIES, type EnemyId } from './enemies';
import type { Stage } from './stages';
import { formOf, unitStats, type UnitId } from './units';

export type Side = 'ally' | 'enemy';

export interface Fighter {
    id: number;
    side: Side;
    kind: UnitId | EnemyId;
    // The evolution (0 for the enemies): only for the picture
    form: 0 | 1 | 2;
    color: string;
    size: number;
    boss: boolean;
    x: number;
    hp: number;
    maxHp: number;
    attack: number;
    attackMs: number;
    range: number;
    speed: number;
    knockback: number;
    area: boolean;
    // ms before it can attack again
    wait: number;
    // ms it stays stopped (き)
    stopMs: number;
    // Harm the barrier still takes (かね)
    shield: number;
    // ms it is shown hurt
    hurtMs: number;
    // Attacking now (for the picture)
    fighting: boolean;
    money: number;
    mana: number;
}

// fly: one that fell flies away; shot: a thing thrown, from x to `to`; stomp: the ground shakes
export type FxKind = SpellGroup | 'fly' | 'shot' | 'stomp' | 'fizzle' | 'perfect';

// Who made it (for the picture only)
export interface FxWho {
    kind: UnitId | EnemyId;
    form: 0 | 1 | 2;
    side: Side;
    size: number;
    color: string;
}

export interface Fx {
    kind: FxKind;
    x: number;
    ms: number;
    total: number;
    to?: number;
    who?: FxWho;
}

const whoOf = (f: Fighter): FxWho => ({ kind: f.kind, form: f.form, side: f.side, size: f.size, color: f.color });

export type BattleEvent = 'summon' | 'hit' | 'fall' | 'base' | 'wallet' | 'win' | 'lose';

export interface Base {
    hp: number;
    max: number;
    hurtMs: number;
}

export interface DeckUnit {
    id: UnitId;
    level: number;
}

export interface Battle {
    stage: Stage;
    // ms since the start (of the battle's own time: slow while the magic circle is open)
    time: number;
    money: number;
    // The level of the wallet (0-based index of WALLET)
    wallet: number;
    mana: number;
    allyBase: Base;
    enemyBase: Base;
    fighters: Fighter[];
    // How many enemies each spawn rule has sent
    spawned: number[];
    deck: DeckUnit[];
    // ms before each unit can be sent again
    cooldowns: Partial<Record<UnitId, number>>;
    boostMs: number;
    boostRate: number;
    shieldMs: number;
    shieldAmount: number;
    result: null | 'win' | 'lose';
    fx: Fx[];
    events: BattleEvent[];
    nextId: number;
    kills: number;
    summoned: number;
}

export function createBattle(stage: Stage, deck: readonly DeckUnit[]): Battle {
    return {
        stage,
        time: 0,
        money: START_MONEY,
        wallet: 0,
        mana: 0,
        allyBase: { hp: stage.allyBaseHp, max: stage.allyBaseHp, hurtMs: 0 },
        enemyBase: { hp: stage.enemyBaseHp, max: stage.enemyBaseHp, hurtMs: 0 },
        fighters: [],
        spawned: stage.spawns.map(() => 0),
        deck: deck.map(d => ({ ...d })),
        cooldowns: {},
        boostMs: 0,
        boostRate: 1,
        shieldMs: 0,
        shieldAmount: 0,
        result: null,
        fx: [],
        events: [],
        nextId: 1,
        kills: 0,
        summoned: 0
    };
}

// --- Money and the wallet ---
export const walletOf = (b: Battle) => WALLET[b.wallet];

export function canUpgradeWallet(b: Battle) {
    const next = walletOf(b).next;
    return !b.result && next !== null && b.money >= next;
}

export function upgradeWallet(b: Battle) {
    const next = walletOf(b).next;
    if (!canUpgradeWallet(b) || next === null) return false;
    b.money -= next;
    b.wallet++;
    b.events.push('wallet');
    return true;
}

// --- Sending a unit ---
export function canSummon(b: Battle, id: UnitId) {
    const d = b.deck.find(u => u.id === id);
    return !b.result && !!d && b.money >= unitStats(id, d.level).cost && (b.cooldowns[id] ?? 0) <= 0;
}

export function summon(b: Battle, id: UnitId) {
    const d = b.deck.find(u => u.id === id);
    if (!d || !canSummon(b, id)) return false;
    const s = unitStats(id, d.level);
    b.money -= s.cost;
    b.cooldowns[id] = s.cooldownMs;
    b.fighters.push({
        id: b.nextId++, side: 'ally', kind: id, form: formOf(d.level), color: s.form.color, size: s.size, boss: false,
        x: LANE.allyBase - s.size / 2, hp: s.hp, maxHp: s.hp, attack: s.attack, attackMs: s.attackMs, range: s.range,
        speed: s.speed, knockback: s.knockback, area: s.area, wait: s.attackMs * 0.3, stopMs: 0,
        shield: b.shieldMs > 0 ? b.shieldAmount : 0, hurtMs: 0, fighting: false, money: 0, mana: 0
    });
    b.summoned++;
    b.events.push('summon');
    return true;
}

function spawnEnemy(b: Battle, id: EnemyId) {
    const e = ENEMIES[id];
    const p = b.stage.power;
    const hp = Math.round(e.hp * p);
    b.fighters.push({
        id: b.nextId++, side: 'enemy', kind: id, form: 0, color: e.color, size: e.size, boss: e.boss,
        x: LANE.enemyBase + e.size / 2, hp, maxHp: hp, attack: Math.round(e.attack * p), attackMs: e.attackMs, range: e.range,
        speed: e.speed, knockback: 0, area: false, wait: e.attackMs * 0.3, stopMs: 0, shield: 0, hurtMs: 0, fighting: false,
        money: e.money, mana: e.mana
    });
}

// --- The magic ---
export const manaFull = (b: Battle) => !b.result && b.mana >= MANA_MAX;

// The まほう button: the gauge is spent (part of it comes back after, by the result)
export function startSpell(b: Battle) {
    if (!manaFull(b)) return false;
    b.mana = 0;
    return true;
}

function harm(f: Fighter, amount: number) {
    let left = amount;
    if (f.shield > 0) {
        const taken = Math.min(f.shield, left);
        f.shield -= taken;
        left -= taken;
    }
    f.hp -= left;
    if (left > 0) f.hurtMs = 200;
}

const enemies = (b: Battle) => b.fighters.filter(f => f.side === 'enemy' && f.hp > 0);
const allies = (b: Battle) => b.fighters.filter(f => f.side === 'ally' && f.hp > 0);
const resist = (f: Fighter) => (f.boss ? BOSS_SPELL_RESIST : 1);

// The spell goes off (effect null: ふはつ). Part of the gauge comes back (かんぺき, ふはつ)
export function castSpell(b: Battle, effect: SpellEffect | null, grade: SpellGrade) {
    b.mana = Math.min(MANA_MAX, b.mana + MANA_REFUND[grade] * MANA_MAX);
    const middle = (LANE.enemyBase + LANE.allyBase) / 2;
    if (!effect || b.result) {
        b.fx.push({ kind: 'fizzle', x: middle, ms: 0, total: 900 });
        return;
    }
    switch (effect.kind) {
        case 'damage':
            for (const f of enemies(b)) harm(f, effect.damage * resist(f));
            break;
        case 'push':
            for (const f of enemies(b)) f.x = Math.max(LANE.enemyBase + f.size / 2, f.x - effect.push * resist(f));
            break;
        case 'stop':
            for (const f of enemies(b)) f.stopMs = Math.max(f.stopMs, effect.ms * resist(f));
            break;
        case 'shield':
            b.shieldMs = effect.ms;
            b.shieldAmount = effect.shield;
            for (const f of allies(b)) f.shield = effect.shield;
            break;
        case 'boost':
            b.boostMs = effect.ms;
            b.boostRate = effect.rate;
            break;
    }
    const total = effect.kind === 'stop' || effect.kind === 'shield' || effect.kind === 'boost' ? Math.min(effect.ms, 3000) : 1500;
    b.fx.push({ kind: effect.group, x: middle, ms: 0, total });
    if (grade === 'perfect') b.fx.push({ kind: 'perfect', x: middle, ms: 0, total: 1500 });
}

// --- One step of the battle ---
function nearestFoe(b: Battle, f: Fighter) {
    let best: Fighter | null = null;
    for (const o of b.fighters) {
        if (o.side === f.side || o.hp <= 0) continue;
        // Only what is ahead
        if (f.side === 'ally' ? o.x > f.x : o.x < f.x) continue;
        if (!best || Math.abs(o.x - f.x) < Math.abs(best.x - f.x)) best = o;
    }
    return best;
}

// The gap between the fronts of two bodies
const gap = (f: Fighter, o: Fighter) => Math.abs(o.x - f.x) - (f.size + o.size) / 2;

function fight(b: Battle, f: Fighter, dt: number) {
    f.wait = Math.max(0, f.wait - dt);
    f.hurtMs = Math.max(0, f.hurtMs - dt);
    if (f.stopMs > 0) {
        f.stopMs = Math.max(0, f.stopMs - dt);
        f.fighting = false;
        return;
    }
    const ally = f.side === 'ally';
    const dir = ally ? -1 : 1;
    const foe = nearestFoe(b, f);
    const base = ally ? b.enemyBase : b.allyBase;
    const baseX = ally ? LANE.enemyBase : LANE.allyBase;
    const toBase = Math.abs(baseX - f.x) - f.size / 2;
    const foeInReach = foe !== null && gap(f, foe) <= f.range;
    f.fighting = foeInReach || toBase <= f.range;
    if (!f.fighting) {
        let x = f.x + dir * f.speed * (dt / 1000);
        // Not into the one ahead
        if (foe) x = ally ? Math.max(x, foe.x + (foe.size + f.size) / 2) : Math.min(x, foe.x - (foe.size + f.size) / 2);
        f.x = x;
        return;
    }
    if (f.wait > 0) return;
    f.wait = f.attackMs;
    // Something thrown, to be seen flying (it hits at once all the same)
    if (f.range > 100) b.fx.push({ kind: 'shot', x: f.x, to: foeInReach && foe ? foe.x : baseX, ms: 0, total: 350, who: whoOf(f) });
    const power = ally && b.boostMs > 0 ? f.attack * b.boostRate : f.attack;
    if (foeInReach && foe) {
        const hit = f.area
            ? b.fighters.filter(o => o.side !== f.side && o.hp > 0 && (ally ? o.x <= f.x : o.x >= f.x) && gap(f, o) <= f.range)
            : [foe];
        if (f.area) b.fx.push({ kind: 'stomp', x: f.x, ms: 0, total: 450, who: whoOf(f) });
        for (const o of hit) {
            harm(o, power);
            if (f.knockback > 0) {
                const back = f.knockback * (o.boss ? 0.25 : 1);
                o.x = ally ? Math.max(LANE.enemyBase + o.size / 2, o.x - back) : Math.min(LANE.allyBase - o.size / 2, o.x + back);
            }
        }
        b.events.push('hit');
    } else {
        base.hp = Math.max(0, base.hp - power);
        base.hurtMs = 200;
        b.events.push('base');
    }
}

export function step(b: Battle, dt: number) {
    for (const fx of b.fx) fx.ms += dt;
    b.fx = b.fx.filter(fx => fx.ms < fx.total);
    if (b.result) return;
    b.time += dt;
    const sec = dt / 1000;
    const w = walletOf(b);
    b.money = Math.min(w.cap, b.money + w.rate * sec);
    b.mana = Math.min(MANA_MAX, b.mana + MANA_PER_SECOND * (b.stage.manaRate ?? 1) * sec);
    for (const id of Object.keys(b.cooldowns) as UnitId[]) b.cooldowns[id] = Math.max(0, (b.cooldowns[id] ?? 0) - dt);
    b.boostMs = Math.max(0, b.boostMs - dt);
    if (b.shieldMs > 0) {
        b.shieldMs = Math.max(0, b.shieldMs - dt);
        if (b.shieldMs === 0) for (const f of b.fighters) if (f.side === 'ally') f.shield = 0;
    }
    b.allyBase.hurtMs = Math.max(0, b.allyBase.hurtMs - dt);
    b.enemyBase.hurtMs = Math.max(0, b.enemyBase.hurtMs - dt);

    b.stage.spawns.forEach((rule, i) => {
        const count = rule.count ?? Infinity;
        while (b.spawned[i] < count && b.time >= (rule.from + b.spawned[i] * rule.every) * 1000) {
            spawnEnemy(b, rule.enemy);
            b.spawned[i]++;
        }
    });

    for (const f of b.fighters) if (f.hp > 0) fight(b, f, dt);

    for (const f of b.fighters) {
        if (f.hp > 0) continue;
        b.fx.push({ kind: 'fly', x: f.x, ms: 0, total: 1200, who: whoOf(f) });
        if (f.side === 'enemy') {
            b.money = Math.min(walletOf(b).cap, b.money + f.money);
            b.mana = Math.min(MANA_MAX, b.mana + f.mana);
            b.kills++;
            b.events.push('fall');
        }
    }
    b.fighters = b.fighters.filter(f => f.hp > 0);

    if (b.enemyBase.hp <= 0) b.result = 'win';
    else if (b.allyBase.hp <= 0) b.result = 'lose';
    if (b.result) b.events.push(b.result);
}

// --- After the battle ---
// ★: won. ★★: our base kept STAR_BASE_HP of its hp. ★★★: a かんぺき too
export function starsOf(b: Battle, perfects: number) {
    if (b.result !== 'win') return 0;
    return 1 + (b.allyBase.hp / b.allyBase.max >= STAR_BASE_HP ? 1 : 0) + (perfects > 0 ? 1 : 0);
}

// どんぐり for the battle: the reward of the stage (more for the first clear) and a bonus for each かんぺき
export function rewardOf(stage: Stage, won: boolean, firstClear: boolean, perfects: number) {
    if (!won) return 0;
    return stage.reward * (firstClear ? FIRST_CLEAR_TIMES : 1) + perfects * PERFECT_BONUS;
}
