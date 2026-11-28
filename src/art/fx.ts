// --- Effects of the fighters: slapstick cartoon KOs, projectiles (ground & air), ground stomps ---
import type { FxWho } from '../game/battle';
import { ART, acorn, fireDonut, fluff, onigiri, paperPlane, pillow, waterOrb } from './characters';
import { burst, line, oval, paint, shout, star, sweat, tiltShout, type Ctx } from './parts';
import { restPose, type Mood } from './pose';

// Altitude of flying fighters above the ground line
export const FLY_HEIGHT = 86;

const ENEMY_COMMON_SHOUTS = [
    'おもいだした！',
    'あ！ しゅくだい！',
    'めが さめたー！',
    'もう ねむくない！',
    'ぎゃぼー！',
    'わすれもの とりにいく〜！'
] as const;

const ENEMY_SPECIAL_SHOUTS: Partial<Record<FxWho['kind'], readonly string[]>> = {
    fluffy: ['ふとんが ふっとんだ！', 'おもいだした！'],
    hard: ['なべが とんだー！', 'おもいだした！'],
    bell: ['ねぼうだー！', 'とまったー！'],
    singer: ['のどが いたーい！', 'おんち〜！'],
    kasa: ['かさが ひっくりかえったー！', 'かぜが つよいー！'],
    bento: ['おにぎり おとしたー！', 'おなか すいたー！'],
    yawn: ['ふぁ〜…あ！', 'めが さめたー！'],
    fuusen: ['ふうせん われたー！', 'おちるー！'],
    spring: ['びよよよーん！', 'とびすぎたー！'],
    ufo: ['ついらくするー！', 'おさらが とんだー！'],
    boss: ['ぜんぶ おもいだしたー！！', 'おぼえてろよ〜！'],
    king: ['おぼえてろよ〜！', 'ぜんぶ おもいだしたー！！']
};

const ALLY_SHOUTS = [
    'きゅう〜',
    'あわわわ〜！',
    'めが まわる〜',
    'どてっ！',
    'また くるよ〜！',
    'びよーん！'
] as const;

const CONFETTI = ['#ff4d6d', '#ffd23f', '#4cc9f0', '#52b788', '#b5179e', '#ff9f1c'] as const;

export function koShout(who: FxWho, seed: number): string {
    const s = Math.abs(Math.floor(seed));
    if (who.side === 'ally') return ALLY_SHOUTS[s % ALLY_SHOUTS.length];
    const spec = ENEMY_SPECIAL_SHOUTS[who.kind];
    if (spec && s % 2 === 1) return spec[Math.floor(s / 2) % spec.length];
    return ENEMY_COMMON_SHOUTS[s % ENEMY_COMMON_SHOUTS.length];
}

// Draws a character where (x, y) is its feet, facing the way of its side
export function drawWho(ctx: Ctx, who: FxWho, x: number, y: number, pose = restPose(who.form, who.color)) {
    ctx.save();
    ctx.translate(x, y);
    // Our side walks to the left
    if (who.side === 'ally') ctx.scale(-1, 1);
    ART[who.kind](ctx, who.size * 1.3, pose);
    ctx.restore();
}

// Detached cartoon prop flying off when an enemy is knocked out (inverted umbrella, popped balloon, UFO saucer, pot, nightcap)
function drawDetachedProp(ctx: Ctx, who: FxWho, x: number, startY: number, dir: number, t: number) {
    if (who.side !== 'enemy' || t > 0.85) return;
    const fade = Math.min(1, (0.85 - t) / 0.25);
    const px = x - dir * t * 110;
    const py = startY - who.size - (240 * t - 280 * t * t);
    ctx.save();
    ctx.globalAlpha *= fade;
    if (who.kind === 'kasa') {
        // Umbrella flips inside-out spinning away!
        ctx.translate(px, py);
        ctx.rotate(-dir * t * 11);
        line(ctx, [[0, 0], [0, 22]], 2.5);
        ctx.beginPath();
        ctx.ellipse(0, -4, 22, 11, 0, 0, Math.PI);
        ctx.closePath();
        paint(ctx, '#4cc9f0', 22);
    } else if (who.kind === 'fuusen') {
        // Balloons pop in a crisp starburst at the start!
        if (t < 0.35) {
            const p = t / 0.35;
            burst(ctx, x, startY - who.size * 1.3, 14 + p * 34, 9, '#ffd23f', '#ff4d6d', p * 2);
            tiltShout(ctx, 'パンッ！', x + 16, startY - who.size * 1.5 - p * 18, 20, '#ff4d6d', 1 - p, 0.2);
        }
    } else if (who.kind === 'ufo') {
        // Saucer flies off in the opposite direction!
        ctx.translate(px, py);
        ctx.rotate(-dir * t * 14);
        ctx.beginPath();
        ctx.ellipse(0, 0, 26, 9, 0, 0, Math.PI * 2);
        paint(ctx, '#7b2cbf', 24);
        oval(ctx, -10, 0, 3, 3, '#ffd23f', 10, false);
        oval(ctx, 10, 0, 3, 3, '#72efdd', 10, false);
    } else if (who.kind === 'hard') {
        // Metal pot flies straight up spinning!
        ctx.translate(x + dir * t * 30, startY - who.size - (320 * t - 260 * t * t));
        ctx.rotate(dir * t * 14);
        ctx.beginPath();
        ctx.ellipse(0, 0, 18, 11, 0, Math.PI, 0);
        ctx.closePath();
        paint(ctx, '#8d99ae', 20);
    } else {
        // Nightcap & ？ pop off!
        ctx.translate(px, py);
        ctx.rotate(-dir * t * 9);
        ctx.beginPath();
        ctx.moveTo(-12, 4);
        ctx.quadraticCurveTo(0, -16, 12, 4);
        ctx.closePath();
        paint(ctx, '#6fa8ff', 16);
        oval(ctx, 0, -10, 4, 4, '#fff', 12);
    }
    ctx.restore();
}

// Beaten: 5 slapstick cartoon KO animations with starbursts, confetti, detached props, and funny shouts (t: 0..1)
export function drawFly(ctx: Ctx, who: FxWho, x: number, ground: number, t: number, ms: number, seed = 0, big = false) {
    const dir = who.side === 'ally' ? 1 : -1;
    const s = Math.abs(Math.floor(seed));
    const startY = who.flying ? ground - FLY_HEIGHT : ground;
    // Style 0: Home-run ☆ Kirān, 1: Bouncy ground tumble, 2: Tornado spin, 3: Screen-splat slide, 4: Rocket up & leaf fall
    const style = big && s % 2 === 0 ? 3 : s % 5;

    // 1. Instant comic impact burst, speed lines, stars, sweat drops & confetti
    if (t < 0.35) {
        const p = t / 0.35;
        const fade = 1 - p;
        const cy = startY - who.size * 0.65;
        ctx.save();
        ctx.globalAlpha *= fade;
        const br = (big ? 58 : 34) * (0.4 + p * 0.9);
        burst(ctx, x, cy, br, big ? 14 : 10, '#fff3b0', big ? '#ff4d6d' : '#f76707', p * 1.4);
        const pieces = big ? 10 : 6;
        for (let k = 0; k < pieces; k++) {
            const a = (k / pieces) * Math.PI * 2 + s * 0.7;
            const d = (18 + p * (big ? 95 : 58));
            const cx = x + Math.cos(a) * d, ccy = cy + Math.sin(a) * d;
            if (k % 3 === 0) star(ctx, cx, ccy, (big ? 9 : 6) * fade, CONFETTI[k % CONFETTI.length], a + p * 4);
            else if (k % 3 === 1) sweat(ctx, cx, ccy, 4.5 * fade);
            else {
                ctx.save();
                ctx.translate(cx, ccy);
                ctx.rotate(a + p * 6);
                ctx.fillStyle = CONFETTI[k % CONFETTI.length];
                ctx.fillRect(-4, -3, 8, 6);
                ctx.restore();
            }
        }
        ctx.restore();
    }

    // 2. Compute slapstick position, rotation, squash-and-stretch, and alpha
    let px = x, py = startY, rot = 0, sx = 1, sy = 1, alpha = 1;
    if (style === 0) {
        // Home-run ☆ Kirān into the distant sky
        px = x + dir * t * (big ? 380 : 300);
        py = startY - (660 * t - 160 * t * t);
        rot = dir * t * Math.PI * 10;
        const k = Math.max(0.08, 1 - 0.85 * t);
        sx = k * (t < 0.12 ? 1.35 : 1);
        sy = k * (t < 0.12 ? 0.7 : 1);
        alpha = t > 0.78 ? Math.max(0, (0.9 - t) / 0.12) : 1;
        // Giant comic twinkle star at the vanishing point!
        if (t > 0.76) {
            const p = Math.min(1, (t - 0.76) / 0.24);
            const glint = Math.sin(p * Math.PI) * (big ? 28 : 18);
            star(ctx, px, py - who.size * 0.4, glint, '#fff', p * 3);
            star(ctx, px, py - who.size * 0.4, glint * 0.55, '#ffd23f', -p * 3);
            if (p < 0.85) tiltShout(ctx, 'キラーン！', px, py - who.size * 0.4 - 22, big ? 20 : 15, '#e8590c', 1 - p, -0.15);
        }
    } else if (style === 1) {
        // Bouncy ground tumble (3 comical squashing bounces with dust puffs!)
        px = x + dir * t * (big ? 300 : 250);
        const phase = t * 3;
        const bIdx = Math.min(2, Math.floor(phase));
        const u = phase - bIdx;
        const amp = (bIdx === 0 ? (who.flying ? 150 : 115) : bIdx === 1 ? 75 : 38);
        const lift = Math.sin(Math.PI * u) * amp + (bIdx === 0 && who.flying ? FLY_HEIGHT * (1 - u) : 0);
        py = ground - lift;
        rot = dir * t * Math.PI * 6;
        // Squash flat right on bounce impact
        const flat = u < 0.16 && bIdx > 0 ? 1 - u / 0.16 : 0;
        sx = 1 + flat * 0.65;
        sy = 1 - flat * 0.52;
        alpha = t > 0.78 ? Math.max(0, (1 - t) / 0.22) : 1;
        if (flat > 0.1) {
            ctx.save();
            ctx.fillStyle = `rgb(210 195 170 / ${flat * 0.75})`;
            ctx.beginPath();
            ctx.ellipse(px, ground - 2, 22 * (1.3 - flat * 0.3), 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    } else if (style === 2) {
        // Tornado spinning top! Vibrates briefly, then corkscrews away flipping 3D-style
        if (t < 0.14) {
            px = x + Math.sin(t * 240) * 9;
            py = startY - t * 60;
            sx = 1.25;
            sy = 0.82;
        } else {
            const u = (t - 0.14) / 0.86;
            px = x + dir * u * 270 + Math.sin(u * Math.PI * 5) * 18;
            py = startY - 12 - (440 * u - 160 * u * u);
            rot = Math.sin(u * 20) * 0.35;
            const flip = Math.cos(u * Math.PI * 14);
            sx = (Math.abs(flip) < 0.18 ? 0.18 : Math.abs(flip)) * (flip < 0 ? -1 : 1) * (1 - 0.4 * u);
            sy = (1 + 0.15 * Math.sin(u * 25)) * (1 - 0.4 * u);
            alpha = u > 0.75 ? Math.max(0, (1 - u) / 0.25) : 1;
            // Whirlwind rings underneath
            ctx.save();
            ctx.strokeStyle = `rgb(255 255 255 / ${0.7 * alpha})`;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.ellipse(px, py - who.size * 0.3, 24 * (1 - 0.3 * u), 7, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    } else if (style === 3) {
        // Screen-splat slide! Zooms HUGE toward the camera, splats flat, then slides down the glass!
        if (t < 0.32) {
            const u = t / 0.32;
            const e = 1 - (1 - u) * (1 - u);
            px = x + dir * e * 35;
            py = startY - e * (who.flying ? 15 : 85);
            rot = dir * e * Math.PI * 2;
            const grow = 1 + e * (big ? 1.15 : 1.35);
            sx = grow;
            sy = grow;
        } else {
            const u = (t - 0.32) / 0.68;
            px = x + dir * 35 + Math.sin(u * 18) * (u < 0.2 ? 5 : 1.5);
            py = startY - (who.flying ? 15 : 85) + u * u * 210;
            const baseGrow = big ? 2.15 : 2.35;
            const splat = u < 0.18 ? 1 - u / 0.18 : 0;
            sx = baseGrow * (1.2 + splat * 0.3);
            sy = baseGrow * (0.82 - splat * 0.2);
            alpha = u > 0.68 ? Math.max(0, (1 - u) / 0.32) : 1;
            if (u < 0.45) {
                tiltShout(ctx, 'ベチャッ！', px + dir * 24, py - who.size * 0.9, big ? 30 : 24, '#e03131', 1 - u / 0.45, -0.2);
            }
        }
    } else {
        // Rocket straight UP, then flutter down like a leaf!
        if (t < 0.4) {
            const u = t / 0.4;
            const e = 1 - (1 - u) * (1 - u);
            px = x + Math.sin(u * 40) * 4;
            py = startY - e * 245;
            sx = 0.68;
            sy = 1.48;
            // Rocket puff trail
            ctx.save();
            ctx.fillStyle = `rgb(255 255 255 / ${0.75 * (1 - u)})`;
            ctx.beginPath();
            ctx.arc(px, py + 14, 10 + u * 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        } else {
            const u = (t - 0.4) / 0.6;
            px = x + dir * u * 70 + Math.sin(u * Math.PI * 4) * 34;
            py = startY - 245 + u * 210;
            rot = Math.cos(u * Math.PI * 4) * 0.55;
            alpha = u > 0.72 ? Math.max(0, (1 - u) / 0.28) : 1;
        }
    }

    // 3. Draw the flying character with comical shock -> ko/dizzy face transition!
    if (alpha > 0.01) {
        const mood: Mood = t < 0.28 ? 'shock' : s % 2 === 0 ? 'ko' : 'dizzy';
        ctx.save();
        ctx.globalAlpha *= alpha;
        ctx.translate(px, py - who.size / 2);
        ctx.rotate(rot);
        ctx.scale(sx, sy);
        drawWho(ctx, who, 0, who.size / 2, restPose(who.form, who.color, ms + s * 97, mood));
        ctx.restore();
    }

    // 4. Detached enemy prop (umbrella, balloon pop, UFO saucer, pot, nightcap)
    drawDetachedProp(ctx, who, x, startY, dir, t);

    // 5. Tilted manga onomatopoeia + hilarious character shout!
    if (t < 0.36 && style !== 3) {
        const onoma = big ? 'ドッカーン！' : style === 1 ? 'ボヨン！' : style === 4 ? 'ビューン！' : 'ドカーン！';
        tiltShout(ctx, onoma, x - dir * 18, startY - who.size - 16 - t * 30, big ? 28 : 20, '#e8590c', 1 - t / 0.36, dir * -0.18);
    }
    if (t < 0.78) {
        const text = koShout(who, s);
        const pop = 1 + 0.3 * Math.max(0, 1 - t * 7);
        const size = (who.size > 60 || big ? 24 : 18) * pop;
        const fill = who.side === 'enemy' ? '#7a5fc0' : '#1971c2';
        shout(ctx, text, x, startY - who.size - 44 - t * 44, size, fill, Math.min(1, (0.78 - t) / 0.3));
    }
}

// Something thrown on an arc, from x (at attacker height) to `to` (at target height)
export function drawShot(ctx: Ctx, who: FxWho, x: number, to: number, ground: number, t: number, ms: number, toFlying = false) {
    const px = x + (to - x) * t;
    const y0 = (who.flying ? ground - FLY_HEIGHT : ground) - who.size * 0.6;
    const y1 = (toFlying ? ground - FLY_HEIGHT : ground) - 24;
    const arc = who.flying && !toFlying ? 32 : 85;
    const py = y0 + (y1 - y0) * t - Math.sin(Math.PI * t) * arc;
    if (who.kind === 'neko') fluff(ctx, px, py, 8, who.color, ms);
    else if (who.kind === 'zou') waterOrb(ctx, px, py, 9, ms);
    else if (who.kind === 'fukurou') acorn(ctx, px, py, 9, ms / 55);
    else if (who.kind === 'buta') fireDonut(ctx, px, py, 13, ms);
    else if (who.kind === 'bento') onigiri(ctx, px, py, 10, ms / 60);
    else if (who.kind === 'fuusen') paperPlane(ctx, px, py, 12, who.side === 'enemy' ? 0.25 : Math.PI - 0.25);
    else if (who.kind === 'ufo') {
        oval(ctx, px, py, 14, 7, '#72efdd', 18);
        oval(ctx, px, py, 7, 3.5, '#fff', 10, false);
    }
    // こもりうた: a note; まおう: a dark dream cloud
    else if (who.kind === 'singer') shout(ctx, '♪', px, py, 26, '#e0569b');
    else if (who.kind === 'king') fluff(ctx, px, py, 20, '#7b2cbf', ms);
    else pillow(ctx, px, py, 26, ms / 60);
}

// The stamp of the hippo, taiko drum, sky bomb, alarm clock ring, UFO beam, or dream cloud
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
