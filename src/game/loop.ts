// --- The game loop: requestAnimationFrame, with the battle moved on in fixed steps (60 a second) ---
// The steps do not depend on the screen's rate, so the battle is the same on every device.
// timeScale slows the battle (0.1 while the magic circle is open): fewer steps, each the same.
import { STEPS_PER_SECOND } from '../config';

export const STEP_MS = 1000 / STEPS_PER_SECOND;
// After a pause (a hidden tab), the battle does not rush to catch up
const MAX_FRAME_MS = 250;

export interface Loop {
    start(): void;
    stop(): void;
    timeScale: number;
    readonly running: boolean;
}

export function createLoop(step: (dt: number) => void, draw: () => void): Loop {
    let frame = 0;
    let last = 0;
    let carry = 0;
    let running = false;
    const loop: Loop = {
        timeScale: 1,
        get running() {
            return running;
        },
        start() {
            if (running) return;
            running = true;
            last = performance.now();
            frame = requestAnimationFrame(tick);
        },
        stop() {
            running = false;
            cancelAnimationFrame(frame);
        }
    };
    function tick(now: number) {
        if (!running) return;
        carry += Math.min(MAX_FRAME_MS, Math.max(0, now - last)) * loop.timeScale;
        last = now;
        while (carry >= STEP_MS) {
            step(STEP_MS);
            carry -= STEP_MS;
        }
        draw();
        frame = requestAnimationFrame(tick);
    }
    return loop;
}
