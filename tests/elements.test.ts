import { describe, expect, it } from 'vitest';
import { kanjiDatabase } from '../src/vendor/kanji-quiz/src/data/kanji';
import { AFFINITY } from '../src/config';
import { BEATS, BY_MEANING, ELEMENTS, affinity, elementByShape, elementOf } from '../src/spell/elements';
import { components } from '../src/spell/radicals';

describe('the element of a kanji', () => {
    it('comes from the radical, then the parts, then the meaning', () => {
        // Radical
        expect(elementOf('海')).toBe('water');
        expect(elementOf('点')).toBe('fire');
        expect(elementOf('花')).toBe('wood');
        // A part (談: 言 is the radical, 炎 → 火 is in it; 雪: 雨)
        expect(elementOf('談')).toBe('fire');
        expect(elementOf('雪')).toBe('water');
        // The meaning
        expect(elementOf('日')).toBe('fire');
        expect(elementOf('川')).toBe('water');
        expect(elementOf('米')).toBe('wood');
        // None
        expect(elementOf('一')).toBeNull();
        expect(elementOf('金')).toBeNull();
    });

    it('the parts of every kanji are known', () => {
        expect(Object.keys(components).sort()).toEqual(kanjiDatabase.map(k => k.kanji).sort());
        expect(components['談']).toContain('火');
    });

    it('the table of meanings has only kanji of the 1,026 the shape says nothing of, once each', () => {
        const all = new Set(kanjiDatabase.map(k => k.kanji));
        const listed = ELEMENTS.flatMap(e => [...BY_MEANING[e]]);
        expect(new Set(listed).size).toBe(listed.length);
        for (const k of listed) {
            expect(all.has(k), k).toBe(true);
            expect(elementByShape(k), k).toBeNull();
        }
    });

    it('even in the 1st grade there are 3 kanji or more of each element (the 3 choices)', () => {
        for (let g = 1; g <= 6; g++) {
            for (const e of ELEMENTS) {
                const n = kanjiDatabase.filter(k => k.grade <= g && elementOf(k.kanji) === e).length;
                expect(n, `${g} ${e}`).toBeGreaterThanOrEqual(3);
            }
        }
    });
});

describe('affinity', () => {
    it('水 beats 炎, 炎 beats 木, 木 beats 水', () => {
        expect(BEATS).toEqual({ water: 'fire', fire: 'wood', wood: 'water' });
        expect(affinity('water', 'fire', 'spell')).toBe(AFFINITY.spell.strong);
        expect(affinity('fire', 'water', 'spell')).toBe(AFFINITY.spell.weak);
        expect(affinity('wood', 'wood', 'spell')).toBe(1);
        expect(affinity(null, 'fire', 'spell')).toBe(1);
        expect(affinity('fire', null, 'unit')).toBe(1);
        expect(affinity('fire', 'wood', 'unit')).toBe(AFFINITY.unit.strong);
        expect(affinity('wood', 'fire', 'unit')).toBe(AFFINITY.unit.weak);
    });
});
