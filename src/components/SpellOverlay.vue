<script setup lang="ts">
// --- The magic circle: the question, the time to write, the square in the circle, the result ---
// Opened over the battle (which goes slow meanwhile) when the まほう button is pressed
// (requirements 6.1). The runes around the circle light up as the strokes are written: that
// shows how far the child is, not whether it is right. The spell goes off by itself a moment
// after as many strokes as the model has, by the はつどう！ button, or when the time runs out
// (with what is written by then). Then the result, and the model unless it was かんぺき (a tap
// skips it). なぞりモード (6.5): each stroke is traced over the model, and kept only when traceStroke
// says it follows it; all traced is せいこう (れんしゅう).
// Emits judged when the spell is judged and done when it closes (the battle casts it then, in view).
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import WritingPad from '../vendor/kanji-quiz/src/components/WritingPad.vue';
import ModelStrokes from '../vendor/kanji-quiz/src/components/ModelStrokes.vue';
import type { Stroke } from '../vendor/kanji-quiz/src/core/handwriting';
import { createRng } from '../vendor/kanji-quiz/src/core/battle';
import SpellPrompt from './SpellPrompt.vue';
import SpellDebug from './SpellDebug.vue';
import MuteButton from './MuteButton.vue';
import { useNoSelect } from './noSelect';
import { AUTO_CONFIRM_MS, MODEL_SHOW_MS, PERFECT_SHOW_MS } from '../config';
import { gradeSpell, SPELL_GRADE_LABEL, type SpellOutcome } from '../spell/grade';
import type { Question } from '../spell/question';
import { outcomeMessage, tegakiDebug, verdictMarks, type TegakiKit } from '../spell/tegaki';
import { spellSeconds } from '../spell/timer';
import { play } from '../sound';

const props = defineProps<{
    kit: TegakiKit;
    question: Question;
    // かきじゅんも みる, おてほんを なぞる
    settings: { strokeOrder: boolean; trace: boolean };
}>();
const emit = defineEmits<{
    judged: [outcome: SpellOutcome];
    done: [outcome: SpellOutcome];
}>();

const kanji = computed(() => props.question.item.kanji);
const model = computed(() => props.kit.strokes[kanji.value] ?? []);
const expected = computed(() => model.value.length);
const tracing = props.settings.trace;
const totalMs = spellSeconds(expected.value) * 1000;

const dialog = ref<HTMLDialogElement | null>(null);
const pad = ref<InstanceType<typeof WritingPad> | null>(null);
useNoSelect(dialog);
const count = ref(0);
// なぞりモード: how many strokes have been traced right
const traced = ref(0);
const remaining = ref(totalMs);
const outcome = shallowRef<SpellOutcome | null>(null);
const message = ref(tracing ? '1かくめを なぞろう' : 'まほうじんに かんじを かこう');
const messageKind = ref<'' | 'correct' | 'incorrect'>('');
// A stroke traced right: the circle glows once (the number changes to start the glow again)
const glow = ref(0);
// ?debug: the writing judged
const judged = shallowRef<{ writing: Stroke[]; size: number } | null>(null);

const shown = computed(() => outcome.value !== null);
const result = computed(() => outcome.value?.result ?? null);
const marks = computed(() => verdictMarks(result.value?.verdict ?? null));
const showModel = computed(() => shown.value && result.value !== null && result.value.grade !== 'perfect');
const mark = computed(() => {
    const g = outcome.value?.grade;
    if (!g) return '';
    return g === 'perfect' || g === 'success' ? 'correct' : 'incorrect';
});
const seconds = computed(() => Math.ceil(remaining.value / 1000));
const hurry = computed(() => !shown.value && remaining.value <= 5000);
const debugLimits = computed(() => props.kit.limitsFor(props.question.item.grade, expected.value));

// --- The runes: 4 arcs of 6 between the corners of the square, a different set for each kanji ---
// Shapes in a box of 10 x 10 (lines only, so no font is needed)
const RUNE_SHAPES = [
    'M3 0V10M3 2L8 0M3 5L8 3', 'M2 10V0L8 4V10', 'M3 0V10M3 3L7 5L3 7', 'M5 0V10M5 2L1 5M5 2L9 5',
    'M2 0V10M8 0V10M2 3L8 7', 'M5 0V10M1 3L9 7', 'M5 0L9 5L5 10L1 5Z', 'M1 0L9 10M9 0L1 10',
    'M2 0V10M2 0L8 3L2 6L8 10', 'M1 0L5 5L9 0M5 5V10', 'M8 0L2 5L8 10', 'M1 10L5 0L9 10M3 6H7'
];
const PER_ARC = 6;
const RUNE_RADIUS = 44.5;
const runes = (() => {
    const rng = createRng(`runes:${kanji.value}`);
    const list: { d: string; transform: string }[] = [];
    for (let arc = 0; arc < 4; arc++) {
        for (let k = 0; k < PER_ARC; k++) {
            // Clockwise from the top; 9° apart, the arc centred on top, right, bottom and left
            const deg = arc * 90 + (k - (PER_ARC - 1) / 2) * 9;
            const rad = ((deg - 90) * Math.PI) / 180;
            const x = 50 + RUNE_RADIUS * Math.cos(rad), y = 50 + RUNE_RADIUS * Math.sin(rad);
            const d = RUNE_SHAPES[Math.floor(rng() * RUNE_SHAPES.length)];
            // Standing on the circle, read from outside; 10 x 10 drawn as 4.6 x 4.6
            list.push({ d, transform: `translate(${x} ${y}) rotate(${deg}) scale(0.46) translate(-5 -5)` });
        }
    }
    return list;
})();
const lit = computed(() => {
    const done = tracing ? traced.value : count.value;
    const part = expected.value > 0 ? Math.min(1, done / expected.value) : 0;
    return Math.round(runes.length * part);
});

// --- The time ---
let deadline = 0;
let frame = 0;
let timeUp: ReturnType<typeof setTimeout> | undefined;
let autoCast: ReturnType<typeof setTimeout> | undefined;
let autoClose: ReturnType<typeof setTimeout> | undefined;
let shownAt = 0;
let closed = false;

function tick() {
    remaining.value = Math.max(0, deadline - performance.now());
    if (!shown.value) frame = requestAnimationFrame(tick);
}

function stopWriting() {
    clearTimeout(timeUp);
    clearTimeout(autoCast);
    cancelAnimationFrame(frame);
}

function say(text: string, kind: '' | 'correct' | 'incorrect' = '') {
    message.value = text;
    messageKind.value = kind;
}

// --- Writing ---
function onCount(n: number) {
    count.value = n;
    // A stroke taken back (1かく もどす, ぜんぶ けす): trace it again
    if (tracing && n < traced.value) {
        traced.value = n;
        say(`${n + 1}かくめを なぞろう`);
    }
    // A new stroke begun, or one taken back: wait again
    clearTimeout(autoCast);
}

function onStroke(stroke: Stroke, size: number) {
    if (shown.value) return;
    play('rune');
    if (tracing) {
        const r = props.kit.trace(stroke, model.value, traced.value, size);
        if (r !== 'ok') {
            say(r === 'direction' ? `${traced.value + 1}かくめは かく むきに きを つけよう` : 'もういちど なぞろう', 'incorrect');
            pad.value?.undo();
            return;
        }
        traced.value++;
        glow.value++;
        if (traced.value >= expected.value) cast(false);
        else say(`${traced.value + 1}かくめを なぞろう`);
        return;
    }
    if (expected.value > 0 && count.value >= expected.value) {
        clearTimeout(autoCast);
        autoCast = setTimeout(() => cast(false), AUTO_CONFIRM_MS);
    }
}

// The spell goes off: judged now, with what is written
function cast(timedOut: boolean) {
    if (shown.value || closed) return;
    stopWriting();
    remaining.value = Math.max(0, deadline - performance.now());
    let next: SpellOutcome;
    if (tracing) {
        const all = expected.value > 0 && traced.value >= expected.value;
        next = { kanji: kanji.value, grade: all ? 'success' : 'fail', traced: true, timedOut, result: null };
        say(all ? 'よく なぞれたね！' : 'じかんぎれ… つぎは さいごまで なぞろう', all ? 'correct' : 'incorrect');
    } else {
        const p = pad.value;
        const writing = p ? p.strokes().map(s => s.slice()) : [];
        judged.value = { writing, size: p?.size() ?? 0 };
        const r = gradeSpell(writing, kanji.value, props.kit, { strokeOrder: props.settings.strokeOrder });
        next = { kanji: kanji.value, grade: r.grade, traced: false, timedOut, result: r };
        const text = outcomeMessage(r.grade, r.verdict);
        const good = r.grade === 'perfect' || r.grade === 'success';
        say(timedOut && !good ? `じかんぎれ… ${text}` : text, good ? 'correct' : 'incorrect');
    }
    outcome.value = next;
    shownAt = performance.now();
    emit('judged', next);
    // ?debug: stays open to read the numbers
    if (!tegakiDebug) {
        const quick = next.grade === 'perfect' || next.traced;
        autoClose = setTimeout(finish, quick ? PERFECT_SHOW_MS : MODEL_SHOW_MS);
    }
}

function finish() {
    if (closed) return;
    closed = true;
    stopWriting();
    clearTimeout(autoClose);
    if (dialog.value?.open) dialog.value.close();
    emit('done', outcome.value!);
}

// A tap while the result is shown skips it (not the tap that cast the spell). pointerup too: a
// touch on the square gives no click (noSelect.ts stops it, for Safari's long press)
function onTap() {
    if (shown.value && performance.now() - shownAt > 300) finish();
}

// Esc (or the back gesture) cannot take the spell away; if the dialog closes all the same,
// the spell goes off with what is written
function onClose() {
    if (closed) return;
    cast(false);
    finish();
}

onMounted(() => {
    dialog.value?.showModal();
    deadline = performance.now() + totalMs;
    // The deadline is kept by a timer too: requestAnimationFrame stops in a hidden tab
    timeUp = setTimeout(() => cast(true), totalMs);
    frame = requestAnimationFrame(tick);
    // No model (should not happen): nothing to write
    if (expected.value === 0) cast(false);
});
onBeforeUnmount(() => {
    stopWriting();
    clearTimeout(autoClose);
});
</script>

<template>
    <dialog ref="dialog" class="spell-overlay no-select" aria-label="まほうじん" @cancel.prevent @close="onClose" @click="onTap" @pointerup="onTap">
        <div class="spell-panel">
            <SpellPrompt class="spell-question" :reibun="question.reibun" :answer="shown ? kanji : null" />

            <div class="spell-time" :class="{ 'is-hurry': hurry }" role="timer" :aria-label="`のこり ${seconds}びょう`">
                <div class="spell-time-bar" :style="{ transform: `scaleX(${remaining / totalMs})` }"></div>
                <span class="spell-time-text">のこり {{ seconds }}びょう</span>
            </div>

            <div class="spell-circle" :class="outcome ? `is-${outcome.grade}` : 'is-writing'">
                <svg class="spell-ring" viewBox="0 0 100 100" aria-hidden="true">
                    <circle class="ring-line" cx="50" cy="50" r="49" />
                    <circle class="ring-line thin" cx="50" cy="50" r="40.5" />
                    <g class="ring-runes">
                        <path v-for="(r, i) in runes" :key="i" class="rune" :class="{ 'is-lit': i < lit }" :d="r.d" :transform="r.transform" />
                    </g>
                </svg>
                <div :key="glow" class="spell-glow" :class="{ 'is-on': glow > 0 }" aria-hidden="true"></div>
                <div class="spell-pad tegaki">
                    <WritingPad ref="pad" :locked="shown" :faded="showModel" :mark="mark" :highlight="showModel ? marks.written : null"
                        @count="onCount" @stroke="onStroke">
                        <template #under>
                            <ModelStrokes v-if="tracing && !shown" :model="model" :guide="traced" />
                        </template>
                        <ModelStrokes v-if="tracing && !shown" :model="model" :guide="traced" layer="over" />
                        <!-- The model with the stroke order, unless it was かんぺき -->
                        <ModelStrokes v-if="showModel" :model="model" :wrong="marks.stroke" />
                    </WritingPad>
                </div>
            </div>

            <p v-if="outcome" class="spell-grade" :class="outcome.grade">{{ outcome.traced && outcome.grade === 'success' ? 'れんしゅう せいこう' : SPELL_GRADE_LABEL[outcome.grade] }}</p>
            <p class="spell-message" :class="messageKind" aria-live="polite">{{ message }}</p>

            <div class="tegaki-actions">
                <template v-if="!shown">
                    <button type="button" class="btn" :disabled="count === 0" @click="pad?.undo()">1かく もどす</button>
                    <button type="button" class="btn" :disabled="count === 0" @click="pad?.clear()">ぜんぶ けす</button>
                    <button v-if="!tracing" type="button" class="btn btn-primary" @click="cast(false)">はつどう！</button>
                </template>
                <button v-else type="button" class="btn btn-primary" @click.stop="finish">つぎへ</button>
            </div>

            <SpellDebug v-if="tegakiDebug && result && judged" :kanji="kanji" :grade="question.item.grade"
                :stroke-order="settings.strokeOrder" :result="result" :limits="debugLimits" :writing="judged.writing" :size="judged.size" />
        </div>
        <MuteButton @click.stop />
    </dialog>
</template>

<style scoped>
/* The colours of the magic, the same in light and dark (the circle is drawn on a dark veil) */
.spell-overlay {
    /* Dark enough to read on, the battle still seen faintly behind */
    --spell-veil: rgb(18 14 40 / 0.95);
    --spell-line: #9d93e6;
    --spell-rune: #6b62b3;
    --spell-gold: #ffd45a;
    --spell-fail: #7c7a88;
    --spell-text: #f6f3ff;
}

.spell-overlay:modal {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: max(0.75rem, env(safe-area-inset-top)) 1rem max(0.75rem, env(safe-area-inset-bottom));
    border: 0;
    background: var(--spell-veil);
    color: var(--spell-text);
    overflow: auto;
    overscroll-behavior: contain;
}

.spell-overlay::backdrop {
    background: transparent;
    overflow: hidden;
    overscroll-behavior: contain;
}

.spell-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.6rem;
    min-height: 100%;
    max-width: 40rem;
    margin: 0 auto;
}

/* The phrase on paper, as in the practice page */
.spell-question {
    padding: 0.25rem 1rem;
    border-radius: 0.75rem;
    background: var(--paper);
    color: var(--ink);
}

.spell-time {
    position: relative;
    width: min(100%, 24rem);
    height: 1.75rem;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.15);
    overflow: hidden;
}

.spell-time-bar {
    position: absolute;
    inset: 0;
    background: var(--spell-line);
    transform-origin: left;
    transition: background-color 0.3s;
}

.spell-time.is-hurry .spell-time-bar {
    background: var(--red);
}

.spell-time-text {
    position: relative;
    display: block;
    text-align: center;
    font-weight: 700;
    font-size: 1rem;
    line-height: 1.75rem;
    text-shadow: 0 1px 2px rgb(0 0 0 / 0.6);
}

/* The circle: as big as the screen allows. The square is set in it, its corners out of the ring */
.spell-circle {
    position: relative;
    flex: none;
    width: min(100% - 2rem, 100dvh - 19rem, 34rem);
    min-width: 15rem;
    aspect-ratio: 1;
    margin: 1rem 0;
}

.spell-ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
}

.ring-line {
    fill: none;
    stroke: var(--spell-line);
    stroke-width: 0.8;
    transition: stroke 0.4s;
}

.ring-line.thin {
    stroke-width: 0.4;
}

.ring-runes {
    transform-origin: 50px 50px;
}

.rune {
    fill: none;
    stroke: var(--spell-rune);
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    transition: stroke 0.25s;
}

.rune.is-lit {
    stroke: var(--spell-gold);
    filter: drop-shadow(0 0 1.2px var(--spell-gold));
}

.is-perfect .ring-line,
.is-success .ring-line {
    stroke: var(--spell-gold);
}

.is-perfect .spell-ring {
    filter: drop-shadow(0 0 6px var(--spell-gold));
}

.is-fail .ring-line,
.is-fail .rune {
    stroke: var(--spell-fail);
    filter: none;
}

/* Motion only for those who have not asked for less: the runes turn slowly while writing, and
   fast when the spell is かんぺき */
@media (prefers-reduced-motion: no-preference) {
    .is-writing .ring-runes {
        animation: spell-turn 60s linear infinite;
    }

    .is-perfect .ring-runes {
        animation: spell-turn 1.5s ease-out;
    }
}

@keyframes spell-turn {
    to {
        transform: rotate(1turn);
    }
}

/* A stroke traced right: a soft gold light once (not flashing) */
.spell-glow {
    position: absolute;
    inset: 4%;
    border-radius: 50%;
    pointer-events: none;
    box-shadow: 0 0 2rem 0.5rem var(--spell-gold);
    opacity: 0;
}

.spell-glow.is-on {
    animation: spell-glow 0.6s ease-out;
}

@keyframes spell-glow {
    from {
        opacity: 0.8;
    }
}

/* The square in the circle: 76% of it */
.spell-pad {
    position: absolute;
    inset: 12%;
    min-height: 0;
}

.spell-pad :deep(.tegaki-space) {
    min-height: 0;
}

.spell-grade {
    font-family: var(--hand);
    font-weight: 600;
    font-size: 2rem;
    line-height: 1.2;
}

.spell-grade.perfect,
.spell-grade.success {
    color: var(--spell-gold);
}

.spell-message {
    min-height: 1.7em;
    font-family: var(--hand);
    font-weight: 600;
    text-align: center;
}

.spell-message.incorrect {
    color: #ffb3a8;
}

.spell-panel .tegaki-actions {
    flex-wrap: wrap;
}

/* Not see-through: the page behind would show in a button that cannot be pressed */
.spell-panel .btn:disabled {
    opacity: 1;
    color: var(--muted);
}

.spell-panel :deep(.spell-debug) {
    color: var(--ink);
    background: var(--paper);
}
</style>
