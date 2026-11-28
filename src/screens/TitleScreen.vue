<script setup lang="ts">
// --- The title: the way to the stages, the 魔法書, the settings and the credits ---
// Kanji not learned at the grade set get furigana (requirements 1.1)
import Furi from '../components/Furi.vue';
import TitleParade from '../components/TitleParade.vue';
import { go, save } from '../store';
import { unlockAudio } from '../sound';

function open(screen: 'stages' | 'book' | 'characters' | 'settings' | 'credits') {
    unlockAudio();
    go(screen);
}
</script>

<template>
    <main class="title">
        <h1><span class="title-line"><Furi text="KM[魔法|まほう]" /></span><span class="title-line"><Furi text="[大|だい][戦争|せんそう]" /></span></h1>
        <TitleParade />
        <nav class="title-menu">
            <button type="button" class="btn btn-primary btn-big" @click="open('stages')"><Furi text="[遊|あそ]ぶ" /></button>
            <button type="button" class="btn" @click="open('book')">📖 <Furi text="[魔法|まほう]の [本|ほん]" /></button>
            <button type="button" class="btn" @click="open('characters')">🐾 <Furi text="キャラクター[一覧|いちらん]" /></button>
            <button type="button" class="btn" @click="open('settings')">⚙️ <Furi :text="`[設定|せってい]（[今|いま] ${save.settings.grade}[年生|ねんせい]）`" /></button>
            <button type="button" class="btn" @click="open('credits')">クレジット</button>
        </nav>
    </main>
</template>

<style scoped>
.title {
    display: grid;
    place-items: center;
    align-content: center;
    gap: 1rem;
    min-height: 100dvh;
    padding: 1rem;
    text-align: center;
}

h1 {
    font-family: var(--hand);
    font-size: clamp(2.2rem, 10vw, 4rem);
    line-height: 1.2;
    color: #6b4fd8;
    text-shadow: 0 3px 0 var(--mark);
}

/* On a phone: two lines. On a wide screen (a PC): one line */
.title-line {
    display: block;
}

@media (min-width: 48em) {
    h1 {
        white-space: nowrap;
    }

    .title-line {
        display: inline;
    }
}

.title-menu {
    display: grid;
    gap: 0.75rem;
    width: min(100%, 22rem);
}

.btn-big {
    min-height: 4rem;
    font-size: 1.4rem;
}
</style>
