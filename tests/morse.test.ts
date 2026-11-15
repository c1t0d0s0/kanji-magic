import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MORSE_DASH_AT, MORSE_LETTER_GAP, MORSE_SECONDS } from '../src/config';
import { charOf, codeOf, dotsAndDashes, isFinal, MORSE } from '../src/morse/code';
import { Keyer } from '../src/morse/keyer';
import { morseGrade, morseSeconds, morseWord, WORDS } from '../src/morse/spell';
import { ELEMENTS } from '../src/spell/elements';
import { effectOfGroup, spellEffect } from '../src/spell/effects';
import { parseSave } from '../src/storage';

describe('Morse code', () => {
    it('has the 26 letters and the 10 numbers, each with its own code', () => {
        const chars = Object.keys(MORSE);
        expect(chars).toHaveLength(36);
        expect(new Set(Object.values(MORSE)).size).toBe(36);
        for (const c of chars) {
            expect(MORSE[c], c).toMatch(/^[.-]{1,5}$/);
            expect(charOf(codeOf(c))).toBe(c);
        }
        expect(codeOf('f')).toBe('..-.');
        expect(charOf('......')).toBe('');
        expect(dotsAndDashes('..-.')).toBe('・・－・');
    });

    it('knows the codes no letter goes on from', () => {
        for (const c of 'CFLPQXY0123456789') expect(isFinal(codeOf(c)), c).toBe(true);
        // T (M), E (I), O (8), B (6), J (1): more can follow
        for (const c of 'TEOBJ') expect(isFinal(codeOf(c)), c).toBe(false);
        expect(isFinal('')).toBe(false);
    });
});

describe('the word of a Morse spell', () => {
    it('is the element in English, a number and a letter', () => {
        for (const e of ELEMENTS) {
            for (let i = 0; i < 20; i++) expect(morseWord(e)).toMatch(new RegExp(`^${WORDS[e]}[0-9][A-Z]$`));
        }
        expect(morseWord('fire', () => 0)).toBe('FIRE0A');
        expect(morseWord('water', () => 0.999)).toBe('WATER9Z');
        // Every letter of the words can be sent
        for (const e of ELEMENTS) for (const c of WORDS[e]) expect(codeOf(c)).not.toBe('');
    });

    it('has GUARD for まもり (against the enemy magic)', () => {
        expect(morseWord('guard', () => 0)).toBe('GUARD0A');
        for (const c of WORDS.guard) expect(codeOf(c)).not.toBe('');
    });

    it('has more time for a longer word', () => {
        expect(morseSeconds('FIRE1A')).toBe(MORSE_SECONDS.base + 6 * MORSE_SECONDS.perChar);
        expect(morseSeconds('WATER2M')).toBeGreaterThan(morseSeconds('WOOD6X'));
    });

    it('is graded by the misses, or by how much was sent when the time ran out', () => {
        expect(morseGrade('FIRE1A', 6, 0)).toBe('perfect');
        expect(morseGrade('FIRE1A', 6, 1)).toBe('success');
        expect(morseGrade('FIRE1A', 6, 2)).toBe('success');
        expect(morseGrade('FIRE1A', 6, 3)).toBe('close');
        expect(morseGrade('FIRE1A', 3, 0)).toBe('close');
        expect(morseGrade('FIRE1A', 2, 0)).toBe('fail');
        expect(morseGrade('FIRE1A', 0, 0)).toBe('fail');
    });

    it('goes off as a spell of its group, the letters for the strokes', () => {
        expect(effectOfGroup('water', 'perfect', 7)).toMatchObject({ group: 'water', kind: 'attack', element: 'water' });
        expect(effectOfGroup('fire', 'fail', 6)).toBeNull();
        // The same as a kanji of that group
        expect(effectOfGroup('fire', 'success', 4)).toEqual(spellEffect('火', 'success', 4));
    });
});

describe('the Morse key', () => {
    const DOT = 100;
    let letters: string[];
    let symbols: string[];
    let keyer: Keyer;
    beforeEach(() => {
        vi.useFakeTimers();
        letters = [];
        symbols = [];
        keyer = new Keyer({ letter: c => letters.push(c), symbol: s => symbols.push(s) }, DOT);
    });
    afterEach(() => {
        keyer.dispose();
        vi.useRealTimers();
    });

    const hold = (ms: number) => {
        keyer.keyDown();
        vi.advanceTimersByTime(ms);
        keyer.keyUp();
    };

    it('電鍵: short is a dot, long is a dash; a letter when the keying stops', () => {
        hold(DOT);
        vi.advanceTimersByTime(DOT);
        hold(DOT * 3);
        vi.advanceTimersByTime(DOT);
        hold(DOT * (MORSE_DASH_AT - 0.2));
        expect(letters).toEqual([]);
        expect(keyer.buffer).toBe('.-.');
        vi.advanceTimersByTime(DOT * MORSE_LETTER_GAP.dot);
        expect(letters).toEqual(['.-.']);
        expect(keyer.buffer).toBe('');
    });

    it('電鍵: no letter while the key is down', () => {
        hold(DOT);
        keyer.keyDown();
        vi.advanceTimersByTime(DOT * 20);
        expect(letters).toEqual([]);
        keyer.keyUp();
        vi.advanceTimersByTime(DOT * MORSE_LETTER_GAP.dot);
        expect(letters).toEqual(['.-']);
    });

    it('パドル: a letter after the last symbol, longer after a dash', () => {
        keyer.press('-');
        keyer.release('-');
        vi.advanceTimersByTime(DOT * MORSE_LETTER_GAP.dash - 1);
        expect(letters).toEqual([]);
        vi.advanceTimersByTime(1);
        expect(letters).toEqual(['-']);
        keyer.press('.');
        keyer.release('.');
        vi.advanceTimersByTime(DOT * MORSE_LETTER_GAP.dot);
        expect(letters).toEqual(['-', '.']);
        expect(symbols).toEqual(['-', '.']);
    });

    it('a code no letter goes on from is taken at once; T waits, as M may follow', () => {
        // F: ..-.
        for (const s of '..-') {
            hold(s === '.' ? DOT : DOT * 3);
            vi.advanceTimersByTime(DOT);
        }
        expect(letters).toEqual([]);
        hold(DOT);
        expect(letters).toEqual(['..-.']);
        // T for M: the second dash within the gap makes it M
        hold(DOT * 3);
        vi.advanceTimersByTime(DOT);
        expect(letters).toEqual(['..-.']);
        hold(DOT * 3);
        vi.advanceTimersByTime(DOT * MORSE_LETTER_GAP.dot);
        expect(letters).toEqual(['..-.', '--']);
    });

    it('commit takes the letter at once; back takes back a symbol; reset forgets it', () => {
        keyer.press('.');
        keyer.release('.');
        vi.advanceTimersByTime(DOT * 2);
        keyer.press('-');
        keyer.release('-');
        keyer.back();
        expect(keyer.buffer).toBe('.');
        keyer.commit();
        expect(letters).toEqual(['.']);
        vi.advanceTimersByTime(DOT * 20);
        expect(letters).toEqual(['.']);
        hold(DOT);
        keyer.reset();
        vi.advanceTimersByTime(DOT * 20);
        expect(letters).toEqual(['.']);
    });
});

describe('the settings of the Morse spells', () => {
    it('an old save gets the defaults: by hand, the paddle, 初級', () => {
        const s = parseSave(JSON.stringify({ version: 1, settings: { grade: 3 } })).settings;
        expect(s).toMatchObject({ grade: 3, input: 'kanji', keyer: 'paddle', morseLevel: 'easy' });
    });

    it('keeps what is right and drops what is not', () => {
        const ok = parseSave(JSON.stringify({ version: 1, settings: { input: 'morse', keyer: 'straight', morseLevel: 'hard' } })).settings;
        expect(ok).toMatchObject({ input: 'morse', keyer: 'straight', morseLevel: 'hard' });
        const bad = parseSave(JSON.stringify({ version: 1, settings: { input: 'voice', keyer: 3, morseLevel: null } })).settings;
        expect(bad).toMatchObject({ input: 'kanji', keyer: 'paddle', morseLevel: 'easy' });
    });
});
