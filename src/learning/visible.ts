// --- Kanji on the screen only from the grades chosen (requirements 1.1, 14) ---
// A character of the 1,026 kanji of a later grade is not shown (a radical such as 氵 is not one of
// them and can always be shown)
import { kanjiDatabase } from '../vendor/kanji-quiz/src/data/kanji';

const gradeOf = new Map(kanjiDatabase.map(k => [k.kanji, k.grade]));

export function canShow(text: string, grade: number) {
    return [...text].every(c => (gradeOf.get(c) ?? 0) <= grade);
}

// Every kanji of the text is learned by this grade: a kanji not among the 1,026 (魔, 撃, 壁…) is
// learned in no grade of the elementary school
export function learned(text: string, grade: number) {
    return [...text].every(c => !/\p{Script=Han}/u.test(c) || (gradeOf.get(c) ?? Infinity) <= grade);
}
