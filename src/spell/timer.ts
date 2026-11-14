// --- How long the child has to write a kanji: 10 to 30 seconds, more for more strokes ---
import { MAX_STROKES, SPELL_SECONDS } from '../config';

export function spellSeconds(strokes: number): number {
    const { min, max } = SPELL_SECONDS;
    const part = MAX_STROKES > 1 ? (strokes - 1) / (MAX_STROKES - 1) : 1;
    return Math.min(max, Math.max(min, min + part * (max - min)));
}
