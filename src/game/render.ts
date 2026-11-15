// --- Drawing the battle on a canvas (2D) ---
// The field is 1000 wide (LANE) and FIELD_HEIGHT high, scaled to the canvas. The characters and the
// bases are drawn by src/art; here they are put in their places, with the spells over them.
// On a narrow screen (a phone held upright) the whole field is small: the characters, their
// element marks and what is shown over them are drawn bigger (lookFor), on a ring of the colour of
// their element. Only the pictures: the battle is the same.
import { drawMushroomHouse, drawPillowTower } from '../art/bases';
import { ART } from '../art/characters';
import { drawFly, drawShot, drawStomp } from '../art/fx';
import { drawMark, MARK_PATHS } from '../art/marks';
import { shout, star } from '../art/parts';
import type { Pose } from '../art/pose';
import { ENEMY_MAGIC, LANE } from '../config';
import { drawSkyLife, drawWeather, paintScene } from '../art/scenery';
import { sceneOf, type Scene } from './scenes';
import { enemyMagicSoon, type Base, type Battle, type Fighter, type Fx, type FxWho } from './battle';

export const FIELD_HEIGHT = 400;
const GROUND = 330;
// The pictures are drawn a little bigger than the bodies of the battle (they may overlap a bit)
const DRAW_SCALE = 1.3;
const UI = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';

function bar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, part: number, color: string, h = 7) {
    ctx.fillStyle = 'rgb(0 0 0 / 0.35)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, w * Math.max(0, Math.min(1, part)), h, h / 2);
    ctx.fill();
}

// --- How big to draw, by the size of the field on the screen ---
// cssPerUnit: CSS px of the screen for 1 of the field (its width / LANE.width): 1.0 or so on a PC,
// 0.36 on a phone held upright. boost: the characters this many times bigger (1: as they are);
// markPx: the element mark, never under MARK_MIN_PX on the screen; ring: the element's colour under
// the feet
export interface Look {
    boost: number;
    markPx: number;
    bossMarkPx: number;
    ring: boolean;
}

const BOOST_AT = 0.62;
const BOOST_MAX = 1.6;
export const MARK_MIN_PX = 12;
const BOSS_MARK_MIN_PX = 16;

export function lookFor(cssPerUnit: number): Look {
    const unit = cssPerUnit > 0 ? cssPerUnit : 1;
    const boost = Math.min(BOOST_MAX, Math.max(1, BOOST_AT / unit));
    return {
        boost,
        markPx: Math.max(15, MARK_MIN_PX / unit),
        bossMarkPx: Math.max(22, BOSS_MARK_MIN_PX / unit),
        ring: boost > 1
    };
}

// The look of the field being drawn (set by drawBattle)
let look: Look = lookFor(1);
// The size a character is drawn at
const drawn = (size: number) => size * DRAW_SCALE * look.boost;
// One that flies off or throws, as big as it is drawn (src/art/fx.ts draws it by its size)
const grown = (who: FxWho): FxWho => (look.boost === 1 ? who : { ...who, size: who.size * look.boost });

function drawBase(ctx: CanvasRenderingContext2D, base: Base, x: number, ally: boolean, time: number, scene: Scene) {
    const ratio = base.hp / base.max;
    const hurt = base.hurtMs / 200;
    const shake = base.hurtMs > 0 ? Math.sin(base.hurtMs) * 3 : 0;
    if (ally) drawMushroomHouse(ctx, x + shake, GROUND, ratio, hurt, time);
    else drawPillowTower(ctx, x + shake, GROUND, ratio, hurt, time, scene.tower);
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
        hurt: Math.min(1, f.hurtMs / 200),
        stopped,
        form: f.form,
        color: f.color,
        seed: f.id * 1.7
    };
}

function drawFighter(ctx: CanvasRenderingContext2D, f: Fighter, time: number, boosted: boolean) {
    const size = drawn(f.size);
    const r = size / 2;
    if (look.ring && f.element) {
        // The colour of its element under its feet: seen even when the mark is hidden
        const color = MARK_PATHS[f.element].color;
        ctx.save();
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.ellipse(f.x, GROUND, r * 1.1, r * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5 * look.boost;
        ctx.stroke();
        ctx.restore();
    } else {
        ctx.fillStyle = 'rgb(0 0 0 / 0.16)';
        ctx.beginPath();
        ctx.ellipse(f.x, GROUND, r * 1.05, r * 0.22, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.save();
    ctx.translate(f.x, GROUND);
    // Pictures face right: ours walk to the left
    if (f.side === 'ally') ctx.scale(-1, 1);
    ART[f.kind](ctx, size, poseOf(f, time));
    ctx.restore();
    const y = GROUND - r;
    if (f.shield > 0) {
        // Ours: the blue barrier of かね. The enemies: the pink one of ふとん バリア
        const ally = f.side === 'ally';
        ctx.strokeStyle = ally ? 'rgb(120 190 255 / 0.9)' : 'rgb(240 130 200 / 0.9)';
        ctx.fillStyle = ally ? 'rgb(150 210 255 / 0.18)' : 'rgb(255 180 225 / 0.22)';
        ctx.lineWidth = 3 * look.boost;
        ctx.beginPath();
        ctx.arc(f.x, y, r + 8 * look.boost, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    if (f.stopMs > 0 && f.side === 'ally') {
        // Ours asleep (ねむりの きり): Zzz going up
        for (let k = 0; k < 3; k++) {
            const up = ((time / 700 + k / 3) % 1);
            const k2 = look.boost;
            shout(ctx, 'Z', f.x + r * 0.4 + up * 14 * k2, y - r - 6 - up * 26 * k2, (12 + k * 4) * k2, '#6a4c93', 1 - up);
        }
    } else if (f.stopMs > 0) {
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
    if (boosted && f.side === 'ally') star(ctx, f.x - r * 0.8, GROUND - size - 6 + Math.sin(time / 120 + f.id) * 3, 6 * look.boost, '#ffd84a', time / 300);
    // The element, over the head
    const mark = f.boss ? look.bossMarkPx : look.markPx;
    if (f.element) drawMark(ctx, f.element, f.x + (f.side === 'ally' ? r * 0.55 : -r * 0.55), GROUND - size * 1.05 - (mark - 15) * 0.3, mark);
    if (f.hp < f.maxHp) {
        const h = 7 * look.boost;
        bar(ctx, f.x, GROUND - size * 1.15 - 18 * look.boost, Math.max(30, f.size) * look.boost, f.hp / f.maxHp, f.side === 'ally' ? '#4c9be0' : '#e5533d', h);
    }
}

// The look of the stage (game/scenes.ts) does not move: drawn once for each stage and scale
let backdrop: { key: string; canvas: HTMLCanvasElement } | null = null;

function drawBackdrop(ctx: CanvasRenderingContext2D, scene: Scene, id: number, w: number, scale: number) {
    if (typeof document === 'undefined') return paintScene(ctx, scene, w, GROUND, FIELD_HEIGHT);
    const key = `${id}:${scale}`;
    if (!backdrop || backdrop.key !== key) {
        const c = document.createElement('canvas');
        c.width = Math.ceil(w * scale);
        c.height = Math.ceil(FIELD_HEIGHT * scale);
        const g = c.getContext('2d');
        if (!g) return paintScene(ctx, scene, w, GROUND, FIELD_HEIGHT);
        g.setTransform(scale, 0, 0, scale, 0, 0);
        paintScene(g, scene, w, GROUND, FIELD_HEIGHT);
        backdrop = { key, canvas: c };
    }
    ctx.drawImage(backdrop.canvas, 0, 0, w, FIELD_HEIGHT);
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
            if (fx.who) drawFly(ctx, grown(fx.who), fx.x, GROUND, t, fx.ms);
            break;
        case 'shot':
            if (fx.who && fx.to !== undefined) drawShot(ctx, grown(fx.who), fx.x, fx.to, GROUND, t, fx.ms);
            break;
        case 'stomp':
            // The hippo's stamp, the alarm clock's ring, the king's dream cloud
            drawStomp(ctx, fx.x, GROUND, t, fx.who?.kind === 'bell' ? 'ジリリリ！' : fx.who?.kind === 'king' ? 'もくもく〜' : 'ドスン');
            break;
        case 'heal':
            // A lullaby healed it: a green ＋ rises
            if (fx.who) shout(ctx, '＋', fx.x, GROUND - drawn(fx.who.size) - 10 - t * 30, 26 * look.boost, '#2b9348', fade * 1.5);
            break;
        case 'split':
            // A ふたご came apart: a puff and パカッ
            ctx.fillStyle = `rgb(255 255 255 / ${0.8 * fade})`;
            ctx.beginPath();
            ctx.arc(fx.x, GROUND - 30 * look.boost, (20 + 40 * t) * look.boost, 0, Math.PI * 2);
            ctx.fill();
            shout(ctx, 'パカッ', fx.x, GROUND - 90 * look.boost - t * 20, 22 * look.boost, '#b5179e', fade * 1.5);
            break;
        case 'spark':
            // A hit on the element it beats: stars burst out
            for (let k = 0; k < 4; k++) {
                const a = (k * Math.PI) / 2 + t * 2;
                const d = 14 * look.boost * (0.5 + t);
                star(ctx, fx.x + Math.cos(a) * d, GROUND - (fx.who?.size ?? 30) * 0.7 * look.boost + Math.sin(a) * d, 6 * look.boost * fade, '#ffe14a', a);
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
                const top = GROUND - drawn(fx.who.size);
                shout(ctx, 'ぞくせい チェンジ！', fx.x, top - 70 * look.boost - t * 20, 22 * look.boost, '#7a2c4d', fade * 1.5);
                drawMark(ctx, fx.who.element, fx.x, top - 40 * look.boost - t * 20, Math.max(30, look.bossMarkPx * 1.3) * (1 + 0.3 * Math.sin(t * Math.PI)));
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
        case 'damage': {
            // The harm of a spell over the one hit: bigger and red when the element worked well
            if (!fx.who || fx.amount === undefined) break;
            const big = fx.tone === 'good', small = fx.tone === 'weak';
            const pop = 1 + 0.35 * Math.max(0, 1 - t * 6);
            // Bigger on a small field, but not as much as the characters (the numbers would cover them)
            const k = 1 + (look.boost - 1) * 0.6;
            const px = (big ? 40 : small ? 24 : 32) * pop * k;
            const y = GROUND - drawn(fx.who.size) * 1.15 - 34 * k - ease(t) * 40 - (fx.stack ?? 0) * 46 * k;
            shout(ctx, `-${fx.amount}${big ? '!' : ''}`, fx.x, y, px, big ? '#d9480f' : small ? '#6c757d' : '#c92a2a', Math.min(1, fade * 2.5));
            break;
        }
        case 'sleep': {
            // ねむりの きり: a lilac mist over our side
            const a = Math.min(1, t * 5) * fade;
            const g = ctx.createLinearGradient(LANE.enemyBase + 200, 0, LANE.allyBase, 0);
            g.addColorStop(0, 'rgb(190 160 230 / 0)');
            g.addColorStop(0.4, `rgb(190 160 230 / ${0.55 * a})`);
            g.addColorStop(1, `rgb(190 160 230 / ${0.65 * a})`);
            ctx.fillStyle = g;
            for (let k = 0; k < 6; k++) {
                ctx.beginPath();
                ctx.ellipse(LANE.enemyBase + 300 + k * 110 + Math.sin(fx.ms / 400 + k) * 15, GROUND - 40 - (k % 2) * 30, 110, 45, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            shout(ctx, 'ねむりの きり…', width / 2 + 120, 130 - t * 10, 34, '#6a4c93', Math.min(1, fade * 2));
            break;
        }
        case 'meteor':
            // まくら ながれぼし: pillows fall from the enemy's sky on our side
            for (let k = 0; k < 7; k++) {
                const at = Math.min(1, Math.max(0, t * 1.6 - k * 0.08));
                if (at <= 0 || at >= 1) continue;
                const x = 380 + k * 85 - (1 - at) * 220;
                const y = -30 + at * (GROUND - 10);
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(at * 4 + k);
                ctx.fillStyle = ['#ffc8dd', '#c8b6ff', '#bde0fe'][k % 3];
                ctx.strokeStyle = '#7a5c9e';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.roundRect(-18, -12, 36, 24, 10);
                ctx.fill();
                ctx.stroke();
                ctx.restore();
                star(ctx, x - 22 * (1 - at), y - 26, 5, '#fff3b0', at * 6);
            }
            shout(ctx, 'まくら ながれぼし！', width / 2 + 120, 120 - t * 10, 34, '#7a2c4d', Math.min(1, fade * 2));
            break;
        case 'futon':
            // ふとん バリア: the enemies are wrapped (each in pink: drawFighter)
            shout(ctx, 'ふとん バリア！', width / 2 - 120, 120 - t * 10, 34, '#c2255c', Math.min(1, fade * 2));
            break;
        case 'blocked':
            // The barrier (まもり) stopped it there
            shout(ctx, 'ふせいだ！', fx.x, GROUND - 120 - ease(t) * 30, 40, '#1971c2', Math.min(1, fade * 2.5));
            break;
        case 'fizzle':
            ctx.font = `bold 40px ${UI}`;
            ctx.fillStyle = `rgb(110 110 120 / ${fade})`;
            ctx.fillText('ぷすん…', fx.x, GROUND - 160 - t * 30);
            break;
    }
    ctx.restore();
}

// The enemy tower is about to cast: a magic circle over it that fills, faster near the end
function drawCharge(ctx: CanvasRenderingContext2D, b: Battle) {
    const soon = enemyMagicSoon(b);
    if (!soon) return;
    const part = 1 - soon.ms / ENEMY_MAGIC.warnMs;
    const x = LANE.enemyBase + 40, y = GROUND - 270;
    const pulse = 1 + 0.08 * Math.sin(b.time / (120 - 70 * part));
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = 'rgb(60 20 90 / 0.45)';
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgb(255 255 255 / 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = '#e599f7';
    ctx.beginPath();
    ctx.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + part * Math.PI * 2);
    ctx.stroke();
    star(ctx, 0, 0, 13, '#ffe066', b.time / 400);
    ctx.restore();
    shout(ctx, `${Math.ceil(soon.ms / 1000)}`, x + 44, y - 26, 22, '#862e9c', 1);
}

// Draws the whole field; the canvas is `scale` device pixels per unit of the field
// cssPerUnit: as lookFor (by default as `scale`, for a canvas not scaled by CSS)
export function drawBattle(ctx: CanvasRenderingContext2D, b: Battle, scale: number, cssPerUnit = scale) {
    const w = LANE.width;
    look = lookFor(cssPerUnit);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const scene = sceneOf(b.stage.id);
    // The clouds and the weather move with the clock, not the battle (they go on while the magic
    // circle is open)
    const clock = typeof performance !== 'undefined' ? performance.now() : b.time;
    drawBackdrop(ctx, scene, b.stage.id, w, scale);
    drawSkyLife(ctx, scene, w, clock);
    drawBase(ctx, b.enemyBase, LANE.enemyBase, false, b.time, scene);
    drawBase(ctx, b.allyBase, LANE.allyBase, true, b.time, scene);
    drawCharge(ctx, b);
    // Bigger ones behind
    const order = [...b.fighters].sort((p, q) => q.size - p.size);
    const boosted = b.boostMs > 0;
    for (const f of order) drawFighter(ctx, f, b.time, boosted);
    drawWeather(ctx, scene, w, GROUND, FIELD_HEIGHT, clock);
    for (const fx of b.fx) drawFx(ctx, fx, w);
}
