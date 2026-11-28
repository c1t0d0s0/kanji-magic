// --- What a character is doing, for its picture ---
import type { EyeKind, MouthKind } from './parts';

export type Mood = 'dizzy' | 'cheer' | 'shock' | 'ko';

export interface Pose {
    // ms (makes everything move: blinking, wobbling, walking)
    t: number;
    // 0..1: walking (0: standing still)
    walk: number;
    // 0..1: getting ready to strike (rises just before it)
    windup: number;
    // 0..1: the strike (1 just after it, back to 0)
    attack: number;
    // 0..1: just hit
    hurt: number;
    // Bound by the vines (き)
    stopped: boolean;
    form: 0 | 1 | 2;
    // Main colour (of the form)
    color: string;
    // A number of its own, so that two of a kind do not move together
    seed: number;
    mood?: Mood;
}

export const restPose = (form: 0 | 1 | 2, color: string, t = 0, mood?: Mood): Pose => ({
    t, walk: 0, windup: 0, attack: 0, hurt: 0, stopped: false, form, color, seed: 0, mood
});

// Blinking now and then
export const blinking = (p: Pose) => (p.t + p.seed * 997) % 3200 < 120;

// The face for this pose; `eyes` and `smile` are the usual ones of the character
export function faceOf(p: Pose, eyes: EyeKind = 'open', smile: MouthKind = 'smile'): { eyes: EyeKind; mouth: MouthKind } {
    if (p.mood === 'shock') return { eyes: 'pop', mouth: 'scream' };
    if (p.mood === 'ko') return { eyes: 'x', mouth: 'scream' };
    if (p.mood === 'dizzy') return { eyes: 'spiral', mouth: 'wavy' };
    if (p.mood === 'cheer') return { eyes: 'happy', mouth: 'open' };
    if (p.hurt > 0.2) return { eyes: 'shut', mouth: 'wavy' };
    if (p.stopped) return { eyes: 'shut', mouth: 'wavy' };
    if (p.attack > 0.3 || p.windup > 0.5) return { eyes: eyes === 'half' ? 'open' : eyes, mouth: 'open' };
    if (eyes === 'open' && blinking(p)) return { eyes: 'closed', mouth: smile };
    return { eyes, mouth: smile };
}

// Bouncing while walking: 0..1
export const bounce = (p: Pose, speed = 150) => Math.abs(Math.sin(p.t / speed + p.seed)) * p.walk;
