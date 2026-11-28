// --- Parts the characters are made of: eyes, mouths, sweat, stars, and the outline ---
// Every picture is drawn with paths (no image files): it can move and make faces.
export type Ctx = CanvasRenderingContext2D;

export const OUTLINE = '#2b2340';
export const UI_FONT = '"Zen Maru Gothic", "Hiragino Maru Gothic ProN", sans-serif';

// The thickness of the outline for a body of this size
export const lineFor = (size: number) => Math.max(1.5, size * 0.055);

// Fill (and outline) the current path
export function paint(ctx: Ctx, fill: string, size: number, outline = true) {
    ctx.fillStyle = fill;
    ctx.fill();
    if (outline) {
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = lineFor(size);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
    }
}

export function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, size: number, outline = true) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
    paint(ctx, fill, size, outline);
}

export function line(ctx: Ctx, pts: readonly (readonly [number, number])[], width: number, color = OUTLINE) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

export type EyeKind = 'open' | 'half' | 'closed' | 'shut' | 'spiral' | 'wide' | 'happy' | 'pop' | 'x';

// A googly eye: the pupil wobbles a little behind the look (lx, ly in -1..1)
export function eye(ctx: Ctx, x: number, y: number, r: number, kind: EyeKind, t: number, lx = 0.3, ly = 0) {
    const w = Math.max(1, r * 0.32);
    switch (kind) {
        case 'open':
        case 'wide':
        case 'pop': {
            const rr = kind === 'pop' ? r * 1.55 : kind === 'wide' ? r * 1.25 : r;
            oval(ctx, x, y, rr, rr, '#fff', r * 3);
            const wob = kind === 'pop' ? Math.sin(t / 28) * 0.25 : Math.sin(t / 90) * 0.12;
            const wy = kind === 'pop' ? Math.cos(t / 24) * 0.25 : Math.cos(t / 110) * 0.1;
            const pr = rr * (kind === 'pop' ? 0.22 : kind === 'wide' ? 0.35 : 0.52);
            ctx.beginPath();
            ctx.arc(x + (lx + wob) * (rr - pr), y + (ly + wy) * (rr - pr), pr, 0, Math.PI * 2);
            ctx.fillStyle = OUTLINE;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x + (lx + wob) * (rr - pr) - pr * 0.35, y - pr * 0.35, pr * 0.32, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            break;
        }
        case 'x':
            // × comical knocked-out eye
            line(ctx, [[x - r * 0.72, y - r * 0.72], [x + r * 0.72, y + r * 0.72]], w * 1.15);
            line(ctx, [[x + r * 0.72, y - r * 0.72], [x - r * 0.72, y + r * 0.72]], w * 1.15);
            break;
        case 'half':
            // Sleepy: an eye with the lid half down
            oval(ctx, x, y, r, r, '#fff', r * 3);
            ctx.beginPath();
            ctx.arc(x + lx * r * 0.4, y + r * 0.35, r * 0.45, 0, Math.PI * 2);
            ctx.fillStyle = OUTLINE;
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(x, y, r, r, 0, Math.PI, 0);
            ctx.lineTo(x + r, y + r * 0.05);
            ctx.lineTo(x - r, y + r * 0.05);
            ctx.closePath();
            ctx.fillStyle = 'rgb(120 90 160 / 0.9)';
            ctx.fill();
            line(ctx, [[x - r, y + r * 0.05], [x + r, y + r * 0.05]], w);
            break;
        case 'closed':
            // ‿ a sleeping eye
            ctx.beginPath();
            ctx.arc(x, y - r * 0.2, r * 0.8, Math.PI * 0.15, Math.PI * 0.85);
            ctx.strokeStyle = OUTLINE;
            ctx.lineWidth = w;
            ctx.lineCap = 'round';
            ctx.stroke();
            break;
        case 'happy':
            // ^ a laughing eye
            ctx.beginPath();
            ctx.arc(x, y + r * 0.5, r * 0.8, Math.PI * 1.15, Math.PI * 1.85);
            ctx.strokeStyle = OUTLINE;
            ctx.lineWidth = w;
            ctx.lineCap = 'round';
            ctx.stroke();
            break;
        case 'shut':
            // > < squeezed shut (hurt)
            line(ctx, [[x - r * 0.7, y - r * 0.6], [x + r * 0.5, y], [x - r * 0.7, y + r * 0.6]], w);
            break;
        case 'spiral': {
            // @ dizzy
            ctx.beginPath();
            for (let a = 0; a < Math.PI * 5; a += 0.3) {
                const rr = (a / (Math.PI * 5)) * r;
                const px = x + Math.cos(a + t / 80) * rr, py = y + Math.sin(a + t / 80) * rr;
                if (a === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.strokeStyle = OUTLINE;
            ctx.lineWidth = w * 0.8;
            ctx.stroke();
            break;
        }
    }
}

export type MouthKind = 'smile' | 'open' | 'wavy' | 'frown' | 'o' | 'grin' | 'cat' | 'yawn' | 'scream';

export function mouth(ctx: Ctx, x: number, y: number, w: number, kind: MouthKind, t = 0) {
    const lw = Math.max(1, w * 0.16);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = lw;
    switch (kind) {
        case 'smile':
            ctx.beginPath();
            ctx.arc(x, y - w * 0.3, w * 0.5, Math.PI * 0.2, Math.PI * 0.8);
            ctx.stroke();
            break;
        case 'grin':
            // A smug one-sided smile
            ctx.beginPath();
            ctx.moveTo(x - w * 0.5, y);
            ctx.quadraticCurveTo(x, y + w * 0.25, x + w * 0.55, y - w * 0.25);
            ctx.stroke();
            break;
        case 'open':
        case 'yawn': {
            const h = kind === 'yawn' ? w * (0.5 + 0.25 * Math.sin(t / 200)) : w * 0.55;
            ctx.beginPath();
            ctx.ellipse(x, y, w * 0.42, h * 0.6, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#7a2340';
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.ellipse(x, y + h * 0.3, w * 0.22, h * 0.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#ff7f9a';
            ctx.fill();
            break;
        }
        case 'o':
            ctx.beginPath();
            ctx.ellipse(x, y, w * 0.16, w * 0.2, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#7a2340';
            ctx.fill();
            ctx.stroke();
            break;
        case 'wavy':
            ctx.beginPath();
            for (let i = 0; i <= 8; i++) {
                const px = x - w / 2 + (w * i) / 8, py = y + Math.sin(i * 1.6 + t / 60) * w * 0.1;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
            break;
        case 'frown':
            ctx.beginPath();
            ctx.arc(x, y + w * 0.4, w * 0.45, Math.PI * 1.2, Math.PI * 1.8);
            ctx.stroke();
            break;
        case 'cat':
            // ω
            ctx.beginPath();
            ctx.arc(x - w * 0.18, y, w * 0.18, 0, Math.PI);
            ctx.arc(x + w * 0.18, y, w * 0.18, Math.PI, 0, true);
            ctx.stroke();
            break;
        case 'scream': {
            // Giant comical open-jaw shout
            const rx = w * 0.56, ry = w * (0.68 + 0.12 * Math.sin(t / 35));
            ctx.beginPath();
            ctx.ellipse(x, y + ry * 0.12, rx, ry, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#7a2340';
            ctx.fill();
            ctx.stroke();
            // Wiggling tongue
            ctx.beginPath();
            ctx.ellipse(x + Math.sin(t / 40) * rx * 0.15, y + ry * 0.5, rx * 0.52, ry * 0.3, 0, 0, Math.PI * 2);
            ctx.fillStyle = '#ff7f9a';
            ctx.fill();
            // Cartoon top tooth bar
            ctx.beginPath();
            ctx.roundRect(x - rx * 0.55, y - ry * 0.72, rx * 1.1, ry * 0.28, ry * 0.12);
            ctx.fillStyle = '#fff';
            ctx.fill();
            break;
        }
    }
}

export function blush(ctx: Ctx, x: number, y: number, r: number) {
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.6, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(255 110 140 / 0.45)';
    ctx.fill();
}

// A drop of sweat (worried, tired)
export function sweat(ctx: Ctx, x: number, y: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.6);
    ctx.quadraticCurveTo(x + r, y - r * 0.2, x, y + r);
    ctx.quadraticCurveTo(x - r, y - r * 0.2, x, y - r * 1.6);
    ctx.fillStyle = '#9fdcff';
    ctx.fill();
    ctx.strokeStyle = '#3a7fc0';
    ctx.lineWidth = Math.max(1, r * 0.3);
    ctx.stroke();
}

export function star(ctx: Ctx, x: number, y: number, r: number, fill = '#ffd84a', turn = 0) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
        const a = turn - Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? r * 0.45 : r;
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = '#b07a00';
    ctx.lineWidth = Math.max(1, r * 0.18);
    ctx.stroke();
}

// Stars going round the head (dizzy)
export function dizzyStars(ctx: Ctx, x: number, y: number, r: number, t: number) {
    for (let k = 0; k < 3; k++) {
        const a = t / 250 + (k * Math.PI * 2) / 3;
        star(ctx, x + Math.cos(a) * r, y + Math.sin(a) * r * 0.35, r * 0.28, '#ffd84a', a);
    }
}

// Spiky comic-book starburst for slapstick impacts
export function burst(ctx: Ctx, x: number, y: number, r: number, points = 12, fill = '#fff3b0', stroke = '#e8590c', turn = 0) {
    ctx.save();
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
        const a = turn + (i * Math.PI) / points;
        const rr = i % 2 ? r * 0.48 : r;
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = Math.max(1.5, r * 0.08);
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
}

// Bold text with an outline, for the shouts (おもいだした！, カーン, …)
export function shout(ctx: Ctx, text: string, x: number, y: number, px: number, fill: string, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= Math.max(0, Math.min(1, alpha));
    ctx.font = `bold ${Math.round(px)}px ${UI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, px * 0.22);
    ctx.strokeStyle = '#fff';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
    ctx.restore();
}

// Tilted manga-style onomatopoeia shout (ドカーン！, ベチャッ！, ボヨン！)
export function tiltShout(ctx: Ctx, text: string, x: number, y: number, px: number, fill: string, alpha = 1, angle = -0.18) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    shout(ctx, text, 0, 0, px, fill, alpha);
    ctx.restore();
}
