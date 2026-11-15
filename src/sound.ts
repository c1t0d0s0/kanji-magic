// --- Sound effects made with the Web Audio API (no files to load) ---
// The AudioContext is made at the first tap (browsers allow sound only after one). The volume is
// set from the settings; 0 is silent (the mute button).
import type { SpellGroup } from './spell/effects';

export type SoundName =
    | 'tap' | 'summon' | 'hit' | 'fall' | 'base' | 'wallet' | 'win' | 'lose' | 'open' | 'rune'
    | 'perfect' | 'success' | 'close' | 'fail' | SpellGroup;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.7;
// Many hits in a moment would be noise: the same sound is not played again so soon
const lastPlayed = new Map<SoundName, number>();
const MIN_GAP_MS: Partial<Record<SoundName, number>> = { hit: 90, fall: 60, base: 150, rune: 40 };

function audio() {
    if (ctx) return ctx;
    const AC = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
    if (!AC) return null;
    try {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = volume;
        master.connect(ctx.destination);
    } catch {
        ctx = null;
    }
    return ctx;
}

// Call from a tap: makes the sound possible from then on
export function unlockAudio() {
    const a = audio();
    if (a && a.state === 'suspended') void a.resume();
}

export function setVolume(v: number) {
    volume = Math.max(0, Math.min(1, v));
    if (master && ctx) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.02);
}

function tone(freq: number, start: number, length: number, type: OscillatorType = 'sine', gain = 0.3, slideTo?: number) {
    if (!ctx || !master) return;
    const t = ctx.currentTime + start;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + length);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + length + 0.02);
}

function noise(start: number, length: number, gain = 0.2, lowpass = 1200) {
    if (!ctx || !master) return;
    const t = ctx.currentTime + start;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lowpass;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(f).connect(g).connect(master);
    src.start(t);
}

const notes = (list: number[], gap: number, length: number, type: OscillatorType = 'triangle', gain = 0.25) =>
    list.forEach((f, i) => tone(f, i * gap, length, type, gain));

export function play(name: SoundName) {
    if (volume <= 0 || !audio() || !ctx || ctx.state !== 'running') return;
    const now = performance.now();
    const gap = MIN_GAP_MS[name] ?? 0;
    if (gap && now - (lastPlayed.get(name) ?? -Infinity) < gap) return;
    lastPlayed.set(name, now);
    switch (name) {
        case 'tap': tone(660, 0, 0.06, 'square', 0.08); break;
        case 'summon': tone(440, 0, 0.12, 'triangle', 0.2, 880); break;
        case 'hit': noise(0, 0.05, 0.08, 2500); break;
        case 'fall': tone(520, 0, 0.15, 'square', 0.08, 180); break;
        case 'base': noise(0, 0.12, 0.15, 500); break;
        case 'wallet': notes([880, 1320], 0.07, 0.12, 'square', 0.1); break;
        case 'win': notes([523, 659, 784, 1047], 0.13, 0.3); break;
        case 'lose': notes([392, 330, 262], 0.2, 0.4, 'sine'); break;
        case 'open': tone(220, 0, 0.6, 'sine', 0.2, 660); break;
        case 'rune': tone(1200 + Math.random() * 400, 0, 0.12, 'sine', 0.1); break;
        case 'perfect': notes([784, 988, 1175, 1568], 0.08, 0.35, 'triangle', 0.25); break;
        case 'success': notes([659, 880], 0.1, 0.3); break;
        case 'close': notes([523, 494], 0.12, 0.25, 'sine'); break;
        case 'fail': tone(300, 0, 0.4, 'sawtooth', 0.08, 120); break;
        case 'fire': noise(0, 0.8, 0.35, 900); tone(110, 0, 0.6, 'sawtooth', 0.12, 60); break;
        case 'water': noise(0, 1.0, 0.25, 600); tone(300, 0, 0.8, 'sine', 0.1, 150); break;
        case 'wood': notes([392, 523, 659], 0.06, 0.3, 'triangle', 0.15); break;
        case 'metal': tone(1568, 0, 0.6, 'square', 0.06); tone(2093, 0.05, 0.5, 'sine', 0.1); break;
        case 'word': notes([523, 659, 784, 659, 784], 0.07, 0.15, 'square', 0.08); break;
        case 'wonder': tone(200, 0, 0.7, 'sine', 0.25, 900); noise(0.3, 0.5, 0.2, 1500); break;
    }
}

// --- The side tone of the Morse key (src/morse/): sounds while the key is down ---
// From morse-master src/audio/morseAudioEngine.ts (startManualTone / stopManualTone): a sine with
// 5 ms ramps so the key makes no click
const SIDE_TONE_HZ = 650;
let side: { o: OscillatorNode; g: GainNode } | null = null;

export function sideToneOn() {
    sideToneOff();
    if (volume <= 0 || !audio() || !ctx || !master || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(SIDE_TONE_HZ, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.005);
    o.connect(g).connect(master);
    o.start(t);
    side = { o, g };
}

export function sideToneOff() {
    if (!side || !ctx) return;
    const { o, g } = side;
    side = null;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(0.0001, t + 0.005);
    o.stop(t + 0.02);
}

// One dot or dash (the paddle sends them by itself)
export function sideTone(ms: number) {
    if (volume <= 0 || !audio() || !ctx || !master || ctx.state !== 'running') return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(SIDE_TONE_HZ, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.35, t + 0.005);
    g.gain.setValueAtTime(0.35, t + ms / 1000);
    g.gain.linearRampToValueAtTime(0.0001, t + ms / 1000 + 0.005);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + ms / 1000 + 0.02);
}
