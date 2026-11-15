<script setup lang="ts">
// --- The spell sent in Morse code (for a PC with no touch screen: the せってい chooses it) ---
// Over the battle, as the magic circle (SpellOverlay): the word to send (FIRE1A), the time, the
// keys. The word is sent a letter at a time: a letter right goes on to the next, a wrong one is a
// miss and is sent again. 初級 shows the code under each letter. The spell goes off when all is
// sent or the time runs out (morse/spell.ts: the result), then the result, and it closes.
// Emits judged when the spell goes off and done when it closes, as SpellOverlay.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import MuteButton from './MuteButton.vue';
import { useNoSelect } from './noSelect';
import { MODEL_SHOW_MS, PERFECT_SHOW_MS } from '../config';
import { charOf, codeOf, dotsAndDashes } from '../morse/code';
import { DOT_MS, useKeyer, type PaddleSymbol } from '../morse/keyer';
import { morseGrade, morseSeconds } from '../morse/spell';
import { SPELL_GRADE_LABEL, type SpellOutcome } from '../spell/grade';
import type { Keyer, MorseLevel } from '../storage';
import { play, sideTone, sideToneOff, sideToneOn } from '../sound';

const props = defineProps<{
    word: string;
    settings: { keyer: Keyer; level: MorseLevel };
}>();
const emit = defineEmits<{
    judged: [outcome: SpellOutcome];
    done: [outcome: SpellOutcome];
}>();

const totalMs = morseSeconds(props.word) * 1000;
const paddle = props.settings.keyer === 'paddle';

const dialog = ref<HTMLDialogElement | null>(null);
useNoSelect(dialog);
const sent = ref(0);
const misses = ref(0);
// The last letter keyed wrong (shown a moment), and a number to start its shake again
const wrong = ref<string | null>(null);
const shake = ref(0);
const remaining = ref(totalMs);
const outcome = shallowRef<SpellOutcome | null>(null);
const message = ref(paddle ? 'J（トン）と K（ツー）で おくろう' : 'スペースキーを おす ながさで おくろう');
const messageKind = ref<'' | 'correct' | 'incorrect'>('');
// The lamp: on while a symbol sounds (or the 電鍵 is down)
const lamp = ref(false);
let lampOff: ReturnType<typeof setTimeout> | undefined;

const letters = computed(() => [...props.word].map((c, i) => ({
    c,
    hint: props.settings.level === 'easy' ? dotsAndDashes(codeOf(c)) : '',
    state: i < sent.value ? 'done' : i === sent.value && !outcome.value ? 'now' : 'todo'
})));
const seconds = computed(() => Math.ceil(remaining.value / 1000));
const hurry = computed(() => !outcome.value && remaining.value <= 5000);

function say(text: string, kind: '' | 'correct' | 'incorrect' = '') {
    message.value = text;
    messageKind.value = kind;
}

// --- The keys ---
function onSymbol(s: PaddleSymbol) {
    if (!paddle) return;
    const ms = s === '.' ? DOT_MS : DOT_MS * 3;
    sideTone(ms);
    lamp.value = true;
    clearTimeout(lampOff);
    lampOff = setTimeout(() => (lamp.value = false), ms);
}

function onHeld(h: PaddleSymbol | 'key' | null) {
    if (paddle) return;
    lamp.value = h === 'key';
    if (h === 'key') sideToneOn();
    else sideToneOff();
}

function onLetter(code: string) {
    if (outcome.value) return;
    const c = charOf(code);
    if (c === props.word[sent.value]) {
        sent.value++;
        wrong.value = null;
        play('rune');
        if (sent.value >= props.word.length) cast(false);
        else say('いいね！ つぎの もじ', 'correct');
        return;
    }
    misses.value++;
    wrong.value = c || '？';
    shake.value++;
    say(`${dotsAndDashes(code)} は「${c || '？'}」だよ。もう いちど`, 'incorrect');
}

const { keyer, buffer, paddleButton, keyButton } = useKeyer(() => props.settings.keyer, {
    symbol: onSymbol,
    held: onHeld,
    letter: onLetter
}, () => !outcome.value);
const reading = computed(() => (buffer.value ? charOf(buffer.value) || '？' : ''));

// --- The time ---
let deadline = 0;
let frame = 0;
let timeUp: ReturnType<typeof setTimeout> | undefined;
let autoClose: ReturnType<typeof setTimeout> | undefined;
let shownAt = 0;
let closed = false;

function tick() {
    remaining.value = Math.max(0, deadline - performance.now());
    if (!outcome.value) frame = requestAnimationFrame(tick);
}

function stopSending() {
    clearTimeout(timeUp);
    cancelAnimationFrame(frame);
    keyer.reset();
    sideToneOff();
    lamp.value = false;
}

// The spell goes off: what is sent so far
function cast(timedOut: boolean) {
    if (outcome.value || closed) return;
    stopSending();
    remaining.value = Math.max(0, deadline - performance.now());
    const grade = morseGrade(props.word, sent.value, misses.value);
    const next: SpellOutcome = { kanji: '', morse: props.word, grade, traced: false, timedOut, result: null };
    const good = grade === 'perfect' || grade === 'success';
    const text = grade === 'perfect' ? 'ミス なし！ すごい！' : good ? `ミス ${misses.value}かい。よく できたね` : grade === 'close' ? 'あと すこし！' : 'つぎは がんばろう';
    say(timedOut && !good ? `じかんぎれ… ${text}` : text, good ? 'correct' : 'incorrect');
    outcome.value = next;
    shownAt = performance.now();
    emit('judged', next);
    autoClose = setTimeout(finish, grade === 'perfect' ? PERFECT_SHOW_MS : MODEL_SHOW_MS);
}

function finish() {
    if (closed) return;
    closed = true;
    stopSending();
    clearTimeout(autoClose);
    if (dialog.value?.open) dialog.value.close();
    emit('done', outcome.value!);
}

// A tap or a click while the result is shown skips it
function onTap() {
    if (outcome.value && performance.now() - shownAt > 300) finish();
}

// Esc cannot take the spell away; if the dialog closes all the same, it goes off with what is sent
function onClose() {
    if (closed) return;
    cast(false);
    finish();
}

onMounted(() => {
    dialog.value?.showModal();
    // Nothing focused: Space and Enter are the keys here, not a button's
    (document.activeElement as HTMLElement | null)?.blur?.();
    deadline = performance.now() + totalMs;
    timeUp = setTimeout(() => cast(true), totalMs);
    frame = requestAnimationFrame(tick);
});
onBeforeUnmount(() => {
    stopSending();
    clearTimeout(autoClose);
    clearTimeout(lampOff);
});
</script>

<template>
    <dialog ref="dialog" class="morse-overlay no-select" aria-label="モールスの まほう" @cancel.prevent @close="onClose" @click="onTap">
        <div class="morse-panel">
            <div class="morse-time" :class="{ 'is-hurry': hurry }" role="timer" :aria-label="`のこり ${seconds}びょう`">
                <div class="morse-time-bar" :style="{ transform: `scaleX(${remaining / totalMs})` }"></div>
                <span class="morse-time-text">のこり {{ seconds }}びょう</span>
            </div>

            <ol class="morse-word" :class="outcome ? `is-${outcome.grade}` : ''" :aria-label="`おくる ことば ${word}`">
                <li v-for="(l, i) in letters" :key="i" class="letter" :class="`is-${l.state}`">
                    <span :key="l.state === 'now' ? shake : 0" class="letter-char" :class="{ 'is-wrong': l.state === 'now' && wrong }">{{ l.c }}</span>
                    <span v-if="l.hint" class="letter-hint">{{ l.hint }}</span>
                </li>
            </ol>

            <div class="morse-now" aria-live="off">
                <span class="lamp" :class="{ 'is-on': lamp }" aria-hidden="true"></span>
                <span class="now-code">{{ buffer ? dotsAndDashes(buffer) : '　' }}</span>
                <span class="now-char">{{ reading }}</span>
            </div>

            <p v-if="outcome" class="morse-grade" :class="outcome.grade">{{ SPELL_GRADE_LABEL[outcome.grade] }}</p>
            <p class="morse-message" :class="messageKind" aria-live="polite">{{ message }}</p>

            <template v-if="!outcome">
                <div v-if="paddle" class="keys">
                    <button type="button" class="key" tabindex="-1" v-bind="paddleButton('.')"><b>・</b><small>トン（J・F）</small></button>
                    <button type="button" class="key" tabindex="-1" v-bind="paddleButton('-')"><b>－</b><small>ツー（K・D）</small></button>
                </div>
                <div v-else class="keys">
                    <button type="button" class="key key-straight" :class="{ 'is-down': lamp }" tabindex="-1" v-bind="keyButton">
                        <b>でんけん</b><small>みじかく おすと トン・ながく おすと ツー（スペース）</small>
                    </button>
                </div>
                <div class="morse-actions">
                    <button type="button" class="btn" tabindex="-1" :disabled="!buffer" @click="keyer.back()">1つ もどす（BS）</button>
                    <button type="button" class="btn" tabindex="-1" :disabled="!buffer" @click="keyer.commit()">もじを きめる（Enter）</button>
                </div>
            </template>
            <button v-else type="button" class="btn btn-primary" @click.stop="finish">つぎへ</button>
        </div>
        <MuteButton @click.stop />
    </dialog>
</template>

<style scoped>
/* The colours of the magic circle (SpellOverlay), the same in light and dark */
.morse-overlay {
    --spell-veil: rgb(18 14 40 / 0.95);
    --spell-line: #9d93e6;
    --spell-gold: #ffd45a;
    --spell-fail: #7c7a88;
    --spell-text: #f6f3ff;
}

.morse-overlay:modal {
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

.morse-overlay::backdrop {
    background: transparent;
}

.morse-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 48rem;
    margin: 0 auto;
    padding-top: 2.5rem;
}

.morse-time {
    position: relative;
    width: min(100%, 24rem);
    height: 1.75rem;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.15);
    overflow: hidden;
}

.morse-time-bar {
    position: absolute;
    inset: 0;
    background: var(--spell-line);
    transform-origin: left;
}

.morse-time.is-hurry .morse-time-bar {
    background: var(--red);
}

.morse-time-text {
    position: relative;
    display: block;
    text-align: center;
    font-weight: 700;
    font-size: 1rem;
    line-height: 1.75rem;
    text-shadow: 0 1px 2px rgb(0 0 0 / 0.6);
}

/* The word: a box for each letter, the code under it (初級) */
.morse-word {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin: 0.5rem 0;
    padding: 0;
    list-style: none;
}

.letter {
    display: grid;
    justify-items: center;
    align-content: start;
    min-width: 3.6rem;
    padding: 0.4rem 0.5rem;
    border: 3px solid rgb(255 255 255 / 0.2);
    border-radius: 0.75rem;
}

.letter-char {
    font-size: 2.6rem;
    font-weight: 700;
    line-height: 1.1;
}

.letter-hint {
    font-size: 0.85rem;
    letter-spacing: 0.05em;
    opacity: 0.85;
    white-space: nowrap;
}

.letter.is-done {
    border-color: var(--spell-gold);
    color: var(--spell-gold);
}

.letter.is-now {
    border-color: #fff;
    background: rgb(255 255 255 / 0.12);
}

.letter.is-todo {
    opacity: 0.7;
}

.letter-char.is-wrong {
    color: #ffb3a8;
}

.is-fail .letter {
    border-color: var(--spell-fail);
}

/* What is keyed now: the lamp, the code, what it reads */
.morse-now {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 3rem;
    font-size: 1.6rem;
    font-weight: 700;
}

.lamp {
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    background: #3b355e;
    box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.25);
}

.lamp.is-on {
    background: var(--spell-gold);
    box-shadow: 0 0 0.8rem var(--spell-gold);
}

.now-code {
    min-width: 6rem;
    letter-spacing: 0.1em;
}

.now-char {
    min-width: 2rem;
    color: var(--spell-line);
}

.morse-grade {
    font-family: var(--hand);
    font-weight: 600;
    font-size: 2rem;
    line-height: 1.2;
}

.morse-grade.perfect,
.morse-grade.success {
    color: var(--spell-gold);
}

.morse-message {
    min-height: 1.7em;
    font-family: var(--hand);
    font-weight: 600;
    text-align: center;
}

.morse-message.incorrect {
    color: #ffb3a8;
}

.morse-message.correct {
    color: var(--spell-gold);
}

.keys {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.75rem;
    width: min(100%, 32rem);
}

.key {
    display: grid;
    justify-items: center;
    gap: 0.2rem;
    min-height: 6rem;
    padding: 0.75rem;
    border: 3px solid var(--spell-line);
    border-radius: 1rem;
    background: rgb(255 255 255 / 0.08);
    color: var(--spell-text);
    font: inherit;
    cursor: pointer;
    touch-action: none;
}

.key b {
    font-size: 2rem;
    line-height: 1;
}

.key small {
    font-size: 0.95rem;
}

.key:active,
.key.is-down {
    background: rgb(255 212 90 / 0.25);
    border-color: var(--spell-gold);
}

.key-straight {
    grid-column: 1 / -1;
}

.key-straight b {
    font-size: 1.6rem;
}

.morse-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
}

/* On paper: the text of the panel is light */
.morse-panel .btn:not(.btn-primary) {
    color: var(--ink);
}

/* Not see-through: the page behind would show in a button that cannot be pressed */
.morse-panel .btn:disabled {
    opacity: 1;
    color: var(--muted);
}

@media (prefers-reduced-motion: no-preference) {
    .letter-char.is-wrong {
        animation: morse-shake 0.3s;
    }
}

@keyframes morse-shake {
    25% {
        transform: translateX(-4px);
    }

    75% {
        transform: translateX(4px);
    }
}
</style>
