import { describe, expect, it } from 'vitest';
import { fromKanjiVG, judge, limitsFor, traceStroke, type Stroke } from '../src/vendor/kanji-quiz/src/core/handwriting';
import { kanjiDatabase } from '../src/vendor/kanji-quiz/src/data/kanji';
import { strokes as models } from '../src/vendor/kanji-quiz/src/data/kanjivg';
import { lookAlikesOf } from '../src/vendor/kanji-quiz/src/data/lookalikes';
import { MESS, scribble } from '../src/vendor/kanji-quiz/tests/helpers/scribble';
import { gradeSpell, kanjiGrade, type SpellSettings } from '../src/spell/grade';
import type { TegakiKit } from '../src/spell/tegaki';

const kit: TegakiKit = { strokes: models, lookAlikesOf, judge, trace: traceStroke, limitsFor };
const OFF: SpellSettings = { strokeOrder: false };
const ON: SpellSettings = { strokeOrder: true };

// The model itself, as written on a canvas of 300 px
const asWritten = (kanji: string): Stroke[] => fromKanjiVG(models[kanji]).map(s => s.map(p => ({ x: (p.x * 300) / 109, y: (p.y * 300) / 109 })));
// Every 7th kanji: some of every grade
const sample = kanjiDatabase.filter((_, i) => i % 7 === 0);

describe('gradeSpell', () => {
    it('the model itself is かんぺき, for all 1,026 kanji', () => {
        const missed = kanjiDatabase.filter(k => gradeSpell(asWritten(k.kanji), k.kanji, kit, OFF).grade !== 'perfect').map(k => k.kanji);
        expect(missed.join('')).toBe('');
        expect(kanjiDatabase.length).toBe(1026);
    }, 120000);

    it('a kanji written a little untidily is せいこう or better', () => {
        const missed = sample.filter(k => {
            const g = gradeSpell(scribble(models[k.kanji], MESS.small, k.kanji), k.kanji, kit, OFF).grade;
            return g !== 'perfect' && g !== 'success';
        });
        expect(missed.map(k => k.kanji).join('')).toBe('');
    }, 120000);

    it('two strokes written the other way round are never かんぺき', () => {
        let checked = 0;
        for (const k of sample.filter(k => models[k.kanji].length >= 2)) {
            const m = models[k.kanji];
            const at = Math.max(0, Math.floor(m.length / 2) - 1);
            const w = asWritten(k.kanji);
            [w[at], w[at + 1]] = [w[at + 1], w[at]];
            const off = gradeSpell(w, k.kanji, kit, OFF);
            expect(off.grade, k.kanji).not.toBe('perfect');
            // With the order on, it is not even せいこう
            expect(gradeSpell(w, k.kanji, kit, ON).grade, k.kanji).not.toMatch(/perfect|success/);
            // Right in shape: the order is shown, to tell which stroke
            if (off.grade === 'success') {
                checked++;
                expect(off.verdict.order, k.kanji).toMatchObject({ kind: 'order', stroke: at + 1 });
            }
        }
        expect(checked).toBeGreaterThan(50);
    }, 120000);

    // Look-alikes too: kanji-quiz is gentle with the kanji of the low grades (天 and 夫 in 1年生),
    // and tells them apart by the list of look-alikes (judge with { lookAlikes })
    it('another kanji is not せいこう, look-alikes neither', () => {
        const pairs = ['山川', '右左', '右石', '木本', '田由', '人入', '大犬', '大太', '日目', '口日', '王玉', '白百', '貝見', '休体',
            '未末', '待持', '試式', '土士', '牛午', '矢失', '千干', '天夫', '刀力'];
        const accepted: string[] = [];
        for (const pair of pairs) {
            const [x, y] = [...pair];
            for (const [w, a] of [[x, y], [y, x]]) {
                const g = gradeSpell(asWritten(w), a, kit, OFF).grade;
                if (g === 'perfect' || g === 'success') accepted.push(`${w}→${a}`);
            }
        }
        expect(accepted).toEqual([]);
    });

    it('the model of any look-alike is never せいこう; おしい (with what differs) when only the look-alike tells', () => {
        let told = 0, close = 0;
        for (const k of kanjiDatabase) {
            for (const o of lookAlikesOf(k.kanji)) {
                const w = asWritten(o);
                const g = gradeSpell(w, k.kanji, kit, OFF).grade;
                expect(['close', 'fail'], `${o} for ${k.kanji}`).toContain(g);
                // Accepted without the look-alikes (in the grade of the kanji): what tells them apart
                // is the look-alike, so the hint should say what differs
                if (!judge(w, models[k.kanji], k.grade).ok) continue;
                told++;
                if (g === 'close') close++;
            }
        }
        expect(told).toBeGreaterThan(300);
        expect(close / told).toBeGreaterThan(0.95);
    }, 300000);

    it('nothing written is ふはつ', () => {
        const r = gradeSpell([], '赤', kit, OFF);
        expect(r.grade).toBe('fail');
        expect(r.verdict.reason).toBe('empty');
        expect(r.margin).toBe(1);
    });

    it('a stroke left out is おしい, and says which', () => {
        const w = asWritten('赤').slice(0, -1);
        const r = gradeSpell(w, '赤', kit, OFF);
        expect(r.grade).toBe('close');
        expect(r.verdict.reason).toBe('count');
    });

    it('judges with the grade the kanji is taught in', () => {
        expect(kanjiGrade('一')).toBe(1);
        expect(kanjiGrade('臨')).toBe(6);
        expect(() => kanjiGrade('A')).toThrow();
    });

    // 記: 10 strokes. 宮: 10 strokes and the most look-alikes of the kanji of 10 strokes (10)
    it('is quick enough: judge twice for a kanji of about 10 strokes', () => {
        for (const kanji of ['記', '宮']) {
            const w = scribble(models[kanji], MESS.small, kanji);
            gradeSpell(w, kanji, kit, OFF);
            const t0 = performance.now();
            const runs = 10;
            for (let i = 0; i < runs; i++) gradeSpell(w, kanji, kit, OFF);
            expect((performance.now() - t0) / runs, kanji).toBeLessThan(30);
        }
    });
});
