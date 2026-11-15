<script setup lang="ts">
// --- After a battle: won or lost, the stars, the どんぐり, and the kanji written (requirements 8.4) ---
// Any kanji of the list can be tapped to see its model again
import Furi from '../components/Furi.vue';
import { computed, ref } from 'vue';
import CharacterIcon from '../components/CharacterIcon.vue';
import KanjiDetail from '../components/KanjiDetail.vue';
import { PERFECT_BONUS } from '../config';
import { STAGES } from '../game/stages';
import { SPELL_GRADE_LABEL } from '../spell/grade';
import { formOf } from '../game/units';
import { go, lastReport, save, ui } from '../store';

const report = computed(() => lastReport.value);
const looking = ref<string | null>(null);
const next = computed(() => {
    const r = report.value;
    return r && r.won ? STAGES.find(s => s.id === r.stage.id + 1) ?? null : null;
});
// The first one of the team cheers (or is dizzy)
const hero = computed(() => {
    const id = save.deck[0];
    return id ? { id, form: formOf(save.units[id]) } : null;
});
// Words sent in Morse code (src/morse/): no model to see. By the way of the battle, not by the
// spells (none may have been cast)
const morse = computed(() => report.value ? report.value.morse || report.value.spells.some(s => s.morse) : false);
// The hint to tap a kanji, only when there is one to tap
const kanjiWritten = computed(() => report.value?.spells.some(s => !s.morse && s.kanji) ?? false);
const perfects = computed(() => report.value?.spells.filter(s => s.grade === 'perfect' && !s.traced).length ?? 0);

function again() {
    go('formation');
}

function toNext() {
    if (!next.value) return;
    ui.stageId = next.value.id;
    go('formation');
}
</script>

<template>
    <main v-if="report" class="screen result">
        <header class="screen-head">
            <h1><Furi :text="report.won ? '[勝|か]ち！ 🎉' : '[負|ま]けちゃった…'" /></h1>
        </header>
        <section class="card summary">
            <div v-if="hero" class="hero" aria-hidden="true">
                <CharacterIcon :kind="hero.id" :form="hero.form" :size="96" animate :mood="report.won ? 'cheer' : 'dizzy'" />
                <span class="hero-say">{{ report.won ? 'やったー！' : 'きゅう〜' }}</span>
            </div>
            <p>ステージ {{ report.stage.id }}：<Furi :text="report.stage.name" /></p>
            <p v-if="report.won" class="stars big" :aria-label="`星 ${report.stars}こ`">{{ '★'.repeat(report.stars) + '☆'.repeat(3 - report.stars) }}</p>
            <p v-if="report.won">どんぐり +{{ report.reward }}<span v-if="report.firstClear">（<Furi text="[初|はじ]めての クリアで 2[倍|ばい]" />）</span><span v-if="perfects">（<Furi :text="`かんぺき ${perfects}[回|かい]で +${perfects * PERFECT_BONUS}`" />）</span></p>
            <p v-else><Furi text="[仲間|なかま]を [強|つよ]くして もう[一度|いちど] [挑|いど]もう！" /></p>
        </section>

        <section class="card">
            <h2><Furi :text="morse ? '[今回|こんかい] [送|おく]った モールス[信号|しんごう]' : '[今回|こんかい] [書|か]いた [漢字|かんじ]'" /></h2>
            <p v-if="report.spells.length === 0" class="muted"><Furi text="[魔法|まほう]を [使|つか]わなかったよ" /></p>
            <ul v-else class="written">
                <li v-for="(s, i) in report.spells" :key="i">
                    <span v-if="s.morse" class="written-kanji is-morse" :class="s.grade">
                        <span class="k">{{ s.morse }}</span>
                        <span class="g">{{ SPELL_GRADE_LABEL[s.grade] }}</span>
                    </span>
                    <button v-else type="button" class="written-kanji" :class="s.grade" :aria-label="`${s.kanji} ${SPELL_GRADE_LABEL[s.grade]}。お手本を 見る`" @click="looking = s.kanji">
                        <span class="k">{{ s.kanji }}</span>
                        <span class="g">{{ s.traced ? 'なぞり' : SPELL_GRADE_LABEL[s.grade] }}</span>
                    </button>
                </li>
            </ul>
            <p v-if="kanjiWritten" class="muted"><Furi text="[漢字|かんじ]を [押|お]すと お[手本|てほん]が [見|み]られるよ" /></p>
        </section>

        <nav class="actions">
            <button v-if="next" type="button" class="btn btn-primary" @click="toNext"><Furi text="[次|つぎ]の ステージへ" /></button>
            <button type="button" class="btn" :class="{ 'btn-primary': !next }" @click="again"><Furi text="もう[一度|いちど]" /></button>
            <button type="button" class="btn" @click="go('stages')"><Furi text="ステージを [選|えら]ぶ" /></button>
        </nav>

        <KanjiDetail v-if="looking" :kanji="looking" @close="looking = null" />
    </main>
    <main v-else class="screen">
        <button type="button" class="btn" @click="go('stages')"><Furi text="ステージを [選|えら]ぶ" /></button>
    </main>
</template>

<style scoped>
.hero {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}

.hero-say {
    font-family: var(--hand);
    font-weight: 700;
    font-size: 1.4rem;
}

.summary {
    display: grid;
    gap: 0.25rem;
    justify-items: center;
    text-align: center;
}

.big {
    font-size: 2.5rem;
}

h2 {
    font-family: var(--hand);
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
}

.written {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.written-kanji {
    display: grid;
    justify-items: center;
    min-width: 4.5rem;
    padding: 0.3rem 0.5rem;
    border: 2px solid var(--rule);
    border-radius: 0.75rem;
    background: var(--paper);
    cursor: pointer;
}

.written-kanji .k {
    font-family: var(--font-kyokasho);
    font-size: 2rem;
    line-height: 1.2;
}

.is-morse {
    cursor: default;
}

.is-morse .k {
    font-family: var(--ui);
    font-size: 1.4rem;
    font-weight: 700;
    letter-spacing: 0.05em;
}

.written-kanji .g {
    font-size: 0.85rem;
    font-weight: 700;
}

.written-kanji.perfect {
    border-color: #e0a800;
    background: var(--mark-soft);
}

.written-kanji.close,
.written-kanji.fail {
    border-color: var(--red);
    background: var(--red-soft);
}

.muted {
    color: var(--muted);
    font-size: 1rem;
}

.actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.6rem;
}
</style>
