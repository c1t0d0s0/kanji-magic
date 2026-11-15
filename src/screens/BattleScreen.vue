<script setup lang="ts">
// --- The battle: the field on a canvas, and the buttons to send units, grow the wallet and cast ---
// The battle state (game/battle.ts) is not reactive; a few numbers for the buttons are copied into
// `hud` at each frame. The judging is loaded when the battle starts (requirements 6.1): until it is
// ready the まほう button says じゅんびちゅう. While the magic circle is open the battle goes at
// SPELL_SLOW; the spell goes off when it is judged, and the battle is back to speed when it closes.
// Stage 1 is the tutorial: a pointing hand shows the unit button, then the まほう button.
import Furi from '../components/Furi.vue';
import { computed, onBeforeUnmount, onMounted, reactive, ref, shallowRef } from 'vue';
import SpellOverlay from '../components/SpellOverlay.vue';
import SpellChoice from '../components/SpellChoice.vue';
import MuteButton from '../components/MuteButton.vue';
import CharacterIcon from '../components/CharacterIcon.vue';
import { LANE, MANA_MAX, SPELL_SLOW } from '../config';
import {
    canSummon, canUpgradeWallet, castSpell, spellRating, createBattle, manaFull, starsOf, startSpell, step, summon, upgradeWallet, walletOf, type BattleEvent
} from '../game/battle';
import { createLoop } from '../game/loop';
import { drawBattle, FIELD_HEIGHT } from '../game/render';
import { stageById } from '../game/stages';
import { formOf, unitStats, type UnitId } from '../game/units';
import { plain } from '../learning/furi';
import { pickChoices } from '../learning/picker';
import { elementOfGroup, spellEffect, spellGroup } from '../spell/effects';
import type { SpellOutcome } from '../spell/grade';
import { questionFor, type Choice, type Question } from '../spell/question';
import { loadTegaki, type TegakiKit } from '../spell/tegaki';
import { play, unlockAudio, type SoundName } from '../sound';
import { finishBattle, go, progress, recordOutcome, save, ui } from '../store';

const stage = stageById(ui.stageId);
const battle = createBattle(stage, save.deck.map(id => ({ id, level: save.units[id] })));
const deck = save.deck.map(id => unitStats(id, save.units[id]));

const kit = shallowRef<TegakiKit | null>(null);
const loadFailed = ref(false);
const question = shallowRef<Question | null>(null);
// The 3 kanji to choose from, before the magic circle
const choices = shallowRef<Choice[] | null>(null);
const spells: SpellOutcome[] = [];
const used = new Set<string>();
const paused = ref(false);
const pauseDialog = ref<HTMLDialogElement | null>(null);

const hud = reactive({
    money: 0,
    cap: 0,
    walletLevel: 1,
    walletNext: null as number | null,
    canWallet: false,
    mana: 0,
    manaFull: false,
    ready: {} as Partial<Record<UnitId, boolean>>,
    cooldown: {} as Partial<Record<UnitId, number>>,
    result: null as null | 'win' | 'lose'
});

// --- The tutorial ---
const tutorial = ref<'summon' | 'fight' | 'magic' | 'cheer' | null>(stage.tutorial ? 'summon' : null);
const tutorialText = computed(() => {
    switch (tutorial.value) {
        case 'summon': return 'ここを [押|お]して [仲間|なかま]を [出|だ]そう！';
        case 'fight': return '[仲間|なかま]が [敵|てき]の [城|しろ]へ [向|む]かうよ。どんどん [出|だ]そう！';
        case 'magic': return '[魔法|まほう]が たまったよ！ [押|お]してみよう';
        case 'cheer': return 'その [調子|ちょうし]！ [敵|てき]の [城|しろ]を [壊|こわ]そう';
        default: return '';
    }
});

// --- Drawing ---
const canvas = ref<HTMLCanvasElement | null>(null);
const field = ref<HTMLElement | null>(null);
const hudBox = ref<HTMLElement | null>(null);
let scale = 1;
let observer: ResizeObserver | null = null;
// A PC (as in the style below): the battle has to fit in the window
const pc = typeof matchMedia === 'function' ? matchMedia('(min-width: 64em) and (min-height: 36em)') : null;

// On a PC, the field not wider than the window's height allows: what is under it (the money, the
// units, a tutorial) must be seen with no scrolling. What is under it does not depend on the
// field, so this gives the same width again when the field has changed: it does not go round.
function fieldLimit(f: HTMLElement): string {
    const main = f.parentElement, hudEl = hudBox.value;
    if (!pc?.matches || !main || !hudEl) return '';
    const style = getComputedStyle(main);
    const rest = hudEl.getBoundingClientRect().bottom - main.getBoundingClientRect().top + (parseFloat(style.paddingBottom) || 0) - f.offsetHeight;
    const room = (window.innerHeight - rest) * (LANE.width / FIELD_HEIGHT);
    const full = main.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
    // Never too small: then it scrolls
    return room < full ? `${Math.max(Math.floor(room), Math.round(full * 0.5))}px` : '';
}

function fit() {
    const c = canvas.value, f = field.value;
    if (!c || !f) return;
    const limit = fieldLimit(f);
    // A pixel more or less (the rounding of the heights) is not a change: else it goes to and fro
    const was = parseFloat(f.style.maxWidth), now = parseFloat(limit);
    const same = limit === f.style.maxWidth || (!isNaN(was) && !isNaN(now) && Math.abs(was - now) <= 2);
    if (!same) f.style.maxWidth = limit;
    const ratio = window.devicePixelRatio || 1;
    const width = f.clientWidth;
    const height = (width * FIELD_HEIGHT) / LANE.width;
    c.style.width = `${width}px`;
    c.style.height = `${height}px`;
    c.width = Math.round(width * ratio);
    c.height = Math.round(height * ratio);
    scale = (width * ratio) / LANE.width;
    draw();
}

const SOUND_OF: Record<BattleEvent, SoundName> = { summon: 'summon', hit: 'hit', fall: 'fall', base: 'base', wallet: 'wallet', win: 'win', lose: 'lose' };

let finishing = false;
function draw() {
    const ctx = canvas.value?.getContext('2d');
    if (ctx) drawBattle(ctx, battle, scale);
    for (const e of battle.events) play(SOUND_OF[e]);
    battle.events.length = 0;
    const w = walletOf(battle);
    hud.money = Math.floor(battle.money);
    hud.cap = w.cap;
    hud.walletLevel = battle.wallet + 1;
    hud.walletNext = w.next;
    hud.canWallet = canUpgradeWallet(battle);
    hud.mana = battle.mana / MANA_MAX;
    hud.manaFull = manaFull(battle);
    for (const u of deck) {
        hud.ready[u.id] = canSummon(battle, u.id);
        hud.cooldown[u.id] = (battle.cooldowns[u.id] ?? 0) / u.cooldownMs;
    }
    hud.result = battle.result;
    if (tutorial.value === 'fight' && hud.manaFull && kit.value) tutorial.value = 'magic';
    if (battle.result && !question.value && !choices.value && !finishing) end();
}

const loop = createLoop(dt => step(battle, dt), draw);

// --- The buttons ---
function send(id: UnitId) {
    unlockAudio();
    if (summon(battle, id) && tutorial.value === 'summon') tutorial.value = 'fight';
}

function wallet() {
    unlockAudio();
    upgradeWallet(battle);
}

function strokesOf(kanji: string) {
    return kit.value?.strokes[kanji]?.length ?? 99;
}

function magic() {
    unlockAudio();
    if (!kit.value || question.value || choices.value || !startSpell(battle)) return;
    const items = pickChoices({
        grade: save.settings.grade,
        only: save.settings.only,
        progress,
        recent: save.recent,
        used,
        strokesOf
    }, spellGroup);
    choices.value = items.map(item => {
        const group = spellGroup(item.kanji);
        const element = elementOfGroup(group);
        const rating = group === 'metal' || group === 'word' ? 'none' : element ? spellRating(battle, element) : 'normal';
        return { question: questionFor(item), group, rating };
    });
    loop.timeScale = SPELL_SLOW;
    play('open');
    if (tutorial.value === 'magic') tutorial.value = null;
}

// A card chosen: the magic circle opens with its kanji
function chosen(i: number) {
    const c = choices.value?.[i];
    choices.value = null;
    if (!c) return closed();
    used.add(c.question.item.kanji);
    question.value = c.question;
}

// The spell is judged: it goes off now (the battle still slow behind the circle)
function judged(outcome: SpellOutcome) {
    spells.push(outcome);
    const strokes = strokesOf(outcome.kanji);
    castSpell(battle, spellEffect(outcome.kanji, outcome.grade, strokes), outcome.grade);
    play(outcome.grade);
    if (outcome.grade !== 'fail') setTimeout(() => play(spellGroup(outcome.kanji)), 250);
    recordOutcome(outcome);
}

function closed() {
    question.value = null;
    loop.timeScale = 1;
    if (stage.tutorial && !save.tutorialDone && tutorial.value === null) {
        tutorial.value = 'cheer';
        setTimeout(() => {
            if (tutorial.value === 'cheer') tutorial.value = null;
        }, 4000);
    }
}

// --- The end ---
function end() {
    finishing = true;
    // A moment to see the base fall, then the result
    setTimeout(() => {
        loop.stop();
        const perfects = spells.filter(s => s.grade === 'perfect' && !s.traced).length;
        finishBattle(stage, battle.result === 'win', starsOf(battle, perfects), spells);
        go('result');
    }, 1500);
}

function pause() {
    unlockAudio();
    loop.stop();
    paused.value = true;
    pauseDialog.value?.showModal();
}

function resume() {
    pauseDialog.value?.close();
}

let leaving = false;
function onPauseClosed() {
    paused.value = false;
    if (!leaving) loop.start();
}

function quit() {
    leaving = true;
    loop.stop();
    pauseDialog.value?.close();
    go('stages');
}

// The judging and KanjiVG, loaded now so they are ready when the gauge is full. Offline: tried again
let retry: ReturnType<typeof setTimeout> | undefined;
async function load() {
    try {
        kit.value = await loadTegaki();
        loadFailed.value = false;
    } catch {
        loadFailed.value = true;
        retry = setTimeout(load, 5000);
    }
}

// The hidden page (another app): the battle waits
function onVisibility() {
    if (document.hidden && !paused.value && !question.value && !choices.value && !battle.result) pause();
}

onMounted(() => {
    observer = new ResizeObserver(fit);
    if (field.value) observer.observe(field.value);
    // A tutorial or a note under the field: less room for it
    if (hudBox.value) observer.observe(hudBox.value);
    window.addEventListener('resize', fit);
    fit();
    loop.start();
    void load();
    document.addEventListener('visibilitychange', onVisibility);
});
onBeforeUnmount(() => {
    leaving = true;
    loop.stop();
    observer?.disconnect();
    window.removeEventListener('resize', fit);
    clearTimeout(retry);
    document.removeEventListener('visibilitychange', onVisibility);
});

const unitLabel = (u: (typeof deck)[number]) => `${plain(u.form.name)}（${u.cost}円）`;
</script>

<template>
    <main class="battle">
        <header class="battle-head">
            <button type="button" class="btn" @click="pause"><Furi text="[止|と]める" /></button>
            <p class="battle-stage">ステージ {{ stage.id }}：<Furi :text="stage.name" /></p>
        </header>

        <div ref="field" class="battle-field">
            <canvas ref="canvas" aria-label="戦いの 様子"></canvas>
            <p v-if="hud.result" class="battle-banner" :class="hud.result"><Furi :text="hud.result === 'win' ? '[勝|か]ち！' : '[負|ま]けちゃった…'" /></p>
        </div>

        <div ref="hudBox" class="battle-hud">
            <div class="hud-row">
                <p class="money" aria-live="off">💰 {{ hud.money }} / {{ hud.cap }}</p>
                <button type="button" class="btn" :disabled="!hud.canWallet" @click="wallet">
                    <Furi text="[財布|さいふ]" /> Lv{{ hud.walletLevel }}<template v-if="hud.walletNext !== null">（<Furi :text="`${hud.walletNext}[円|えん]で [強|つよ]く`" />）</template>
                </button>
            </div>

            <div class="hud-row magic-row">
                <div class="mana" role="meter" aria-label="魔力" :aria-valuenow="Math.round(hud.mana * 100)" aria-valuemin="0" aria-valuemax="100">
                    <div class="mana-bar" :style="{ transform: `scaleX(${hud.mana})` }"></div>
                    <span class="mana-text"><Furi text="[魔力|まりょく]" /> {{ Math.floor(hud.mana * 100) }}%</span>
                </div>
                <div class="pointer-anchor">
                    <button type="button" class="btn magic-btn" :class="{ 'is-full': hud.manaFull && kit }" :disabled="!kit || !hud.manaFull || !!question || !!choices" @click="magic">
                        <Furi :text="kit ? '[魔法|まほう]' : '[準備中|じゅんびちゅう]'" />
                    </button>
                    <span v-if="tutorial === 'magic'" class="pointer" aria-hidden="true">👆</span>
                </div>
            </div>
            <p v-if="loadFailed" class="hud-note"><Furi text="[魔法|まほう]の [準備|じゅんび]が できないよ。インターネットに つないでね" /></p>

            <div class="units">
                <div v-for="(u, i) in deck" :key="u.id" class="pointer-anchor">
                    <button type="button" class="unit" :disabled="!hud.ready[u.id]" :aria-label="unitLabel(u)" @click="send(u.id)">
                        <span class="unit-look" aria-hidden="true"><CharacterIcon :kind="u.id" :form="formOf(save.units[u.id])" :size="44" /></span>
                        <span class="unit-cost"><Furi :text="`${u.cost}[円|えん]`" /></span>
                        <span class="unit-wait" :style="{ transform: `scaleY(${hud.cooldown[u.id] ?? 0})` }" aria-hidden="true"></span>
                    </button>
                    <span v-if="tutorial === 'summon' && i === 0" class="pointer" aria-hidden="true">👆</span>
                </div>
            </div>
            <p v-if="tutorialText" class="tutorial" role="status"><Furi :text="tutorialText" /></p>
        </div>

        <MuteButton />

        <dialog ref="pauseDialog" class="pause" aria-labelledby="pause-title" @close="onPauseClosed">
            <h2 id="pause-title"><Furi text="[一休|ひとやす]み" /></h2>
            <div class="pause-actions">
                <button type="button" class="btn btn-primary" autofocus @click="resume"><Furi text="[続|つづ]ける" /></button>
                <button type="button" class="btn" @click="quit"><Furi text="やめて ステージを [選|えら]ぶ" /></button>
            </div>
        </dialog>

        <SpellChoice v-if="choices" :choices="choices" @pick="chosen" />
        <SpellOverlay v-if="question && kit" :kit="kit" :question="question"
            :settings="{ strokeOrder: save.settings.strokeOrder, trace: save.settings.trace }" @judged="judged" @done="closed" />
    </main>
</template>

<style scoped>
.battle {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 72rem;
    min-height: 100dvh;
    margin: 0 auto;
    padding: 0.5rem 1rem 1rem;
}

/* On a PC (wide, and tall enough): the whole battle in the window, no scrolling. The field is
   2.5 times as wide as high (LANE.width / FIELD_HEIGHT); about 19rem go to the rest */
@media (min-width: 64em) and (min-height: 36em) {
    .battle {
        max-width: min(72rem, (100dvh - 19rem) * 2.5 + 2rem);
    }
}

.battle-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding-right: 3.5rem;
}

.battle-stage {
    font-family: var(--hand);
    font-weight: 600;
}

.battle-field {
    position: relative;
    width: 100%;
    /* Narrower on a PC with a low window (fieldLimit) */
    margin-inline: auto;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 0 0 2px var(--rule);
}

canvas {
    display: block;
    touch-action: manipulation;
}

.battle-banner {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    font-family: var(--hand);
    font-weight: 600;
    font-size: clamp(2rem, 8vw, 4rem);
    color: #fff;
    text-shadow: 0 2px 6px rgb(0 0 0 / 0.6);
    background: rgb(0 0 0 / 0.25);
}

.battle-hud {
    display: grid;
    gap: 0.5rem;
}

.hud-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem;
}

.money {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-width: 9rem;
}

.mana {
    position: relative;
    flex: 1 1 12rem;
    height: 2rem;
    border-radius: 999px;
    background: var(--rule-soft);
    overflow: hidden;
}

.mana-bar {
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, #7d6cf0, #c38cff);
    transform-origin: left;
}

.mana-text {
    position: relative;
    display: block;
    text-align: center;
    line-height: 2rem;
    font-weight: 700;
    font-size: 1rem;
    color: #fff;
    text-shadow: 0 1px 2px rgb(0 0 0 / 0.6);
}

.magic-btn {
    min-width: 8rem;
    min-height: 3.5rem;
    font-size: 1.25rem;
}

.magic-btn.is-full {
    border-color: #7d6cf0;
    background: #7d6cf0;
    color: #fff;
    box-shadow: 0 0 0 4px rgb(195 140 255 / 0.5);
}

@media (prefers-reduced-motion: no-preference) {
    .magic-btn.is-full {
        animation: magic-ready 1.4s ease-in-out infinite alternate;
    }
}

@keyframes magic-ready {
    to {
        box-shadow: 0 0 0 10px rgb(195 140 255 / 0.15);
    }
}

.hud-note {
    color: var(--red);
    font-size: 1rem;
}

.units {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.unit {
    position: relative;
    display: grid;
    justify-items: center;
    gap: 0.1rem;
    width: 5rem;
    padding: 0.4rem 0.25rem;
    border: 2px solid var(--rule);
    border-radius: 0.75rem;
    background: var(--paper);
    overflow: hidden;
    cursor: pointer;
}

.unit:disabled {
    cursor: default;
    filter: grayscale(0.8);
    opacity: 0.7;
}

.unit-look {
    display: grid;
    place-items: center;
    width: 2.8rem;
    height: 2.8rem;
}

.unit-cost {
    font-weight: 700;
    font-size: 0.9rem;
}

/* The wait before the unit can be sent again, falling */
.unit-wait {
    position: absolute;
    inset: 0;
    background: rgb(0 0 0 / 0.35);
    transform-origin: bottom;
    pointer-events: none;
}

.pointer-anchor {
    position: relative;
}

.pointer {
    position: absolute;
    left: 50%;
    top: 100%;
    font-size: 2.2rem;
    pointer-events: none;
    translate: -50% 0;
}

@media (prefers-reduced-motion: no-preference) {
    .pointer {
        animation: point 0.8s ease-in-out infinite alternate;
    }
}

@keyframes point {
    to {
        translate: -50% -0.6rem;
    }
}

.tutorial {
    margin-top: 1.5rem;
    padding: 0.5rem 1rem;
    border-radius: 0.75rem;
    background: var(--mark-soft);
    font-family: var(--hand);
    font-weight: 600;
    text-align: center;
}

.pause:modal {
    padding: 1.5rem;
    border: 2px solid var(--rule);
    border-radius: 1rem;
    background: var(--paper);
    color: var(--ink);
    text-align: center;
}

.pause::backdrop {
    background: rgb(0 0 0 / 0.5);
}

.pause h2 {
    font-family: var(--hand);
    margin-bottom: 1rem;
}

.pause-actions {
    display: grid;
    gap: 0.75rem;
}
</style>
