// A simple player for the tests: saves for the strongest unit it has, sends a wall when an enemy
// comes near, makes the wallet bigger early, and casts a spell (as good as `spell` says) when the
// gauge is full. Plays a whole stage and tells how it went.
import { LANE } from '../../src/config';
import { canSummon, canUpgradeWallet, castSpell, createBattle, manaFull, startSpell, step, summon, upgradeWallet, type Battle, type DeckUnit } from '../../src/game/battle';
import type { Stage } from '../../src/game/stages';
import { UNITS, unlockedUnits, type UnitId } from '../../src/game/units';
import { spellEffect } from '../../src/spell/effects';
import type { SpellGrade } from '../../src/spell/grade';

export interface Play {
    // null: no spells at all
    spell: SpellGrade | null;
    // A kanji for the spells (its group decides the effect) and its strokes
    kanji?: string;
    strokes?: number;
    // Do nothing at all
    idle?: boolean;
    level: number;
    maxMs?: number;
}

export function deckFor(stage: Stage, level: number): DeckUnit[] {
    return unlockedUnits(stage.id - 1).map(id => ({ id, level }));
}

export function autoplay(stage: Stage, play: Play): Battle {
    const b = createBattle(stage, deckFor(stage, play.level));
    const dt = 1000 / 60;
    const maxMs = play.maxMs ?? 8 * 60 * 1000;
    const strongest = [...b.deck].sort((x, y) => UNITS[y.id].cost - UNITS[x.id].cost).map(d => d.id);
    let n = 0;
    while (!b.result && b.time < maxMs) {
        step(b, dt);
        b.events.length = 0;
        if (play.idle || n++ % 6 !== 0) continue;
        if (b.time < 90000 && b.wallet < 2 && canUpgradeWallet(b)) upgradeWallet(b);
        const near = b.fighters.some(f => f.side === 'enemy' && f.x > LANE.allyBase - 350);
        const wantWall = near && !b.fighters.some(f => f.side === 'ally' && f.kind === 'purun');
        if (wantWall && canSummon(b, 'purun')) summon(b, 'purun');
        for (const id of strongest as UnitId[]) {
            if (canSummon(b, id) && (id !== 'purun' || b.money > 400)) {
                summon(b, id);
                break;
            }
        }
        if (play.spell && manaFull(b)) {
            startSpell(b);
            castSpell(b, spellEffect(play.kanji ?? '火', play.spell, play.strokes ?? 6), play.spell);
        }
    }
    return b;
}
