<script setup lang="ts">
// --- The title picture: our unlocked friends march (and fly!) out of the きのこハウス after seen わすれんぼう ---
// Only characters already unlocked (allies) or met in cleared stages (enemies) appear.
// Still (one picture) when the child's device asks for less motion.
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { drawMushroomHouse } from '../art/bases';
import { ART } from '../art/characters';
import { restPose } from '../art/pose';
import { ENEMIES, type EnemyId } from '../game/enemies';
import { seenEnemies } from '../game/stages';
import { formOf, UNITS, type UnitId } from '../game/units';
import { availableUnits, save } from '../store';

const W = 400, H = 175, GROUND = 158, SKY = 76;
const canvas = ref<HTMLCanvasElement | null>(null);
let frame = 0;

const ALL_GROUND_ALLIES: readonly { kind: UnitId; size: number }[] = [
    { kind: 'kaeru', size: 34 },
    { kind: 'purun', size: 32 },
    { kind: 'usagi', size: 34 },
    { kind: 'neko', size: 32 },
    { kind: 'zou', size: 36 },
    { kind: 'pengin', size: 34 },
    { kind: 'tanuki', size: 40 },
    { kind: 'kaba', size: 44 }
];
const ALL_GROUND_FOES: readonly { kind: EnemyId; size: number }[] = [
    { kind: 'zako', size: 28 },
    { kind: 'bento', size: 32 }
];
const ALL_SKY_ALLIES: readonly { kind: UnitId; size: number }[] = [
    { kind: 'fukurou', size: 32 },
    { kind: 'buta', size: 36 }
];
const ALL_SKY_FOES: readonly { kind: EnemyId; size: number }[] = [
    { kind: 'kasa', size: 30 },
    { kind: 'fuusen', size: 32 }
];

function currentCast() {
    const unlocked = new Set(availableUnits());
    const clearedIds = Object.entries(save.stages)
        .filter(([, r]) => r.cleared)
        .map(([id]) => Number(id));
    const seen = seenEnemies(clearedIds);
    return {
        groundAllies: ALL_GROUND_ALLIES.filter(m => unlocked.has(m.kind)),
        groundFoes: ALL_GROUND_FOES.filter(f => seen.has(f.kind)),
        skyAllies: ALL_SKY_ALLIES.filter(m => unlocked.has(m.kind)),
        skyFoes: ALL_SKY_FOES.filter(f => seen.has(f.kind))
    };
}

function draw(t: number) {
    const c = canvas.value;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    // Drawn sharp at its size on the screen (rem: bigger on a big screen)
    const dpr = (window.devicePixelRatio || 1) * ((c.clientWidth || W) / W);
    if (c.width !== Math.round(W * dpr)) {
        c.width = Math.round(W * dpr);
        c.height = Math.round(H * dpr);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#a5d68c';
    ctx.beginPath();
    ctx.ellipse(W / 2, GROUND + 30, W * 0.6, 36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(W - 48, GROUND);
    ctx.scale(0.54, 0.54);
    drawMushroomHouse(ctx, 0, 0, 1, 0, t);
    ctx.restore();

    const { groundAllies, groundFoes, skyAllies, skyFoes } = currentCast();

    // Ground parade: seen enemies lead, unlocked allies march behind
    const gSlots = groundFoes.length + groundAllies.length;
    const span = Math.max(W + 60, gSlots * 58 + 140);
    const at = (behind: number, speed = 26) => W - 44 - ((((t / speed - behind) % span) + span) % span);
    groundFoes.forEach((f, i) => {
        ctx.save();
        ctx.translate(at(i * 52), GROUND);
        ART[f.kind](ctx, f.size, { ...restPose(0, ENEMIES[f.kind].color, t), walk: 1, seed: i * 5 + 3 });
        ctx.restore();
    });
    const allyOffset = groundFoes.length > 0 ? groundFoes.length * 52 + 64 : 0;
    groundAllies.forEach((m, i) => {
        const form = formOf(save.units[m.kind]);
        ctx.save();
        ctx.translate(at(allyOffset + i * 56), GROUND);
        // Ours face the left
        ctx.scale(-1, 1);
        ART[m.kind](ctx, m.size, { ...restPose(form, UNITS[m.kind].forms[form].color, t), walk: 1, seed: i * 2 });
        ctx.restore();
    });

    // Sky parade: only unlocked/seen flying characters
    const sSlots = skyFoes.length + skyAllies.length;
    if (sSlots > 0) {
        const skySpan = Math.max(W + 120, sSlots * 115 + 120);
        const skyAt = (behind: number) => W - 20 - ((((t / 21 - behind) % skySpan) + skySpan) % skySpan);
        skyFoes.forEach((f, i) => {
            const y = SKY + Math.sin(t / 280 + i * 3.1) * 6;
            ctx.save();
            ctx.translate(skyAt(i * 110), y);
            ART[f.kind](ctx, f.size, { ...restPose(0, ENEMIES[f.kind].color, t), walk: 1, seed: i * 7 + 9 });
            ctx.restore();
        });
        const skyAllyOffset = skyFoes.length > 0 ? skyFoes.length * 110 + 70 : 0;
        skyAllies.forEach((m, i) => {
            const form = formOf(save.units[m.kind]);
            const y = SKY + Math.sin(t / 260 + i * 2.4) * 6;
            ctx.save();
            ctx.translate(skyAt(skyAllyOffset + i * 115), y);
            ctx.scale(-1, 1);
            ART[m.kind](ctx, m.size, { ...restPose(form, UNITS[m.kind].forms[form].color, t), walk: 1, seed: i * 3 + 1 });
            ctx.restore();
        });
    }
}

function loop(t: number) {
    draw(t);
    frame = requestAnimationFrame(loop);
}

onMounted(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) draw(900);
    else frame = requestAnimationFrame(loop);
});
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
    <canvas ref="canvas" class="parade" :style="{ aspectRatio: `${W} / ${H}` }" aria-hidden="true"></canvas>
</template>

<style scoped>
.parade {
    display: block;
    width: min(100%, 25rem);
}
</style>
