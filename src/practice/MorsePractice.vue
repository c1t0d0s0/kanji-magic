<script setup lang="ts">
// --- モールス しんごう の れんしゅう (practice.html): no time limit, with code chart & audio playback ---
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useNoSelect } from '../components/noSelect';
import { SPELL_MULTIPLIER } from '../config';
import { charOf, codeOf, dotsAndDashes, MORSE } from '../morse/code';
import { DOT_MS, useKeyer, type PaddleSymbol } from '../morse/keyer';
import { morseGrade, morseWord, type WordKind } from '../morse/spell';
import { SPELL_GRADE_LABEL, type SpellGrade } from '../spell/grade';
import { loadSave, type Keyer, type MorseLevel } from '../storage';
import { play, sideTone, sideToneOff, sideToneOn, unlockAudio } from '../sound';

type KindChoice = 'random' | WordKind;
const KINDS: { id: KindChoice; label: string }[] = [
    { id: 'random', label: 'ランダム' },
    { id: 'fire', label: 'ほのお' },
    { id: 'water', label: 'みず' },
    { id: 'wood', label: 'き' },
    { id: 'guard', label: 'まもり' }
];
const ALL_WORD_KINDS: readonly WordKind[] = ['fire', 'water', 'wood', 'guard'];

const saved = loadSave().settings;
const keyerKind = ref<Keyer>(saved.keyer);
const level = ref<MorseLevel>(saved.morseLevel);
const kind = ref<KindChoice>('random');

const root = ref<HTMLElement | null>(null);
useNoSelect(root);

const word = ref('');
const sent = ref(0);
const misses = ref(0);
const wrong = ref<string | null>(null);
const shake = ref(0);
const grade = ref<SpellGrade | null>(null);
const message = ref('');
const messageKind = ref<'' | 'correct' | 'incorrect'>('');
const lamp = ref(false);
let lampOff: ReturnType<typeof setTimeout> | undefined;
let demoTimers: ReturnType<typeof setTimeout>[] = [];

const paddle = computed(() => keyerKind.value === 'paddle');

const letters = computed(() => [...word.value].map((c, i) => ({
    c,
    hint: level.value === 'easy' ? dotsAndDashes(codeOf(c)) : '',
    state: i < sent.value ? 'done' : i === sent.value && !grade.value ? 'now' : 'todo'
})));

const CHART = Object.entries(MORSE).map(([c, code]) => ({ c, code, show: dotsAndDashes(code) }));

function say(text: string, kindName: '' | 'correct' | 'incorrect' = '') {
    message.value = text;
    messageKind.value = kindName;
}

function defaultHint() {
    return paddle.value ? 'J（トン）と K（ツー）で おくろう' : 'スペースキーを おす ながさで おくろう';
}

function stopDemo() {
    for (const id of demoTimers) clearTimeout(id);
    demoTimers = [];
}

function blurFocus() {
    (document.activeElement as HTMLElement | null)?.blur?.();
}

function nextWord(same = false) {
    stopDemo();
    keyer.reset();
    sideToneOff();
    lamp.value = false;
    if (!same) {
        const chosen: WordKind = kind.value === 'random'
            ? ALL_WORD_KINDS[Math.floor(Math.random() * ALL_WORD_KINDS.length)]
            : kind.value;
        word.value = morseWord(chosen);
    }
    sent.value = 0;
    misses.value = 0;
    wrong.value = null;
    grade.value = null;
    say(defaultHint());
    blurFocus();
}

function setKeyerKind(next: Keyer) {
    keyerKind.value = next;
    keyer.reset();
    sideToneOff();
    lamp.value = false;
    if (!grade.value) say(defaultHint());
    blurFocus();
}

function setKind(next: KindChoice) {
    kind.value = next;
    nextWord();
}

function onSymbol(s: PaddleSymbol) {
    unlockAudio();
    if (!paddle.value) return;
    const ms = s === '.' ? DOT_MS : DOT_MS * 3;
    sideTone(ms);
    lamp.value = true;
    clearTimeout(lampOff);
    lampOff = setTimeout(() => (lamp.value = false), ms);
}

function onHeld(h: PaddleSymbol | 'key' | null) {
    unlockAudio();
    if (paddle.value) return;
    lamp.value = h === 'key';
    if (h === 'key') sideToneOn();
    else sideToneOff();
}

function onLetter(code: string) {
    if (grade.value) return;
    const c = charOf(code);
    if (c === word.value[sent.value]) {
        sent.value++;
        wrong.value = null;
        play('rune');
        if (sent.value >= word.value.length) {
            const g = morseGrade(word.value, sent.value, misses.value);
            grade.value = g;
            keyer.reset();
            sideToneOff();
            lamp.value = false;
            play(g);
            const good = g === 'perfect' || g === 'success';
            say(
                g === 'perfect' ? 'ミス なし！ すごい！' : good ? `ミス ${misses.value}かい。よく できたね` : `ミス ${misses.value}かい。もう いちど やってみよう`,
                good ? 'correct' : 'incorrect'
            );
        } else {
            say('いいね！ つぎの もじ', 'correct');
        }
        return;
    }
    misses.value++;
    wrong.value = c || '？';
    shake.value++;
    say(`${dotsAndDashes(code)} は「${c || '？'}」だよ。もう いちど`, 'incorrect');
}

// Play an example sound + lamp blink for a character in the reference chart
function playSample(char: string) {
    unlockAudio();
    stopDemo();
    const code = codeOf(char);
    if (!code) return;
    let at = 0;
    for (const sym of code) {
        const len = sym === '.' ? DOT_MS : DOT_MS * 3;
        demoTimers.push(setTimeout(() => {
            sideTone(len);
            lamp.value = true;
        }, at));
        demoTimers.push(setTimeout(() => {
            lamp.value = false;
        }, at + len));
        at += len + DOT_MS;
    }
    blurFocus();
}

const { keyer, buffer, paddleButton, keyButton } = useKeyer(
    () => keyerKind.value,
    { symbol: onSymbol, held: onHeld, letter: onLetter },
    () => !grade.value
);
const reading = computed(() => (buffer.value ? charOf(buffer.value) || '？' : ''));

function onUserWake() {
    unlockAudio();
}

onMounted(() => {
    window.addEventListener('pointerdown', onUserWake, { once: true });
    window.addEventListener('keydown', onUserWake, { once: true });
    nextWord();
});

onBeforeUnmount(() => {
    stopDemo();
    clearTimeout(lampOff);
    sideToneOff();
    window.removeEventListener('pointerdown', onUserWake);
    window.removeEventListener('keydown', onUserWake);
});
</script>

<template>
    <section ref="root" class="morse-practice no-select">
        <div class="morse-settings">
            <div class="group" role="group" aria-label="うちかた">
                <button type="button" class="btn" :class="{ 'btn-primary': paddle }" :aria-pressed="paddle" @click="setKeyerKind('paddle')">パドル（J・K）</button>
                <button type="button" class="btn" :class="{ 'btn-primary': !paddle }" :aria-pressed="!paddle" @click="setKeyerKind('straight')">でんけん（スペース）</button>
            </div>
            <div class="group" role="group" aria-label="むずかしさ">
                <button type="button" class="btn" :class="{ 'btn-primary': level === 'easy' }" :aria-pressed="level === 'easy'" @click="level = 'easy'; blurFocus()">しょきゅう</button>
                <button type="button" class="btn" :class="{ 'btn-primary': level === 'hard' }" :aria-pressed="level === 'hard'" @click="level = 'hard'; blurFocus()">じょうきゅう</button>
            </div>
            <div class="group" role="group" aria-label="ことば">
                <button v-for="k in KINDS" :key="k.id" type="button" class="btn" :class="{ 'btn-primary': kind === k.id }" :aria-pressed="kind === k.id" @click="setKind(k.id)">
                    {{ k.label }}
                </button>
            </div>
        </div>

        <div class="card morse-stage">
            <ol class="morse-word" :aria-label="`おくる ことば ${word}`">
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

            <div v-if="grade" class="outcome" :class="grade">
                <p class="outcome-grade">{{ SPELL_GRADE_LABEL[grade] }}<span class="outcome-power">いりょく ×{{ SPELL_MULTIPLIER[grade] }}</span></p>
            </div>
            <p class="morse-message" :class="messageKind" aria-live="polite">{{ message }}</p>

            <template v-if="!grade">
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
                    <button type="button" class="btn" tabindex="-1" @click="nextWord()">ことばを かえる</button>
                </div>
            </template>
            <div v-else class="morse-actions">
                <button type="button" class="btn" @click="nextWord(true)">もう いちど</button>
                <button type="button" class="btn btn-primary" @click="nextWord()">つぎの もんだい</button>
            </div>
        </div>

        <details class="card chart-box">
            <summary>モールス ふごう ひょう（おすと おとが きけるよ）</summary>
            <div class="chart-grid">
                <button v-for="item in CHART" :key="item.c" type="button" class="chart-cell" @click="playSample(item.c)">
                    <b>{{ item.c }}</b>
                    <span>{{ item.show }}</span>
                </button>
            </div>
        </details>
    </section>
</template>

<style scoped>
.morse-practice {
    display: grid;
    gap: 0.75rem;
}

.morse-settings {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
}

.group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
}

.morse-stage {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.85rem;
    padding: 1rem;
    background: #1a1536;
    border-color: #6b5ed6;
    color: #f6f3ff;
}

.morse-word {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.letter {
    display: grid;
    justify-items: center;
    align-content: start;
    min-width: 3.4rem;
    padding: 0.35rem 0.45rem;
    border: 3px solid rgb(255 255 255 / 0.22);
    border-radius: 0.7rem;
}

.letter-char {
    font-size: 2.3rem;
    font-weight: 700;
    line-height: 1.1;
}

.letter-hint {
    font-size: 0.82rem;
    letter-spacing: 0.04em;
    opacity: 0.88;
    white-space: nowrap;
}

.letter.is-done {
    border-color: #ffd45a;
    color: #ffd45a;
}

.letter.is-now {
    border-color: #fff;
    background: rgb(255 255 255 / 0.14);
}

.letter.is-todo {
    opacity: 0.7;
}

.letter-char.is-wrong {
    color: #ffb3a8;
}

.morse-now {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 2.6rem;
    font-size: 1.5rem;
    font-weight: 700;
}

.lamp {
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 50%;
    background: #3b355e;
    box-shadow: inset 0 0 0 2px rgb(255 255 255 / 0.25);
}

.lamp.is-on {
    background: #ffd45a;
    box-shadow: 0 0 0.8rem #ffd45a;
}

.now-code {
    min-width: 5.5rem;
    letter-spacing: 0.1em;
}

.now-char {
    min-width: 2rem;
    color: #b4a7ff;
}

.outcome {
    text-align: center;
}

.outcome-grade {
    margin: 0;
    font-family: var(--hand);
    font-weight: 600;
    font-size: 2rem;
    line-height: 1.2;
}

.outcome.perfect .outcome-grade,
.outcome.success .outcome-grade {
    color: #ffd45a;
}

.outcome-power {
    margin-left: 0.5em;
    font-size: 0.5em;
    color: #c8c2e8;
}

.morse-message {
    margin: 0;
    min-height: 1.6em;
    font-family: var(--hand);
    font-weight: 600;
    text-align: center;
}

.morse-message.incorrect {
    color: #ffb3a8;
}

.morse-message.correct {
    color: #ffd45a;
}

.keys {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(9.5rem, 1fr));
    gap: 0.65rem;
    width: min(100%, 30rem);
}

.key {
    display: grid;
    justify-items: center;
    gap: 0.2rem;
    min-height: 5.5rem;
    padding: 0.65rem;
    border: 3px solid #9d93e6;
    border-radius: 1rem;
    background: rgb(255 255 255 / 0.08);
    color: #f6f3ff;
    font: inherit;
    cursor: pointer;
    touch-action: none;
}

.key b {
    font-size: 1.9rem;
    line-height: 1;
}

.key small {
    font-size: 0.9rem;
}

.key:active,
.key.is-down {
    background: rgb(255 212 90 / 0.25);
    border-color: #ffd45a;
}

.key-straight {
    grid-column: 1 / -1;
}

.key-straight b {
    font-size: 1.5rem;
}

.morse-actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
}

.morse-stage .btn:not(.btn-primary) {
    color: var(--ink);
}

.morse-stage .btn:disabled {
    opacity: 1;
    color: var(--muted);
}

.chart-box summary {
    font-weight: 700;
    cursor: pointer;
}

.chart-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(5.2rem, 1fr));
    gap: 0.35rem;
    margin-top: 0.65rem;
}

.chart-cell {
    display: grid;
    justify-items: center;
    padding: 0.3rem 0.2rem;
    border: 2px solid var(--rule);
    border-radius: 0.5rem;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
}

.chart-cell b {
    font-size: 1.1rem;
    line-height: 1.2;
}

.chart-cell span {
    font-size: 0.8rem;
    color: var(--muted);
    letter-spacing: 0.04em;
}

@media (prefers-reduced-motion: no-preference) {
    .letter-char.is-wrong {
        animation: morse-shake 0.3s;
    }
}

@keyframes morse-shake {
    25% { transform: translateX(-4px); }
    75% { transform: translateX(4px); }
}
</style>
