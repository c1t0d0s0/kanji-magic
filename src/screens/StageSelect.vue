<script setup lang="ts">
// --- The 20 stages: cleared ones with their stars, the next one open, the rest locked ---
import Furi from '../components/Furi.vue';
import ElementMark from '../components/ElementMark.vue';
import { STAGES, stageEnemies } from '../game/stages';
import { go, isOpen, save, ui } from '../store';

function choose(id: number) {
    if (!isOpen(id)) return;
    ui.stageId = id;
    go('formation');
}

// The elements of a stage's enemies, once each
const marksOf = (id: number) => [...new Set(stageEnemies(STAGES.find(s => s.id === id)!).map(f => f.element).filter(e => e !== null))];

const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(3 - n);
</script>

<template>
    <main class="screen stage-select">
        <header class="screen-head">
            <button type="button" class="btn" @click="go('title')"><Furi text="[戻|もど]る" /></button>
            <h1><Furi text="ステージを [選|えら]ぼう" /></h1>
        </header>
        <p>どんぐり：{{ save.materials }}　<button type="button" class="btn" @click="go('formation')"><Furi text="[編成|へんせい]・[強|つよ]くする" /></button></p>
        <ol class="stages">
            <li v-for="s in STAGES" :key="s.id">
                <button type="button" class="stage card" :disabled="!isOpen(s.id)" @click="choose(s.id)">
                    <span class="stage-no">{{ s.id }}</span>
                    <span class="stage-name"><Furi :text="isOpen(s.id) ? s.name : '？？？'" /></span>
                    <span class="stage-info">
                        <template v-if="isOpen(s.id)">
                            <span class="stage-marks"><span v-if="s.boss" class="boss" aria-label="ボス">👹</span><ElementMark v-for="m in marksOf(s.id)" :key="m" :mark="m" :size="18" /></span>
                            <span class="stars" :aria-label="`星 ${save.stages[s.id]?.stars ?? 0}こ`">{{ stars(save.stages[s.id]?.stars ?? 0) }}</span>
                        </template>
                        <span v-else class="stage-lock" aria-label="まだ 遊べないよ">🔒</span>
                    </span>
                </button>
            </li>
        </ol>
        <p class="hint"><Furi text="★ [勝|か]つ　★★ [城|しろ]を [守|まも]る（[残|のこ]り 6[割|わり] [以上|いじょう]）　★★★「かんぺき」の [魔法|まほう]" /></p>
    </main>
</template>

<style scoped>
.stages {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr));
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.stage {
    display: grid;
    /* Every stage the same: the number on the left; the name, then the marks and the stars */
    grid-template-columns: auto minmax(0, 1fr);
    grid-template-rows: auto auto;
    align-items: center;
    gap: 0.1rem 0.75rem;
    width: 100%;
    height: 100%;
    padding-block: 0.4rem;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
}

.stage:disabled {
    opacity: 0.55;
    cursor: default;
}

.stage-no {
    grid-row: span 2;
    display: grid;
    place-items: center;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    background: var(--ink);
    color: var(--on-ink);
    font-weight: 700;
}

/* One line, with room for the furigana whether it has some or not */
.stage-name {
    overflow: hidden;
    font-family: var(--hand);
    font-weight: 600;
    line-height: 2.1;
    white-space: nowrap;
    text-overflow: ellipsis;
}

.stage-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 1.5rem;
}

.stage-marks {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
}

.boss {
    font-size: 1rem;
    line-height: 1;
}

.hint {
    color: var(--muted);
    font-size: 1rem;
}

/* On a wide screen (a PC): 4 in a row, so the 20 fit with no scrolling */
@media (min-width: 64em) {
    .stage-select {
        max-width: 80rem;
    }

    .stages {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.45rem;
    }
}
</style>
