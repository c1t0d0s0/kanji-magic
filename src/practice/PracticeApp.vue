<script setup lang="ts">
// --- まほうの れんしゅう: a question → the writing → かんぺき / せいこう / おしい / ふはつ, with the model ---
// No battle and no time limit: to try the judging (and tune PERFECT_MARGIN) with children.
// ?debug shows the measures of each spell
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue';
import WritingPad from '../vendor/kanji-quiz/src/components/WritingPad.vue';
import ModelStrokes from '../vendor/kanji-quiz/src/components/ModelStrokes.vue';
import type { Stroke } from '../vendor/kanji-quiz/src/core/handwriting';
import type { KanjiItem } from '../vendor/kanji-quiz/src/data/kanji';
import type { Reibun } from '../vendor/kanji-quiz/src/data/reibun';
import SpellPrompt from '../components/SpellPrompt.vue';
import SpellDebug from '../components/SpellDebug.vue';
import { useNoSelect } from '../components/noSelect';
import { AUTO_CONFIRM_MS, SPELL_MULTIPLIER } from '../config';
import { gradeSpell, SPELL_GRADE_LABEL, type SpellResult } from '../spell/grade';
import { pickQuestion } from '../spell/question';
import { loadTegaki, outcomeMessage, tegakiDebug, verdictMarks, type TegakiKit } from '../spell/tegaki';

const GRADES = [1, 2, 3, 4, 5, 6];

const kit = shallowRef<TegakiKit | null>(null);
const failed = ref(false);
const grade = ref(1);
const strokeOrder = ref(false);

const item = shallowRef<KanjiItem | null>(null);
const reibun = shallowRef<Reibun | null>(null);
const recent: string[] = [];

const pad = ref<InstanceType<typeof WritingPad> | null>(null);
const count = ref(0);
const result = shallowRef<SpellResult | null>(null);
// The writing judged, and the size of the square it was written in (for ?debug)
const judged = shallowRef<{ writing: Stroke[]; size: number } | null>(null);

const model = computed(() => (item.value && kit.value ? kit.value.strokes[item.value.kanji] ?? null : null));
const locked = computed(() => result.value !== null);
const marks = computed(() => verdictMarks(result.value?.verdict ?? null));
const ready = computed(() => kit.value !== null && item.value !== null);

async function load() {
    failed.value = false;
    try {
        kit.value = await loadTegaki();
    } catch (e) {
        console.error('the judging could not be loaded', e);
        failed.value = true;
    }
}

// A kanji of the grade or below, not one of the last few, and one of its phrases
function pick() {
    const q = pickQuestion(grade.value, recent);
    item.value = q.item;
    reibun.value = q.reibun;
    result.value = null;
    judged.value = null;
    stopTimer();
    pad.value?.clear();
}

// As many strokes as the model has: the spell goes off by itself a moment later
let timer: ReturnType<typeof setTimeout> | null = null;
function stopTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
}

function onCount(n: number) {
    count.value = n;
    // A new stroke begun, or one taken back: wait again
    stopTimer();
}

function onStroke() {
    const expected = model.value?.length ?? 0;
    if (!locked.value && expected > 0 && count.value >= expected) {
        stopTimer();
        timer = setTimeout(cast, AUTO_CONFIRM_MS);
    }
}

function cast() {
    stopTimer();
    const k = kit.value, it = item.value, p = pad.value;
    if (!k || !it || !p || locked.value) return;
    const writing = p.strokes().map(s => s.slice());
    judged.value = { writing, size: p.size() };
    result.value = gradeSpell(writing, it.kanji, k, { strokeOrder: strokeOrder.value });
}

const mark = computed(() => {
    const g = result.value?.grade;
    if (!g) return '';
    return g === 'perfect' || g === 'success' ? 'correct' : 'incorrect';
});

const message = computed(() => (result.value ? outcomeMessage(result.value.grade, result.value.verdict) : ''));

const debugLimits = computed(() => {
    const k = kit.value, m = model.value, it = item.value;
    return k && m && it ? k.limitsFor(it.grade, m.length) : null;
});

function changeGrade(g: number) {
    grade.value = g;
    recent.length = 0;
    pick();
}

// The writing area: no text selection nor long-press menu (iPhone Safari)
const writing = ref<HTMLElement | null>(null);
useNoSelect(writing);

onMounted(async () => {
    pick();
    await load();
});
onBeforeUnmount(stopTimer);
</script>

<template>
    <main class="practice">
        <header class="practice-head">
            <a class="btn" href="./">もどる</a>
            <h1>まほうの れんしゅう</h1>
        </header>

        <div class="practice-settings">
            <div class="grades" role="group" aria-label="がくねん">
                <button v-for="g in GRADES" :key="g" type="button" class="btn" :class="{ 'btn-primary': g === grade }"
                    :aria-pressed="g === grade" @click="changeGrade(g)">{{ g }}ねん</button>
            </div>
            <label class="check">
                <input v-model="strokeOrder" type="checkbox">
                かきじゅんも みる
            </label>
        </div>

        <SpellPrompt v-if="reibun" :reibun="reibun" :answer="result ? item?.kanji : null" />

        <p v-if="failed" class="status">
            じゅんびが できなかったよ。
            <button type="button" class="btn" @click="load">もういちど</button>
        </p>
        <p v-else-if="!kit" class="status">じゅんびちゅう…</p>

        <section ref="writing" class="tegaki no-select">
            <WritingPad ref="pad" :locked="locked || !ready" :faded="locked && result?.grade !== 'perfect'" :mark="mark"
                :highlight="locked ? marks.written : null" @count="onCount" @stroke="onStroke">
                <!-- The model with the stroke order, unless it was かんぺき -->
                <ModelStrokes v-if="locked && model && result?.grade !== 'perfect'" :model="model" :wrong="marks.stroke" />
            </WritingPad>
            <div class="tegaki-actions">
                <template v-if="!locked">
                    <button type="button" class="btn" :disabled="count === 0" @click="pad?.undo()">1かく もどす</button>
                    <button type="button" class="btn" :disabled="count === 0" @click="pad?.clear()">ぜんぶ けす</button>
                    <button type="button" class="btn btn-primary" :disabled="!ready" @click="cast">はつどう！</button>
                </template>
                <button v-else type="button" class="btn btn-primary" @click="pick">つぎの もんだい</button>
            </div>
        </section>

        <div v-if="result" class="outcome" :class="result.grade">
            <p class="outcome-grade">{{ SPELL_GRADE_LABEL[result.grade] }}<span class="outcome-power">いりょく ×{{ SPELL_MULTIPLIER[result.grade] }}</span></p>
            <p class="outcome-message">{{ message }}</p>
        </div>

        <SpellDebug v-if="tegakiDebug && result && item && debugLimits && judged" :kanji="item.kanji" :grade="item.grade"
            :stroke-order="strokeOrder" :result="result" :limits="debugLimits" :writing="judged.writing" :size="judged.size" />
    </main>
</template>

<style scoped>
.practice {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 40rem;
    min-height: 100dvh;
    margin: 0 auto;
    padding: 0.75rem 1rem 1.5rem;
}

.practice-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.practice-head a {
    text-decoration: none;
}

h1 {
    font-family: var(--hand);
    font-size: 1.5rem;
}

.practice-settings {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 1rem;
}

.grades {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}

.check {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 3rem;
}

.check input {
    width: 1.5rem;
    height: 1.5rem;
}

.status {
    text-align: center;
    color: var(--muted);
}

/* The square takes the room left, up to a comfortable size */
.tegaki {
    flex: 1 1 auto;
    height: min(70vw, 50dvh, 28rem);
    min-height: 14rem;
}

.outcome {
    display: grid;
    justify-items: center;
    gap: 0.25rem;
    text-align: center;
}

.outcome-grade {
    font-family: var(--hand);
    font-weight: 600;
    font-size: 2rem;
    line-height: 1.2;
}

.outcome.perfect .outcome-grade,
.outcome.success .outcome-grade {
    color: var(--red);
}

.outcome-power {
    margin-left: 0.5em;
    font-size: 0.5em;
    color: var(--muted);
}

.outcome-message {
    font-family: var(--hand);
    font-weight: 600;
}
</style>
