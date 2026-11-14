import { describe, expect, it } from 'vitest';
import { kanjiDatabase } from '../src/vendor/kanji-quiz/src/data/kanji';
import { strokes as models } from '../src/vendor/kanji-quiz/src/data/kanjivg';
import { createRng } from '../src/vendor/kanji-quiz/src/core/battle';
import { EASY_STROKES, FIRST_EASY, RECENT, WEIGHT, pickKanji, pushRecent, weightOf, type PickOptions } from '../src/learning/picker';
import { MASTER_PERFECTS, emptyProgress, isRegistered, recordSpell, type ProgressMap } from '../src/learning/progress';
import { canShow } from '../src/learning/visible';
import { SAVE_KEY, defaultSave, loadSave, parseSave, writeSave } from '../src/storage';

const strokesOf = (k: string) => models[k].length;
const opts = (o: Partial<PickOptions> = {}): PickOptions => ({
    grade: 1, only: false, progress: new Map(), recent: [], used: new Set(), strokesOf, random: createRng('picker'), ...o
});
// Some spells written already, so the first easy questions are over
const played = (): ProgressMap => {
    const m: ProgressMap = new Map();
    for (const k of ['一', '二', '三']) recordSpell(m, { kanji: k, grade: 'success', traced: false }, 1);
    return m;
};

describe('progress', () => {
    it('counts the spells, and three かんぺき in a row make a kanji mastered', () => {
        const m: ProgressMap = new Map();
        recordSpell(m, { kanji: '火', grade: 'close', traced: false }, 10);
        let p = m.get('火')!;
        expect(p).toMatchObject({ attempts: 1, successes: 0, streak: 0, lastResult: 'close', lastSeen: 10, mastered: false });
        expect(isRegistered(p)).toBe(false);
        for (let i = 0; i < MASTER_PERFECTS - 1; i++) recordSpell(m, { kanji: '火', grade: 'perfect', traced: false }, 20);
        recordSpell(m, { kanji: '火', grade: 'success', traced: false }, 30);
        p = m.get('火')!;
        expect(p.mastered).toBe(false);
        expect(p.streak).toBe(3);
        for (let i = 0; i < MASTER_PERFECTS; i++) recordSpell(m, { kanji: '火', grade: 'perfect', traced: false }, 40);
        p = m.get('火')!;
        expect(p).toMatchObject({ attempts: 7, successes: 6, perfects: 5, mastered: true });
        expect(isRegistered(p)).toBe(true);
    });

    it('a kanji traced is れんしゅう: not in the 魔法書, never mastered', () => {
        const m: ProgressMap = new Map();
        for (let i = 0; i < 5; i++) recordSpell(m, { kanji: '水', grade: 'success', traced: true }, 1);
        const p = m.get('水')!;
        expect(p).toMatchObject({ attempts: 0, successes: 0, practices: 5, mastered: false });
        expect(isRegistered(p)).toBe(false);
    });
});

describe('pickKanji', () => {
    it('asks only the kanji of the grades chosen', () => {
        for (const [grade, only] of [[1, false], [3, false], [3, true], [6, true]] as const) {
            const o = opts({ grade, only, progress: played() });
            for (let i = 0; i < 300; i++) {
                const k = pickKanji(o);
                if (only) expect(k.grade).toBe(grade);
                else expect(k.grade).toBeLessThanOrEqual(grade);
            }
        }
    });

    it('never asks one of the last 5, nor twice in a battle', () => {
        const random = createRng('recent');
        let recent: string[] = [];
        const used = new Set<string>();
        const progress = played();
        for (let i = 0; i < 70; i++) {
            const k = pickKanji(opts({ recent, used, progress, random })).kanji;
            expect(recent).not.toContain(k);
            expect(used.has(k)).toBe(false);
            used.add(k);
            recent = pushRecent(recent, k);
            expect(recent.length).toBeLessThanOrEqual(RECENT);
        }
    });

    it('still asks something when every kanji was asked in the battle', () => {
        const used = new Set(kanjiDatabase.filter(k => k.grade === 1).map(k => k.kanji));
        expect(pickKanji(opts({ used, progress: played() })).grade).toBe(1);
    });

    it('the first 3 questions of the 1st grade have 5 strokes or fewer', () => {
        const m: ProgressMap = new Map();
        const random = createRng('first');
        for (let i = 0; i < FIRST_EASY; i++) {
            for (let n = 0; n < 50; n++) expect(strokesOf(pickKanji(opts({ progress: m, random })).kanji)).toBeLessThanOrEqual(EASY_STROKES);
            recordSpell(m, { kanji: '一', grade: 'fail', traced: false }, 1);
        }
        const later = Array.from({ length: 200 }, () => strokesOf(pickKanji(opts({ progress: m, random })).kanji));
        expect(Math.max(...later)).toBeGreaterThan(EASY_STROKES);
    });

    it('weighs: missed 3, never asked 2, mastered 0.3, others 1', () => {
        const m: ProgressMap = new Map();
        recordSpell(m, { kanji: '火', grade: 'fail', traced: false }, 1);
        recordSpell(m, { kanji: '水', grade: 'success', traced: false }, 1);
        for (let i = 0; i < 3; i++) recordSpell(m, { kanji: '木', grade: 'perfect', traced: false }, 1);
        expect(weightOf('火', m)).toBe(WEIGHT.failed);
        expect(weightOf('金', m)).toBe(WEIGHT.unseen);
        expect(weightOf('木', m)).toBe(WEIGHT.mastered);
        expect(weightOf('水', m)).toBe(WEIGHT.other);
        // In the long run, a missed kanji comes about 10 times as often as a mastered one
        const pool = ['火', '木'];
        const used = new Set(kanjiDatabase.filter(k => k.grade === 1 && !pool.includes(k.kanji)).map(k => k.kanji));
        const random = createRng('weights');
        let fire = 0;
        for (let i = 0; i < 3000; i++) if (pickKanji(opts({ progress: m, used, random })).kanji === '火') fire++;
        expect(fire / 3000).toBeGreaterThan(0.85);
        expect(fire / 3000).toBeLessThan(0.97);
    });
});

describe('what may be shown', () => {
    it('no kanji of a later grade on the screen', () => {
        expect(canShow('火', 1)).toBe(true);
        expect(canShow('言', 1)).toBe(false);
        expect(canShow('言', 2)).toBe(true);
        // A radical that is not one of the 1,026 kanji
        expect(canShow('氵', 1)).toBe(true);
    });
});

describe('the save', () => {
    const memory = () => {
        const data = new Map<string, string>();
        return {
            getItem: (k: string) => data.get(k) ?? null,
            setItem: (k: string, v: string) => void data.set(k, v),
            removeItem: (k: string) => void data.delete(k),
            data
        };
    };

    it('keeps the stages, the units, the kanji and the settings across a reload', () => {
        const store = memory();
        const s = defaultSave();
        s.stages[1] = { cleared: true, stars: 3 };
        s.units.kaeru = 5;
        s.deck = ['kaeru', 'purun'];
        s.materials = 42;
        s.settings.grade = 3;
        s.progress.push({ ...emptyProgress('火'), attempts: 2, successes: 1, perfects: 1, mastered: false });
        s.recent = ['火'];
        writeSave(s, store);
        expect(store.data.has(SAVE_KEY)).toBe(true);
        expect(loadSave(store)).toEqual(s);
    });

    it('anything broken comes back as the defaults', () => {
        expect(parseSave(null)).toEqual(defaultSave());
        expect(parseSave('not json')).toEqual(defaultSave());
        expect(parseSave('[1,2]')).toEqual(defaultSave());
        const s = parseSave(JSON.stringify({
            settings: { grade: 9, volume: 'loud', trace: true },
            units: { kaeru: 99, purun: -3 },
            deck: ['kaeru', 'dragon', 'kaeru'],
            progress: [{ char: '火', attempts: 3 }, { char: 'ながい' }, 5],
            stages: { 1: { cleared: true, stars: 7 } }
        }));
        expect(s.settings).toMatchObject({ grade: 6, volume: 0.7, trace: true });
        expect(s.units).toMatchObject({ kaeru: 10, purun: 1 });
        expect(s.deck).toEqual(['kaeru']);
        expect(s.progress).toHaveLength(1);
        expect(s.progress[0]).toMatchObject({ char: '火', attempts: 3, successes: 0 });
        expect(s.stages[1]).toEqual({ cleared: true, stars: 3 });
        expect(s.version).toBe(1);
    });

    it('a storage that throws (private mode) does not stop the game', () => {
        const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); }, removeItem: () => {} };
        expect(loadSave(broken)).toEqual(defaultSave());
        expect(writeSave(defaultSave(), broken)).toBe(false);
    });
});
