<script setup lang="ts">
// --- 編成: up to DECK_SIZE units to take into the battle, and making them stronger with どんぐり ---
// The enemies of the stage are shown with their elements, and each unit says whether its element
// is good against them (とくい) or not (にがて).
import Furi from '../components/Furi.vue';
import { computed } from 'vue';
import CharacterIcon from '../components/CharacterIcon.vue';
import ElementMark from '../components/ElementMark.vue';
import { BEATS, ELEMENTS, type Element } from '../spell/elements';
import { EVOLVE_AT, MAX_LEVEL, upgradeCost } from '../config';
import { stageById, stageEnemies } from '../game/stages';
import { UNIT_IDS, UNITS, formOf, unitStats, type UnitId } from '../game/units';
import { DECK_SIZE } from '../storage';
import { availableUnits, canUpgradeUnit, fillDeck, go, save, toggleDeck, ui, upgradeUnit } from '../store';
import { play, unlockAudio } from '../sound';

fillDeck();
const stage = computed(() => stageById(ui.stageId));
const foes = computed(() => stageEnemies(stage.value));
// The elements of the enemies of the stage (the boss that changes has all three)
const foeElements = computed(() => new Set<Element>(foes.value.flatMap(f => (f.element === 'cycle' ? ELEMENTS : f.element ? [f.element] : []))));
function fit(e: Element): 'good' | 'bad' | null {
    if (foeElements.value.has(BEATS[e])) return 'good';
    if ([...foeElements.value].some(f => BEATS[f] === e)) return 'bad';
    return null;
}
const units = computed(() => UNIT_IDS.map(id => {
    const level = save.units[id];
    const s = unitStats(id, level);
    const nextForm = level < MAX_LEVEL ? formOf(level + 1) !== formOf(level) : false;
    return { id, level, s, open: availableUnits().includes(id), inDeck: save.deck.includes(id), nextForm, fit: fit(UNITS[id].element) };
}));

function upgrade(id: UnitId) {
    unlockAudio();
    if (upgradeUnit(id)) play('wallet');
}

function start() {
    unlockAudio();
    go('battle');
}
</script>

<template>
    <main class="screen">
        <header class="screen-head">
            <button type="button" class="btn" @click="go('stages')"><Furi text="[戻|もど]る" /></button>
            <h1><Furi text="[編成|へんせい]" /></h1>
        </header>

        <section class="card go">
            <p>ステージ {{ stage.id }}：<Furi :text="stage.name" /></p>
            <div class="foes">
                <span class="foes-title"><Furi text="[出|で]てくる [敵|てき]" /></span>
                <span v-for="(f, i) in foes" :key="i" class="foe">
                    <CharacterIcon :kind="f.enemy" :element="f.element === 'cycle' ? 'fire' : f.element" :size="40" />
                    <ElementMark v-if="f.element" :mark="f.element" :size="18" />
                </span>
            </div>
            <p class="affinity">
                <ElementMark mark="water" :size="22" /> → <ElementMark mark="fire" :size="22" /> → <ElementMark mark="wood" :size="22" /> → <ElementMark mark="water" :size="22" />
                <small><Furi text="やじるしの [先|さき]に [強|つよ]いよ" /></small>
            </p>
            <p class="deck" aria-label="連れていく 仲間">
                <span v-for="i in DECK_SIZE" :key="i" class="slot">
                    <CharacterIcon v-if="save.deck[i - 1]" :kind="save.deck[i - 1]" :form="formOf(save.units[save.deck[i - 1]])" :size="40" />
                </span>
            </p>
            <button type="button" class="btn btn-primary btn-go" @click="start"><Furi text="[出撃|しゅつげき]！" /></button>
        </section>

        <p>どんぐり：<b>{{ save.materials }}</b>（<Furi text="[勝|か]つと もらえるよ" />）</p>

        <ul class="units">
            <li v-for="u in units" :key="u.id" class="card unit" :class="{ locked: !u.open }">
                <template v-if="u.open">
                    <span class="unit-look" aria-hidden="true"><CharacterIcon :kind="u.id" :form="formOf(u.level)" :size="64" :animate="u.inDeck" /></span>
                    <div class="unit-text">
                        <p class="unit-name"><ElementMark :mark="UNITS[u.id].element" :size="20" /> <Furi :text="u.s.form.name" /> <small>Lv{{ u.level }}</small></p>
                        <p class="unit-stats"><Furi :text="`${UNITS[u.id].role}・[体力|たいりょく] ${u.s.hp}・[攻撃|こうげき] ${u.s.attack}・${u.s.cost}[円|えん]`" /></p>
                    </div>
                    <div class="unit-actions">
                        <label class="check"><input type="checkbox" :checked="u.inDeck" :disabled="!u.inDeck && save.deck.length >= DECK_SIZE" @change="toggleDeck(u.id)"><Furi text="[連|つ]れていく" /></label>
                        <button v-if="u.level < MAX_LEVEL" type="button" class="btn" :disabled="!canUpgradeUnit(u.id)" @click="upgrade(u.id)">
                            <Furi :text="u.nextForm ? '[進化|しんか]' : '[強|つよ]くする'" />（どんぐり {{ upgradeCost(u.level) }}）
                        </button>
                        <span v-else><Furi text="[最大|さいだい]！" /></span>
                    </div>
                    <p v-if="u.fit" class="fit" :class="u.fit"><Furi :text="u.fit === 'good' ? '◎ この ステージが [得意|とくい]' : '△ この ステージは [苦手|にがて]'" /></p>
                </template>
                <template v-else>
                    <span class="unit-look" aria-hidden="true">？</span>
                    <p class="unit-text"><Furi :text="`ステージ ${UNITS[u.id].unlockAfter} を クリアすると [仲間|なかま]に なるよ`" /></p>
                </template>
            </li>
        </ul>
        <p class="hint"><Furi :text="`Lv${EVOLVE_AT[0]} と Lv${EVOLVE_AT[1]} で [進化|しんか]するよ`" /></p>
    </main>
</template>

<style scoped>
.go {
    display: grid;
    gap: 0.5rem;
    justify-items: center;
    text-align: center;
}

.foes {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
}

.foes-title {
    font-weight: 700;
}

.foe {
    display: inline-flex;
    align-items: center;
}

.affinity {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
    margin: 0;
}

.fit {
    flex-basis: 100%;
    margin: 0;
    font-weight: 700;
}

.fit.good {
    color: #c2410c;
}

.fit.bad {
    color: var(--muted);
}

.deck {
    display: flex;
    gap: 0.4rem;
}

.slot {
    display: grid;
    place-items: center;
    width: 3rem;
    height: 3rem;
    border: 2px dashed var(--rule);
    border-radius: 50%;
    font-size: 1.6rem;
}

.btn-go {
    min-height: 3.5rem;
    min-width: 12rem;
    font-size: 1.25rem;
}

.units {
    display: grid;
    gap: 0.6rem;
}

.unit {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
}

.unit.locked {
    opacity: 0.6;
}

.unit-look {
    display: grid;
    place-items: center;
    flex: none;
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background: var(--rule-soft);
    overflow: hidden;
    font-size: 1.8rem;
}

.unit-text {
    flex: 1 1 12rem;
}

.unit-name {
    font-family: var(--hand);
    font-weight: 600;
}

.unit-stats {
    font-size: 0.95rem;
    color: var(--muted);
}

.unit-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
}

.hint {
    color: var(--muted);
    font-size: 1rem;
}
</style>
