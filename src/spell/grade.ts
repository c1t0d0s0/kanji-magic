// --- A writing → かんぺき / せいこう / おしい / ふはつ ---
// judge of kanji-quiz is called twice: with the stroke order and without it. Both compare the
// writing with the kanji that look like the one asked too (天 and 夫), so another kanji written
// neatly is not taken for it.
import type { Stroke, Verdict } from '../vendor/kanji-quiz/src/core/handwriting';
import { kanjiDatabase } from '../vendor/kanji-quiz/src/data/kanji';
import { PERFECT_MARGIN } from '../config';
import type { TegakiKit } from './tegaki';

export type SpellGrade = 'perfect' | 'success' | 'close' | 'fail';

export const SPELL_GRADE_LABEL: Record<SpellGrade, string> = {
    perfect: 'かんぺき',
    success: 'せいこう',
    close: 'おしい',
    fail: 'ふはつ'
};

export interface SpellSettings {
    // 「かきじゅんも みる」: せいこう needs the right stroke order too
    strokeOrder: boolean;
}

export interface SpellResult {
    grade: SpellGrade;
    // To show: the one that decided (with the stroke order or without it)
    verdict: Verdict;
    // 0 to 1: how much of the limits the writing used (the largest of shape, strokes, worst)
    margin: number;
    strict: Verdict;
    loose: Verdict;
}

const gradeOfKanji = new Map(kanjiDatabase.map(k => [k.kanji, k.grade]));

// The grade the kanji is taught in (the judging is gentler for the kanji of the lower grades)
export function kanjiGrade(kanji: string): number {
    const grade = gradeOfKanji.get(kanji);
    if (grade === undefined) throw new Error(`not a kanji of the list: ${kanji}`);
    return grade;
}

// A near miss: the right number of strokes or nearly, and the judging could say what to fix
function isClose(verdict: Verdict) {
    return (verdict.reason === 'count' || verdict.reason === 'shape' || verdict.reason === 'order') && Boolean(verdict.hint || verdict.order);
}

export function gradeSpell(writing: readonly Stroke[], kanji: string, kit: TegakiKit, settings: SpellSettings): SpellResult {
    const model = kit.strokes[kanji];
    if (!model) throw new Error(`no strokes for ${kanji}`);
    const grade = kanjiGrade(kanji);
    const lookAlikes = kit.lookAlikesOf(kanji).map(other => kit.strokes[other]).filter(Boolean);
    // The look-alikes do not depend on the stroke order: compared once (they take the most time).
    // Without the order but with the look-alikes: wrong. With the order (look-alikes not compared):
    // right only when the shape passed the limits, so it was wrong for being the look-alike
    const loose = kit.judge(writing, model, grade, { strokeOrder: false, lookAlikes });
    const ordered = kit.judge(writing, model, grade, { strokeOrder: true });
    const strict = ordered.ok && !loose.ok ? loose : ordered;
    const limits = kit.limitsFor(grade, model.length);
    const used = Math.max(strict.shape / limits.shape, strict.strokes / limits.strokes, strict.worst / limits.worst);
    const margin = Number.isFinite(used) ? Math.min(1, Math.max(0, used)) : 1;

    const decided = settings.strokeOrder ? strict : loose;
    // Right without the order but not with it: show the order, so the child sees what to fix
    const verdict = !settings.strokeOrder && loose.ok && !strict.ok ? strict : decided;

    let result: SpellGrade;
    if (strict.ok && margin <= PERFECT_MARGIN) result = 'perfect';
    else if (decided.ok) result = 'success';
    else if (isClose(decided)) result = 'close';
    else result = 'fail';
    return { grade: result, verdict, margin, strict, loose };
}

// What came of a magic circle (SpellOverlay), for the battle and for the record of the learning
export interface SpellOutcome {
    // '' for a word sent in Morse code
    kanji: string;
    // The word sent in Morse code (src/morse/), when it was one
    morse?: string;
    grade: SpellGrade;
    // なぞりモード: traced over the model. せいこう at best, and kept as れんしゅう (not for 8.1)
    traced: boolean;
    // The time ran out before the spell went off by itself or by the button
    timedOut: boolean;
    // The judging (null when traced)
    result: SpellResult | null;
}
