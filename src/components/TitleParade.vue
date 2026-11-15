<script setup lang="ts">
// --- The title picture: our friends march out of the きのこハウス after a わすれんぼう ---
// Still (one picture) when the child's device asks for less motion
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { drawMushroomHouse } from '../art/bases';
import { ART } from '../art/characters';
import { restPose } from '../art/pose';
import { ENEMIES } from '../game/enemies';
import { UNITS, type UnitId } from '../game/units';

const W = 360, H = 150, GROUND = 135;
const canvas = ref<HTMLCanvasElement | null>(null);
let frame = 0;

const marchers: { kind: UnitId; size: number }[] = [
    { kind: 'kaeru', size: 36 }, { kind: 'purun', size: 34 }, { kind: 'neko', size: 34 }, { kind: 'pengin', size: 36 }, { kind: 'kaba', size: 46 }
];

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
    ctx.translate(W - 50, GROUND);
    ctx.scale(0.55, 0.55);
    drawMushroomHouse(ctx, 0, 0, 1, 0, t);
    ctx.restore();
    // The march goes round: off on the left, out of the house again (the わすれんぼう in front)
    const span = W + 60;
    const at = (behind: number) => W - 40 - ((((t / 28 - behind) % span) + span) % span);
    ctx.save();
    ctx.translate(at(0), GROUND);
    ART.zako(ctx, 30, { ...restPose(0, ENEMIES.zako.color, t), walk: 1, seed: 3 });
    ctx.restore();
    marchers.forEach((m, i) => {
        ctx.save();
        ctx.translate(at(70 + i * 52), GROUND);
        // Ours face the left
        ctx.scale(-1, 1);
        ART[m.kind](ctx, m.size, { ...restPose(0, UNITS[m.kind].forms[0].color, t), walk: 1, seed: i * 2 });
        ctx.restore();
    });
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
    width: min(100%, 22.5rem);
}
</style>
