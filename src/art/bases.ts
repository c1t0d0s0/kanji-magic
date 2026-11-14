// --- The two bases: our きのこハウス and the ねぼすけまくらタワー of the enemies ---
// Drawn with the bottom at (x, ground). `ratio` is the hp left (0..1), `hurt` 0..1 just hit.
import { pillow, shade } from './characters';
import { OUTLINE, blush, eye, line, mouth, oval, paint, shout, sweat, type Ctx } from './parts';

export function drawMushroomHouse(ctx: Ctx, x: number, ground: number, ratio: number, hurt: number, t: number) {
    const S = 100;
    ctx.save();
    ctx.translate(x, ground);
    // The stem, with the door
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.quadraticCurveTo(-50, -60, -36, -112);
    ctx.lineTo(36, -112);
    ctx.quadraticCurveTo(50, -60, 42, 0);
    ctx.closePath();
    paint(ctx, '#f6e7c8', S);
    ctx.beginPath();
    ctx.moveTo(-14, 0);
    ctx.lineTo(-14, -26);
    ctx.arc(0, -26, 14, Math.PI, 0);
    ctx.lineTo(14, 0);
    ctx.closePath();
    paint(ctx, '#a0663a', S);
    oval(ctx, 8, -16, 2.5, 2.5, '#ffd23f', S, false);
    // The face: smiling, then worried, then crying (and a bandage) as it gets hurt
    const worried = ratio < 0.6, crying = ratio < 0.3;
    const eyes = hurt > 0.3 || crying ? 'shut' : 'open';
    eye(ctx, -16, -76, 8, eyes, t, 0, 0.2);
    eye(ctx, 16, -76, 8, eyes, t, 0, 0.2);
    mouth(ctx, 0, -55, 20, hurt > 0.3 ? 'open' : crying ? 'frown' : worried ? 'wavy' : 'smile', t);
    blush(ctx, -28, -62, 7);
    blush(ctx, 28, -62, 7);
    if (crying) {
        // Tears
        const d = (t / 6) % 30;
        for (const side of [-1, 1]) oval(ctx, side * 22, -66 + d, 3, 4.5, '#9fdcff', S * 0.4);
    } else if (worried) sweat(ctx, 38, -95, 7);
    // The cap: it bounces when hit, and leans when it is nearly broken
    const bob = hurt * Math.sin(t / 30) * 0.12;
    ctx.save();
    ctx.translate(0, -108);
    ctx.rotate(crying ? -0.12 : 0);
    ctx.scale(1 + bob, 1 - bob);
    ctx.beginPath();
    ctx.moveTo(-72, 0);
    ctx.bezierCurveTo(-76, -95, 76, -95, 72, 0);
    ctx.quadraticCurveTo(0, 16, -72, 0);
    paint(ctx, '#e5483c', S);
    for (const [dx, dy, r] of [[-45, -25, 12], [0, -55, 14], [45, -25, 12], [-15, -20, 7], [25, -48, 7]] as const) {
        oval(ctx, dx, dy, r, r * 0.85, '#fff', S, false);
    }
    // A round window, lit
    oval(ctx, 22, -18, 9, 9, '#ffe08a', S);
    line(ctx, [[13, -18], [31, -18]], 2);
    line(ctx, [[22, -27], [22, -9]], 2);
    if (crying) {
        // A bandage
        ctx.save();
        ctx.translate(-40, -45);
        ctx.rotate(0.6);
        ctx.beginPath();
        ctx.roundRect(-20, -6, 40, 12, 5);
        paint(ctx, '#f6d7b0', S);
        ctx.rotate(-1.2);
        ctx.beginPath();
        ctx.roundRect(-20, -6, 40, 12, 5);
        paint(ctx, '#f6d7b0', S);
        ctx.restore();
    }
    ctx.restore();
    ctx.restore();
}

export function drawPillowTower(ctx: Ctx, x: number, ground: number, ratio: number, hurt: number, t: number) {
    const S = 100;
    const torn = ratio < 0.5, broken = ratio < 0.25;
    ctx.save();
    ctx.translate(x, ground);
    // Three pillows, swaying sleepily (more when nearly broken)
    const sway = Math.sin(t / 700) * (broken ? 0.09 : 0.03);
    const colors = ['#c8b6ff', '#ffc8dd', '#bde0fe'];
    let y = 0;
    for (let i = 0; i < 3; i++) {
        const w = 130 - i * 12;
        y -= 40;
        pillow(ctx, Math.sin(i * 2 + 1) * 6 + sway * 60 * i, y + 4, w, sway * (i + 1) + (broken ? (i - 1) * 0.08 : 0), colors[i]);
    }
    // The face on the top pillow
    const fy = y + 2;
    const awake = hurt > 0.2;
    eye(ctx, -18 + sway * 120, fy - 2, 8, awake ? 'wide' : 'closed', t, 0.3);
    eye(ctx, 18 + sway * 120, fy - 2, 8, awake ? 'wide' : 'closed', t, 0.3);
    mouth(ctx, sway * 120, fy + 12, 18, awake ? 'open' : 'o', t);
    blush(ctx, -32 + sway * 120, fy + 6, 6);
    blush(ctx, 32 + sway * 120, fy + 6, 6);
    // A big nightcap
    const tip = Math.sin(t / 400) * 6;
    ctx.save();
    ctx.translate(sway * 150, fy - 22);
    ctx.beginPath();
    ctx.moveTo(-42, 0);
    ctx.quadraticCurveTo(-5, -75, 55 + tip, -50);
    ctx.quadraticCurveTo(5, -40, 42, 0);
    ctx.closePath();
    paint(ctx, '#5b3f8c', S);
    for (const [dx, dy] of [[-15, -25], [10, -35], [-25, -8], [20, -12]] as const) oval(ctx, dx, dy, 4, 4, '#ffd23f', S, false);
    ctx.beginPath();
    ctx.roundRect(-46, -6, 92, 12, 6);
    paint(ctx, '#fff', S);
    oval(ctx, 55 + tip, -50, 9, 9, '#fff', S);
    ctx.restore();
    if (awake) shout(ctx, 'はっ！', 50, fy - 40, 22, '#e5383b');
    else {
        // Zzz rising
        for (let k = 0; k < 3; k++) {
            const a = ((t / 1400 + k / 3) % 1);
            shout(ctx, 'Z', 40 + a * 30 + k * 4, fy - 30 - a * 60, 14 + k * 4, '#5b3f8c', 1 - a);
        }
    }
    if (torn) {
        // Feathers come out
        for (let k = 0; k < (broken ? 7 : 3); k++) {
            const a = (t / 2500 + k * 0.37) % 1;
            const fx = -50 + ((k * 53) % 100) + Math.sin(a * 9 + k) * 12, fyy = -40 - a * 140;
            ctx.save();
            ctx.globalAlpha = 1 - a;
            ctx.translate(fx, fyy);
            ctx.rotate(Math.sin(a * 6 + k));
            oval(ctx, 0, 0, 7, 3, '#fff', 30);
            line(ctx, [[-6, 0], [6, 0]], 1, shade('#8888aa', 0));
            ctx.restore();
        }
        // A seam come open
        line(ctx, [[-30, -55], [-22, -48], [-30, -42], [-22, -36]], 2.5, OUTLINE);
    }
    ctx.restore();
}
