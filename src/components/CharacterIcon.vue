<script setup lang="ts">
// --- A character drawn small, for the buttons and the screens (the same pictures as in the battle) ---
// It moves only if `animate` is set and the child's device does not ask for less motion.
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ART } from '../art/characters';
import { restPose, type Mood } from '../art/pose';
import type { EnemyId } from '../game/enemies';
import { ELEMENT_BODY, ENEMIES } from '../game/enemies';
import type { Element } from '../spell/elements';
import { UNITS, type UnitId } from '../game/units';

const props = withDefaults(defineProps<{
    kind: UnitId | EnemyId;
    form?: 0 | 1 | 2;
    // px (css) at the root font size of 16px: it grows with the screen as the rest (styles.css)
    size?: number;
    animate?: boolean;
    mood?: Mood;
    walk?: boolean;
    // An enemy of an element has its colour
    element?: Element | null;
    // Render as a solid dark mystery silhouette (for undiscovered characters)
    silhouette?: boolean;
}>(), { form: 0, size: 44, animate: false, mood: undefined, walk: false, element: null, silhouette: false });

const canvas = ref<HTMLCanvasElement | null>(null);
let frame = 0;
let observer: ResizeObserver | null = null;

const colorOf = () => (props.kind in UNITS ? UNITS[props.kind as UnitId].forms[props.form].color : props.element ? ELEMENT_BODY[props.element] : ENEMIES[props.kind as EnemyId].color);

function draw(t: number) {
    const c = canvas.value;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    // The size on the screen (rem: bigger on a big screen), drawn sharp at it
    const k = (window.devicePixelRatio || 1) * ((c.clientWidth || props.size) / props.size);
    const px = Math.round(props.size * k);
    if (c.width !== px) c.width = c.height = px;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, px, px);
    // The body takes about 3/5 of the box, the feet near the bottom
    ctx.setTransform(k, 0, 0, k, props.size * 0.5 * k, props.size * 0.9 * k);
    const pose = { ...restPose(props.form, colorOf(), props.silhouette ? 0 : t, props.mood), walk: props.walk && !props.silhouette ? 1 : 0 };
    ART[props.kind](ctx, props.size * 0.58, pose);
    if (props.silhouette) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = '#5c667a';
        ctx.fillRect(0, 0, px, px);
        ctx.restore();
    }
}

const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function loop(t: number) {
    draw(t);
    frame = requestAnimationFrame(loop);
}

function start() {
    cancelAnimationFrame(frame);
    if (props.animate && !props.silhouette && !still()) frame = requestAnimationFrame(loop);
    else draw(800);
}

onMounted(() => {
    start();
    // The screen grew or shrank: drawn again at the new size
    if (typeof ResizeObserver === 'function' && canvas.value) {
        observer = new ResizeObserver(() => { if (!props.animate || props.silhouette || still()) draw(800); });
        observer.observe(canvas.value);
    }
});
watch(() => [props.kind, props.form, props.size, props.animate, props.mood, props.walk, props.element, props.silhouette], start);
onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    observer?.disconnect();
});
</script>

<template>
    <canvas ref="canvas" class="character-icon" :style="{ width: `${size / 16}rem`, height: `${size / 16}rem` }" aria-hidden="true"></canvas>
</template>

<style scoped>
.character-icon {
    display: block;
}
</style>
