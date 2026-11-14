// --- Which kanji to ask (requirements 8.2) ---
// Any kanji of the grades chosen, at random with weights: missed before 3, never asked 2,
// mastered 0.3, others 1. Not one of the last RECENT asked, and never twice in a battle.
// The 1st grade's first FIRST_EASY questions are of EASY_STROKES strokes or fewer, for a first success.
import { kanjiDatabase, type KanjiItem } from '../vendor/kanji-quiz/src/data/kanji';
import { hasFailed, type ProgressMap } from './progress';

export const WEIGHT = { failed: 3, unseen: 2, mastered: 0.3, other: 1 } as const;
export const RECENT = 5;
export const FIRST_EASY = 3;
export const EASY_STROKES = 5;

export interface PickOptions {
    grade: number;
    // この がくねんだけ: only the kanji of the grade (not the grades below)
    only: boolean;
    progress: ProgressMap;
    // The kanji asked last (the newest at the end)
    recent: readonly string[];
    // Asked in this battle
    used: ReadonlySet<string>;
    strokesOf: (kanji: string) => number;
    random?: () => number;
    // Choose among these only (else all the kanji of the grades)
    pool?: readonly KanjiItem[];
}

export function candidates(grade: number, only: boolean): KanjiItem[] {
    return kanjiDatabase.filter(k => (only ? k.grade === grade : k.grade <= grade));
}

export function weightOf(kanji: string, progress: ProgressMap): number {
    const p = progress.get(kanji);
    if (p?.mastered) return WEIGHT.mastered;
    if (hasFailed(p)) return WEIGHT.failed;
    if (!p || p.attempts === 0) return WEIGHT.unseen;
    return WEIGHT.other;
}

// How many spells have been written (or traced) so far
function totalAsked(progress: ProgressMap) {
    let n = 0;
    for (const p of progress.values()) n += p.attempts + p.practices;
    return n;
}

export function pickKanji(o: PickOptions): KanjiItem {
    const random = o.random ?? Math.random;
    let list = o.pool ? [...o.pool] : candidates(o.grade, o.only);
    if (o.grade === 1 && totalAsked(o.progress) < FIRST_EASY) {
        const easy = list.filter(k => o.strokesOf(k.kanji) <= EASY_STROKES);
        if (easy.length > 0) list = easy;
    }
    // Leave out the recent ones and those of this battle; if none is left, the recent ones may
    // come again, and then any (a long battle in a small grade)
    const fresh = list.filter(k => !o.used.has(k.kanji) && !o.recent.includes(k.kanji));
    const unused = list.filter(k => !o.used.has(k.kanji));
    const pool = fresh.length > 0 ? fresh : unused.length > 0 ? unused : list;
    const weights = pool.map(k => weightOf(k.kanji, o.progress));
    const total = weights.reduce((a, w) => a + w, 0);
    let at = random() * total;
    for (let i = 0; i < pool.length; i++) {
        at -= weights[i];
        if (at < 0) return pool[i];
    }
    return pool[pool.length - 1];
}

// The list of recent kanji after one more is asked
export function pushRecent(recent: readonly string[], kanji: string): string[] {
    return [...recent.filter(k => k !== kanji), kanji].slice(-RECENT);
}

// --- The 3 kanji to choose from (the magic circle): one of 炎, one of 水, one of 木 ---
// Each is chosen as pickKanji chooses (weights, not recent, not twice in a battle, easy at first),
// among the kanji of its element; when an element has none left, a kanji of any other group comes.
// The 3 are all different.
export const CHOICES = 3;

export function pickChoices(o: PickOptions, groupOf: (kanji: string) => string): KanjiItem[] {
    const out: KanjiItem[] = [];
    const taken = new Set(o.used);
    for (const element of ['fire', 'water', 'wood']) {
        const k = pickFrom(o, taken, k => groupOf(k) === element);
        if (k) {
            out.push(k);
            taken.add(k.kanji);
        }
    }
    while (out.length < CHOICES) {
        const have = new Set(out.map(k => groupOf(k.kanji)));
        // Something else than the groups there already, if it can
        const k = pickFrom(o, taken, k => !have.has(groupOf(k))) ?? pickKanji({ ...o, used: taken });
        out.push(k);
        taken.add(k.kanji);
    }
    return out;
}

// pickKanji among the kanji that `keep` lets through, none of `taken`; null if there are none
function pickFrom(o: PickOptions, taken: ReadonlySet<string>, keep: (kanji: string) => boolean): KanjiItem | null {
    const list = candidates(o.grade, o.only).filter(k => keep(k.kanji) && !taken.has(k.kanji));
    if (list.length === 0) return null;
    return pickKanji({ ...o, used: taken, only: o.only, pool: list });
}
