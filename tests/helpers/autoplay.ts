// A simple player for the tests: chooses its 3 units, saves for the strongest unit it has, sends a
// wall when an enemy comes near, makes the wallet bigger early, and casts a spell (as good as
// `spell` says) when the gauge is full. `choose` says how it chooses its units and its spells:
// 'best' by the elements of the enemies (as a child who looks at the marks), 'worst' the other
// way, 'fixed' always 火 and the first units. 'smart' as 'best', and as a child who reads the tips
// (from the 11th stage): takes the units good against the enemies (enemies.ts counters) and sends
// them first, keeps the gauge for a big wave and casts on it, chooses the card the tips praise, and
// guards only from the まくら ながれぼし (ねむりの きり stops ours for a moment only). `guard` (by itself with 'best'): when the enemy
// tower's magic that a barrier stops is coming, it keeps the gauge for it and casts まもり.
// Plays a whole stage and tells how it went.
import { LANE, WAVE } from '../../src/config';
import {
    canSummon, canUpgradeWallet, castSpell, createBattle, enemyMagicSoon, guarded, manaFull, spellRating, spellTips, startSpell, step, summon, upgradeWallet, waveEnemies, waveSoon, type Battle, type DeckUnit
} from '../../src/game/battle';
import { stageEnemies, type Stage } from '../../src/game/stages';
import { UNITS, unlockedUnits, type UnitId } from '../../src/game/units';
import { BEATS, ELEMENTS, type Element } from '../../src/spell/elements';
import { ENEMIES, ENEMY_SPELLS, type EnemyId, type EnemySpell } from '../../src/game/enemies';
import { effectOfGroup, spellEffect } from '../../src/spell/effects';
import type { SpellGrade } from '../../src/spell/grade';
import { DECK_SIZE } from '../../src/storage';

export type Choose = 'best' | 'worst' | 'fixed' | 'smart';

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
    // smart: leave out some of its ways (to see what each one does)
    without?: readonly ('key' | 'hold' | 'tips')[];
    // Called every step (to look into a battle)
    watch?: (b: Battle) => void;
}

// A kanji of each element, for the spells
const KANJI: Record<Element, string> = { fire: '火', water: '水', wood: '木' };

export function deckFor(stage: Stage, level: number, choose: Choose = 'best'): DeckUnit[] {
    const open = unlockedUnits(stage.id - 1);
    const foes = new Set(stageEnemies(stage).flatMap(f => (f.element === 'cycle' ? ELEMENTS : f.element ? [f.element] : [])));
    const kinds = new Set<EnemyId>([...stage.spawns.map(r => r.enemy), ...(stage.waves ?? []).flatMap(w => w.enemies.map(e => e.enemy))]);
    const score = (id: UnitId) => {
        const e = UNITS[id].element;
        const s = (foes.has(BEATS[e]) ? 1 : 0) - ([...foes].some(f => BEATS[f] === e) ? 1 : 0);
        return choose === 'worst' ? -s : choose === 'best' || choose === 'smart' ? s : 0;
    };
    // The wall always (cheap and needed), then by the score, then the strongest
    const rest = open.filter(id => id !== 'purun').sort((a, b) => score(b) - score(a) || UNITS[b].cost - UNITS[a].cost);
    if (choose === 'smart') {
        // One by one: the element counts most, then the enemies it is good against that no unit
        // taken is good against yet
        const taken: UnitId[] = [];
        const covered = new Set<EnemyId>();
        while (taken.length < DECK_SIZE - 1 && taken.length < rest.length) {
            const value = (id: UnitId) => 2 * score(id) + 5 * [...kinds].filter(k => !covered.has(k) && ENEMIES[k].counters?.includes(id)).length;
            const pick = rest.filter(id => !taken.includes(id)).sort((x, y) => value(y) - value(x) || UNITS[y].cost - UNITS[x].cost)[0];
            taken.push(pick);
            for (const k of kinds) if (ENEMIES[k].counters?.includes(pick)) covered.add(k);
        }
        return ['purun' as UnitId, ...taken].filter(id => open.includes(id)).map(id => ({ id, level }));
    }
    return ['purun' as UnitId, ...rest].filter(id => open.includes(id)).slice(0, DECK_SIZE).map(id => ({ id, level }));
}

function spellKanji(b: Battle, choose: Choose): string {
    if (choose === 'fixed') return '火';
    const rank = { good: 3, normal: 2, none: 2, weak: 1 } as const;
    // smart: a card the tips praise counts as one step better, one they warn of one worse
    const tipped = (e: Element) => (choose === 'smart' ? spellTips(b, e).reduce((n, t) => n + (t.good ? 0.75 : -0.75), 0) : 0);
    const value = (e: Element) => rank[spellRating(b, e)] + tipped(e);
    const sorted = [...ELEMENTS].sort((x, y) => value(y) - value(x));
    return KANJI[choose === 'worst' ? sorted[sorted.length - 1] : sorted[0]];
}

export function autoplay(stage: Stage, play: Play): Battle {
    const choose = play.choose ?? 'best';
    const guard = play.guard ?? (choose === 'best' || choose === 'smart');
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
        const smart = choose === 'smart';
        // smart: the units good against the enemies there (enemies.ts counters) first, and the money
        // kept for them even when the enemies are near (but the wall)
        const keys = smart && !play.without?.includes('key') ? b.deck.map(d => d.id).filter(id => b.fighters.some(f => f.side === 'enemy' && ENEMIES[f.kind as EnemyId].counters?.includes(id))) : [];
        const wantWall = near && !b.fighters.some(f => f.side === 'ally' && f.kind === 'purun');
        if (wantWall && canSummon(b, 'purun')) summon(b, 'purun');
        // The strongest first; while it is ready but the money is short, save for it (unless the
        // enemies are near our base: then anything)
        for (const id of [...keys, ...strongest.filter(id => !keys.includes(id))] as UnitId[]) {
            if (canSummon(b, id) && (id !== 'purun' || b.money > 400)) {
                summon(b, id);
                break;
            }
            const ready = (b.cooldowns[id] ?? 0) <= 0;
            if (ready && id !== 'purun' && (!near || keys.includes(id))) break;
        }
        if (play.spell && manaFull(b) && !(smart && !play.without?.includes('hold') && holdForWave(b))) {
            const strokes = play.strokes ?? 6;
            if (guard && blockableComing(b, 0, smart)) {
                startSpell(b);
                castSpell(b, effectOfGroup('metal', play.spell, strokes), play.spell);
            } else if (!(guard && blockableComing(b, 12000, smart))) {
                const kanji = spellKanji(b, smart && play.without?.includes('tips') ? 'best' : choose);
                startSpell(b);
                castSpell(b, spellEffect(kanji, play.spell, strokes), play.spell);
            }
        }
    }
    return b;
}

// smart: keep the gauge while a wave is told, and until all of it has come out (and a little more)
function holdForWave(b: Battle): boolean {
    if (waveSoon(b)) return true;
    return (b.stage.waves ?? []).some((w, i) => b.waveSpawned[i] > 0 && b.time - w.at * 1000 < waveEnemies(w).length * WAVE.gapMs + 3000);
}

// The enemy's magic that a barrier stops is told now (more: comes within this many ms after the
// warning), and no barrier is up
function blockableComing(b: Battle, more: number, onlyMeteor = false): boolean {
    const m = b.stage.enemyMagic;
    if (!m || guarded(b)) return false;
    const worth = (spell: EnemySpell) => ENEMY_SPELLS[spell].blockable && (!onlyMeteor || spell === 'meteor');
    if (more === 0) {
        const soon = enemyMagicSoon(b);
        return !!soon && worth(soon.spell);
    }
    const next = m.spells[b.enemyCasts % m.spells.length];
    return worth(next) && b.enemyMagicAt - b.time <= more;
}
