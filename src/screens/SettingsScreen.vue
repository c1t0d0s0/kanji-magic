<script setup lang="ts">
// --- せってい: the grade and which kanji, how spells are cast (a kanji by hand or Morse code), the
// magic circle, the sound, and erasing the data ---
// Saved at each change (requirements 10)
import Furi from '../components/Furi.vue';
import { ref } from 'vue';
import { changeSettings, eraseAll, go, save } from '../store';
import { play, unlockAudio } from '../sound';

const GRADES = [1, 2, 3, 4, 5, 6];
const confirmDialog = ref<HTMLDialogElement | null>(null);
const erased = ref(false);

function setVolume(e: Event) {
    unlockAudio();
    changeSettings({ volume: Number((e.target as HTMLInputElement).value) / 100, muted: false });
    play('tap');
}

function askErase() {
    erased.value = false;
    confirmDialog.value?.showModal();
}

function onConfirmClose() {
    if (confirmDialog.value?.returnValue === 'erase') {
        eraseAll();
        erased.value = true;
    }
    if (confirmDialog.value) confirmDialog.value.returnValue = '';
}
</script>

<template>
    <main class="screen settings">
        <header class="screen-head">
            <button type="button" class="btn" @click="go('title')"><Furi text="[戻|もど]る" /></button>
            <h1><Furi text="[設定|せってい]" /></h1>
        </header>

        <div class="settings-cards">
        <section class="card">
            <h2><Furi text="[学年|がくねん]" /></h2>
            <div class="row" role="group" aria-label="学年">
                <button v-for="g in GRADES" :key="g" type="button" class="btn" :class="{ 'btn-primary': g === save.settings.grade }"
                    :aria-pressed="g === save.settings.grade" @click="changeSettings({ grade: g })"><Furi :text="`${g}[年|ねん]`" /></button>
            </div>
            <div class="row">
                <label class="check"><input type="radio" name="only" :checked="!save.settings.only" @change="changeSettings({ only: false })"><Furi text="この [学年|がくねん]までの [漢字|かんじ]" /></label>
                <label class="check"><input type="radio" name="only" :checked="save.settings.only" @change="changeSettings({ only: true })"><Furi text="この [学年|がくねん]の [漢字|かんじ]だけ" /></label>
            </div>
        </section>

        <section class="card">
            <h2><Furi text="[魔法|まほう]の [使|つか]い[方|かた]" /></h2>
            <div class="row">
                <label class="check"><input type="radio" name="input" :checked="save.settings.input === 'kanji'" @change="changeSettings({ input: 'kanji' })"><Furi text="[漢字|かんじ]を [手書|てが]き" /></label>
                <label class="check"><input type="radio" name="input" :checked="save.settings.input === 'morse'" @change="changeSettings({ input: 'morse' })"><Furi text="モールス[信号|しんごう]（キーボード）" /></label>
            </div>
            <p class="note"><Furi text="タッチの できない パソコンでは、モールス[信号|しんごう]で [英語|えいご]と [数字|すうじ]を [送|おく]って [魔法|まほう]を [使|つか]えるよ" /></p>
            <template v-if="save.settings.input === 'morse'">
                <h3><Furi text="キー" /></h3>
                <div class="row">
                    <label class="check"><input type="radio" name="keyer" :checked="save.settings.keyer === 'paddle'" @change="changeSettings({ keyer: 'paddle' })">パドル</label>
                    <label class="check"><input type="radio" name="keyer" :checked="save.settings.keyer === 'straight'" @change="changeSettings({ keyer: 'straight' })"><Furi text="[電鍵|でんけん]" /></label>
                </div>
                <p class="note" v-if="save.settings.keyer === 'paddle'"><Furi text="J・F キーで トン（・）、K・D キーで ツー（－）。[押|お]し[続|つづ]けると くり[返|かえ]すよ" /></p>
                <p class="note" v-else><Furi text="スペースキーを [短|みじか]く [押|お]すと トン（・）、[長|なが]く [押|お]すと ツー（－）" /></p>
                <h3><Furi text="レベル" /></h3>
                <div class="row">
                    <label class="check"><input type="radio" name="morseLevel" :checked="save.settings.morseLevel === 'easy'" @change="changeSettings({ morseLevel: 'easy' })"><Furi text="[初級|しょきゅう]" /></label>
                    <label class="check"><input type="radio" name="morseLevel" :checked="save.settings.morseLevel === 'hard'" @change="changeSettings({ morseLevel: 'hard' })"><Furi text="[上級|じょうきゅう]" /></label>
                </div>
                <p class="note"><Furi :text="save.settings.morseLevel === 'easy' ? '[文字|もじ]の [下|した]に モールス[信号|しんごう]（・－）が [出|で]るよ' : 'ヒントは [出|で]ないよ'" /></p>
            </template>
        </section>

        <section v-if="save.settings.input === 'kanji'" class="card">
            <h2><Furi text="[魔法陣|まほうじん]" /></h2>
            <label class="check"><input type="checkbox" :checked="save.settings.strokeOrder" @change="changeSettings({ strokeOrder: ($event.target as HTMLInputElement).checked })"><Furi text="[書|か]き[順|じゅん]も [見|み]る" /></label>
            <p class="note"><Furi text="オンに すると、[書|か]き[順|じゅん]が [違|ちが]うと「せいこう」に ならないよ" /></p>
            <label class="check"><input type="checkbox" :checked="save.settings.trace" @change="changeSettings({ trace: ($event.target as HTMLInputElement).checked })"><Furi text="お[手本|てほん]を なぞる" /></label>
            <p class="note"><Furi text="お[手本|てほん]の [上|うえ]を なぞるよ。「れんしゅう」に なるので、[魔法|まほう]の [本|ほん]には [登録|とうろく] されないよ" /></p>
        </section>

        <section class="card">
            <h2><Furi text="[音|おと]" /></h2>
            <label class="volume"><Furi text="[大|おお]きさ" />
                <input type="range" min="0" max="100" step="5" :value="Math.round(save.settings.volume * 100)" @change="setVolume">
            </label>
            <label class="check"><input type="checkbox" :checked="save.settings.muted" @change="changeSettings({ muted: ($event.target as HTMLInputElement).checked })"><Furi text="[音|おと]を [消|け]す" /></label>
        </section>

        <section class="card">
            <h2>データ</h2>
            <button type="button" class="btn danger" @click="askErase"><Furi text="データを [全部|ぜんぶ] [消|け]す" /></button>
            <p v-if="erased" role="status"><Furi text="[消|け]したよ。[初|はじ]めから [遊|あそ]べるよ" /></p>
        </section>

        </div>

        <dialog ref="confirmDialog" class="confirm" aria-labelledby="confirm-title" @close="onConfirmClose">
            <h2 id="confirm-title"><Furi text="[本当|ほんとう]に [消|け]しても いい？" /></h2>
            <p><Furi text="ステージ・[仲間|なかま]・[魔法|まほう]の [本|ほん]が [全部|ぜんぶ] [消|き]えるよ。[元|もと]に [戻|もど]せないよ" /></p>
            <form method="dialog" class="confirm-actions">
                <button value="erase" class="btn danger"><Furi text="[消|け]す" /></button>
                <button value="cancel" class="btn btn-primary" autofocus>やめる</button>
            </form>
        </dialog>
    </main>
</template>

<style scoped>
.settings-cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

/* On a wide screen (a PC): the cards in two columns, so that it fits without scrolling */
@media (min-width: 64em) {
    .settings {
        max-width: 72rem;
    }

    .settings-cards {
        display: block;
        columns: 2;
        column-gap: 1rem;
    }

    .settings-cards > .card {
        break-inside: avoid;
        margin-bottom: 1rem;
    }
}

h2 {
    font-family: var(--hand);
    font-size: 1.2rem;
    margin-bottom: 0.4rem;
}

h3 {
    margin: 0.5rem 0 0;
    font-size: 1rem;
}

.row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 1rem;
}

.note {
    margin: 0 0 0.5rem 2rem;
    color: var(--muted);
    font-size: 1rem;
}

.volume {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 3rem;
}

.volume input {
    flex: 1;
    min-height: 2rem;
}

.danger {
    border-color: var(--red);
    color: var(--red);
}

.confirm:modal {
    width: min(100% - 2rem, 26rem);
    padding: 1.25rem;
    border: 2px solid var(--red);
    border-radius: 1rem;
    background: var(--paper);
    color: var(--ink);
    overscroll-behavior: contain;
}

.confirm::backdrop {
    background: rgb(0 0 0 / 0.5);
}

.confirm-actions {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1rem;
}
</style>
