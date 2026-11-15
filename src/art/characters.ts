// --- The characters: へんてこ生き物 (our side) and the わすれんぼう (the enemies) ---
// Each one is drawn with its feet at (0, 0), facing right (+x), about `s` wide and tall. One
// function draws the 3 forms of a unit (pose.form). No text in our units: they are drawn mirrored.
import type { EnemyId } from '../game/enemies';
import type { UnitId } from '../game/units';
import { OUTLINE, blush, dizzyStars, eye, line, lineFor, mouth, oval, paint, shout, star, sweat, type Ctx } from './parts';
import { bounce, faceOf, type Pose } from './pose';

export type Draw = (ctx: Ctx, s: number, p: Pose) => void;

// A colour made lighter (amount > 0) or darker (< 0)
export function shade(hex: string, amount: number) {
    const n = parseInt(hex.slice(1), 16);
    const mix = (c: number) => Math.round(amount > 0 ? c + (255 - c) * amount : c * (1 + amount));
    const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
    return `rgb(${r} ${g} ${b})`;
}

// Small feet that step in turn
function feet(ctx: Ctx, s: number, p: Pose, color: string, gap = 0.22) {
    const k = Math.sin(p.t / 120 + p.seed) * p.walk;
    oval(ctx, -s * gap + k * s * 0.08, -s * 0.04 - Math.max(0, k) * s * 0.06, s * 0.13, s * 0.07, color, s);
    oval(ctx, s * gap - k * s * 0.08, -s * 0.04 - Math.max(0, -k) * s * 0.06, s * 0.13, s * 0.07, color, s);
}

// Things every character shows the same way
function extras(ctx: Ctx, s: number, p: Pose, headY: number) {
    if (p.stopped) sweat(ctx, s * 0.45, headY, s * 0.08);
    if (p.mood === 'dizzy') dizzyStars(ctx, 0, headY - s * 0.15, s * 0.4, p.t);
}

// ===== Our side =====

// ぷるりん: a slime that wobbles; hit, it goes flat as a pancake
const purun: Draw = (ctx, s, p) => {
    const jig = Math.sin(p.t / 110 + p.seed);
    let sx = 1 + 0.06 * jig * (0.4 + p.walk) - 0.05 * p.windup + 0.4 * p.hurt + 0.15 * p.attack;
    let sy = 1 - 0.07 * jig * (0.4 + p.walk) + 0.08 * p.windup - 0.45 * p.hurt - 0.1 * p.attack;
    if (p.mood === 'cheer') { sx -= 0.1; sy += 0.15; }
    const r = s * 0.55, h = s * 0.92;
    ctx.save();
    ctx.translate(p.attack * s * 0.15, 0);
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.bezierCurveTo(-r, -h * 0.6, -r * 0.45, -h, r * 0.05, -h);
    ctx.bezierCurveTo(r * 0.6, -h, r, -h * 0.6, r, 0);
    ctx.quadraticCurveTo(0, s * 0.06, -r, 0);
    paint(ctx, p.color, s);
    // Shine
    oval(ctx, -r * 0.4, -h * 0.68, r * 0.16, r * 0.26, 'rgb(255 255 255 / 0.75)', s, false);
    if (p.form === 1) {
        // A headband, and arms with very small muscles, flexing
        line(ctx, [[-r * 0.85, -h * 0.72], [r * 0.85, -h * 0.72]], s * 0.1, '#e5383b');
        line(ctx, [[-r * 0.9, -h * 0.72], [-r * 1.25, -h * 0.85 + Math.sin(p.t / 90) * s * 0.05]], s * 0.07, '#e5383b');
        const flex = Math.sin(p.t / 260 + p.seed) * 0.5 + 0.5;
        for (const side of [-1, 1]) {
            const ax = side * r * 0.95;
            line(ctx, [[ax, -h * 0.35], [ax + side * r * 0.35, -h * 0.4], [ax + side * r * 0.3, -h * (0.62 + 0.08 * flex)]], s * 0.11, p.color);
            oval(ctx, ax + side * r * 0.3, -h * (0.46 + 0.04 * flex), s * 0.05 + flex * s * 0.02, s * 0.05, p.color, s * 0.6);
        }
    }
    const f = faceOf(p, p.form === 2 ? 'happy' : 'open');
    eye(ctx, r * 0.05, -h * 0.5, s * 0.13, f.eyes, p.t, 0.4);
    eye(ctx, r * 0.5, -h * 0.5, s * 0.13, f.eyes, p.t, 0.4);
    if (p.form === 1) {
        // Brave eyebrows
        line(ctx, [[-r * 0.1, -h * 0.68], [r * 0.2, -h * 0.62]], s * 0.06);
        line(ctx, [[r * 0.65, -h * 0.62], [r * 0.35, -h * 0.68]], s * 0.06);
    }
    if (p.form === 2) {
        // Bushy white eyebrows hanging down
        for (const ex of [r * 0.05, r * 0.5]) {
            ctx.beginPath();
            ctx.moveTo(ex - s * 0.16, -h * 0.6);
            ctx.quadraticCurveTo(ex, -h * 0.82, ex + s * 0.18, -h * 0.58);
            ctx.quadraticCurveTo(ex + s * 0.2, -h * 0.5, ex + s * 0.12, -h * 0.5);
            ctx.quadraticCurveTo(ex, -h * 0.6, ex - s * 0.16, -h * 0.6);
            paint(ctx, '#fbfbff', s * 0.7);
        }
        // A long white beard, down to the ground and trailing behind
        const wave = Math.sin(p.t / 200) * s * 0.04;
        ctx.beginPath();
        ctx.moveTo(-r * 0.05, -h * 0.33);
        ctx.quadraticCurveTo(r * 0.3, -h * 0.4, r * 0.7, -h * 0.33);
        ctx.quadraticCurveTo(r * 0.75, -h * 0.1, r * 0.45, -s * 0.01);
        ctx.quadraticCurveTo(-r * 0.6, s * 0.01 + wave, -r * 1.7, -s * 0.02);
        ctx.quadraticCurveTo(-r * 0.6, -s * 0.12 - wave, -r * 0.05, -h * 0.33);
        paint(ctx, '#fbfbff', s * 0.8);
        line(ctx, [[r * 0.2, -h * 0.2], [r * 0.3, -h * 0.08]], s * 0.02, '#c9c9e0');
        line(ctx, [[r * 0.45, -h * 0.22], [r * 0.5, -h * 0.1]], s * 0.02, '#c9c9e0');
        mouth(ctx, r * 0.33, -h * 0.36, s * 0.14, f.mouth === 'smile' ? 'grin' : f.mouth, p.t);
    } else mouth(ctx, r * 0.3, -h * 0.26, s * 0.22, f.mouth, p.t);
    blush(ctx, -r * 0.25, -h * 0.32, s * 0.08);
    blush(ctx, r * 0.78, -h * 0.32, s * 0.07);
    ctx.restore();
    extras(ctx, s, p, -h);
};

// まゆげガエル: thick eyebrows that go up and down; it slaps with its tongue
const kaeru: Draw = (ctx, s, p) => {
    const hop = Math.max(0, Math.sin(p.t / 180 + p.seed)) * s * 0.22 * p.walk;
    const cheer = p.mood === 'cheer' ? Math.abs(Math.sin(p.t / 150)) * s * 0.2 : 0;
    const squish = 1 - 0.3 * p.hurt;
    ctx.save();
    ctx.translate(0, -hop - cheer);
    ctx.scale(1 + 0.2 * p.hurt, squish);
    const c = p.color;
    // Back leg, body, belly
    oval(ctx, -s * 0.38, -s * 0.12, s * 0.2, s * 0.12, c, s);
    oval(ctx, 0, -s * 0.36, s * 0.55, s * 0.36, c, s);
    oval(ctx, s * 0.12, -s * 0.28, s * 0.32, s * 0.2, shade(c, 0.55), s, false);
    oval(ctx, s * 0.35, -s * 0.05, s * 0.14, s * 0.07, c, s);
    // The eyes on bumps
    const f = faceOf(p);
    for (const ex of [-s * 0.08, s * 0.3]) {
        oval(ctx, ex, -s * 0.7, s * 0.17, s * 0.16, c, s);
        eye(ctx, ex, -s * 0.72, s * 0.11, f.eyes, p.t, 0.45);
    }
    // The eyebrows: up and down, higher when it strikes
    const up = (Math.sin(p.t / 140 + p.seed) * 0.5 + 0.5) * s * 0.08 + p.windup * s * 0.1;
    const by = -s * 0.92 - up;
    if (p.form === 2) {
        // One long eyebrow over both eyes, and a crown
        ctx.beginPath();
        ctx.moveTo(-s * 0.3, by + s * 0.04);
        ctx.quadraticCurveTo(s * 0.11, by - s * 0.14, s * 0.52, by + s * 0.04);
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = s * 0.13;
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.beginPath();
        const cy = -s * 1.08 - up;
        ctx.moveTo(-s * 0.02, cy + s * 0.12);
        ctx.lineTo(-s * 0.06, cy - s * 0.08);
        ctx.lineTo(s * 0.06, cy + s * 0.02);
        ctx.lineTo(s * 0.12, cy - s * 0.12);
        ctx.lineTo(s * 0.18, cy + s * 0.02);
        ctx.lineTo(s * 0.3, cy - s * 0.08);
        ctx.lineTo(s * 0.26, cy + s * 0.12);
        ctx.closePath();
        paint(ctx, '#ffd23f', s * 0.7);
    } else {
        for (const ex of [-s * 0.08, s * 0.3]) {
            if (p.form === 0) line(ctx, [[ex - s * 0.13, by + s * 0.02], [ex + s * 0.13, by - s * 0.02]], s * 0.09);
            else {
                // Bushy: zigzag
                const pts: [number, number][] = [];
                for (let i = 0; i <= 6; i++) pts.push([ex - s * 0.17 + i * s * 0.057, by - (i % 2) * s * 0.07]);
                line(ctx, pts, s * 0.1);
            }
        }
    }
    // The tongue
    if (p.attack > 0) {
        const len = s * (0.2 + 1.1 * Math.sin(Math.PI * Math.min(1, p.attack)));
        line(ctx, [[s * 0.45, -s * 0.36], [s * 0.45 + len, -s * 0.34]], s * 0.1, '#ff6f91');
        oval(ctx, s * 0.45 + len, -s * 0.34, s * 0.09, s * 0.08, '#ff6f91', s * 0.6);
    } else {
        ctx.beginPath();
        ctx.moveTo(s * 0.0, -s * 0.4);
        ctx.quadraticCurveTo(s * 0.3, -s * 0.28, s * 0.52, -s * 0.42);
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = lineFor(s);
        ctx.stroke();
    }
    blush(ctx, s * 0.42, -s * 0.48, s * 0.07);
    ctx.restore();
    extras(ctx, s, p, -s * 0.9);
};

// ヒゲながネコ: whiskers longer at each form; it throws balls of fluff
const neko: Draw = (ctx, s, p) => {
    const b = bounce(p, 140) * s * 0.08 + (p.mood === 'cheer' ? Math.abs(Math.sin(p.t / 150)) * s * 0.2 : 0);
    const c = p.color;
    ctx.save();
    ctx.translate(0, -b);
    ctx.scale(1 + 0.2 * p.hurt, 1 - 0.25 * p.hurt);
    // Tail, waving
    const tw = Math.sin(p.t / 220 + p.seed) * s * 0.15;
    line(ctx, [[-s * 0.35, -s * 0.25], [-s * 0.65, -s * 0.4], [-s * 0.6 + tw, -s * 0.85]], s * 0.14);
    line(ctx, [[-s * 0.35, -s * 0.25], [-s * 0.65, -s * 0.4], [-s * 0.6 + tw, -s * 0.85]], s * 0.08, c);
    // Ears and the round body
    for (const ex of [-s * 0.2, s * 0.25]) {
        ctx.beginPath();
        ctx.moveTo(ex - s * 0.15, -s * 0.72);
        ctx.lineTo(ex, -s * 1.0);
        ctx.lineTo(ex + s * 0.15, -s * 0.72);
        ctx.closePath();
        paint(ctx, c, s);
    }
    oval(ctx, 0, -s * 0.45, s * 0.48, s * 0.42, c, s);
    if (p.form === 0) {
        // Stripes
        for (const k of [-0.15, 0.05]) line(ctx, [[s * k, -s * 0.86], [s * k + s * 0.04, -s * 0.72]], s * 0.06, shade(c, -0.25));
    }
    const f = faceOf(p);
    eye(ctx, s * 0.05, -s * 0.52, s * 0.11, f.eyes, p.t, 0.5);
    eye(ctx, s * 0.32, -s * 0.52, s * 0.11, f.eyes, p.t, 0.5);
    if (p.form === 2) {
        // Round glasses of an old cat
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = s * 0.04;
        for (const ex of [s * 0.05, s * 0.32]) {
            ctx.beginPath();
            ctx.arc(ex, -s * 0.52, s * 0.14, 0, Math.PI * 2);
            ctx.stroke();
        }
        line(ctx, [[s * 0.19, -s * 0.53], [s * 0.18, -s * 0.53]], s * 0.04);
    }
    // Nose, mouth
    ctx.beginPath();
    ctx.moveTo(s * 0.16, -s * 0.42);
    ctx.lineTo(s * 0.22, -s * 0.42);
    ctx.lineTo(s * 0.19, -s * 0.38);
    ctx.closePath();
    ctx.fillStyle = '#ff7f9a';
    ctx.fill();
    mouth(ctx, s * 0.19, -s * 0.34, s * 0.2, f.mouth === 'smile' ? 'cat' : f.mouth, p.t);
    // Whiskers: long, longer, and at last down to the ground and dragged behind
    const n = p.form === 1 ? 4 : 3;
    for (const side of [-1, 1]) {
        for (let i = 0; i < n; i++) {
            const y0 = -s * 0.38 + (i - (n - 1) / 2) * s * 0.05;
            const x0 = s * 0.19 + side * s * 0.12;
            const wig = Math.sin(p.t / 160 + i + side) * s * 0.03;
            if (p.form === 2) {
                // Down to the ground, then along it behind
                const pts: [number, number][] = [[x0, y0], [x0 + side * s * 0.3, y0 + s * 0.15]];
                pts.push([x0 + side * s * 0.25, -s * 0.01 * (i + 1)]);
                pts.push([-s * (0.7 + i * 0.25) + wig, -s * 0.01 * (i + 1)]);
                line(ctx, pts, s * 0.025);
            } else {
                const len = s * (p.form === 0 ? 0.45 : 0.7);
                line(ctx, [[x0, y0], [x0 + side * len * 0.5, y0 + (i - 1) * s * 0.04 + wig], [x0 + side * len, y0 + (i - 1) * s * 0.1 - wig]], s * 0.025);
            }
        }
    }
    if (p.form === 1) {
        // A big curly moustache
        for (const side of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(s * 0.19, -s * 0.37);
            ctx.quadraticCurveTo(s * 0.19 + side * s * 0.25, -s * 0.25, s * 0.19 + side * s * 0.32, -s * 0.4);
            ctx.strokeStyle = shade(c, -0.55);
            ctx.lineWidth = s * 0.07;
            ctx.lineCap = 'round';
            ctx.stroke();
        }
    }
    // The paw: back, then forward with the throw
    const swing = p.attack > 0 ? 1 - p.attack : -p.windup;
    oval(ctx, s * (0.3 + swing * 0.3), -s * (0.12 + p.windup * 0.55 + Math.max(0, swing) * 0.25), s * 0.11, s * 0.09, c, s);
    if (p.windup > 0.2) fluff(ctx, s * (0.25 - p.windup * 0.3), -s * (0.35 + p.windup * 0.45), s * 0.13, c, p.t);
    blush(ctx, -s * 0.08, -s * 0.38, s * 0.07);
    ctx.restore();
    extras(ctx, s, p, -s * 0.95);
};

// A ball of fluff (thrown by the cats)
export function fluff(ctx: Ctx, x: number, y: number, r: number, color: string, t: number) {
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI * 2) / 16 + t / 100;
        const rr = r * (i % 2 ? 0.75 : 1);
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    paint(ctx, color, r * 4);
}

// ローラーペンギン: slides on roller skates and bumps with its belly
const pengin: Draw = (ctx, s, p) => {
    const c = p.color;
    const lean = 0.12 * p.walk + 0.35 * p.attack - 0.15 * p.windup + (p.mood === 'cheer' ? Math.sin(p.t / 120) * 0.2 : 0);
    // Wheels (they do not lean)
    for (const wx of [-s * 0.16, s * 0.16]) {
        oval(ctx, wx, -s * 0.07, s * 0.07, s * 0.07, '#ffd23f', s);
        const a = p.t / 40 * p.walk;
        line(ctx, [[wx - Math.cos(a) * s * 0.05, -s * 0.07 - Math.sin(a) * s * 0.05], [wx + Math.cos(a) * s * 0.05, -s * 0.07 + Math.sin(a) * s * 0.05]], s * 0.025);
    }
    ctx.beginPath();
    ctx.roundRect(-s * 0.3, -s * 0.2, s * 0.62, s * 0.1, s * 0.04);
    paint(ctx, '#e5383b', s);
    ctx.save();
    ctx.translate(p.attack * s * 0.25, -s * 0.18);
    ctx.rotate(lean);
    ctx.scale(1 + 0.2 * p.hurt, 1 - 0.25 * p.hurt);
    // The scarf of the fastest one flies behind
    if (p.form === 2) {
        const w = Math.sin(p.t / 70) * s * 0.06;
        ctx.beginPath();
        ctx.moveTo(-s * 0.05, -s * 0.62);
        ctx.quadraticCurveTo(-s * 0.5, -s * 0.7 + w, -s * 0.85, -s * 0.55 - w);
        ctx.lineTo(-s * 0.8, -s * 0.45 - w);
        ctx.quadraticCurveTo(-s * 0.5, -s * 0.55 + w, -s * 0.05, -s * 0.5);
        paint(ctx, '#e5383b', s);
    }
    if (p.form >= 1) {
        // A jet pack, its fire flickering
        ctx.beginPath();
        ctx.roundRect(-s * 0.5, -s * 0.7, s * 0.2, s * 0.4, s * 0.06);
        paint(ctx, '#b8c0cc', s);
        const fl = s * (0.15 + 0.12 * Math.abs(Math.sin(p.t / 40)) + 0.15 * p.walk);
        ctx.beginPath();
        ctx.moveTo(-s * 0.48, -s * 0.3);
        ctx.lineTo(-s * 0.4, -s * 0.3 + fl);
        ctx.lineTo(-s * 0.32, -s * 0.3);
        ctx.closePath();
        ctx.fillStyle = '#ff9f1c';
        ctx.fill();
    }
    oval(ctx, 0, -s * 0.42, s * 0.34, s * 0.44, c, s);
    oval(ctx, s * 0.1, -s * 0.36, s * 0.21, s * 0.32, '#fff', s, false);
    // Flippers, flapping
    const flap = Math.sin(p.t / 80) * 0.6 * p.walk + (p.mood === 'cheer' ? -1.2 : 0);
    ctx.save();
    ctx.translate(-s * 0.08, -s * 0.5);
    ctx.rotate(0.5 + flap);
    oval(ctx, 0, s * 0.18, s * 0.07, s * 0.2, c, s);
    ctx.restore();
    const f = faceOf(p);
    if (p.form === 2 && p.hurt < 0.2 && p.mood !== 'dizzy') {
        // Cool sunglasses, always
        ctx.beginPath();
        ctx.roundRect(s * 0.02, -s * 0.74, s * 0.16, s * 0.1, s * 0.03);
        ctx.roundRect(s * 0.2, -s * 0.74, s * 0.14, s * 0.1, s * 0.03);
        paint(ctx, '#111', s * 0.6);
        line(ctx, [[-s * 0.12, -s * 0.71], [s * 0.34, -s * 0.71]], s * 0.03, '#111');
        if ((p.t + p.seed * 500) % 2400 < 300) star(ctx, s * 0.32, -s * 0.78, s * 0.07, '#fff');
    } else {
        eye(ctx, s * 0.08, -s * 0.68, s * 0.08, f.eyes, p.t, 0.5);
        eye(ctx, s * 0.26, -s * 0.68, s * 0.08, f.eyes, p.t, 0.5);
    }
    // Beak (open when it strikes)
    const open = p.attack > 0.3 || p.mood === 'cheer' ? s * 0.06 : 0;
    ctx.beginPath();
    ctx.moveTo(s * 0.26, -s * 0.6 - open / 2);
    ctx.lineTo(s * 0.48, -s * 0.57);
    ctx.lineTo(s * 0.26, -s * 0.54 + open / 2);
    ctx.closePath();
    paint(ctx, '#ff9f1c', s);
    blush(ctx, s * 0.22, -s * 0.5, s * 0.05);
    ctx.restore();
    if (p.form === 2 && p.walk > 0) {
        // Speed lines
        for (let k = 0; k < 3; k++) line(ctx, [[-s * 0.6 - k * s * 0.1, -s * (0.3 + k * 0.2)], [-s * 1.0 - k * s * 0.1, -s * (0.3 + k * 0.2)]], s * 0.03, 'rgb(255 255 255 / 0.8)');
    }
    extras(ctx, s, p, -s * 1.0);
};

// どすこいカバ: a sumo hippo; its stamp (しこ) shakes the ground
const kaba: Draw = (ctx, s, p) => {
    const c = p.color;
    const lift = p.windup;
    const slam = p.attack;
    const cheer = p.mood === 'cheer' ? Math.abs(Math.sin(p.t / 160)) * s * 0.12 : 0;
    ctx.save();
    ctx.translate(0, -cheer);
    ctx.scale(1 + 0.1 * slam + 0.1 * p.hurt, 1 - 0.12 * slam - 0.15 * p.hurt);
    ctx.rotate(-0.12 * lift);
    // Legs: the front one goes up high before the stamp
    const step = Math.sin(p.t / 160 + p.seed) * p.walk;
    oval(ctx, -s * 0.25, -s * 0.1 - Math.max(0, step) * s * 0.05, s * 0.13, s * 0.12, c, s);
    oval(ctx, s * 0.25 + lift * s * 0.1, -s * 0.1 - lift * s * 0.35 - Math.max(0, -step) * s * 0.05, s * 0.13, s * 0.12, c, s);
    // Body
    oval(ctx, 0, -s * 0.48, s * 0.55, s * 0.42, c, s);
    oval(ctx, s * 0.05, -s * 0.4, s * 0.35, s * 0.26, shade(c, 0.35), s, false);
    // Mawashi (and the white rope of the champion)
    const belt = p.form === 0 ? '#2b3a67' : p.form === 1 ? '#e0a526' : '#7b2d8b';
    ctx.beginPath();
    ctx.roundRect(-s * 0.52, -s * 0.3, s * 1.04, s * 0.13, s * 0.04);
    paint(ctx, belt, s);
    if (p.form === 2) {
        line(ctx, [[-s * 0.55, -s * 0.33], [s * 0.55, -s * 0.33]], s * 0.1, '#fff');
        for (const zx of [-0.2, 0.05, 0.3]) {
            line(ctx, [[s * zx, -s * 0.3], [s * zx + s * 0.06, -s * 0.24], [s * zx, -s * 0.18], [s * zx + s * 0.06, -s * 0.12]], s * 0.04, '#fff');
        }
    }
    // Head: ears, topknot, the big snout
    oval(ctx, s * 0.02, -s * 0.88, s * 0.07, s * 0.06, c, s);
    oval(ctx, -s * 0.02, -s * 0.96, s * 0.1, s * 0.07, '#2b2340', s);
    if (p.form >= 1) line(ctx, [[-s * 0.1, -s * 0.9], [s * 0.06, -s * 0.9]], s * 0.03, '#fff');
    oval(ctx, s * 0.4, -s * 0.52, s * 0.28, s * 0.22, shade(c, 0.2), s);
    oval(ctx, s * 0.5, -s * 0.6, s * 0.035, s * 0.05, OUTLINE, s, false);
    oval(ctx, s * 0.6, -s * 0.58, s * 0.035, s * 0.05, OUTLINE, s, false);
    const f = faceOf(p, 'open', 'smile');
    eye(ctx, s * 0.15, -s * 0.74, s * 0.09, f.eyes, p.t, 0.5);
    eye(ctx, s * 0.32, -s * 0.76, s * 0.09, f.eyes, p.t, 0.5);
    mouth(ctx, s * 0.45, -s * 0.42, s * 0.25, f.mouth, p.t);
    blush(ctx, s * 0.18, -s * 0.55, s * 0.08);
    ctx.restore();
    extras(ctx, s, p, -s * 1.0);
};

// ===== The enemies: わすれんぼう (sleepy, in nightcaps, with a ？ over the head) =====

interface Sleepy {
    cap: string;
    helmet?: boolean;
    wheels?: boolean;
    pillow?: boolean;
    crown?: boolean;
    // めざまし: an alarm clock on the head instead of the cap; it rings when it hits
    clock?: boolean;
    // ふかふか: soft puffs all round
    puffs?: boolean;
    // ふたご: a smaller one leaning on it, with a cap of this colour
    twin?: string;
    // こもりうた: notes float up as it sings
    notes?: boolean;
    // ゆめのまおう: a tall wizard hat with a moon, and a cape
    wizard?: boolean;
}

const twinOf = new Map<string, Draw>();

function sleepy(o: Sleepy): Draw {
    return (ctx, s, p) => {
        const c = p.color;
        if (o.wizard) {
            // The cape, behind all, flapping a little
            const flap = Math.sin(p.t / 260 + p.seed) * s * 0.04;
            ctx.beginPath();
            ctx.moveTo(-s * 0.3, -s * 0.62);
            ctx.quadraticCurveTo(-s * 0.75, -s * 0.3, -s * 0.62 + flap, -s * 0.02);
            ctx.lineTo(s * 0.1, -s * 0.06);
            ctx.closePath();
            paint(ctx, '#5a189a', s);
        }
        const sway = Math.sin(p.t / 500 + p.seed) * 0.06;
        const b = bounce(p, o.wheels ? 70 : 170) * s * 0.06;
        // Legs: little feet, or a spinning wheel of legs for the fast one
        if (o.wheels) {
            const a = (p.t / 25) * (p.walk + 0.1);
            oval(ctx, 0, -s * 0.14, s * 0.15, s * 0.15, 'rgb(255 255 255 / 0.5)', s);
            for (let k = 0; k < 4; k++) {
                const aa = a + (k * Math.PI) / 2;
                line(ctx, [[0, -s * 0.14], [Math.cos(aa) * s * 0.15, -s * 0.14 + Math.sin(aa) * s * 0.15]], s * 0.05);
            }
            if (p.walk > 0) for (let k = 0; k < 3; k++) line(ctx, [[-s * 0.35 - k * s * 0.08, -s * (0.25 + k * 0.18)], [-s * 0.7 - k * s * 0.08, -s * (0.25 + k * 0.18)]], s * 0.03, 'rgb(255 255 255 / 0.8)');
        } else feet(ctx, s, p, shade(c, -0.25), 0.2);
        ctx.save();
        ctx.translate(0, -b - (o.wheels ? s * 0.12 : 0));
        ctx.rotate(sway);
        ctx.scale(1 + 0.15 * p.hurt, 1 - 0.15 * p.hurt);
        // Body: round, a little lumpy at the bottom
        ctx.beginPath();
        ctx.moveTo(-s * 0.46, -s * 0.15);
        ctx.bezierCurveTo(-s * 0.5, -s * 0.85, s * 0.5, -s * 0.85, s * 0.46, -s * 0.15);
        ctx.quadraticCurveTo(s * 0.3, -s * 0.02, s * 0.15, -s * 0.1);
        ctx.quadraticCurveTo(0, 0, -s * 0.15, -s * 0.1);
        ctx.quadraticCurveTo(-s * 0.3, -s * 0.02, -s * 0.46, -s * 0.15);
        paint(ctx, c, s);
        if (o.puffs) {
            // A futon of a body: puffs on its sides and top
            for (const [x, y, r] of [[-s * 0.44, -s * 0.3, 0.14], [s * 0.44, -s * 0.3, 0.14], [-s * 0.3, -s * 0.66, 0.12], [s * 0.3, -s * 0.66, 0.12], [-s * 0.42, -s * 0.12, 0.1], [s * 0.42, -s * 0.12, 0.1]] as const) {
                fluff(ctx, x, y, s * r, shade(c, 0.08), p.t * 0.3 + x);
            }
        }
        // Sleepy face, awake with a start when hit
        const f = faceOf(p, 'half', 'o');
        const yawn = f.mouth === 'o' && Math.sin(p.t / 900 + p.seed * 3) > 0.7;
        const eyes = p.hurt > 0.2 ? 'wide' : yawn ? 'closed' : f.eyes;
        eye(ctx, s * 0.05, -s * 0.45, s * 0.1, eyes, p.t, 0.5);
        eye(ctx, s * 0.28, -s * 0.45, s * 0.1, eyes, p.t, 0.5);
        if (o.crown || o.wizard) {
            // Grumpy eyebrows of the king
            line(ctx, [[-s * 0.05, -s * 0.6], [s * 0.12, -s * 0.56]], s * 0.05);
            line(ctx, [[s * 0.38, -s * 0.6], [s * 0.21, -s * 0.56]], s * 0.05);
        }
        mouth(ctx, s * 0.17, -s * 0.28, s * 0.2, p.hurt > 0.2 ? 'open' : o.notes ? 'o' : yawn ? 'yawn' : f.mouth, p.t);
        blush(ctx, -s * 0.1, -s * 0.32, s * 0.06);
        if (o.helmet) {
            // A pot on the head; it rings when hit
            ctx.beginPath();
            ctx.ellipse(0, -s * 0.62, s * 0.4, s * 0.25, 0, Math.PI, 0);
            ctx.closePath();
            paint(ctx, '#8d99ae', s);
            ctx.beginPath();
            ctx.roundRect(-s * 0.46, -s * 0.66, s * 0.92, s * 0.08, s * 0.03);
            paint(ctx, '#6c7a91', s);
            line(ctx, [[s * 0.45, -s * 0.66], [s * 0.7, -s * 0.72]], s * 0.07, OUTLINE);
            oval(ctx, -s * 0.15, -s * 0.75, s * 0.08, s * 0.04, 'rgb(255 255 255 / 0.6)', s, false);
        } else if (o.clock) {
            // An alarm clock: two bells, a face with hands; it shakes when it rings
            const ring = p.attack > 0 || p.windup > 0.6;
            const shake = ring ? Math.sin(p.t / 18) * s * 0.03 : 0;
            ctx.save();
            ctx.translate(shake, 0);
            oval(ctx, -s * 0.22, -s * 0.98, s * 0.11, s * 0.09, '#e9c46a', s);
            oval(ctx, s * 0.22, -s * 0.98, s * 0.11, s * 0.09, '#e9c46a', s);
            line(ctx, [[-s * 0.18, -s * 0.62], [-s * 0.26, -s * 0.55]], s * 0.05);
            line(ctx, [[s * 0.18, -s * 0.62], [s * 0.26, -s * 0.55]], s * 0.05);
            oval(ctx, 0, -s * 0.8, s * 0.24, s * 0.22, '#f4a261', s);
            oval(ctx, 0, -s * 0.8, s * 0.17, s * 0.15, '#fff', s * 0.6);
            const a = p.t / 600;
            line(ctx, [[0, -s * 0.8], [Math.cos(a) * s * 0.1, -s * 0.8 + Math.sin(a) * s * 0.1]], s * 0.035);
            line(ctx, [[0, -s * 0.8], [0, -s * 0.9]], s * 0.035);
            ctx.restore();
            if (ring) {
                for (const k of [-1, 1]) {
                    line(ctx, [[k * s * 0.38, -s * 1.02], [k * s * 0.5, -s * 1.1]], s * 0.035, '#e76f51');
                    line(ctx, [[k * s * 0.4, -s * 0.9], [k * s * 0.55, -s * 0.9]], s * 0.035, '#e76f51');
                }
            }
        } else if (o.wizard) {
            // A tall wizard hat, its tip bent, a moon and stars on it
            const tip = Math.sin(p.t / 400 + p.seed) * s * 0.05;
            ctx.beginPath();
            ctx.moveTo(-s * 0.42, -s * 0.62);
            ctx.lineTo(-s * 0.08, -s * 1.3);
            ctx.quadraticCurveTo(s * 0.12, -s * 1.45, s * 0.35 + tip, -s * 1.32);
            ctx.quadraticCurveTo(s * 0.12, -s * 1.25, s * 0.42, -s * 0.62);
            ctx.closePath();
            paint(ctx, '#3c096c', s);
            ctx.beginPath();
            ctx.roundRect(-s * 0.52, -s * 0.68, s * 1.04, s * 0.1, s * 0.05);
            paint(ctx, '#7b2cbf', s);
            // The moon: two circles
            ctx.save();
            ctx.beginPath();
            ctx.arc(0, -s * 0.95, s * 0.11, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd23f';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(s * 0.05, -s * 0.98, s * 0.09, 0, Math.PI * 2);
            ctx.fillStyle = '#3c096c';
            ctx.fill();
            ctx.restore();
            star(ctx, -s * 0.2, -s * 0.78, s * 0.05);
            star(ctx, s * 0.2, -s * 1.1, s * 0.04);
        } else {
            // A nightcap, its tip flopping behind
            const tip = Math.sin(p.t / 300 + p.seed) * s * 0.06;
            ctx.beginPath();
            ctx.moveTo(-s * 0.36, -s * 0.62);
            ctx.quadraticCurveTo(-s * 0.1, -s * 1.15, -s * 0.55 + tip, -s * 0.95);
            ctx.quadraticCurveTo(-s * 0.1, -s * 0.95, s * 0.36, -s * 0.62);
            ctx.closePath();
            paint(ctx, o.cap, s);
            line(ctx, [[-s * 0.25, -s * 0.8], [-s * 0.05, -s * 0.8]], s * 0.05, 'rgb(255 255 255 / 0.7)');
            ctx.beginPath();
            ctx.roundRect(-s * 0.4, -s * 0.67, s * 0.8, s * 0.1, s * 0.05);
            paint(ctx, '#fff', s);
            oval(ctx, -s * 0.55 + tip, -s * 0.95, s * 0.08, s * 0.08, '#fff', s);
            if (o.crown) {
                ctx.beginPath();
                ctx.moveTo(-s * 0.22, -s * 0.68);
                ctx.lineTo(-s * 0.26, -s * 0.92);
                ctx.lineTo(-s * 0.1, -s * 0.8);
                ctx.lineTo(0, -s * 0.98);
                ctx.lineTo(s * 0.1, -s * 0.8);
                ctx.lineTo(s * 0.26, -s * 0.92);
                ctx.lineTo(s * 0.22, -s * 0.68);
                ctx.closePath();
                paint(ctx, '#ffd23f', s);
                oval(ctx, 0, -s * 0.76, s * 0.04, s * 0.04, '#e5383b', s * 0.5);
            }
        }
        if (o.pillow && p.attack === 0) {
            // The pillow to throw, lifted over the head
            const py = -s * (0.75 + 0.35 * p.windup);
            pillow(ctx, s * 0.05, py, s * 0.5, 0);
        }
        ctx.restore();
        // ？ floating over the head (it forgot something)
        const q = Math.sin(p.t / 400 + p.seed) * s * 0.06;
        if (p.mood !== 'dizzy') shout(ctx, '？', s * 0.35, -s * 1.12 + q, s * 0.32, '#7a5fc0', 0.85);
        if (o.helmet && p.hurt > 0.4) {
            shout(ctx, 'カーン', 0, -s * 1.3, s * 0.3, '#e0a526');
            star(ctx, -s * 0.4, -s * 0.85, s * 0.1);
            star(ctx, s * 0.45, -s * 0.9, s * 0.08);
        }
        if (o.notes && p.mood !== 'dizzy') {
            // The lullaby: notes rise and fade
            for (let k = 0; k < 2; k++) {
                const u = ((p.t / 1400 + k * 0.5 + p.seed) % 1 + 1) % 1;
                shout(ctx, k ? '♫' : '♪', -s * 0.4 - u * s * 0.25 + k * s * 0.2, -s * (0.85 + u * 0.6), s * 0.42, '#d6336c', Math.min(1, (1 - u) * 1.6));
            }
        }
        if (o.wizard && p.mood !== 'dizzy') {
            const k = (p.t + p.seed * 1000) % 10000;
            if (k < 2500) shout(ctx, k < 1200 ? 'ねむれ〜…' : 'ぜんぶ わすれろ〜', 0, -s * 1.6, Math.max(14, s * 0.2), '#3c096c');
        }
        if (o.crown && p.mood !== 'dizzy') {
            // Talking in its sleep now and then
            const k = (p.t + p.seed * 1000) % 9000;
            if (k < 2500) shout(ctx, k < 1200 ? 'むにゃむにゃ…' : 'なんだっけ？', 0, -s * 1.35, Math.max(14, s * 0.2), '#5b3f8c');
        }
        extras(ctx, s, p, -s * 0.85);
        if (o.twin) {
            // The small one, in front at its side, hand in hand
            let small = twinOf.get(o.twin);
            if (!small) twinOf.set(o.twin, (small = sleepy({ cap: o.twin })));
            ctx.save();
            ctx.translate(s * 0.48, 0);
            small(ctx, s * 0.6, { ...p, seed: p.seed + 1.7, color: shade(c, 0.12) });
            ctx.restore();
        }
    };
}

// A pillow (thrown by ぽいぽいわすれ, and the tower of the enemies is made of them)
export function pillow(ctx: Ctx, x: number, y: number, w: number, turn: number, fill = '#fff') {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(turn);
    ctx.beginPath();
    ctx.moveTo(-w / 2, -w * 0.18);
    ctx.quadraticCurveTo(0, -w * 0.32, w / 2, -w * 0.18);
    ctx.quadraticCurveTo(w * 0.58, 0, w / 2, w * 0.18);
    ctx.quadraticCurveTo(0, w * 0.32, -w / 2, w * 0.18);
    ctx.quadraticCurveTo(-w * 0.58, 0, -w / 2, -w * 0.18);
    paint(ctx, fill, w * 1.2);
    line(ctx, [[-w * 0.3, 0], [w * 0.3, 0]], Math.max(1, w * 0.04), 'rgb(120 140 200 / 0.6)');
    ctx.restore();
}

export const ART: Record<UnitId | EnemyId, Draw> = {
    purun, kaeru, neko, pengin, kaba,
    zako: sleepy({ cap: '#6fa8ff' }),
    hard: sleepy({ cap: '#8d99ae', helmet: true }),
    fast: sleepy({ cap: '#ff9f1c', wheels: true }),
    thrower: sleepy({ cap: '#4cc9a0', pillow: true }),
    boss: sleepy({ cap: '#e5383b', crown: true }),
    bell: sleepy({ cap: '#e9c46a', clock: true }),
    fluffy: sleepy({ cap: '#a8dadc', puffs: true }),
    twin: sleepy({ cap: '#b5179e', twin: '#f72585' }),
    singer: sleepy({ cap: '#ff8fab', notes: true }),
    king: sleepy({ cap: '#3c096c', wizard: true })
};
