<script setup lang="ts">
// --- クレジット (requirements 9, 11): KanjiVG and kanji-quiz, with their licences ---
// The notice of KanjiVG is the LICENSE of kanjivg.ts (loaded with it, apart from the first page)
import Furi from '../components/Furi.vue';
import { onMounted, shallowRef } from 'vue';
import { go } from '../store';

interface Notice { name: string; author: string; url: string; licence: string; licenceUrl: string }
const kanjivg = shallowRef<Notice | null>(null);

onMounted(async () => {
    try {
        kanjivg.value = (await import('../vendor/kanji-quiz/src/data/kanjivg')).LICENSE;
    } catch {
        kanjivg.value = null;
    }
});
</script>

<template>
    <main class="screen">
        <header class="screen-head">
            <button type="button" class="btn" @click="go('title')"><Furi text="[戻|もど]る" /></button>
            <h1>クレジット</h1>
        </header>
        <section class="card">
            <h2><Furi text="[書|か]き[順|じゅん]の データ" /></h2>
            <p v-if="kanjivg">
                <a :href="kanjivg.url" target="_blank" rel="noopener">{{ kanjivg.name }}</a> © {{ kanjivg.author }}<br>
                ライセンス：<a :href="kanjivg.licenceUrl" target="_blank" rel="noopener">{{ kanjivg.licence }}</a>
            </p>
            <p v-else>
                <a href="https://kanjivg.tagaini.net" target="_blank" rel="noopener">KanjiVG</a> © Ulrich Apel<br>
                ライセンス：<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC BY-SA 3.0</a>
            </p>
            <p class="note"><Furi text="お[手本|てほん]の [線|せん]・[部首|ぶしゅ]・[似|に]ている [字|じ]の データは KanjiVG を もとに [作|つく]ったので、[同|おな]じ ライセンス（CC BY-SA 3.0）です" /></p>
        </section>
        <section class="card">
            <h2><Furi text="[手書|てが]きの [判定|はんてい]" /></h2>
            <p><a href="https://github.com/c1t0d0s0/kanji-quiz" target="_blank" rel="noopener">kanji-quiz</a>（MIT ライセンス）</p>
            <p class="note"><Furi text="[書|か]いた [字|じ]の [判定|はんてい]や、[例文|れいぶん]・[配当表|はいとうひょう]の データを [使|つか]っています" /></p>
        </section>
        <section class="card">
            <h2>この ゲーム</h2>
            <p>MIT ライセンス</p>
            <p class="note"><Furi text="お[名前|なまえ]など、あなたの ことは [何|なに]も [集|あつ]めていません" /></p>
        </section>
        <a class="btn" href="./practice.html"><Furi text="[魔法|まほう]の [練習|れんしゅう] ページ（[時間|じかん] なし）" /></a>
    </main>
</template>

<style scoped>
h2 {
    font-family: var(--hand);
    font-size: 1.2rem;
    margin-bottom: 0.4rem;
}

.note {
    margin-top: 0.4rem;
    color: var(--muted);
    font-size: 1rem;
}

a {
    color: inherit;
}

a.btn {
    align-self: center;
    text-decoration: none;
}
</style>
