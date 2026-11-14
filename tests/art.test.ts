import { describe, expect, it } from 'vitest';
import { drawMushroomHouse, drawPillowTower } from '../src/art/bases';
import { ART } from '../src/art/characters';
import { drawFly, drawShot, drawStomp } from '../src/art/fx';
import { restPose, type Pose } from '../src/art/pose';
import { createBattle, step, summon } from '../src/game/battle';
import { ENEMIES } from '../src/game/enemies';
import { drawBattle } from '../src/game/render';
import { stageById } from '../src/game/stages';
import { UNITS, UNIT_IDS } from '../src/game/units';
import { bareKanji } from '../src/learning/furi';
import { canShow } from '../src/learning/visible';

// A canvas that only counts: every method does nothing, the gradients too
function fakeCtx() {
    const count = { save: 0, restore: 0, calls: 0, texts: [] as string[] };
    const gradient = { addColorStop() {} };
    const ctx = new Proxy({} as Record<string | symbol, unknown>, {
        get(target, key) {
            if (key in target) return target[key];
            if (key === 'save') return () => void count.save++;
            if (key === 'restore') return () => void count.restore++;
            if (key === 'createLinearGradient' || key === 'createRadialGradient') return () => gradient;
            if (key === 'fillText' || key === 'strokeText') return (t: string) => void count.texts.push(t);
            if (key === 'measureText') return () => ({ width: 10 });
            return () => void count.calls++;
        },
        set(target, key, value) {
            target[key] = value;
            return true;
        }
    });
    return { ctx: ctx as unknown as CanvasRenderingContext2D, count };
}

const poses = (form: 0 | 1 | 2, color: string): Pose[] => {
    const p = restPose(form, color, 1234);
    return [
        p, { ...p, walk: 1 }, { ...p, windup: 0.8 }, { ...p, attack: 1 }, { ...p, hurt: 1 }, { ...p, stopped: true },
        { ...p, mood: 'dizzy' }, { ...p, mood: 'cheer' }, { ...p, t: 0 }
    ];
};

describe('the pictures', () => {
    it('every character draws every form and pose, and puts back the state of the canvas', () => {
        const kinds = [
            ...UNIT_IDS.flatMap(id => UNITS[id].forms.map((f, i) => ({ kind: id, form: i as 0 | 1 | 2, color: f.color }))),
            ...Object.values(ENEMIES).map(e => ({ kind: e.id, form: 0 as const, color: e.color }))
        ];
        for (const k of kinds) {
            for (const p of poses(k.form, k.color)) {
                const { ctx, count } = fakeCtx();
                ART[k.kind](ctx, 40, p);
                expect(count.save, `${k.kind} ${k.form}`).toBe(count.restore);
                expect(count.calls).toBeGreaterThan(20);
            }
        }
    });

    it('our units have no words on them (they are drawn mirrored)', () => {
        for (const id of UNIT_IDS) {
            for (const p of poses(2, UNITS[id].forms[2].color)) {
                const { ctx, count } = fakeCtx();
                ART[id](ctx, 40, p);
                expect(count.texts, id).toEqual([]);
            }
        }
    });

    it('the bases draw at any hp, hit or not', () => {
        for (const ratio of [1, 0.5, 0.1, 0]) {
            for (const hurt of [0, 1]) {
                for (const draw of [drawMushroomHouse, drawPillowTower]) {
                    const { ctx, count } = fakeCtx();
                    draw(ctx, 500, 330, ratio, hurt, 4321);
                    expect(count.save).toBe(count.restore);
                }
            }
        }
    });

    it('the effects of the fighters draw from start to end', () => {
        const who = { kind: 'neko' as const, form: 1 as const, side: 'ally' as const, size: 34, color: '#fff' };
        const boss = { kind: 'boss' as const, form: 0 as const, side: 'enemy' as const, size: 72, color: '#7a2c4d' };
        for (const t of [0, 0.3, 0.8, 0.95, 1]) {
            const { ctx, count } = fakeCtx();
            drawFly(ctx, who, 500, 330, t, t * 1000);
            drawFly(ctx, boss, 500, 330, t, t * 1000);
            drawShot(ctx, who, 500, 300, 330, t, t * 300);
            drawShot(ctx, { ...who, kind: 'thrower', side: 'enemy' }, 300, 500, 330, t, t * 300);
            drawStomp(ctx, 500, 330, t);
            expect(count.save).toBe(count.restore);
        }
    });

    it('a whole battle draws, with everyone fighting and falling', () => {
        const b = createBattle(stageById(10), UNIT_IDS.map(id => ({ id, level: 10 })));
        const { ctx, count } = fakeCtx();
        for (let i = 0; i < 60 * 90; i++) {
            b.money = 5000;
            for (const id of UNIT_IDS) summon(b, id);
            step(b, 1000 / 60);
            if (i % 30 === 0) drawBattle(ctx, b, 1);
        }
        expect(count.save).toBe(count.restore);
        expect(count.texts).toContain('おもいだした！');
    });

    it('the names have a reading for each kanji; the words on the field are in kana', () => {
        const names = [
            ...UNIT_IDS.flatMap(id => UNITS[id].forms.map(f => f.name)), ...UNIT_IDS.map(id => UNITS[id].role),
            ...Object.values(ENEMIES).map(e => e.name)
        ];
        for (const n of names) expect(bareKanji(n), n).toEqual([]);
        // Everything the pictures write on the field (no ruby on a canvas)
        const { ctx, count } = fakeCtx();
        for (const e of Object.values(ENEMIES)) for (const p of poses(0, e.color)) for (const t of [0, 1500, 3000]) ART[e.id](ctx, 72, { ...p, t });
        for (const t of [0, 0.5]) drawFly(ctx, { kind: 'purun', form: 0, side: 'ally', size: 34, color: '#fff' }, 0, 330, t, 0);
        drawStomp(ctx, 0, 330, 0.1);
        drawPillowTower(ctx, 0, 330, 1, 1, 0);
        for (const w of count.texts) expect(canShow(w, 1), w).toBe(true);
    });
});
