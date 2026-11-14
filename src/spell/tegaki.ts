// --- The judging of kanji-quiz, loaded when it is needed, and the words to tell the child ---
// Written again after kanji-quiz src/app/tegaki.ts (that file depends on the app state of kanji-quiz).
// The strokes of KanjiVG (about 260 kB) and the judging are loaded apart from the first page:
// a battle starts loading them, so they are ready when the magic button is pressed.
import type { Hint, JudgeOptions, Limits, Stroke, TraceResult, Verdict } from '../vendor/kanji-quiz/src/core/handwriting';

// ?debug in the address: after each spell, the measures and their limits, and the writing to copy
export const tegakiDebug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');

export interface TegakiKit {
    strokes: Record<string, number[][]>;
    // The kanji that look like a kanji (judge tells them apart when given their models)
    lookAlikesOf(kanji: string): string[];
    judge(writing: readonly Stroke[], model: readonly (readonly number[])[], grade: number, options?: JudgeOptions): Verdict;
    trace(written: Stroke, model: readonly (readonly number[])[], index: number, size: number): TraceResult;
    limitsFor(grade: number, strokes?: number): Limits;
}

let loading: Promise<TegakiKit> | null = null;

export function loadTegaki(): Promise<TegakiKit> {
    if (!loading) {
        loading = Promise.all([
            import('../vendor/kanji-quiz/src/data/kanjivg'),
            import('../vendor/kanji-quiz/src/core/handwriting'),
            import('../vendor/kanji-quiz/src/data/lookalikes')
        ]).then(([data, handwriting, alikes]) => ({
            strokes: data.strokes,
            lookAlikesOf: alikes.lookAlikesOf,
            judge: handwriting.judge,
            trace: handwriting.traceStroke,
            limitsFor: handwriting.limitsFor
        }));
        // Offline: try again next time
        loading.catch(() => {
            loading = null;
        });
    }
    return loading;
}

// What a near miss got wrong, in a few words. In kana (「かくめ」), so the 1st grade can read it
function hintMessage(hint: Hint) {
    const n = hint.stroke;
    switch (hint.kind) {
        case 'missing': return `${n}かくめが かけていないよ`;
        case 'extra': return 'よけいな せんが あるよ';
        case 'longer': return `${n}かくめを もっと ながく かこう`;
        case 'shorter': return `${n}かくめを もっと みじかく かこう`;
        case 'poke': return `${n}かくめは つき出すよ`;
        case 'stop': return `${n}かくめは つき出さないよ`;
        case 'place': return `${n}かくめの ばしょや かたちを くらべよう`;
    }
}

// Says what went wrong, so the child knows what to look at in the model (as kanji-quiz says it)
export function verdictMessage(verdict: Verdict) {
    if (verdict.reason === 'empty') return 'なにも かいていないよ';
    if (verdict.reason === 'count') return verdict.hint ? `${hintMessage(verdict.hint)}（${verdict.expected}かく）` : `${verdict.expected}かくで かこう`;
    if (verdict.order?.kind === 'order') return `${verdict.order.stroke}かくめの かきじゅんが ちがうよ`;
    if (verdict.order?.kind === 'direction') return `${verdict.order.stroke}かくめの かく むきが ちがうよ`;
    if (verdict.hint) return `おしい！ ${hintMessage(verdict.hint)}`;
    return 'おしい！ おてほんと くらべよう';
}

// Where to look after a miss: a stroke of the model (its number), and a stroke as it was
// written (its index) when it is one the model does not have
export function verdictMarks(verdict: Verdict | null) {
    const hint = verdict?.hint;
    return {
        stroke: verdict?.order?.stroke ?? (hint && hint.kind !== 'extra' ? hint.stroke : null),
        written: hint?.kind === 'extra' ? (hint.written ?? null) : null
    };
}

// What to say after a spell: praise, or what to fix (the same words on the practice page and
// in the magic circle)
export function outcomeMessage(grade: 'perfect' | 'success' | 'close' | 'fail', verdict: Verdict) {
    if (grade === 'perfect') return 'かんぺき！ すごい まほうが でたよ';
    if (verdict.reason === 'ok') return 'せいこう！ おてほんと くらべてみよう';
    return verdictMessage(verdict);
}
