<script setup lang="ts">
// --- ?debug: both judgements (with and without the stroke order) against their limits, and the
// writing to copy (after kanji-quiz TegakiDebug.vue). Writings that seem judged wrongly can be
// collected and taken to kanji-quiz ---
import { computed, ref, watch } from 'vue';
import type { Limits, Stroke, Verdict } from '../vendor/kanji-quiz/src/core/handwriting';
import { PERFECT_MARGIN } from '../config';
import type { SpellResult } from '../spell/grade';

const props = defineProps<{
    kanji: string;
    grade: number;
    strokeOrder: boolean;
    result: SpellResult;
    limits: Limits;
    writing: readonly Stroke[];
    size: number;
}>();

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : Number.isFinite(n) ? n.toFixed(3) : '∞');

function lines(name: string, v: Verdict) {
    const d = props.limits;
    const mark = (bad: boolean) => (bad ? '✗' : '・');
    const keys = ['shape', 'strokes', 'worst', 'flips', 'meets'] as const;
    return [
        `[${name}] ${v.ok ? 'ok' : 'ng'} (${v.reason})`,
        `${mark(v.written !== v.expected)} 画数 ${v.written}/${v.expected}  (つなぎ ${v.joins}/${d.joins})`,
        ...keys.map(k => `${mark(v[k] > d[k])} ${k} ${fmt(v[k])} / ${fmt(d[k])}`),
        `order ${JSON.stringify(v.order)}  hint ${JSON.stringify(v.hint)}`
    ];
}

const rows = computed(() => [
    `${props.kanji} ${props.grade}年生  ${props.result.grade}  margin ${props.result.margin.toFixed(3)} (かんぺき ≤ ${PERFECT_MARGIN})`,
    `かきじゅんも みる: ${props.strokeOrder ? 'ON' : 'OFF'}`,
    ...lines('strict: 書き順あり', props.result.strict),
    ...lines('loose: 書き順なし', props.result.loose)
]);

const copied = ref('');
async function copy() {
    const text = JSON.stringify({
        kanji: props.kanji, grade: props.grade, strokeOrder: props.strokeOrder, size: props.size,
        strokes: props.writing.map(s => s.map(p => [Math.round(p.x), Math.round(p.y)]))
    });
    try {
        await navigator.clipboard.writeText(text);
        copied.value = 'コピーしました';
    } catch {
        // No clipboard (e.g. not https): shown to be copied by hand
        copied.value = text;
    }
}
watch(() => props.result, () => {
    copied.value = '';
});
</script>

<template>
    <div class="spell-debug">
        <pre>{{ rows.join('\n') }}</pre>
        <button type="button" class="btn" @click="copy">書いた線を コピー</button>
        <textarea v-if="copied && copied !== 'コピーしました'" readonly :value="copied" rows="3"></textarea>
        <p v-else-if="copied">{{ copied }}</p>
    </div>
</template>

<style scoped>
.spell-debug {
    display: grid;
    gap: 0.5rem;
    justify-items: start;
    padding: 0.75rem;
    border: 1px dashed var(--muted);
    font-size: 0.8125rem;
}

pre {
    margin: 0;
    white-space: pre-wrap;
    font-size: 0.8125rem;
    line-height: 1.4;
}

textarea {
    width: 100%;
}
</style>
