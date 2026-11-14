// --- The record of each kanji (requirements 8.1) ---
// A spell written without the model counts; a kanji traced (なぞりモード) is れんしゅう: only
// `practices` goes up, so tracing never makes a kanji mastered nor puts it in the 魔法書.
import type { SpellGrade, SpellOutcome } from '../spell/grade';

export interface KanjiProgress {
    char: string;
    attempts: number;
    // せいこう or better
    successes: number;
    perfects: number;
    lastResult: SpellGrade;
    // UNIX ms
    lastSeen: number;
    // せいこう or better in a row
    streak: number;
    // かんぺき in a row (3 makes it mastered)
    perfectStreak: number;
    mastered: boolean;
    // Traced over the model (れんしゅう)
    practices: number;
}

export const MASTER_PERFECTS = 3;

export type ProgressMap = Map<string, KanjiProgress>;

export function emptyProgress(char: string): KanjiProgress {
    return { char, attempts: 0, successes: 0, perfects: 0, lastResult: 'fail', lastSeen: 0, streak: 0, perfectStreak: 0, mastered: false, practices: 0 };
}

export function recordSpell(map: ProgressMap, outcome: Pick<SpellOutcome, 'kanji' | 'grade' | 'traced'>, now: number): KanjiProgress {
    const p = { ...(map.get(outcome.kanji) ?? emptyProgress(outcome.kanji)) };
    p.lastSeen = now;
    if (outcome.traced) {
        p.practices++;
    } else {
        const good = outcome.grade === 'perfect' || outcome.grade === 'success';
        p.attempts++;
        p.lastResult = outcome.grade;
        p.successes += good ? 1 : 0;
        p.streak = good ? p.streak + 1 : 0;
        p.perfects += outcome.grade === 'perfect' ? 1 : 0;
        p.perfectStreak = outcome.grade === 'perfect' ? p.perfectStreak + 1 : 0;
        if (p.perfectStreak >= MASTER_PERFECTS) p.mastered = true;
    }
    map.set(p.char, p);
    return p;
}

// In the 魔法書: せいこう or better once (not traced)
export const isRegistered = (p: KanjiProgress | undefined) => (p?.successes ?? 0) > 0;
// Missed at least once
export const hasFailed = (p: KanjiProgress | undefined) => !!p && p.attempts > p.successes;
