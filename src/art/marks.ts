// --- The marks of the elements and of the groups of spells (24 x 24 paths), for the pages
// (components/ElementMark.vue) and the canvas (drawMark) ---
import type { SpellGroup } from '../spell/effects';
import type { Element } from '../spell/elements';

export const MARK_PATHS: Record<SpellGroup, { d: string; color: string }> = {
    fire: { d: 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-4 0-6 1-9z', color: '#ff6b3d' },
    water: { d: 'M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13z', color: '#3d9bff' },
    wood: { d: 'M4 20C4 10 10 4 20 4c0 10-6 16-16 16zM4 20l9-9', color: '#3fae4a' },
    metal: { d: 'M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', color: '#8d99ae' },
    word: { d: 'M3 4h18v12H10l-5 4v-4H3z', color: '#ff9f1c' },
    wonder: { d: 'M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.2 5.8 20.9l1.6-7L2 9.2l7.1-.6z', color: '#a77bff' }
};

// The mark on a canvas, centred on (x, y), `size` across
export function drawMark(ctx: CanvasRenderingContext2D, mark: SpellGroup | Element, x: number, y: number, size: number) {
    const m = MARK_PATHS[mark];
    ctx.save();
    ctx.translate(x - size / 2, y - size / 2);
    ctx.scale(size / 24, size / 24);
    ctx.fillStyle = m.color;
    ctx.strokeStyle = '#2b2340';
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    // A white disc behind, to be seen on any colour
    ctx.beginPath();
    ctx.arc(12, 12, 12.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgb(255 255 255 / 0.9)';
    ctx.fill();
    ctx.fillStyle = m.color;
    if (typeof Path2D !== 'undefined') {
        const p = new Path2D(m.d);
        ctx.fill(p);
        ctx.stroke(p);
    }
    ctx.restore();
}
