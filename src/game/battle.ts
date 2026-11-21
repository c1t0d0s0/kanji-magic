// --- The battle: money, the magic gauge, the units, the enemies and the two bases ---
// Plain state and functions, no Vue (requirements 2: the battle is not reactive) and no time of its
// own: loop.ts calls step() with a fixed step, so the same inputs play the same battle (the tests
// play whole stages). Our base is on the right, the enemy's on the left; our units go left.
// What happens for the sound and the pictures is told by `events` (emptied by the screen) and `fx`.
import {
    BOSS_ELEMENT_MS, BOSS_SPELL_RESIST, ENEMY_MAGIC, SPELL_GROWS_FROM, WAVE, FIRST_CLEAR_TIMES, LANE, MANA_MAX, MANA_PER_SECOND, MANA_REFUND, PERFECT_BONUS, STAR_BASE_HP, START_MONEY, WALLET
} from '../config';
import type { SpellEffect, SpellGroup } from '../spell/effects';
import { ELEMENTS, affinity, type Element } from '../spell/elements';
import type { SpellGrade } from '../spell/grade';
import { ELEMENT_BODY, ENEMIES, ENEMY_SPELLS, SPLIT_INTO, type EnemyId, type EnemySpell } from './enemies';
import type { Spawn, Stage, Wave } from './stages';
import { formOf, unitStats, type UnitId } from './units';

export type Side = 'ally' | 'enemy';

export interface Fighter {
    id: number;
    side: Side;
    kind: UnitId | EnemyId;
    // The evolution (0 for the enemies): only for the picture
    form: 0 | 1 | 2;
    // 炎・水・木 or none: the hits between two of them are stronger or weaker (spell/elements.ts)
    element: Element | null;
    // The element changes every BOSS_ELEMENT_MS (the last boss); ms since it came
    cycle?: boolean;
    age?: number;
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
    // ふたご: falls into this many (SPLIT_INTO)
    split?: number;
    // こもりうた: heals the enemies near it; ms before it sings again
    heal?: { amount: number; everyMs: number; range: number };
    healWait?: number;
    // ふかふか: our units other than `except` do only this part of their harm (not the spells)
    soft?: { part: number; bane: number; except: readonly UnitId[] };
    // Those it hits stop this long (ms)
    stun?: number;
    // Not pushed back, by the water spell or by a unit (ふかふか)
    heavy?: boolean;
    // ネコ: aims first at a こもりうた in its reach
    snipe?: boolean;
    // ms it burns (a ふたご hit by the fire): if it falls now, it does not part
    burnMs?: number;
    // Stopped by a めざまし or the ゆめのまおう (startled, not asleep: for the picture)
    startled?: boolean;
    // An enemy in the ふとん バリア (the enemy tower's magic): our units cannot hurt it; a spell breaks it
    pillow?: boolean;
}

// fly: one that fell flies away; shot: a thing thrown, from x to `to`; stomp: the ground shakes;
// spark: a hit on the element it beats; good / weak: a spell that worked well / not well on most;
// change: the boss changed its element; damage: the harm a spell did to one enemy (a number over it);
// heal: an enemy healed by a lullaby; split: a ふたご fell in two; sleep / meteor / futon: the enemy
// tower's magic went off; blocked: the barrier stopped it there
export type FxKind =
    | SpellGroup | 'fly' | 'shot' | 'stomp' | 'spark' | 'good' | 'weak' | 'change' | 'fizzle' | 'perfect' | 'damage' | 'heal' | 'split'
    | EnemySpell | 'blocked';

// Who made it (for the picture only)
export interface FxWho {
    kind: UnitId | EnemyId;
    form: 0 | 1 | 2;
    side: Side;
    size: number;
    color: string;
    element: Element | null;
}

export interface Fx {
    kind: FxKind;
    x: number;
    ms: number;
    total: number;
    to?: number;
    who?: FxWho;
    // damage: how much, and how well the element worked on that one
    amount?: number;
    tone?: 'good' | 'normal' | 'weak';
    // damage: how many numbers are under this one (enemies close together: stacked, not over each other)
    stack?: number;
}

const whoOf = (f: Fighter): FxWho => ({ kind: f.kind, form: f.form, side: f.side, size: f.size, color: f.color, element: f.element });

export type BattleEvent = 'summon' | 'hit' | 'fall' | 'base' | 'wallet' | 'win' | 'lose' | 'enemyMagic' | 'blocked' | 'wave';

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
    // The enemy tower's magic: how many it has cast, and when (ms of the battle) the next goes off
    enemyCasts: number;
    enemyMagicAt: number;
    // The big waves (stages.ts waves): how many of each have come out
    waveSpawned: number[];
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
        enemyCasts: 0,
        enemyMagicAt: stage.enemyMagic ? stage.enemyMagic.from * 1000 : Infinity,
        waveSpawned: (stage.waves ?? []).map(() => 0),
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
        id: b.nextId++, side: 'ally', kind: id, form: formOf(d.level), element: s.element, color: s.form.color, size: s.size, boss: false,
        x: LANE.allyBase - s.size / 2, hp: s.hp, maxHp: s.hp, attack: s.attack, attackMs: s.attackMs, range: s.range,
        speed: s.speed, knockback: s.knockback, area: s.area, wait: s.attackMs * 0.3, stopMs: 0,
        shield: b.shieldMs > 0 ? b.shieldAmount : 0, hurtMs: 0, fighting: false, money: 0, mana: 0
    });
    if (s.snipe) b.fighters[b.fighters.length - 1].snipe = true;
    b.summoned++;
    b.events.push('summon');
    return true;
}

function spawnEnemy(b: Battle, rule: Spawn) {
    const cycle = rule.element === 'cycle';
    const element: Element | null = rule.element === 'cycle' ? ELEMENTS[0] : rule.element ?? null;
    enemyAt(b, rule.enemy, element, cycle, LANE.enemyBase + ENEMIES[rule.enemy].size / 2);
}

function enemyAt(b: Battle, id: EnemyId, element: Element | null, cycle: boolean, x: number) {
    const e = ENEMIES[id];
    const p = b.stage.power;
    const hp = Math.round(e.hp * p);
    const f: Fighter = {
        id: b.nextId++, side: 'enemy', kind: id, form: 0, element, cycle, age: 0, color: element ? ELEMENT_BODY[element] : e.color, size: e.size, boss: e.boss,
        x, hp, maxHp: hp, attack: Math.round(e.attack * p), attackMs: e.attackMs, range: e.range,
        speed: e.speed, knockback: e.knockback ?? 0, area: e.area ?? false, wait: e.attackMs * 0.3, stopMs: 0, shield: 0, hurtMs: 0, fighting: false,
        money: e.money, mana: e.mana
    };
    if (e.split) f.split = e.split;
    if (e.soft) f.soft = { part: e.soft, bane: e.bane ?? 1, except: e.counters ?? [] };
    if (e.stun) f.stun = e.stun;
    if (e.heavy) f.heavy = true;
    if (e.heal) {
        f.heal = { ...e.heal, amount: Math.round(e.heal.amount * p) };
        f.healWait = e.heal.everyMs;
    }
    b.fighters.push(f);
    return f;
}

// こもりうた: every so often, the enemies near it (itself too) get back some hp
function sing(b: Battle, f: Fighter, dt: number) {
    if (!f.heal || f.stopMs > 0) return;
    f.healWait = (f.healWait ?? f.heal.everyMs) - dt;
    if (f.healWait > 0) return;
    f.healWait = f.heal.everyMs;
    for (const o of b.fighters) {
        if (o.side !== 'enemy' || o.hp <= 0 || o.hp >= o.maxHp || Math.abs(o.x - f.x) > f.heal.range) continue;
        o.hp = Math.min(o.maxHp, o.hp + f.heal.amount);
        b.fx.push({ kind: 'heal', x: o.x, ms: 0, total: 900, who: whoOf(o) });
    }
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
// A spell's hit: the one hit flinches this long (a unit's hit: 200 ms)
const SPELL_HURT_MS = 600;

// The spell goes off (effect null: ふはつ). Part of the gauge comes back (かんぺき, ふはつ)
export function castSpell(b: Battle, effect: SpellEffect | null, grade: SpellGrade) {
    b.mana = Math.min(MANA_MAX, b.mana + MANA_REFUND[grade] * MANA_MAX);
    const middle = (LANE.enemyBase + LANE.allyBase) / 2;
    if (!effect || b.result) {
        b.fx.push({ kind: 'fizzle', x: middle, ms: 0, total: 900 });
        return;
    }
    // The enemies of the later stages are stronger: the spells too
    const grow = spellGrowth(b.stage);
    switch (effect.kind) {
        case 'attack': {
            let good = 0, weak = 0;
            const hitAt: number[] = [];
            for (const f of enemies(b)) {
                const k = affinity(effect.element, f.element, 'spell');
                if (k > 1) good++;
                if (k < 1) weak++;
                const dealt = effect.damage * grow * k * resist(f);
                // The ふとん バリア is broken at once
                if (f.pillow) {
                    f.pillow = false;
                    f.shield = 0;
                }
                harm(f, dealt);
                // A ふたご hit by the fire burns: falling while it does, it does not part
                if (effect.group === 'fire' && f.split) f.burnMs = BURN_MS;
                if (effect.push && !f.heavy) f.x = Math.max(LANE.enemyBase + f.size / 2, f.x - effect.push * resist(f));
                if (effect.stopMs) f.stopMs = Math.max(f.stopMs, effect.stopMs * resist(f));
                // Seen on each one (where the wave left it): a longer flinch, and the number over it
                f.hurtMs = Math.max(f.hurtMs, SPELL_HURT_MS);
                const stack = hitAt.filter(x => Math.abs(x - f.x) < 60).length;
                hitAt.push(f.x);
                b.fx.push({ kind: 'damage', x: f.x, ms: 0, total: 1300, who: whoOf(f), amount: Math.round(dealt), tone: k > 1 ? 'good' : k < 1 ? 'weak' : 'normal', stack });
            }
            if (good > weak) b.fx.push({ kind: 'good', x: middle, ms: 0, total: 1400 });
            else if (weak > good) b.fx.push({ kind: 'weak', x: middle, ms: 0, total: 1400 });
            break;
        }
        case 'shield':
            b.shieldMs = effect.ms;
            b.shieldAmount = effect.shield * grow;
            for (const f of allies(b)) f.shield = b.shieldAmount;
            break;
        case 'boost':
            b.boostMs = effect.ms;
            b.boostRate = effect.rate;
            break;
    }
    const total = effect.kind === 'shield' || effect.kind === 'boost' ? Math.min(effect.ms, 3000) : effect.stopMs ? Math.min(effect.stopMs, 3000) : 1500;
    b.fx.push({ kind: effect.group, x: middle, ms: 0, total });
    if (grade === 'perfect') b.fx.push({ kind: 'perfect', x: middle, ms: 0, total: 1500 });
}

// How much more the spells do in a stage (1 to the 10th: SPELL_GROWS_FROM); the square root, for the
// units do not grow with the stage (a spell as strong as the enemies would win by itself)
export const spellGrowth = (stage: Stage) => Math.sqrt(Math.max(1, stage.power / SPELL_GROWS_FROM));

// How well a spell of this element would work on the enemies there now (their hp weighs):
// the mean of the affinity. 'none': no enemy to hurt (or a spell that does not hurt)
export function spellRating(b: Battle, element: Element | null): 'good' | 'normal' | 'weak' | 'none' {
    const list = enemies(b);
    let hp = 0, sum = 0;
    for (const f of list) {
        hp += f.hp;
        sum += f.hp * affinity(element, f.element, 'spell');
    }
    if (hp <= 0) return 'none';
    const mean = sum / hp;
    return mean >= 1.5 ? 'good' : mean <= 0.75 ? 'weak' : 'normal';
}

// --- The enemy tower's magic ---
// The next spell and the ms before it goes off, from ENEMY_MAGIC.warnMs before (null: none soon)
export function enemyMagicSoon(b: Battle): { spell: EnemySpell; ms: number } | null {
    const m = b.stage.enemyMagic;
    if (!m || b.result) return null;
    const ms = b.enemyMagicAt - b.time;
    if (ms > ENEMY_MAGIC.warnMs) return null;
    return { spell: m.spells[b.enemyCasts % m.spells.length], ms: Math.max(0, ms) };
}

// The barrier of かね (まもり) lasts: ours and our base are kept from the enemy's magic
export const guarded = (b: Battle) => b.shieldMs > 0;

// --- The big waves (stages.ts waves) ---
// The enemies of a wave, one by one, in the order they come out (the kinds in turn)
export function waveEnemies(wave: Wave): { enemy: EnemyId; element?: Element }[] {
    const out: { enemy: EnemyId; element?: Element }[] = [];
    const most = Math.max(0, ...wave.enemies.map(e => e.count));
    for (let k = 0; k < most; k++) for (const e of wave.enemies) if (k < e.count) out.push({ enemy: e.enemy, element: e.element });
    return out;
}

// The next wave and the ms before it comes, from WAVE.warnMs before (null: none soon)
export function waveSoon(b: Battle): { index: number; ms: number } | null {
    if (b.result) return null;
    const waves = b.stage.waves ?? [];
    const index = waves.findIndex((_, i) => b.waveSpawned[i] === 0);
    if (index < 0) return null;
    const ms = waves[index].at * 1000 - b.time;
    return ms <= WAVE.warnMs ? { index, ms: Math.max(0, ms) } : null;
}

// --- What a spell of a group would do there now, more than its element (the cards say it) ---
// good: a reason to choose it; else a reason not to. With [kanji|reading] marks
export interface SpellTip {
    text: string;
    good: boolean;
}

export function spellTips(b: Battle, group: SpellGroup): SpellTip[] {
    const list = enemies(b);
    const tips: SpellTip[] = [];
    if (group === 'fire' && list.some(f => f.split)) tips.push({ text: 'ふたごが わかれない！', good: true });
    if (group === 'wood' && list.some(f => f.heal)) tips.push({ text: 'こもりうたが とまる！', good: true });
    if (group === 'water' && list.some(f => f.heavy)) tips.push({ text: 'ふかふかは おせない', good: false });
    return tips;
}

function enemyCast(b: Battle, spell: EnemySpell) {
    const middle = (LANE.enemyBase + LANE.allyBase) / 2;
    // Where the barrier stopped it: one ふせいだ！ over the middle of them
    const stopped: number[] = [];
    const block = (x: number) => stopped.push(x);
    switch (spell) {
        case 'sleep':
            for (const f of allies(b)) {
                if (f.shield > 0) block(f.x);
                else {
                    f.stopMs = Math.max(f.stopMs, ENEMY_MAGIC.sleep.ms);
                    f.startled = false;
                }
            }
            break;
        case 'meteor':
            for (const f of allies(b)) {
                const before = f.shield;
                harm(f, f.maxHp * ENEMY_MAGIC.meteor.unit);
                f.hurtMs = Math.max(f.hurtMs, SPELL_HURT_MS);
                if (before > 0) block(f.x);
            }
            if (guarded(b)) block(LANE.allyBase - 40);
            else {
                b.allyBase.hp = Math.max(0, b.allyBase.hp - b.allyBase.max * ENEMY_MAGIC.meteor.base);
                b.allyBase.hurtMs = SPELL_HURT_MS;
            }
            break;
        case 'futon': {
            const shield = Math.round(ENEMY_MAGIC.futon.shield * b.stage.power);
            for (const f of enemies(b)) {
                f.shield = Math.max(f.shield, shield);
                f.pillow = true;
            }
            break;
        }
    }
    b.fx.push({ kind: spell, x: middle, ms: 0, total: spell === 'sleep' ? ENEMY_MAGIC.sleep.ms : 1600 });
    b.events.push('enemyMagic');
    const blocked = stopped.length > 0;
    if (blocked) b.fx.push({ kind: 'blocked', x: stopped.reduce((a, x) => a + x, 0) / stopped.length, ms: 0, total: 1400 });
    if (blocked && ENEMY_SPELLS[spell].blockable) {
        b.events.push('blocked');
        b.mana = Math.min(MANA_MAX, b.mana + ENEMY_MAGIC.blockRefund * MANA_MAX);
    }
}

// A ふたご hit by the fire spell does not part if it falls within this time
export const BURN_MS = 8000;

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

// The one it hits: the nearest, but a ネコ (snipe) aims first at one that heals in its reach
function targetOf(b: Battle, f: Fighter, nearest: Fighter | null): Fighter | null {
    if (!f.snipe || !nearest) return nearest;
    const ahead = (o: Fighter) => (f.side === 'ally' ? o.x <= f.x : o.x >= f.x);
    return b.fighters.find(o => o.side !== f.side && o.hp > 0 && o.heal && ahead(o) && gap(f, o) <= f.range) ?? nearest;
}

function fight(b: Battle, f: Fighter, dt: number) {
    f.wait = Math.max(0, f.wait - dt);
    f.hurtMs = Math.max(0, f.hurtMs - dt);
    if (f.burnMs) f.burnMs = Math.max(0, f.burnMs - dt);
    if (f.stopMs > 0) {
        f.stopMs = Math.max(0, f.stopMs - dt);
        if (f.stopMs === 0) f.startled = false;
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
    // A ふかふか or ふたご in its reach stands in the way of what it throws: it hits that, not the base
    const wall = foeInReach && f.range > 100 ? b.fighters.find(o => o.side !== f.side && o.hp > 0 && o.soft && (ally ? o.x <= f.x : o.x >= f.x) && gap(f, o) <= f.range) : undefined;
    const aim = wall ?? (foeInReach ? targetOf(b, f, foe) : foe);
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
    if (f.range > 100) b.fx.push({ kind: 'shot', x: f.x, to: foeInReach && aim ? aim.x : baseX, ms: 0, total: 350, who: whoOf(f) });
    const power = ally && b.boostMs > 0 ? f.attack * b.boostRate : f.attack;
    // At the base, the base first: the enemies that keep coming out of it would else hold back the
    // units that got there for ever
    const baseInReach = toBase <= f.range && !wall;
    if (foeInReach && foe && !baseInReach) {
        const hit = f.area
            ? b.fighters.filter(o => o.side !== f.side && o.hp > 0 && (ally ? o.x <= f.x : o.x >= f.x) && gap(f, o) <= f.range)
            : [aim ?? foe];
        // The ground shakes where it hits (far off for one that throws)
        if (f.area) b.fx.push({ kind: 'stomp', x: f.range > 100 ? foe.x : f.x, ms: 0, total: 450, who: whoOf(f) });
        for (const o of hit) {
            const k = affinity(f.element, o.element, 'unit');
            const soft = !o.soft ? 1 : o.soft.except.includes(f.kind as UnitId) ? o.soft.bane : o.soft.part;
            // In the ふとん バリア: nothing gets through (only a spell breaks it)
            if (o.pillow) continue;
            harm(o, power * k * soft);
            if (f.stun && o.shield <= 0 && o.stopMs < f.stun) {
                o.stopMs = f.stun;
                o.startled = true;
            }
            if (k > 1) b.fx.push({ kind: 'spark', x: o.x, ms: 0, total: 300, who: whoOf(o) });
            if (f.knockback > 0 && !o.heavy) {
                // A ふたご holds firm as it holds against the hit
                const back = f.knockback * (o.boss ? 0.25 : 1) * Math.min(1, soft);
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
            spawnEnemy(b, rule);
            b.spawned[i]++;
        }
    });

    (b.stage.waves ?? []).forEach((wave, i) => {
        const list = waveEnemies(wave);
        while (b.waveSpawned[i] < list.length && b.time >= wave.at * 1000 + b.waveSpawned[i] * WAVE.gapMs) {
            if (b.waveSpawned[i] === 0) b.events.push('wave');
            const e = list[b.waveSpawned[i]];
            enemyAt(b, e.enemy, e.element ?? null, false, LANE.enemyBase + ENEMIES[e.enemy].size / 2);
            b.waveSpawned[i]++;
        }
    });

    const magic = b.stage.enemyMagic;
    if (magic && b.time >= b.enemyMagicAt) {
        enemyCast(b, magic.spells[b.enemyCasts % magic.spells.length]);
        b.enemyCasts++;
        b.enemyMagicAt += magic.every * 1000;
    }

    for (const f of b.fighters) {
        if (!f.cycle) continue;
        const before = f.element;
        f.age = (f.age ?? 0) + dt;
        f.element = ELEMENTS[Math.floor(f.age / BOSS_ELEMENT_MS) % ELEMENTS.length];
        if (f.element) f.color = ELEMENT_BODY[f.element];
        if (f.element !== before) b.fx.push({ kind: 'change', x: f.x, ms: 0, total: 1500, who: whoOf(f) });
    }
    for (const f of b.fighters) if (f.hp > 0) fight(b, f, dt);
    for (const f of b.fighters) if (f.hp > 0 && f.heal) sing(b, f, dt);

    for (const f of b.fighters) {
        if (f.hp > 0) continue;
        b.fx.push({ kind: 'fly', x: f.x, ms: 0, total: 1200, who: whoOf(f) });
        if (f.side === 'enemy') {
            b.money = Math.min(walletOf(b).cap, b.money + f.money);
            b.mana = Math.min(MANA_MAX, b.mana + f.mana);
            b.kills++;
            b.events.push('fall');
            // ふたご: two come out where it fell
            const parts = f.burnMs ? 0 : f.split ?? 0;
            for (let k = 0; k < parts; k++) enemyAt(b, SPLIT_INTO, f.element, false, Math.max(LANE.enemyBase + 20, f.x - 22 + k * 30));
            if (parts) b.fx.push({ kind: 'split', x: f.x, ms: 0, total: 700, who: whoOf(f) });
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
