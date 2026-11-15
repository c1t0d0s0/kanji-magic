// --- International Morse code: the letters and the numbers ---
// From morse-master src/data/morseData.ts (ALPHABET_MORSE, NUMBER_MORSE: char and code only).
// '.' a dot (短点), '-' a dash (長点)

export const MORSE: Readonly<Record<string, string>> = {
    A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..',
    J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.',
    S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..',
    1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....',
    6: '-....', 7: '--...', 8: '---..', 9: '----.', 0: '-----'
};

const BY_CODE = new Map(Object.entries(MORSE).map(([c, code]) => [code, c]));

// The code of a letter or a number ('' if none)
export const codeOf = (char: string): string => MORSE[char.toUpperCase()] ?? '';

// The letter a code is ('' if none)
export const charOf = (code: string): string => BY_CODE.get(code) ?? '';

// To show: ..-. → ・・－・
export const dotsAndDashes = (code: string): string => code.replace(/\./g, '・').replace(/-/g, '－');
