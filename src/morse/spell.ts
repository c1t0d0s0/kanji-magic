// --- A spell sent in Morse code: the word to send, the time for it, and how well it went ---
// The word is the element in English and a number and a letter at random (FIRE1A, WATER2M,
// WOOD6X): different codes to send each time. GUARD is まもり (against the enemy's magic). It is sent a letter at a time: a wrong letter
// is a miss and is sent again.
import { MORSE_MISSES, MORSE_SECONDS } from '../config';
import type { Element } from '../spell/elements';
import type { SpellGrade } from '../spell/grade';

export type WordKind = Element | 'guard';

export const WORDS: Record<WordKind, string> = { fire: 'FIRE', water: 'WATER', wood: 'WOOD', guard: 'GUARD' };

const DIGITS = '0123456789';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function morseWord(kind: WordKind, random: () => number = Math.random): string {
    const pick = (list: string) => list[Math.floor(random() * list.length)];
    return `${WORDS[kind]}${pick(DIGITS)}${pick(LETTERS)}`;
}

export function morseSeconds(word: string): number {
    return MORSE_SECONDS.base + word.length * MORSE_SECONDS.perChar;
}

// sent: the letters sent right; misses: the wrong letters
export function morseGrade(word: string, sent: number, misses: number): SpellGrade {
    if (sent >= word.length) {
        if (misses <= MORSE_MISSES.perfect) return 'perfect';
        if (misses <= MORSE_MISSES.success) return 'success';
        return 'close';
    }
    // The time ran out: half of it or more is おしい
    return sent * 2 >= word.length ? 'close' : 'fail';
}
