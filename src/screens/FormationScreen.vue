<script setup lang="ts">
// --- 編成: up to DECK_SIZE units to take into the battle, and making them stronger with どんぐり ---
// The enemies of the stage are shown with their elements, and each unit says whether its element
// is good against them (とくい) or not (にがて). From the 11th stage the enemies have weak points
// (enemies.ts tip, counters): told under them, and on the units good against them; and a stage with
// big waves says so.
import Furi from '../components/Furi.vue';
import { computed } from 'vue';
import CharacterIcon from '../components/CharacterIcon.vue';
import ElementMark from '../components/ElementMark.vue';
import { BEATS, ELEMENTS, type Element } from '../spell/elements';
import { EVOLVE_AT, MAX_LEVEL, upgradeCost } from '../config';
import { stageById, stageEnemies } from '../game/stages';
import { ENEMIES, type EnemyId } from '../game/enemies';
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
// The kinds of enemies with a weak point, once each
// (their names short, without わすれ)
const tips = computed(() => [...new Set(foes.value.map(f => f.enemy))].filter(id => ENEMIES[id].tip).map(id => ({ id, name: ENEMIES[id].name.replace(/わすれ$/, ''), tip: ENEMIES[id].tip! })));
// The enemies of the stage this unit is good against
const strongOn = (id: UnitId) => tips.value.filter(t => ENEMIES[t.id as EnemyId].counters?.includes(id)).map(t => t.name);
const units = computed(() => UNIT_IDS.map(id => {
    const level = save.units[id];
    const s = unitStats(id, level);
    const nextForm = level < MAX_LEVEL ? formOf(level + 1) !== formOf(level) : false;
    return { id, level, s, open: availableUnits().includes(id), inDeck: save.deck.includes(id), nextForm, fit: fit(UNITS[id].element), strong: strongOn(id) };
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
    <main class="screen formation">
        <header class="screen-head">
            <button type="button" class="btn" @click="go('stages')"><Furi text="[戻|もど]る" /></button>
            <h1><Furi text="[編成|へんせい]" /></h1>
        </header>

        <section class="card go">
            <p>ステージ {{ stage.id }}：<Furi :text="stage.name" /></p>
            <div class="foes">
                <span class="foes-title"><Furi text="[出|で]てくる [敵|てき]" /></span>
                <span v-for="(f, i) in foes" :key="i" class="foe" :class="{ 'is-air': ENEMIES[f.enemy].flying }">
                    <CharacterIcon :kind="f.enemy" :element="f.element === 'cycle' ? 'fire' : f.element" :size="40" />
                    <span v-if="ENEMIES[f.enemy].flying" class="air-tag" aria-label="空を 飛ぶ">☁️</span>
                    <ElementMark v-if="f.element" :mark="f.element" :size="18" />
                </span>
            </div>
            <ul v-if="tips.length" class="foe-tips">
                <li v-for="t in tips" :key="t.id"><CharacterIcon :kind="t.id" :size="28" /><span><b>{{ t.name }}</b>：<Furi :text="t.tip" /></span></li>
            </ul>
            <p v-if="stage.waves?.length" class="waves"><Furi text="⚠ [大群|たいぐん]が くる ステージ。[魔法|まほう]を ためて [使|つか]おう" /></p>
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

        <p class="acorns">どんぐり：<b>{{ save.materials }}</b>（<Furi text="[勝|か]つと もらえるよ" />）</p>

        <ul class="units">
            <li v-for="u in units" :key="u.id" class="card unit" :class="{ locked: !u.open }">
                <template v-if="u.open">
                    <span class="unit-look" aria-hidden="true"><CharacterIcon :kind="u.id" :form="formOf(u.level)" :size="56" :animate="u.inDeck" /></span>
                    <div class="unit-text">
                        <p class="unit-name">
                            <ElementMark :mark="UNITS[u.id].element" :size="18" />
                            <Furi :text="u.s.form.name" />
                            <small>Lv{{ u.level }}</small>
                            <span v-if="UNITS[u.id].flying" class="badge air"><Furi text="☁️ [空|そら]" /></span>
                            <span v-else-if="UNITS[u.id].antiAir" class="badge antiair"><Furi text="🎯 [空|そら]OK" /></span>
                        </p>
                        <p class="unit-stats"><Furi :text="`${UNITS[u.id].role}・[体力|たいりょく] ${u.s.hp}・[攻撃|こうげき] ${u.s.attack}・${u.s.cost}[円|えん]`" /></p>
                    </div>
                    <div class="unit-actions">
                        <label class="check"><input type="checkbox" :checked="u.inDeck" :disabled="!u.inDeck && save.deck.length >= DECK_SIZE" @change="toggleDeck(u.id)"><Furi text="[連|つ]れていく" /></label>
                        <button v-if="u.level < MAX_LEVEL" type="button" class="btn" :disabled="!canUpgradeUnit(u.id)" @click="upgrade(u.id)">
                            <Furi :text="u.nextForm ? '[進化|しんか]' : '[強|つよ]くする'" />（どんぐり {{ upgradeCost(u.level) }}）
                        </button>
                        <span v-else><Furi text="[最大|さいだい]！" /></span>
                    </div>
                    <p v-if="u.strong.length" class="fit good strong"><Furi :text="`◎ ${u.strong.join('・')}に つよい${u.fit === 'bad' ? '（[属性|ぞくせい]は [苦手|にがて]）' : ''}`" /></p>
                    <p v-else-if="u.fit" class="fit" :class="u.fit"><Furi :text="u.fit === 'good' ? '◎ この ステージが [得意|とくい]' : '△ この ステージは [苦手|にがて]'" /></p>
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
/* On a wide screen (a PC): the stage on the left, the units on the right, so that it all fits in
   the window without scrolling (fitScreen.ts) */
@media (min-width: 64em) {
    .formation {
        display: grid;
        grid-template-columns: minmax(18rem, 1fr) 2fr;
        grid-template-rows: auto auto auto auto 1fr;
        grid-template-areas:
            "head head"
            "go units"
            "acorns units"
            "hint units"
            ". units";
        align-content: start;
        max-width: 80rem;
    }

    .formation > .screen-head {
        grid-area: head;
    }

    .go {
        grid-area: go;
    }

    .acorns {
        grid-area: acorns;
    }

    /* The units two by two */
    .units {
        grid-area: units;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        align-content: start;
    }

    .hint {
        grid-area: hint;
    }
}

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

.foe.is-air {
    padding: 0 0.25rem;
    border-radius: 999px;
    background: rgb(110 198 255 / 0.22);
}

.air-tag {
    font-size: 0.75rem;
    margin-left: -0.15rem;
}

.badge {
    display: inline-block;
    margin-left: 0.25rem;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    font-family: var(--ui);
    font-size: 0.72rem;
    font-weight: 700;
    vertical-align: middle;
}

.badge.air {
    background: #dbeafe;
    color: #1d4ed8;
}

.badge.antiair {
    background: #fef3c7;
    color: #b45309;
}

/* From the 11th stage: how to beat each enemy, and the big waves */
.foe-tips {
    display: grid;
    gap: 0.15rem;
    margin: 0;
    padding: 0;
    list-style: none;
    font-size: 0.8rem;
    line-height: 1.3;
    text-align: start;
}

.foe-tips li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
}

.foe-tips :deep(canvas),
.foe-tips > li > :first-child {
    flex: none;
}

.waves {
    margin: 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: #b5400f;
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

/* Good against the enemies of the stage: maybe a few names, smaller to stay on one line */
.fit.strong {
    font-size: 0.85rem;
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
    gap: 0.45rem;
}

.unit {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.65rem;
    padding: 0.55rem 0.75rem;
}

.unit.locked {
    opacity: 0.6;
}

.unit-look {
    display: grid;
    place-items: center;
    flex: none;
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    background: var(--rule-soft);
    overflow: hidden;
    font-size: 1.6rem;
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
