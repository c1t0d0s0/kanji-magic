// --- What a spell does: the radical of the kanji chooses the group, the result and the strokes how strong ---
// The radicals of each group are data here (requirements 6.4); a radical not in the table is ふしぎ.
// The battle (Phase 3) applies the effect; this file only says what it is.
import { SPELL_BASE, SPELL_MULTIPLIER, STROKE_BONUS } from '../config';
import type { SpellGrade } from './grade';
import { radicals } from './radicals';

export type SpellGroup = 'fire' | 'water' | 'wood' | 'metal' | 'word' | 'wonder';

export interface SpellGroupInfo {
    // With [kanji|reading] marks (learning/furi.ts): shown with furigana where not learned yet
    name: string;
    // The radicals, as written in the kanji (KanjiVG's kvg:element: 氵 and 灬, not 水 and 火)
    radicals: readonly string[];
    // What it does, for the child
    does: string;
}

export const SPELL_GROUPS: Record<SpellGroup, SpellGroupInfo> = {
    fire: { name: '[炎|ほのお]', radicals: ['火', '灬'], does: '[敵|てき] みんなに [大|おお]きな ダメージ' },
    water: { name: '[水|みず]', radicals: ['水', '氵', '氺'], does: '[敵|てき] みんなを [押|お]し[戻|もど]す' },
    wood: { name: '[木|き]', radicals: ['木', '艹', '竹'], does: '[敵|てき] みんなを [止|と]める' },
    metal: { name: '[金|かね]', radicals: ['金', '刂'], does: '[味方|みかた] みんなを バリアで [守|まも]る' },
    word: { name: '[言葉|ことば]', radicals: ['言', '口'], does: '[味方|みかた]の [攻撃|こうげき]が [強|つよ]くなる' },
    wonder: { name: '[不思議|ふしぎ]', radicals: [], does: '[敵|てき] みんなに ダメージ' }
};

const groupOfRadical = new Map<string, SpellGroup>(
    (Object.keys(SPELL_GROUPS) as SpellGroup[]).flatMap(g => SPELL_GROUPS[g].radicals.map(r => [r, g] as const))
);

export function radicalOf(kanji: string): string | null {
    return radicals[kanji] ?? null;
}

export function spellGroup(kanji: string): SpellGroup {
    const radical = radicalOf(kanji);
    return (radical && groupOfRadical.get(radical)) || 'wonder';
}

// base × this: the result (かんぺき 1.5 … ふはつ 0) and the strokes (5% more for each)
export function spellPower(grade: SpellGrade, strokes: number): number {
    return SPELL_MULTIPLIER[grade] * (1 + strokes * STROKE_BONUS);
}

export type SpellEffect =
    | { group: 'fire' | 'wonder'; kind: 'damage'; damage: number }
    | { group: 'water'; kind: 'push'; push: number }
    | { group: 'wood'; kind: 'stop'; ms: number }
    | { group: 'metal'; kind: 'shield'; shield: number; ms: number }
    | { group: 'word'; kind: 'boost'; rate: number; ms: number };

// What the spell does; null for ふはつ (nothing happens)
export function spellEffect(kanji: string, grade: SpellGrade, strokes: number): SpellEffect | null {
    const power = spellPower(grade, strokes);
    if (power <= 0) return null;
    const group = spellGroup(kanji);
    switch (group) {
        case 'fire':
        case 'wonder':
            return { group, kind: 'damage', damage: Math.round(SPELL_BASE[group].damage * power) };
        case 'water':
            return { group, kind: 'push', push: Math.round(SPELL_BASE.water.push * power) };
        case 'wood':
            return { group, kind: 'stop', ms: Math.round(SPELL_BASE.wood.ms * power) };
        case 'metal':
            return { group, kind: 'shield', shield: Math.round(SPELL_BASE.metal.shield * power), ms: SPELL_BASE.metal.ms };
        case 'word':
            return { group, kind: 'boost', rate: 1 + SPELL_BASE.word.boost * power, ms: SPELL_BASE.word.ms };
    }
}
