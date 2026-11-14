import { describe, expect, it } from 'vitest';
import { kanjiDatabase } from '../src/vendor/kanji-quiz/src/data/kanji';
import { strokes as models } from '../src/vendor/kanji-quiz/src/data/kanjivg';
import { MAX_STROKES, SPELL_SECONDS } from '../src/config';
import { SPELL_GROUPS, radicalOf, spellEffect, spellGroup, spellPower, type SpellGroup } from '../src/spell/effects';
import { radicals } from '../src/spell/radicals';
import { pickQuestion, RECENT } from '../src/spell/question';
import { spellSeconds } from '../src/spell/timer';
import { createRng } from '../src/vendor/kanji-quiz/src/core/battle';

describe('radicals', () => {
    it('has the radical of each of the 1,026 kanji, and no other', () => {
        expect(Object.keys(radicals).sort()).toEqual(kanjiDatabase.map(k => k.kanji).sort());
        for (const r of Object.values(radicals)) expect([...r]).toHaveLength(1);
    });

    it('takes the radical of the dictionaries', () => {
        const expected: Record<string, string> = { 海: '氵', 点: '灬', 花: '艹', 算: '竹', 前: '刂', 語: '言', 名: '口', 森: '木', 銀: '金', 天: '大' };
        for (const [k, r] of Object.entries(expected)) expect(radicalOf(k), k).toBe(r);
    });
});

describe('spell groups', () => {
    it('火・水・木・金 of the 1st grade stand for their groups', () => {
        expect(spellGroup('火')).toBe('fire');
        expect(spellGroup('水')).toBe('water');
        expect(spellGroup('木')).toBe('wood');
        expect(spellGroup('金')).toBe('metal');
        expect(spellGroup('言')).toBe('word');
    });

    it('the radical chooses the group (then the parts and the meaning, spell/elements.ts); else ふしぎ', () => {
        const expected: Record<string, SpellGroup> = { 海: 'water', 点: 'fire', 花: 'wood', 算: 'wood', 前: 'metal', 語: 'word', 名: 'word', 一: 'wonder', 天: 'wonder', 談: 'fire', 日: 'fire', 雪: 'water', 川: 'water', 米: 'wood' };
        for (const [k, g] of Object.entries(expected)) expect(spellGroup(k), k).toBe(g);
        expect(spellGroup('A')).toBe('wonder');
    });

    it('every radical of the table is the radical of some kanji, and every group has kanji of the 1st and 2nd grade', () => {
        const used = new Set(Object.values(radicals));
        for (const g of Object.keys(SPELL_GROUPS) as SpellGroup[]) {
            for (const r of SPELL_GROUPS[g].radicals) expect(used.has(r), `${g} ${r}`).toBe(true);
            const low = kanjiDatabase.filter(k => k.grade <= 2 && spellGroup(k.kanji) === g);
            expect(low.length, g).toBeGreaterThan(0);
        }
    });
});

describe('spell power', () => {
    it('is base × the result × (1 + strokes × 0.05)', () => {
        expect(spellPower('perfect', 10)).toBeCloseTo(2.25);
        expect(spellPower('success', 10)).toBeCloseTo(1.5);
        expect(spellPower('close', 0)).toBeCloseTo(0.5);
        expect(spellPower('fail', 20)).toBe(0);
    });

    it('ふはつ does nothing; the others grow with the result and the strokes', () => {
        for (const k of ['火', '海', '森', '銀', '語', '一']) {
            const n = models[k].length;
            expect(spellEffect(k, 'fail', n)).toBeNull();
            const size = (g: 'perfect' | 'success' | 'close') => {
                const e = spellEffect(k, g, n)!;
                expect(e.group).toBe(spellGroup(k));
                return e.kind === 'attack' ? e.damage : e.kind === 'shield' ? e.shield : e.rate;
            };
            expect(size('perfect')).toBeGreaterThan(size('success'));
            expect(size('success')).toBeGreaterThan(size('close'));
        }
        const a = spellEffect('火', 'success', 4)!, b = spellEffect('火', 'success', 12)!;
        expect(a.kind === 'attack' && b.kind === 'attack' && b.damage > a.damage).toBe(true);
        // 水 pushes back and 木 stops, besides the damage
        const w = spellEffect('海', 'success', 9)!, t = spellEffect('森', 'success', 12)!;
        expect(w.kind === 'attack' && w.push > 0 && w.stopMs === 0 && w.element === 'water').toBe(true);
        expect(t.kind === 'attack' && t.stopMs > 0 && t.push === 0 && t.element === 'wood').toBe(true);
    });

    it('ことば makes the attack ×1.5 for a plain せいこう without strokes', () => {
        expect(spellEffect('語', 'success', 0)).toEqual({ group: 'word', kind: 'boost', rate: 1.5, ms: 10000 });
    });
});

describe('time to write', () => {
    it('MAX_STROKES is the most strokes of the 1,026 kanji', () => {
        expect(Math.max(...kanjiDatabase.map(k => models[k.kanji].length))).toBe(MAX_STROKES);
    });

    it('goes from 10 seconds for 1 stroke to 30 for the most, more for more strokes', () => {
        expect(spellSeconds(1)).toBe(SPELL_SECONDS.min);
        expect(spellSeconds(MAX_STROKES)).toBe(SPELL_SECONDS.max);
        expect(spellSeconds(0)).toBe(SPELL_SECONDS.min);
        expect(spellSeconds(40)).toBe(SPELL_SECONDS.max);
        for (let n = 2; n <= MAX_STROKES; n++) expect(spellSeconds(n)).toBeGreaterThan(spellSeconds(n - 1));
    });
});

describe('pickQuestion', () => {
    it('asks only kanji of the grade or below, never one of the last few, with a reading', () => {
        const random = createRng('questions');
        for (const grade of [1, 3, 6]) {
            const recent: string[] = [];
            for (let i = 0; i < 200; i++) {
                const before = [...recent];
                const q = pickQuestion(grade, recent, random);
                expect(q.item.grade).toBeLessThanOrEqual(grade);
                expect(before).not.toContain(q.item.kanji);
                expect(q.reibun.reading.length).toBeGreaterThan(0);
                expect(recent.length).toBeLessThanOrEqual(RECENT);
            }
        }
    });
});
