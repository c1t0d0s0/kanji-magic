// --- The look of a stage (game/scenes.ts): the sky, the land, a landmark, the ground, the weather ---
// paintScene draws what does not move (once for each size: render.ts keeps it); drawSkyLife the
// clouds that drift, drawWeather the rain, the snow and the like in front of all. Canvas 2D only.
import type { Scene } from '../game/scenes';
import { star } from './parts';

type Ctx = CanvasRenderingContext2D;

// The same "random" numbers every time (the picture must not change from one frame to the next)
const rnd = (i: number) => {
    const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
};

function fillPath(ctx: Ctx, color: string, draw: () => void) {
    ctx.fillStyle = color;
    ctx.beginPath();
    draw();
    ctx.fill();
}

// --- What does not move ---
export function paintScene(ctx: Ctx, s: Scene, w: number, ground: number, height: number) {
    const sky = ctx.createLinearGradient(0, 0, 0, ground);
    sky.addColorStop(0, s.sky[0]);
    sky.addColorStop(1, s.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, ground);
    lights(ctx, s, w, ground);
    if (s.landmark === 'rainbow') rainbow(ctx, w, ground);
    if (s.landmark === 'islands') islands(ctx, s);
    // The far land, then the landmark, then the near land
    if (s.land === 'hills') hills(ctx, w, ground, s.far, 245, 70);
    if (s.land === 'mountains') mountains(ctx, w, ground, s.far, s.ground === 'snow');
    landmark(ctx, s, ground);
    if (s.land !== 'flat' || s.landmark === 'town' || s.landmark === 'hedges' || s.ground === 'cloud') hills(ctx, w, ground, s.near, 288, s.land === 'flat' ? 12 : 42);
    if (s.water) water(ctx, s, w, ground);
    floor(ctx, s, w, ground, height);
    if (s.time === 'cave') cave(ctx, w);
}

// The sun, the evening sun, or the moon and the stars
function lights(ctx: Ctx, s: Scene, w: number, ground: number) {
    if (s.time === 'night') {
        for (let i = 0; i < 70; i++) {
            const x = rnd(i) * w, y = rnd(i + 100) * (ground - 70);
            ctx.fillStyle = `rgb(255 255 240 / ${0.4 + rnd(i + 200) * 0.6})`;
            ctx.beginPath();
            ctx.arc(x, y, 0.8 + rnd(i + 300) * 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
        // A crescent moon: the moon with a round bite out of it (cut, so the sky shows through)
        const glow = ctx.createRadialGradient(600, 70, 20, 600, 70, 90);
        glow.addColorStop(0, 'rgb(255 245 200 / 0.35)');
        glow.addColorStop(1, 'rgb(255 245 200 / 0)');
        ctx.fillStyle = glow;
        ctx.fillRect(500, 0, 200, 170);
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, w, ground);
        ctx.arc(614, 62, 26, 0, Math.PI * 2);
        ctx.clip('evenodd');
        fillPath(ctx, '#fff6c8', () => ctx.arc(600, 70, 30, 0, Math.PI * 2));
        ctx.restore();
    } else if (s.time === 'evening') {
        const g = ctx.createRadialGradient(470, ground - 60, 10, 470, ground - 60, 160);
        g.addColorStop(0, 'rgb(255 240 180 / 0.9)');
        g.addColorStop(1, 'rgb(255 200 120 / 0)');
        ctx.fillStyle = g;
        ctx.fillRect(300, ground - 220, 340, 220);
        fillPath(ctx, '#ffd27a', () => ctx.arc(470, ground - 60, 46, 0, Math.PI * 2));
    } else if (s.time === 'day' && s.weather !== 'rain') {
        fillPath(ctx, 'rgb(255 240 150 / 0.35)', () => ctx.arc(560, 55, 42, 0, Math.PI * 2));
        fillPath(ctx, '#fff3a6', () => ctx.arc(560, 55, 28, 0, Math.PI * 2));
    }
}

function hills(ctx: Ctx, w: number, ground: number, color: string, base: number, hill: number) {
    fillPath(ctx, color, () => {
        ctx.moveTo(0, ground);
        for (let x = 0; x <= w; x += 20) ctx.lineTo(x, base - Math.abs(Math.sin(x / (Math.max(hill, 10) * 2.3) + hill)) * hill);
        ctx.lineTo(w, ground);
    });
}

function mountains(ctx: Ctx, w: number, ground: number, color: string, snowy: boolean) {
    const peaks = [[60, 120], [210, 70], [360, 140], [520, 90], [690, 130], [850, 80], [1000, 120]];
    fillPath(ctx, color, () => {
        ctx.moveTo(-20, ground);
        for (const [x, y] of peaks) {
            ctx.lineTo(x - 75, ground - 40);
            ctx.lineTo(x, y);
            ctx.lineTo(x + 75, ground - 40);
        }
        ctx.lineTo(w + 20, ground);
    });
    if (!snowy) return;
    // Snow on the tops
    for (const [x, y] of peaks) {
        fillPath(ctx, '#ffffff', () => {
            ctx.moveTo(x, y);
            ctx.lineTo(x + 26, y + 34);
            ctx.lineTo(x + 10, y + 28);
            ctx.lineTo(x, y + 38);
            ctx.lineTo(x - 12, y + 28);
            ctx.lineTo(x - 26, y + 34);
            ctx.closePath();
        });
    }
}

function rainbow(ctx: Ctx, w: number, ground: number) {
    const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 12;
    colors.forEach((c, i) => {
        ctx.strokeStyle = c;
        ctx.beginPath();
        ctx.arc(w / 2, ground + 40, 330 - i * 12, Math.PI, 0);
        ctx.stroke();
    });
    ctx.restore();
}

function islands(ctx: Ctx, s: Scene) {
    for (const [x, y, r] of [[230, 120, 50], [520, 70, 34], [760, 140, 42]] as const) {
        // A bit of land floating, a tree on it
        fillPath(ctx, s.near, () => {
            ctx.moveTo(x - r, y);
            ctx.quadraticCurveTo(x, y + r * 1.4, x + r, y);
            ctx.closePath();
        });
        fillPath(ctx, s.time === 'night' ? '#b8e0a8' : '#8ccf6b', () => ctx.ellipse(x, y, r, r * 0.22, 0, 0, Math.PI * 2));
        fillPath(ctx, '#6b4f3a', () => ctx.rect(x - 3, y - 26, 6, 24));
        fillPath(ctx, s.time === 'night' ? '#c77dff' : '#5fae4a', () => ctx.arc(x, y - 32, 14, 0, Math.PI * 2));
    }
}

// The landmark, between the far and the near land
function landmark(ctx: Ctx, s: Scene, ground: number) {
    const night = s.time === 'night';
    switch (s.landmark) {
        case 'trees':
            for (let i = 0; i < 11; i++) {
                const x = 40 + i * 92 + rnd(i) * 30, h = 50 + rnd(i + 9) * 30;
                fillPath(ctx, '#7a5a3c', () => ctx.rect(x - 4, ground - 45 - h * 0.4, 8, h * 0.4 + 10));
                fillPath(ctx, i % 2 ? '#5f9e4a' : '#6fb257', () => {
                    ctx.arc(x, ground - 45 - h * 0.6, h * 0.42, 0, Math.PI * 2);
                    ctx.arc(x - h * 0.25, ground - 45 - h * 0.4, h * 0.3, 0, Math.PI * 2);
                    ctx.arc(x + h * 0.25, ground - 45 - h * 0.4, h * 0.3, 0, Math.PI * 2);
                });
            }
            break;
        case 'pines':
            for (let i = 0; i < 13; i++) {
                const x = 30 + i * 78 + rnd(i) * 25, h = 60 + rnd(i + 5) * 40;
                fillPath(ctx, night ? '#1f3b38' : '#4f7a63', () => {
                    ctx.moveTo(x, ground - 40 - h);
                    ctx.lineTo(x + h * 0.32, ground - 38);
                    ctx.lineTo(x - h * 0.32, ground - 38);
                    ctx.closePath();
                });
                if (s.ground === 'snow') fillPath(ctx, '#ffffff', () => {
                    ctx.moveTo(x, ground - 40 - h);
                    ctx.lineTo(x + h * 0.12, ground - 40 - h * 0.62);
                    ctx.lineTo(x - h * 0.12, ground - 40 - h * 0.62);
                    ctx.closePath();
                });
            }
            break;
        case 'castle': {
            // The castle of the big わすれんぼう, far off, against the evening sky
            const c = '#7d5a8c';
            fillPath(ctx, c, () => {
                ctx.rect(420, ground - 150, 160, 110);
                ctx.rect(400, ground - 200, 40, 160);
                ctx.rect(560, ground - 200, 40, 160);
                ctx.rect(480, ground - 230, 40, 190);
            });
            for (const [x, top] of [[420, 200], [580, 200], [500, 230]] as const) {
                fillPath(ctx, '#5e3f6e', () => {
                    ctx.moveTo(x - 26, ground - top);
                    ctx.lineTo(x, ground - top - 40);
                    ctx.lineTo(x + 26, ground - top);
                    ctx.closePath();
                });
            }
            fillPath(ctx, '#ffd27a', () => {
                ctx.rect(493, ground - 190, 14, 20);
                ctx.rect(413, ground - 170, 12, 16);
                ctx.rect(575, ground - 170, 12, 16);
            });
            break;
        }
        case 'clocktower': {
            const x = 520;
            fillPath(ctx, '#a0785a', () => ctx.rect(x - 32, ground - 230, 64, 200));
            fillPath(ctx, '#7f5a42', () => {
                ctx.moveTo(x - 44, ground - 230);
                ctx.lineTo(x, ground - 290);
                ctx.lineTo(x + 44, ground - 230);
                ctx.closePath();
            });
            fillPath(ctx, '#fff8e1', () => ctx.arc(x, ground - 190, 24, 0, Math.PI * 2));
            ctx.strokeStyle = '#5a3e2b';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x, ground - 190, 24, 0, Math.PI * 2);
            ctx.moveTo(x, ground - 190);
            ctx.lineTo(x, ground - 207);
            ctx.moveTo(x, ground - 190);
            ctx.lineTo(x + 12, ground - 184);
            ctx.stroke();
            break;
        }
        case 'town':
            // Houses asleep, a few windows still lit
            for (let i = 0; i < 12; i++) {
                const x = i * 88 - 10, h = 60 + rnd(i) * 70, wd = 70 + rnd(i + 3) * 20;
                fillPath(ctx, i % 2 ? '#2b3155' : '#323a63', () => {
                    ctx.rect(x, ground - 30 - h, wd, h + 30);
                    ctx.moveTo(x - 6, ground - 30 - h);
                    ctx.lineTo(x + wd / 2, ground - 60 - h);
                    ctx.lineTo(x + wd + 6, ground - 30 - h);
                });
                for (let k = 0; k < 3; k++) {
                    if (rnd(i * 7 + k) > 0.55) fillPath(ctx, '#ffd27a', () => ctx.rect(x + 12 + k * 20, ground - 10 - h + rnd(i + k) * 30, 10, 12));
                }
            }
            break;
        case 'tower': {
            // The king's tower: tall and twisted, a light at the top
            const x = 500;
            fillPath(ctx, '#2a1b4a', () => {
                ctx.moveTo(x - 50, ground - 30);
                ctx.lineTo(x - 30, ground - 250);
                ctx.lineTo(x + 30, ground - 250);
                ctx.lineTo(x + 50, ground - 30);
                ctx.closePath();
            });
            fillPath(ctx, '#3c096c', () => {
                ctx.moveTo(x - 46, ground - 250);
                ctx.lineTo(x + 6, ground - 330);
                ctx.lineTo(x + 46, ground - 250);
                ctx.closePath();
            });
            ctx.save();
            ctx.shadowColor = '#c77dff';
            ctx.shadowBlur = 20;
            fillPath(ctx, '#e0aaff', () => ctx.arc(x, ground - 215, 12, 0, Math.PI * 2));
            ctx.restore();
            break;
        }
        case 'rocks':
            for (let i = 0; i < 7; i++) {
                const x = 60 + i * 150 + rnd(i) * 40, h = 50 + rnd(i + 4) * 60, wd = 40 + rnd(i + 8) * 30;
                fillPath(ctx, s.near, () => {
                    ctx.moveTo(x - wd, ground - 30);
                    ctx.lineTo(x - wd * 0.7, ground - 30 - h);
                    ctx.lineTo(x + wd * 0.5, ground - 30 - h * 0.9);
                    ctx.lineTo(x + wd, ground - 30);
                    ctx.closePath();
                });
            }
            break;
        case 'hedges':
            // Walls of a maze, one behind another
            for (let i = 0; i < 9; i++) {
                const x = i * 120 - 20 + (i % 2) * 30, h = 50 + (i % 3) * 18;
                fillPath(ctx, i % 2 ? '#4f8a4f' : '#5c9a58', () => ctx.roundRect(x, ground - 30 - h, 90, h + 30, 8));
            }
            break;
        default:
            break;
    }
}

function water(ctx: Ctx, s: Scene, w: number, ground: number) {
    const top = ground - 34;
    ctx.fillStyle = s.water!;
    ctx.fillRect(0, top, w, ground - top);
    ctx.strokeStyle = 'rgb(255 255 255 / 0.45)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
        const x = rnd(i) * w, y = top + 6 + rnd(i + 30) * 22;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 9, y - 4, x + 18, y);
        ctx.stroke();
    }
    // The moon or the sun shines on it
    if (s.time === 'night' || s.time === 'evening') {
        ctx.fillStyle = s.time === 'night' ? 'rgb(255 246 200 / 0.55)' : 'rgb(255 220 140 / 0.6)';
        const cx = s.time === 'night' ? 600 : 470;
        for (let k = 0; k < 4; k++) ctx.fillRect(cx - 24 + k * 6, top + 5 + k * 7, 48 - k * 12, 3);
    }
}

function floor(ctx: Ctx, s: Scene, w: number, ground: number, height: number) {
    ctx.fillStyle = s.groundColor;
    ctx.fillRect(0, ground, w, height - ground);
    ctx.fillStyle = s.edge;
    ctx.fillRect(0, ground, w, 6);
    for (let i = 0, x = 15; x < w; x += 47, i++) {
        const y = ground + 18 + ((x * 7) % 40);
        switch (s.ground) {
            case 'grass':
            case 'swamp': {
                ctx.strokeStyle = s.ground === 'swamp' ? '#4a6236' : s.edge;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x - 5, y); ctx.lineTo(x - 7, y - 8);
                ctx.moveTo(x, y); ctx.lineTo(x, y - 10);
                ctx.moveTo(x + 5, y); ctx.lineTo(x + 7, y - 8);
                ctx.stroke();
                if (s.ground === 'swamp' && i % 3 === 1) fillPath(ctx, '#4f6f5f', () => ctx.ellipse(x + 20, y - 2, 22, 6, 0, 0, Math.PI * 2));
                else if (x % 3 === 0 && s.time !== 'night') fillPath(ctx, x % 2 ? '#fff6a8' : '#ffc8dd', () => ctx.arc(x + 12, y - 4, 3.5, 0, Math.PI * 2));
                break;
            }
            case 'rock':
            case 'stone':
                if (s.ground === 'stone') {
                    ctx.strokeStyle = s.edge;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x - 18, y - 10, 36, 14);
                } else fillPath(ctx, s.edge, () => ctx.ellipse(x, y, 8 + rnd(i) * 6, 5, 0, 0, Math.PI * 2));
                break;
            case 'sand':
                fillPath(ctx, s.edge, () => {
                    ctx.arc(x, y, 2, 0, Math.PI * 2);
                    ctx.arc(x + 14, y - 6, 1.5, 0, Math.PI * 2);
                });
                if (i % 4 === 2) fillPath(ctx, '#ffb4a2', () => ctx.ellipse(x + 6, y - 2, 6, 4, 0.3, 0, Math.PI * 2));
                break;
            case 'snow':
                fillPath(ctx, 'rgb(170 195 225 / 0.45)', () => ctx.ellipse(x, y, 16, 4, 0, 0, Math.PI * 2));
                break;
            case 'cloud':
                fillPath(ctx, '#ffffff', () => {
                    ctx.arc(x, ground + 4, 14, 0, Math.PI * 2);
                    ctx.arc(x + 20, ground + 2, 11, 0, Math.PI * 2);
                });
                break;
        }
    }
}

// The roof of a cave, with icicles of stone and a few shining stones
function cave(ctx: Ctx, w: number) {
    fillPath(ctx, '#1d1a26', () => {
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, 30);
        for (let x = w; x >= 0; x -= 40) {
            const d = 30 + rnd(x) * 40;
            ctx.lineTo(x - 10, 26);
            ctx.lineTo(x - 20, d);
            ctx.lineTo(x - 30, 26);
        }
        ctx.lineTo(0, 30);
        ctx.closePath();
    });
    for (let i = 0; i < 8; i++) {
        const x = 60 + i * 120 + rnd(i) * 40, y = 120 + rnd(i + 3) * 120;
        fillPath(ctx, i % 2 ? 'rgb(120 220 255 / 0.7)' : 'rgb(200 150 255 / 0.7)', () => {
            ctx.moveTo(x, y - 9);
            ctx.lineTo(x + 5, y);
            ctx.lineTo(x, y + 9);
            ctx.lineTo(x - 5, y);
            ctx.closePath();
        });
    }
}

// --- What moves ---
// Clouds drift slowly (with the clock: they go on while the magic circle is open)
export function drawSkyLife(ctx: Ctx, s: Scene, w: number, time: number) {
    ctx.fillStyle = s.cloudColor;
    for (let k = 0; k < s.clouds; k++) {
        const x = ((k * 290 + time / (90 + k * 30)) % (w + 200)) - 100, y = 45 + (k % 2) * 50 + (k > 3 ? 40 : 0);
        ctx.beginPath();
        ctx.arc(x, y, 22, 0, Math.PI * 2);
        ctx.arc(x + 25, y - 10, 26, 0, Math.PI * 2);
        ctx.arc(x + 52, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }
}

// In front of all: soft, not too many, so the battle is still easy to see
export function drawWeather(ctx: Ctx, s: Scene, w: number, ground: number, height: number, time: number) {
    const t = time / 1000;
    ctx.save();
    switch (s.weather) {
        case 'rain':
            ctx.strokeStyle = 'rgb(220 235 255 / 0.55)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < 70; i++) {
                const x = (rnd(i) * (w + 100) - t * 120) % (w + 100);
                const y = (rnd(i + 50) * height + t * 520) % height;
                const xx = x < 0 ? x + w + 100 : x;
                ctx.moveTo(xx, y);
                ctx.lineTo(xx - 5, y + 16);
            }
            ctx.stroke();
            break;
        case 'snow':
            ctx.fillStyle = 'rgb(255 255 255 / 0.9)';
            for (let i = 0; i < 60; i++) {
                const y = (rnd(i + 50) * height + t * (30 + rnd(i) * 30)) % height;
                const x = (rnd(i) * w + Math.sin(t + i) * 14 + w) % w;
                ctx.beginPath();
                ctx.arc(x, y, 1.5 + rnd(i + 9) * 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'leaves':
        case 'petals':
            for (let i = 0; i < 16; i++) {
                const y = (rnd(i + 50) * ground + t * (25 + rnd(i) * 20)) % ground;
                const x = (rnd(i) * w + Math.sin(t * 1.3 + i) * 30 - (s.weather === 'petals' ? t * 60 : 0)) % w;
                ctx.save();
                ctx.translate(x < 0 ? x + w : x, y);
                ctx.rotate(t * 2 + i);
                ctx.fillStyle = s.weather === 'petals' ? 'rgb(255 190 215 / 0.9)' : i % 2 ? 'rgb(230 160 60 / 0.9)' : 'rgb(120 180 70 / 0.9)';
                ctx.beginPath();
                ctx.ellipse(0, 0, 7, 3.5, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            break;
        case 'wind':
            ctx.strokeStyle = 'rgb(255 255 255 / 0.6)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const x = w - ((rnd(i) * w + t * 260) % (w + 200)) + 100, y = 60 + rnd(i + 20) * (ground - 80);
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.quadraticCurveTo(x + 40, y - 8, x + 80, y);
                ctx.stroke();
            }
            break;
        case 'fog':
            for (let k = 0; k < 3; k++) {
                const x = ((t * (12 + k * 6) + k * 300) % (w + 400)) - 200;
                const g = ctx.createRadialGradient(x, ground - 30 - k * 40, 10, x, ground - 30 - k * 40, 260);
                g.addColorStop(0, 'rgb(255 255 255 / 0.35)');
                g.addColorStop(1, 'rgb(255 255 255 / 0)');
                ctx.fillStyle = g;
                ctx.fillRect(x - 260, ground - 300, 520, 300);
            }
            break;
        case 'drips':
            ctx.fillStyle = 'rgb(150 210 255 / 0.8)';
            for (let i = 0; i < 10; i++) {
                const x = 40 + i * 100 + rnd(i) * 40, fall = ((t * 0.7 + rnd(i + 7)) % 1);
                ctx.beginPath();
                ctx.ellipse(x, 50 + fall * (ground - 50), 2.5, 4, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'shooting':
            for (let k = 0; k < 2; k++) {
                const u = (t / 3.5 + k * 0.5) % 1;
                if (u > 0.35) continue;
                const p = u / 0.35, x = 900 - k * 380 - p * 260, y = 30 + k * 40 + p * 120;
                const g = ctx.createLinearGradient(x, y, x + 70, y - 32);
                g.addColorStop(0, 'rgb(255 250 210 / 0.95)');
                g.addColorStop(1, 'rgb(255 250 210 / 0)');
                ctx.strokeStyle = g;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + 70, y - 32);
                ctx.stroke();
                star(ctx, x, y, 5, '#fff6c8', t * 4);
            }
            break;
        case 'sparkles':
            for (let i = 0; i < 14; i++) {
                const a = (Math.sin(t * 2.2 + i * 1.7) + 1) / 2;
                if (a < 0.4) continue;
                star(ctx, rnd(i) * w, 20 + rnd(i + 40) * (ground - 60), 3 + a * 4, `rgb(255 245 200 / ${a})`, t + i);
            }
            break;
        case 'fireflies':
            for (let i = 0; i < 16; i++) {
                const a = (Math.sin(t * 1.8 + i * 2.3) + 1) / 2;
                const x = (rnd(i) * w + Math.sin(t * 0.6 + i) * 30 + w) % w, y = ground - 20 - rnd(i + 20) * 150 + Math.cos(t * 0.8 + i) * 10;
                ctx.fillStyle = `rgb(220 255 140 / ${0.25 + a * 0.75})`;
                ctx.shadowColor = '#e9ff8a';
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(x, y, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
            break;
        case 'bubbles':
            ctx.strokeStyle = 'rgb(255 255 255 / 0.75)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 14; i++) {
                const u = (t * (0.08 + rnd(i) * 0.06) + rnd(i + 3)) % 1;
                const x = rnd(i + 11) * w + Math.sin(t * 2 + i) * 8, y = ground - u * (ground - 40);
                ctx.globalAlpha = 1 - u;
                ctx.beginPath();
                ctx.arc(x, y, 4 + rnd(i + 5) * 6, 0, Math.PI * 2);
                ctx.stroke();
            }
            break;
        default:
            break;
    }
    ctx.restore();
}
