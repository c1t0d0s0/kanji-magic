import { describe, expect, it } from 'vitest';
import { drawMushroomHouse, drawPillowTower } from '../src/art/bases';
import { ART } from '../src/art/characters';
import { drawFly, drawShot, drawStomp } from '../src/art/fx';
import { restPose, type Pose } from '../src/art/pose';
import { createBattle, step, summon } from '../src/game/battle';
import { ENEMIES } from '../src/game/enemies';
import { drawBattle, lookFor, MARK_MIN_PX } from '../src/game/render';
import { STAGES, stageById } from '../src/game/stages';
import { sceneOf } from '../src/game/scenes';
import { drawSkyLife, drawWeather, paintScene } from '../src/art/scenery';
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
        { ...p, mood: 'dizzy' }, { ...p, mood: 'cheer' }, { ...p, mood: 'shock' }, { ...p, mood: 'ko' }, { ...p, t: 0 }
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

    it('every stage has its own look, and it draws: the land, the weather, the tower', () => {
        const looks = new Set(STAGES.map(st => JSON.stringify(sceneOf(st.id))));
        expect(looks.size).toBe(STAGES.length);
        for (const st of STAGES) {
            const scene = sceneOf(st.id);
            const { ctx, count } = fakeCtx();
            paintScene(ctx, scene, 1000, 330, 400);
            for (const t of [0, 1700, 9000]) {
                drawSkyLife(ctx, scene, 1000, t);
                drawWeather(ctx, scene, 1000, 330, 400, t);
            }
            for (const ratio of [1, 0.4, 0.1]) for (const hurt of [0, 1]) drawPillowTower(ctx, 70, 330, ratio, hurt, 1234, scene.tower);
            expect(count.save, `stage ${st.id}`).toBe(count.restore);
            expect(count.calls, `stage ${st.id}`).toBeGreaterThan(50);
        }
        // A stage with no look of its own (a test) has the meadow
        expect(sceneOf(99)).toEqual(sceneOf(1));
    });

    it('the effects of the fighters draw from start to end (all 5 KO styles & air projectiles)', () => {
        const who = { kind: 'neko' as const, form: 1 as const, side: 'ally' as const, size: 34, color: '#fff', element: 'fire' as const };
        const boss = { kind: 'boss' as const, form: 0 as const, side: 'enemy' as const, size: 72, color: '#7a2c4d', element: null };
        const flyers = [
            { kind: 'kasa' as const, form: 0 as const, side: 'enemy' as const, size: 34, color: '#9ad4e8', element: null, flying: true },
            { kind: 'fuusen' as const, form: 0 as const, side: 'enemy' as const, size: 36, color: '#ffb5d8', element: null, flying: true },
            { kind: 'ufo' as const, form: 0 as const, side: 'enemy' as const, size: 46, color: '#9c89d9', element: null, flying: true },
            { kind: 'hard' as const, form: 0 as const, side: 'enemy' as const, size: 40, color: '#8d8a84', element: null }
        ];
        for (const t of [0, 0.1, 0.3, 0.55, 0.8, 0.95, 1]) {
            const { ctx, count } = fakeCtx();
            for (let seed = 0; seed < 5; seed++) {
                drawFly(ctx, who, 500, 330, t, t * 1000, seed, false);
                drawFly(ctx, boss, 500, 330, t, t * 1000, seed, true);
            }
            for (const f of flyers) drawFly(ctx, f, 500, 330, t, t * 1000, 1, false);
            for (const kind of ['neko', 'zou', 'fukurou', 'buta'] as const) {
                drawShot(ctx, { ...who, kind, flying: kind === 'fukurou' || kind === 'buta' }, 500, 300, 330, t, t * 300, true);
            }
            for (const kind of ['thrower', 'bento', 'fuusen', 'ufo', 'singer', 'king'] as const) {
                drawShot(ctx, { ...who, kind, side: 'enemy', flying: kind === 'fuusen' || kind === 'ufo' }, 300, 500, 330, t, t * 300, false);
            }
            drawStomp(ctx, 500, 330, t, 'ドンドコ！');
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
            // On a phone held upright (the field 360 px wide) every other time
            if (i % 30 === 0) drawBattle(ctx, b, 1, i % 60 === 0 ? 0.36 : 1);
        }
        expect(count.save).toBe(count.restore);
        expect(count.texts).toContain('おもいだした！');
    });

    it('draws the characters and their marks bigger on a small field (a phone), as they are on a PC', () => {
        expect(lookFor(1).boost).toBe(1);
        expect(lookFor(0.7).boost).toBe(1);
        expect(lookFor(1).ring).toBe(false);
        const phone = lookFor(0.36);
        expect(phone.boost).toBeCloseTo(1.6);
        expect(phone.ring).toBe(true);
        for (const unit of [0.3, 0.36, 0.5, 0.7, 1, 1.4]) {
            const l = lookFor(unit);
            expect(l.markPx * unit).toBeGreaterThanOrEqual(MARK_MIN_PX - 1e-9);
            expect(l.markPx).toBeGreaterThanOrEqual(15);
            expect(l.bossMarkPx).toBeGreaterThan(l.markPx - 1e-9);
        }
    });

    it('the names have a reading for each kanji; the words on the field are in kana', () => {
        const names = [
            ...UNIT_IDS.flatMap(id => UNITS[id].forms.map(f => f.name)), ...UNIT_IDS.map(id => UNITS[id].role),
            ...Object.values(ENEMIES).map(e => e.name)
        ];
        for (const n of names) expect(bareKanji(n), n).toEqual([]);
        // Everything the pictures write on the field (no ruby on a canvas)
        const { ctx, count } = fakeCtx();
        for (const e of Object.values(ENEMIES)) {
            for (const p of poses(0, e.color)) for (const t of [0, 1500, 3000]) ART[e.id](ctx, 72, { ...p, t });
            for (let seed = 0; seed < 12; seed++) {
                for (const t of [0.1, 0.45, 0.85]) drawFly(ctx, { kind: e.id, form: 0, side: 'enemy', size: e.size, color: e.color, element: null, flying: e.flying }, 400, 330, t, t * 1000, seed, e.boss);
            }
        }
        for (let seed = 0; seed < 10; seed++) {
            for (const t of [0.1, 0.45, 0.85]) drawFly(ctx, { kind: 'purun', form: 0, side: 'ally', size: 34, color: '#fff', element: 'water' }, 400, 330, t, t * 1000, seed, false);
        }
        for (const snd of ['ドスン', 'ドンドコ！', 'ドッカーン！', 'ピピピー！', 'ジリリリ！', 'もくもく〜']) drawStomp(ctx, 0, 330, 0.1, snd);
        drawPillowTower(ctx, 0, 330, 1, 1, 0);
        for (const w of count.texts) expect(canShow(w, 1), w).toBe(true);
    });
});
