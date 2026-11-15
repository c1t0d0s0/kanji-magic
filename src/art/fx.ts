// --- Effects of the fighters: flying away when beaten, things thrown, the ground shaking ---
import type { FxWho } from '../game/battle';
import { ART, fluff, pillow } from './characters';
import { line, shout, star, type Ctx } from './parts';
import { restPose } from './pose';

// Draws a character where (x, y) is its feet, facing the way of its side
export function drawWho(ctx: Ctx, who: FxWho, x: number, y: number, pose = restPose(who.form, who.color)) {
    ctx.save();
    ctx.translate(x, y);
    // Our side walks to the left
    if (who.side === 'ally') ctx.scale(-1, 1);
    ART[who.kind](ctx, who.size * 1.3, pose);
    ctx.restore();
}

// Beaten: it flies away spinning, back to its own side, with a shout (t: 0..1)
export function drawFly(ctx: Ctx, who: FxWho, x: number, ground: number, t: number, ms: number) {
    const dir = who.side === 'ally' ? 1 : -1;
    const px = x + dir * t * 240, py = ground - (520 * t - 230 * t * t);
    ctx.save();
    ctx.translate(px, py - who.size / 2);
    ctx.rotate(dir * t * Math.PI * 4);
    const k = 1 - 0.55 * t;
    ctx.scale(k, k);
    if (t < 0.9) {
        ctx.globalAlpha = t > 0.75 ? (0.9 - t) / 0.15 : 1;
        drawWho(ctx, who, 0, who.size / 2, { ...restPose(who.form, who.color, ms + who.size * 37, 'dizzy') });
    }
    ctx.restore();
    // A twinkle where it went
    if (t > 0.82) star(ctx, px, py - who.size / 2, 10 * Math.sin(((t - 0.82) / 0.18) * Math.PI), '#fff', t * 6);
    // The shout stays near where it fell
    if (t < 0.7) {
        const text = who.side === 'enemy' ? 'おもいだした！' : 'きゅう〜';
        shout(ctx, text, x, ground - who.size - 30 - t * 40, who.size > 60 ? 24 : 17, who.side === 'enemy' ? '#7a5fc0' : '#3a7fc0', 1 - t / 0.7);
    }
}

// Something thrown on an arc, from x to `to`
export function drawShot(ctx: Ctx, who: FxWho, x: number, to: number, ground: number, t: number, ms: number) {
    const px = x + (to - x) * t;
    const py = ground - who.size * 0.6 - Math.sin(Math.PI * t) * 90;
    if (who.kind === 'neko') fluff(ctx, px, py, 8, who.color, ms);
    // こもりうた: a note; まおう: a dark dream cloud
    else if (who.kind === 'singer') shout(ctx, '♪', px, py, 26, '#e0569b');
    else if (who.kind === 'king') fluff(ctx, px, py, 20, '#7b2cbf', ms);
    else pillow(ctx, px, py, 26, ms / 60);
}

// The stamp of the hippo: rings on the ground, and dust
export function drawStomp(ctx: Ctx, x: number, ground: number, t: number, sound = 'ドスン') {
    const fade = 1 - t;
    ctx.save();
    ctx.strokeStyle = `rgb(120 90 60 / ${fade})`;
    for (let k = 0; k < 2; k++) {
        ctx.lineWidth = 4 - k;
        ctx.beginPath();
        ctx.ellipse(x, ground, 20 + (60 + k * 30) * t, 6 + 10 * t, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    for (let k = 0; k < 5; k++) {
        const a = Math.PI + (k / 4) * Math.PI;
        ctx.fillStyle = `rgb(200 180 150 / ${fade * 0.8})`;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 50 * t, ground - 4 + Math.sin(a) * 25 * t, 6 + 4 * t, 0, Math.PI * 2);
        ctx.fill();
    }
    if (t < 0.6) {
        line(ctx, [[x - 30, ground - 30], [x - 40, ground - 45]], 3, `rgb(80 60 40 / ${fade})`);
        line(ctx, [[x + 30, ground - 30], [x + 40, ground - 45]], 3, `rgb(80 60 40 / ${fade})`);
        shout(ctx, sound, x, ground - 80, 18, '#7b2d8b', fade);
    }
    ctx.restore();
}
