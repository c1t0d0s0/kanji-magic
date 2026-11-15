// --- The Morse key: dots and dashes, and a letter when the keying stops ---
// パドル: two keys, a dot and a dash; held, it sends them again and again (PaddleRepeater).
// 電鍵: one key; held longer than MORSE_DASH_AT dots it is a dash. A letter is taken after no
// keying for MORSE_LETTER_GAP dots, at once by commit() (Enter), or at once when no letter goes on
// from its code (isFinal: C, F, the numbers). Not by the letter asked: T keyed for M is wrong. From morse-master
// (TappingQuiz, FreeKeyer, usePaddleKeyer), without React: Keyer is plain (tests/morse.test.ts),
// useKeyer puts it on a Vue component with the keyboard.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { MORSE_DASH_AT, MORSE_LETTER_GAP, MORSE_TAKE_FINAL, MORSE_WPM } from '../config';
import { isFinal } from './code';
import type { Keyer as KeyerKind } from '../storage';
import { PaddleRepeater, type PaddleSymbol } from './paddleRepeater';

export type { PaddleSymbol };

export const DOT_MS = 1200 / MORSE_WPM;

export interface KeyerEvents {
    // A symbol keyed (to sound and show it): the paddle's at once, the 電鍵's when let go
    symbol?: (s: PaddleSymbol) => void;
    // The code of the letter so far changed
    buffer?: (code: string) => void;
    // A letter keyed: its code
    letter: (code: string) => void;
    // The key that is down (to show it), null when none
    held?: (s: PaddleSymbol | 'key' | null) => void;
}

export class Keyer {
    private code = '';
    private timer: ReturnType<typeof setTimeout> | null = null;
    private downAt: number | null = null;
    private readonly paddle: PaddleRepeater;

    constructor(private readonly on: KeyerEvents, private readonly dotMs = DOT_MS) {
        this.paddle = new PaddleRepeater({
            onSymbol: s => this.add(s, s === '-' ? MORSE_LETTER_GAP.dash : MORSE_LETTER_GAP.dot),
            getDotMs: () => this.dotMs,
            onHeldChange: h => this.on.held?.(h)
        });
    }

    get buffer() {
        return this.code;
    }

    // --- パドル ---
    press(s: PaddleSymbol) {
        this.paddle.press(s);
    }

    release(s: PaddleSymbol) {
        this.paddle.release(s);
    }

    // --- 電鍵 ---
    keyDown() {
        if (this.downAt !== null) return;
        this.downAt = Date.now();
        // Not a letter yet: the key is down
        this.clearTimer();
        this.on.held?.('key');
    }

    keyUp() {
        if (this.downAt === null) return;
        const held = Date.now() - this.downAt;
        this.downAt = null;
        this.on.held?.(null);
        this.add(held > this.dotMs * MORSE_DASH_AT ? '-' : '.', MORSE_LETTER_GAP.dot);
    }

    get keyIsDown() {
        return this.downAt !== null;
    }

    // --- Both ---
    // The letter keyed so far, now
    commit() {
        this.clearTimer();
        if (!this.code) return;
        const code = this.code;
        this.setCode('');
        this.on.letter(code);
    }

    // Takes back the last symbol of the letter
    back() {
        if (!this.code) return;
        this.clearTimer();
        this.setCode(this.code.slice(0, -1));
    }

    // All keys up and the letter so far forgotten (the window lost the focus, the end)
    reset() {
        this.paddle.releaseAll();
        if (this.downAt !== null) this.on.held?.(null);
        this.downAt = null;
        this.clearTimer();
        this.setCode('');
    }

    dispose() {
        this.reset();
        this.paddle.dispose();
    }

    private add(s: PaddleSymbol, gapDots: number) {
        this.on.symbol?.(s);
        this.setCode(this.code + s);
        this.clearTimer();
        if (MORSE_TAKE_FINAL && isFinal(this.code)) {
            this.commit();
            return;
        }
        this.timer = setTimeout(() => this.commit(), this.dotMs * gapDots);
    }

    private setCode(code: string) {
        this.code = code;
        this.on.buffer?.(code);
    }

    private clearTimer() {
        if (this.timer !== null) clearTimeout(this.timer);
        this.timer = null;
    }
}

// The keys of the keyboard: J and F a dot, K and D a dash (パドル); Space (電鍵); Enter takes the
// letter, Backspace takes back a symbol. By the place of the key (e.code), so a Japanese input
// mode does not matter. The OS repeat of a held key is not used (the paddle repeats by itself).
const DOT_KEYS = ['KeyJ', 'KeyF'];
const DASH_KEYS = ['KeyK', 'KeyD'];

export function useKeyer(kind: () => KeyerKind, on: KeyerEvents, enabled: () => boolean) {
    const buffer = ref('');
    const held = ref<PaddleSymbol | 'key' | null>(null);
    const keyer = new Keyer({
        ...on,
        buffer: code => {
            buffer.value = code;
            on.buffer?.(code);
        },
        held: h => {
            held.value = h;
            on.held?.(h);
        }
    });

    function onKeyDown(e: KeyboardEvent) {
        if (!enabled()) return;
        const paddle = kind() === 'paddle';
        const dot = DOT_KEYS.includes(e.code), dash = DASH_KEYS.includes(e.code);
        if (paddle && (dot || dash)) {
            e.preventDefault();
            if (!e.repeat) keyer.press(dot ? '.' : '-');
        } else if (!paddle && e.code === 'Space') {
            e.preventDefault();
            if (!e.repeat) keyer.keyDown();
        } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
            e.preventDefault();
            keyer.commit();
        } else if (e.code === 'Backspace') {
            e.preventDefault();
            keyer.back();
        }
    }

    function onKeyUp(e: KeyboardEvent) {
        if (DOT_KEYS.includes(e.code)) keyer.release('.');
        else if (DASH_KEYS.includes(e.code)) keyer.release('-');
        else if (e.code === 'Space') {
            e.preventDefault();
            keyer.keyUp();
        }
    }

    // keyup does not come when the window loses the focus: all keys up
    const onBlur = () => keyer.reset();

    onMounted(() => {
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('blur', onBlur);
    });
    onBeforeUnmount(() => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
        window.removeEventListener('blur', onBlur);
        keyer.dispose();
    });

    // For the buttons on the screen (a mouse or a finger): held till let go, even off the button
    function capture(e: PointerEvent) {
        try {
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
        } catch {
            // not captured: still keyed
        }
    }
    const paddleButton = (s: PaddleSymbol) => ({
        onPointerdown: (e: PointerEvent) => {
            if (e.button !== 0 || !enabled()) return;
            capture(e);
            keyer.press(s);
        },
        onPointerup: () => keyer.release(s),
        onPointercancel: () => keyer.release(s),
        onLostpointercapture: () => keyer.release(s)
    });
    const keyButton = {
        onPointerdown: (e: PointerEvent) => {
            if (e.button !== 0 || !enabled()) return;
            capture(e);
            keyer.keyDown();
        },
        onPointerup: () => keyer.keyUp(),
        onPointercancel: () => keyer.keyUp(),
        onLostpointercapture: () => keyer.keyUp()
    };

    return { keyer, buffer, held, paddleButton, keyButton };
}
