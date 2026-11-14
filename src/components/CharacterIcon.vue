<script setup lang="ts">
// --- A character drawn small, for the buttons and the screens (the same pictures as in the battle) ---
// It moves only if `animate` is set and the child's device does not ask for less motion.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ART } from '../art/characters';
import { restPose, type Mood } from '../art/pose';
import type { EnemyId } from '../game/enemies';
import { ENEMIES } from '../game/enemies';
import { UNITS, type UnitId } from '../game/units';

const props = withDefaults(defineProps<{
    kind: UnitId | EnemyId;
    form?: 0 | 1 | 2;
    // px (css)
    size?: number;
    animate?: boolean;
    mood?: Mood;
    walk?: boolean;
}>(), { form: 0, size: 44, animate: false, mood: undefined, walk: false });

const canvas = ref<HTMLCanvasElement | null>(null);
let frame = 0;

const colorOf = () => (props.kind in UNITS ? UNITS[props.kind as UnitId].forms[props.form].color : ENEMIES[props.kind as EnemyId].color);

function draw(t: number) {
    const c = canvas.value;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const px = Math.round(props.size * dpr);
    if (c.width !== px) c.width = c.height = px;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    // The body takes about 3/5 of the box, the feet near the bottom
    ctx.setTransform(dpr, 0, 0, dpr, props.size * 0.5 * dpr, props.size * 0.9 * dpr);
    const pose = { ...restPose(props.form, colorOf(), t, props.mood), walk: props.walk ? 1 : 0 };
    ART[props.kind](ctx, props.size * 0.58, pose);
}

const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function loop(t: number) {
    draw(t);
    frame = requestAnimationFrame(loop);
}

function start() {
    cancelAnimationFrame(frame);
    if (props.animate && !still()) frame = requestAnimationFrame(loop);
    else draw(800);
}

onMounted(start);
watch(() => [props.kind, props.form, props.size, props.animate, props.mood, props.walk], start);
onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
    <canvas ref="canvas" class="character-icon" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true"></canvas>
</template>

<style scoped>
.character-icon {
    display: block;
}
</style>
