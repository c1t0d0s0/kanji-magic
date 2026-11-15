// A simple player for the tests: chooses its 3 units, saves for the strongest unit it has, sends a
// wall when an enemy comes near, makes the wallet bigger early, and casts a spell (as good as
// `spell` says) when the gauge is full. `choose` says how it chooses its units and its spells:
// 'best' by the elements of the enemies (as a child who looks at the marks), 'worst' the other
// way, 'fixed' always 火 and the first units. `guard` (by itself with 'best'): when the enemy
// tower's magic that a barrier stops is coming, it keeps the gauge for it and casts まもり.
// Plays a whole stage and tells how it went.
import { LANE } from '../../src/config';
import {
    canSummon, canUpgradeWallet, castSpell, createBattle, enemyMagicSoon, guarded, manaFull, spellRating, startSpell, step, summon, upgradeWallet, type Battle, type DeckUnit
} from '../../src/game/battle';
import { stageEnemies, type Stage } from '../../src/game/stages';
import { UNITS, unlockedUnits, type UnitId } from '../../src/game/units';
import { BEATS, ELEMENTS, type Element } from '../../src/spell/elements';
import { ENEMY_SPELLS } from '../../src/game/enemies';
import { effectOfGroup, spellEffect } from '../../src/spell/effects';
import type { SpellGrade } from '../../src/spell/grade';
import { DECK_SIZE } from '../../src/storage';

export type Choose = 'best' | 'worst' | 'fixed';

export interface Play {
    // null: no spells at all
    spell: SpellGrade | null;
    choose?: Choose;
    // The strokes of the kanji written
    strokes?: number;
    // Do nothing at all
    idle?: boolean;
    // Cast まもり against the enemy's magic (default: with 'best' only)
    guard?: boolean;
    level: number;
    maxMs?: number;
    // Called every step (to look into a battle)
    watch?: (b: Battle) => void;
}

// A kanji of each element, for the spells
const KANJI: Record<Element, string> = { fire: '火', water: '水', wood: '木' };

export function deckFor(stage: Stage, level: number, choose: Choose = 'best'): DeckUnit[] {
    const open = unlockedUnits(stage.id - 1);
    const foes = new Set(stageEnemies(stage).flatMap(f => (f.element === 'cycle' ? ELEMENTS : f.element ? [f.element] : [])));
    const score = (id: UnitId) => {
        const e = UNITS[id].element;
        const s = (foes.has(BEATS[e]) ? 1 : 0) - ([...foes].some(f => BEATS[f] === e) ? 1 : 0);
        return choose === 'worst' ? -s : choose === 'best' ? s : 0;
    };
    // The wall always (cheap and needed), then by the score, then the strongest
    const rest = open.filter(id => id !== 'purun').sort((a, b) => score(b) - score(a) || UNITS[b].cost - UNITS[a].cost);
    return ['purun' as UnitId, ...rest].filter(id => open.includes(id)).slice(0, DECK_SIZE).map(id => ({ id, level }));
}

function spellKanji(b: Battle, choose: Choose): string {
    if (choose === 'fixed') return '火';
    const rank = { good: 3, normal: 2, none: 2, weak: 1 } as const;
    const sorted = [...ELEMENTS].sort((x, y) => rank[spellRating(b, y)] - rank[spellRating(b, x)]);
    return KANJI[choose === 'best' ? sorted[0] : sorted[sorted.length - 1]];
}

export function autoplay(stage: Stage, play: Play): Battle {
    const choose = play.choose ?? 'best';
    const guard = play.guard ?? choose === 'best';
    const b = createBattle(stage, deckFor(stage, play.level, choose));
    const dt = 1000 / 60;
    const maxMs = play.maxMs ?? 8 * 60 * 1000;
    const strongest = [...b.deck].sort((x, y) => UNITS[y.id].cost - UNITS[x.id].cost).map(d => d.id);
    let n = 0;
    while (!b.result && b.time < maxMs) {
        step(b, dt);
        b.events.length = 0;
        play.watch?.(b);
        if (play.idle || n++ % 6 !== 0) continue;
        if (b.time < 90000 && b.wallet < 2 && canUpgradeWallet(b)) upgradeWallet(b);
        const near = b.fighters.some(f => f.side === 'enemy' && f.x > LANE.allyBase - 350);
        const wantWall = near && !b.fighters.some(f => f.side === 'ally' && f.kind === 'purun');
        if (wantWall && canSummon(b, 'purun')) summon(b, 'purun');
        // The strongest first; while it is ready but the money is short, save for it (unless the
        // enemies are near our base: then anything)
        for (const id of strongest as UnitId[]) {
            if (canSummon(b, id) && (id !== 'purun' || b.money > 400)) {
                summon(b, id);
                break;
            }
            const ready = (b.cooldowns[id] ?? 0) <= 0;
            if (ready && id !== 'purun' && !near) break;
        }
        if (play.spell && manaFull(b)) {
            const strokes = play.strokes ?? 6;
            if (guard && blockableComing(b, 0)) {
                startSpell(b);
                castSpell(b, effectOfGroup('metal', play.spell, strokes), play.spell);
            } else if (!(guard && blockableComing(b, 12000))) {
                const kanji = spellKanji(b, choose);
                startSpell(b);
                castSpell(b, spellEffect(kanji, play.spell, strokes), play.spell);
            }
        }
    }
    return b;
}

// The enemy's magic that a barrier stops is told now (more: comes within this many ms after the
// warning), and no barrier is up
function blockableComing(b: Battle, more: number): boolean {
    const m = b.stage.enemyMagic;
    if (!m || guarded(b)) return false;
    if (more === 0) {
        const soon = enemyMagicSoon(b);
        return !!soon && ENEMY_SPELLS[soon.spell].blockable;
    }
    const next = m.spells[b.enemyCasts % m.spells.length];
    return ENEMY_SPELLS[next].blockable && b.enemyMagicAt - b.time <= more;
}
