<script setup lang="ts">
// --- 魔法書 (requirements 8.3): the kanji written right once, grade by grade ---
// Only the grades up to the one set (a 1st grader sees only the 1st grade). A kanji not in the
// book yet is a blurred shadow; the mastered ones have a gold frame. A kanji in the book opens its page
import Furi from '../components/Furi.vue';
import { computed, ref } from 'vue';
import KanjiDetail from '../components/KanjiDetail.vue';
import { kanjiDatabase } from '../vendor/kanji-quiz/src/data/kanji';
import { isRegistered } from '../learning/progress';
import { go, progress, save } from '../store';

const shownGrade = ref(save.settings.grade);
const looking = ref<string | null>(null);
const grades = computed(() => Array.from({ length: save.settings.grade }, (_, i) => i + 1));

const cells = computed(() => kanjiDatabase.filter(k => k.grade === shownGrade.value).map(k => {
    const p = progress.get(k.kanji);
    return { kanji: k.kanji, registered: isRegistered(p), mastered: !!p?.mastered };
}));
const rate = (g: number) => {
    const list = kanjiDatabase.filter(k => k.grade === g);
    return Math.floor((list.filter(k => isRegistered(progress.get(k.kanji))).length / list.length) * 100);
};
</script>

<template>
    <main class="screen">
        <header class="screen-head">
            <button type="button" class="btn" @click="go('title')"><Furi text="[戻|もど]る" /></button>
            <h1><Furi text="[魔法|まほう]の [本|ほん]" /></h1>
        </header>
        <div class="tabs" role="group" aria-label="学年">
            <button v-for="g in grades" :key="g" type="button" class="btn" :class="{ 'btn-primary': g === shownGrade }" :aria-pressed="g === shownGrade" @click="shownGrade = g">
                <Furi :text="`${g}[年|ねん]`" /> <small>{{ rate(g) }}%</small>
            </button>
        </div>
        <p><Furi :text="`${shownGrade}[年生|ねんせい]の [漢字|かんじ]：`" /><b>{{ rate(shownGrade) }}%</b> <Furi text="[登録|とうろく]" />（{{ cells.filter(c => c.registered).length }} / {{ cells.length }}）</p>
        <ul class="grid">
            <li v-for="c in cells" :key="c.kanji">
                <button v-if="c.registered" type="button" class="cell" :class="{ mastered: c.mastered }" @click="looking = c.kanji">{{ c.kanji }}</button>
                <span v-else class="cell shadow" aria-label="まだ 登録 されていないよ"><span aria-hidden="true">{{ c.kanji }}</span></span>
            </li>
        </ul>
        <p class="hint"><Furi text="[魔法|まほう]で「せいこう」[以上|いじょう]に なると [登録|とうろく] されるよ。「かんぺき」を 3[回|かい] [続|つづ]けると [金|きん]の [枠|わく]に なるよ" /></p>
        <KanjiDetail v-if="looking" :kanji="looking" @close="looking = null" />
    </main>
</template>

<style scoped>
.tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(3.2rem, 1fr));
    gap: 0.4rem;
}

.cell {
    display: grid;
    place-items: center;
    width: 100%;
    aspect-ratio: 1;
    border: 2px solid var(--rule);
    border-radius: 0.5rem;
    background: var(--paper);
    font-family: var(--font-kyokasho);
    font-size: 1.8rem;
    line-height: 1;
    color: var(--ink);
    cursor: pointer;
}

.cell.mastered {
    border: 3px solid #e0a800;
    box-shadow: 0 0 0 2px #f6d76b;
}

/* Not in the book yet: a shadow that cannot be read */
.cell.shadow {
    overflow: hidden;
    background: var(--rule-soft);
    cursor: default;
}

.cell.shadow span {
    color: var(--muted);
    filter: blur(7px);
    opacity: 0.6;
    user-select: none;
}

.hint {
    color: var(--muted);
    font-size: 1rem;
}
</style>
