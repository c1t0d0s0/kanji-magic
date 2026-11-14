// --- Cut out of kanji-quiz src/core/battle.ts: only createRng (and the hash it uses) ---
// tests/helpers/scribble.ts and tests/handwriting.test.ts import createRng from here.
// The two functions below are copied without any change (see VENDOR.md).

// FNV-1a, as 8 hex digits
export function hash(text: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
        h ^= text.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}

// The same seed gives the same numbers on every device (mulberry32)
export function createRng(seed: string): () => number {
    let a = parseInt(hash(String(seed)), 16);
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
