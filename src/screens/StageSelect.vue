<script setup lang="ts">
// --- The 10 stages: cleared ones with their stars, the next one open, the rest locked ---
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
    <main class="screen">
        <header class="screen-head">
            <button type="button" class="btn" @click="go('title')"><Furi text="[戻|もど]る" /></button>
            <h1><Furi text="ステージを [選|えら]ぼう" /></h1>
        </header>
        <p>どんぐり：{{ save.materials }}　<button type="button" class="btn" @click="go('formation')"><Furi text="[編成|へんせい]・[強|つよ]くする" /></button></p>
        <ol class="stages">
            <li v-for="s in STAGES" :key="s.id">
                <button type="button" class="stage card" :disabled="!isOpen(s.id)" @click="choose(s.id)">
                    <span class="stage-no">{{ s.id }}</span>
                    <span class="stage-name"><Furi :text="isOpen(s.id) ? s.name : '？？？'" /><span v-if="s.boss && isOpen(s.id)" aria-label="ボス"> 👹</span><span v-if="isOpen(s.id)" class="stage-marks"><ElementMark v-for="m in marksOf(s.id)" :key="m" :mark="m" :size="18" /></span></span>
                    <span v-if="!isOpen(s.id)" class="stage-lock" aria-label="まだ 遊べないよ">🔒</span>
                    <span v-else class="stars" :aria-label="`星 ${save.stages[s.id]?.stars ?? 0}こ`">{{ stars(save.stages[s.id]?.stars ?? 0) }}</span>
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
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    min-height: 4rem;
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
    display: grid;
    place-items: center;
    width: 2.4rem;
    height: 2.4rem;
    border-radius: 50%;
    background: var(--ink);
    color: var(--on-ink);
    font-weight: 700;
}

.stage-marks {
    display: inline-flex;
    gap: 0.15rem;
    margin-left: 0.4rem;
}

.stage-name {
    font-family: var(--hand);
    font-weight: 600;
}

.hint {
    color: var(--muted);
    font-size: 1rem;
}
</style>
