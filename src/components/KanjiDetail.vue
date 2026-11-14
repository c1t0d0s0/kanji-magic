<script setup lang="ts">
// --- One kanji: the model with the stroke order, its readings and phrases, the record, its magic ---
// Opened from the 魔法書 and from the result of a battle (a kanji to look at again)
import Furi from './Furi.vue';
import { computed, onMounted, ref, shallowRef } from 'vue';
import ModelStrokes from '../vendor/kanji-quiz/src/components/ModelStrokes.vue';
import { kanjiDatabase } from '../vendor/kanji-quiz/src/data/kanji';
import { reibunList } from '../vendor/kanji-quiz/src/data/reibun';
import { SPELL_GROUPS, radicalOf, spellGroup } from '../spell/effects';
import { SPELL_GRADE_LABEL } from '../spell/grade';
import { loadTegaki } from '../spell/tegaki';
import { canShow } from '../learning/visible';
import { progress, save } from '../store';

const props = defineProps<{ kanji: string }>();
const emit = defineEmits<{ close: [] }>();

const dialog = ref<HTMLDialogElement | null>(null);
const model = shallowRef<number[][] | null>(null);
const item = computed(() => kanjiDatabase.find(k => k.kanji === props.kanji) ?? null);
const record = computed(() => progress.get(props.kanji) ?? null);
const phrases = computed(() => reibunList.get(props.kanji) ?? []);
const group = computed(() => SPELL_GROUPS[spellGroup(props.kanji)]);
const radical = computed(() => {
    const r = radicalOf(props.kanji);
    return r && canShow(r, save.settings.grade) ? r : null;
});

onMounted(async () => {
    dialog.value?.showModal();
    try {
        const kit = await loadTegaki();
        model.value = kit.strokes[props.kanji] ?? null;
    } catch {
        model.value = null;
    }
});
</script>

<template>
    <dialog ref="dialog" class="detail" aria-labelledby="detail-title" @close="emit('close')">
        <div class="detail-head">
            <h2 id="detail-title" class="detail-kanji">{{ kanji }}</h2>
            <span v-if="record?.mastered" class="detail-badge">🏅 マスター</span>
        </div>
        <div class="detail-model tegaki-pad">
            <ModelStrokes v-if="model" :model="model" />
            <p v-else class="detail-wait"><Furi text="[準備中|じゅんびちゅう]…" /></p>
        </div>
        <p v-if="item" class="detail-readings"><Furi text="[読|よ]み" />：{{ item.readings.join('・') }}</p>
        <ul class="detail-phrases">
            <li v-for="(p, i) in phrases" :key="i">{{ p.before }}<b>{{ kanji }}</b>{{ p.after }}<span class="detail-reading">（{{ p.before }}{{ p.reading }}{{ p.after }}）</span></li>
        </ul>
        <p class="detail-magic"><Furi text="[魔法|まほう]" />：<b><Furi :text="group.name" /></b>（<Furi :text="group.does" />）<span v-if="radical">　<Furi text="[部首|ぶしゅ]" />：{{ radical }}</span></p>
        <p v-if="record" class="detail-record">
            <Furi :text="`[書|か]いた [数|かず] ${record.attempts}・せいこう ${record.successes}・かんぺき ${record.perfects}`" /><br>
            <Furi :text="`[最後|さいご]は「${SPELL_GRADE_LABEL[record.lastResult]}」`" /><span v-if="record.practices">・<Furi :text="`なぞった [数|かず] ${record.practices}`" /></span>
        </p>
        <form method="dialog">
            <button class="btn btn-primary" autofocus><Furi text="[閉|と]じる" /></button>
        </form>
    </dialog>
</template>

<style scoped>
.detail:modal {
    width: min(100% - 2rem, 28rem);
    max-height: calc(100dvh - 2rem);
    padding: 1rem 1.25rem;
    border: 2px solid var(--rule);
    border-radius: 1rem;
    background: var(--paper);
    color: var(--ink);
    overscroll-behavior: contain;
}

.detail::backdrop {
    background: rgb(0 0 0 / 0.5);
    overflow: hidden;
    overscroll-behavior: contain;
}

.detail-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
}

.detail-kanji {
    font-family: var(--font-kyokasho);
    font-size: 3rem;
    line-height: 1.2;
}

.detail-badge {
    padding: 0.1rem 0.6rem;
    border-radius: 999px;
    background: #f6d76b;
    color: #4a3800;
    font-weight: 700;
}

.detail-model {
    width: min(100%, 14rem);
    aspect-ratio: 1;
    margin: 0.5rem auto;
}

.detail-wait {
    display: grid;
    place-items: center;
    height: 100%;
    color: var(--muted);
}

.detail-phrases {
    margin: 0.25rem 0;
}

.detail-phrases b {
    font-family: var(--font-kyokasho);
    color: var(--red);
}

.detail-reading {
    font-size: 0.85em;
    color: var(--muted);
}

.detail-record {
    margin: 0.5rem 0;
    color: var(--muted);
    font-size: 1rem;
}

form {
    display: flex;
    justify-content: center;
}
</style>
