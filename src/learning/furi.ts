// --- Words with kanji, and their readings: furigana for the kanji not learned yet (requirements 1.1) ---
// The texts are written as "[魔法|まほう]の [本|ほん]": each [kanji|reading] is shown as it is when
// all its kanji are of the grade set or below, with its reading over it (ruby) when not.
import { learned } from './visible';

export interface Segment {
    text: string;
    // The reading to put over it; null: shown as it is
    ruby: string | null;
}

const MARK = /\[([^\]|]+)\|([^\]]+)\]/g;

export function segments(markup: string, grade: number): Segment[] {
    const out: Segment[] = [];
    let last = 0;
    for (const m of markup.matchAll(MARK)) {
        if (m.index > last) out.push({ text: markup.slice(last, m.index), ruby: null });
        out.push({ text: m[1], ruby: learned(m[1], grade) ? null : m[2] });
        last = m.index + m[0].length;
    }
    if (last < markup.length) out.push({ text: markup.slice(last), ruby: null });
    return out;
}

// With kanji (for the screen readers and the titles of the page)
export const plain = (markup: string) => markup.replace(MARK, '$1');

// All in kana
export const kana = (markup: string) => markup.replace(MARK, '$2');

// Kanji of the grade set, kana for the others (where a ruby cannot be put: the tab's title)
export const textFor = (markup: string, grade: number) =>
    segments(markup, grade).map(s => s.ruby ?? s.text).join('');

// The kanji left outside of the [kanji|reading] marks (there should be none)
export const bareKanji = (markup: string) => [...markup.replace(MARK, '')].filter(c => /\p{Script=Han}/u.test(c));
