// --- Drawing the battle on a canvas (2D) ---
// The field is 1000 wide (LANE) and FIELD_HEIGHT high, scaled to the canvas. The characters and the
// bases are drawn by src/art; here they are put in their places, with the spells over them.
import { drawMushroomHouse, drawPillowTower } from '../art/bases';
import { ART } from '../art/characters';
import { drawFly, drawShot, drawStomp } from '../art/fx';
import { drawMark } from '../art/marks';
import { shout, star } from '../art/parts';
import type { Pose } from '../art/pose';
import { LANE } from '../config';
import type { Base, Battle, Fighter, Fx } from './battle';

export const FIELD_HEIGHT = 400;
const GROUND = 330;
// The pictures are drawn a little bigger than the bodies of the battle (they may overlap a bit)
const DRAW_SCALE = 1.3;
const UI = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, part: number, color: string) {
    ctx.fillStyle = 'rgb(0 0 0 / 0.35)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w, 7, 3.5);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w * Math.max(0, Math.min(1, part)), 7, 3.5);
    ctx.fill();
}

function drawBase(ctx: CanvasRenderingContext2D, base: Base, x: number, ally: boolean, time: number) {
    const ratio = base.hp / base.max;
    const hurt = base.hurtMs / 200;
    const shake = base.hurtMs > 0 ? Math.sin(base.hurtMs) * 3 : 0;
    if (ally) drawMushroomHouse(ctx, x + shake, GROUND, ratio, hurt, time);
    else drawPillowTower(ctx, x + shake, GROUND, ratio, hurt, time);
    const top = GROUND - (ally ? 205 : 225);
    bar(ctx, x, top, 120, ratio, ratio > 0.3 ? '#4cc26b' : '#e5533d');
    ctx.font = `bold 18px ${UI}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#fff';
    ctx.strokeText(`${Math.ceil(base.hp)}`, x, top - 13);
    ctx.fillStyle = '#1c2a4a';
    ctx.fillText(`${Math.ceil(base.hp)}`, x, top - 13);
}

// What the fighter is doing now, for its picture
export function poseOf(f: Fighter, time: number): Pose {
    const since = f.attackMs - f.wait;
    const stopped = f.stopMs > 0;
    return {
        t: stopped ? 0 : time,
        walk: !f.fighting && !stopped ? 1 : 0,
        windup: f.fighting && !stopped && f.wait < 250 ? 1 - f.wait / 250 : 0,
        attack: f.fighting && !stopped && since < 300 && since >= 0 ? 1 - since / 300 : 0,
        hurt: f.hurtMs / 200,
        stopped,
        form: f.form,
        color: f.color,
        seed: f.id * 1.7
    };
}

function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter, time: number, boosted: boolean) {
    const size = f.size * DRAW_SCALE;
    const r = size / 2;
    ctx.fillStyle = 'rgb(0 0 0 / 0.16)';
    ctx.beginPath();
    ctx.ellipse(f.x, GROUND, r * 1.05, r * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(f.x, GROUND);
    // Pictures face right: ours walk to the left
    if (f.side === 'ally') ctx.scale(-1, 1);
    ART[f.kind](ctx, size, poseOf(f, time));
    ctx.restore();
    const y = GROUND - r;
    if (f.shield > 0) {
        ctx.strokeStyle = 'rgb(120 190 255 / 0.9)';
        ctx.fillStyle = 'rgb(150 210 255 / 0.18)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(f.x, y, r + 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    if (f.stopMs > 0) {
        // Bound by vines, with leaves
        ctx.strokeStyle = '#3f9b3a';
        ctx.lineWidth = 3;
        for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.ellipse(f.x, y - r / 2 + k * r * 0.6, r + 3, 5, 0.2, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fillStyle = '#5fbf4a';
        for (let k = 0; k < 3; k++) {
            ctx.beginPath();
            ctx.ellipse(f.x - r + k * r, y - r * 0.2 + k * 6, 5, 3, 0.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    if (boosted && f.side === 'ally') star(ctx, f.x - r * 0.8, GROUND - size - 6 + Math.sin(time / 120 + f.id) * 3, 6, '#ffd84a', time / 300);
    // The element, over the head
    if (f.element) drawMark(ctx, f.element, f.x + (f.side === 'ally' ? r * 0.55 : -r * 0.55), GROUND - size * 1.05, f.boss ? 22 : 15);
    if (f.hp < f.maxHp) bar(ctx, f.x, GROUND - size * 1.15 - 18, Math.max(30, f.size), f.hp / f.maxHp, f.side === 'ally' ? '#4c9be0' : '#e5533d');
}

// The sky, the hills and the grass do not move: drawn once for each scale
let backdrop: { scale: number; canvas: HTMLCanvasElement } | null = null;

function paintBackdrop(ctx: CanvasRenderingContext2D, w: number) {
    const sky = ctx.createLinearGradient(0, 0, 0, GROUND);
    sky.addColorStop(0, '#9fd3f7');
    sky.addColorStop(1, '#eaf7ff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, GROUND);
    // Far hills, and nearer ones
    for (const [color, base, hill] of [['#bfe3b0', 250, 70], ['#a5d68c', 285, 45]] as const) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(0, GROUND);
        for (let x = 0; x <= w; x += 20) ctx.lineTo(x, base - Math.abs(Math.sin(x / (hill * 2.3) + hill)) * hill);
        ctx.lineTo(w, GROUND);
        ctx.fill();
    }
    ctx.fillStyle = '#8cc56b';
    ctx.fillRect(0, GROUND, w, FIELD_HEIGHT - GROUND);
    ctx.fillStyle = '#76ad58';
    ctx.fillRect(0, GROUND, w, 6);
    // Tufts of grass and little flowers
    for (let x = 15; x < w; x += 47) {
        const y = GROUND + 18 + ((x * 7) % 40);
        ctx.strokeStyle = '#5f9a45';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x - 5, y); ctx.lineTo(x - 7, y - 8);
        ctx.moveTo(x, y); ctx.lineTo(x, y - 10);
        ctx.moveTo(x + 5, y); ctx.lineTo(x + 7, y - 8);
        ctx.stroke();
        if (x % 3 === 0) {
            ctx.fillStyle = x % 2 ? '#fff6a8' : '#ffc8dd';
            ctx.beginPath();
            ctx.arc(x + 12, y - 4, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawBackdrop(ctx: CanvasRenderingContext2D, w: number, scale: number) {
    if (typeof document === 'undefined') return paintBackdrop(ctx, w);
    if (!backdrop || backdrop.scale !== scale) {
        const c = document.createElement('canvas');
        c.width = Math.ceil(w * scale);
        c.height = Math.ceil(FIELD_HEIGHT * scale);
        const g = c.getContext('2d');
        if (!g) return paintBackdrop(ctx, w);
        g.setTransform(scale, 0, 0, scale, 0, 0);
        paintBackdrop(g, w);
        backdrop = { scale, canvas: c };
    }
    ctx.drawImage(backdrop.canvas, 0, 0, w, FIELD_HEIGHT);
}

// Clouds drift slowly
function drawClouds(ctx: CanvasRenderingContext2D, w: number, time: number) {
    ctx.fillStyle = 'rgb(255 255 255 / 0.9)';
    for (let k = 0; k < 4; k++) {
        const x = ((k * 290 + time / (90 + k * 30)) % (w + 200)) - 100, y = 45 + (k % 2) * 50;
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.arc(x + 25, y - 10, 26, 0, Math.PI * 2);
        ctx.arc(x + 52, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

const ease = (t: number) => 1 - (1 - t) * (1 - t);

function drawFx(ctx: CanvasRenderingContext2D, fx: Fx, width: number) {
    const t = Math.min(1, fx.ms / fx.total);
    const fade = 1 - t;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    switch (fx.kind) {
        case 'fly':
            if (t < 0.25) {
                ctx.strokeStyle = `rgb(255 255 255 / ${1 - t * 4})`;
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(fx.x, GROUND - 25, 10 + 120 * t, 0, Math.PI * 2);
                ctx.stroke();
            }
            if (fx.who) drawFly(ctx, fx.who, fx.x, GROUND, t, fx.ms);
            break;
        case 'shot':
            if (fx.who && fx.to !== undefined) drawShot(ctx, fx.who, fx.x, fx.to, GROUND, t, fx.ms);
            break;
        case 'stomp':
            drawStomp(ctx, fx.x, GROUND, t);
            break;
        case 'spark':
            // A hit on the element it beats: stars burst out
            for (let k = 0; k < 4; k++) {
                const a = (k * Math.PI) / 2 + t * 2;
                star(ctx, fx.x + Math.cos(a) * 14 * (0.5 + t), GROUND - (fx.who?.size ?? 30) * 0.7 + Math.sin(a) * 14 * (0.5 + t), 6 * fade, '#ffe14a', a);
            }
            break;
        case 'good':
            shout(ctx, 'よく きいた！', width / 2, 150 - t * 20, 40, '#e8590c', fade * 1.5);
            break;
        case 'weak':
            shout(ctx, 'いまいち…', width / 2, 150 - t * 10, 32, '#6c757d', fade * 1.5);
            break;
        case 'change':
            if (fx.who?.element) {
                shout(ctx, 'ぞくせい チェンジ！', fx.x, GROUND - (fx.who.size * 1.3) - 70 - t * 20, 22, '#7a2c4d', fade * 1.5);
                drawMark(ctx, fx.who.element, fx.x, GROUND - fx.who.size * 1.3 - 40 - t * 20, 30 * (1 + 0.3 * Math.sin(t * Math.PI)));
            }
            break;
        case 'fire':
            // Pillars of fire over the field
            for (let k = 0; k < 9; k++) {
                const x = LANE.enemyBase + 60 + k * 90;
                const h = 260 * Math.sin(Math.PI * t) * (0.7 + 0.3 * Math.sin(k * 7 + fx.ms / 60));
                const g = ctx.createLinearGradient(x, GROUND, x, GROUND - h);
                g.addColorStop(0, `rgb(255 80 20 / ${fade})`);
                g.addColorStop(1, 'rgb(255 220 80 / 0)');
                ctx.fillStyle = g;
                ctx.fillRect(x - 28, GROUND - h, 56, h);
            }
            break;
        case 'water': {
            // A wave from our side to theirs
            const x = LANE.allyBase - ease(t) * (LANE.allyBase - LANE.enemyBase);
            ctx.fillStyle = `rgb(60 150 255 / ${0.6 * fade + 0.2})`;
            ctx.beginPath();
            ctx.moveTo(x + 220, GROUND);
            ctx.quadraticCurveTo(x + 60, GROUND - 230, x - 30, GROUND - 120);
            ctx.quadraticCurveTo(x - 60, GROUND - 60, x - 10, GROUND);
            ctx.fill();
            break;
        }
        case 'wood':
            ctx.strokeStyle = `rgb(60 160 60 / ${fade})`;
            ctx.lineWidth = 5;
            for (let k = 0; k < 3; k++) {
                ctx.beginPath();
                for (let x = LANE.enemyBase; x < LANE.allyBase; x += 20) ctx.lineTo(x, GROUND - 8 - k * 14 - Math.sin(x / 30 + k) * 8);
                ctx.stroke();
            }
            break;
        case 'metal':
            ctx.fillStyle = `rgb(150 200 255 / ${0.35 * fade})`;
            ctx.strokeStyle = `rgb(120 170 230 / ${fade})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.ellipse(LANE.allyBase - 150, GROUND, 420, 250, 0, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
            break;
        case 'word': {
            // Cheering words fly up
            const words = ['がんばれ！', 'いけー！', 'ファイト！', 'できる！'];
            ctx.font = `bold 34px ${UI}`;
            ctx.fillStyle = `rgb(255 120 40 / ${fade})`;
            words.forEach((w, k) => ctx.fillText(w, 300 + k * 180, GROUND - 60 - t * 180 - (k % 2) * 40));
            break;
        }
        case 'wonder':
            ctx.strokeStyle = `rgb(170 110 255 / ${fade})`;
            ctx.lineWidth = 8;
            for (let k = 0; k < 3; k++) {
                ctx.beginPath();
                ctx.arc(fx.x - 150, GROUND - 120, (60 + k * 50) * (0.3 + ease(t)), 0, Math.PI * 2);
                ctx.stroke();
            }
            break;
        case 'perfect':
            ctx.font = `bold 64px ${UI}`;
            ctx.lineWidth = 8;
            ctx.strokeStyle = `rgb(120 60 0 / ${fade})`;
            ctx.fillStyle = `rgb(255 210 70 / ${fade})`;
            ctx.strokeText('かんぺき！', width / 2, 80 - t * 20);
            ctx.fillText('かんぺき！', width / 2, 80 - t * 20);
            break;
        case 'fizzle':
            ctx.font = `bold 40px ${UI}`;
            ctx.fillStyle = `rgb(110 110 120 / ${fade})`;
            ctx.fillText('ぷすん…', fx.x, GROUND - 160 - t * 30);
            break;
    }
    ctx.restore();
}

// Draws the whole field; the canvas is `scale` device pixels per unit of the field
export function drawBattle(ctx: CanvasRenderingContext2D, b: Battle, scale: number) {
    const w = LANE.width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawBackdrop(ctx, w, scale);
    // The clouds move with the clock, not the battle (they go on while the magic circle is open)
    drawClouds(ctx, w, typeof performance !== 'undefined' ? performance.now() : b.time);
    drawBase(ctx, b.enemyBase, LANE.enemyBase, false, b.time);
    drawBase(ctx, b.allyBase, LANE.allyBase, true, b.time);
    // Bigger ones behind
    const order = [...b.fighters].sort((p, q) => q.size - p.size);
    const boosted = b.boostMs > 0;
    for (const f of order) drawFighter(ctx, f, b.time, boosted);
    for (const fx of b.fx) drawFx(ctx, fx, w);
}
