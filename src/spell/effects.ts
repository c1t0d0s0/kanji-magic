// --- What a spell does: the kanji chooses the group, the result and the strokes how strong ---
// 炎・水・木: the element of the kanji (spell/elements.ts: radical, parts, meaning). Without one, the
// radical: 金 (金 刂) and ことば (言 口); any other kanji is ふしぎ. The battle applies the effect.
import { SPELL_BASE, SPELL_MULTIPLIER, STROKE_BONUS } from '../config';
import type { SpellGrade } from './grade';
import { elementOf, type Element } from './elements';
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
    fire: { name: '[炎|ほのお]', radicals: ['火', '灬'], does: '[敵|てき] みんなに [大|おお]きな ダメージ。[木|き]の [敵|てき]に よく きく' },
    water: { name: '[水|みず]', radicals: ['水', '氵', '氺'], does: '[敵|てき] みんなに ダメージ、[押|お]し[戻|もど]す。[炎|ほのお]の [敵|てき]に よく きく' },
    wood: { name: '[木|き]', radicals: ['木', '艹', '竹'], does: '[敵|てき] みんなに ダメージ、[止|と]める。[水|みず]の [敵|てき]に よく きく' },
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
    const element = elementOf(kanji);
    if (element) return element;
    const radical = radicalOf(kanji);
    const g = radical ? groupOfRadical.get(radical) : undefined;
    return g === 'metal' || g === 'word' ? g : 'wonder';
}

// The element of a group (null: hurts every enemy the same, or does not hurt)
export const elementOfGroup = (g: SpellGroup): Element | null => (g === 'fire' || g === 'water' || g === 'wood' ? g : null);

// base × this: the result (かんぺき 1.5 … ふはつ 0) and the strokes (5% more for each)
export function spellPower(grade: SpellGrade, strokes: number): number {
    return SPELL_MULTIPLIER[grade] * (1 + strokes * STROKE_BONUS);
}

export type SpellEffect =
    // Hurts every enemy (by the element, if any); 水 also pushes them back, 木 stops them
    | { group: 'fire' | 'water' | 'wood' | 'wonder'; kind: 'attack'; element: Element | null; damage: number; push: number; stopMs: number }
    | { group: 'metal'; kind: 'shield'; shield: number; ms: number }
    | { group: 'word'; kind: 'boost'; rate: number; ms: number };

// What the spell does; null for ふはつ (nothing happens)
export function spellEffect(kanji: string, grade: SpellGrade, strokes: number): SpellEffect | null {
    return effectOfGroup(spellGroup(kanji), grade, strokes);
}

// The same by the group: a word sent in Morse code (src/morse/) has its letters for the strokes
export function effectOfGroup(group: SpellGroup, grade: SpellGrade, strokes: number): SpellEffect | null {
    const power = spellPower(grade, strokes);
    if (power <= 0) return null;
    switch (group) {
        case 'fire':
        case 'water':
        case 'wood':
        case 'wonder': {
            const damage = Math.round(SPELL_BASE[group].damage * power);
            const push = group === 'water' ? Math.round(SPELL_BASE.water.push * power) : 0;
            const stopMs = group === 'wood' ? Math.round(SPELL_BASE.wood.ms * power) : 0;
            return { group, kind: 'attack', element: elementOfGroup(group), damage, push, stopMs };
        }
        case 'metal':
            return { group, kind: 'shield', shield: Math.round(SPELL_BASE.metal.shield * power), ms: SPELL_BASE.metal.ms };
        case 'word':
            return { group, kind: 'boost', rate: 1 + SPELL_BASE.word.boost * power, ms: SPELL_BASE.word.ms };
    }
}
