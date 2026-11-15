<script setup lang="ts">
// --- Before the magic circle: 3 kanji to choose from, each of a different element ---
// A card shows the element and what the kanji reads in its phrase (never the kanji: that is the
// answer), and how well it would work on the enemies there now. All in kana, as in the magic
// circle. The time runs out after CHOICE_SECONDS: the best card is taken.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { CHOICE_SECONDS } from '../config';
import { kana } from '../learning/furi';
import { SPELL_GROUPS, type SpellGroup } from '../spell/effects';
import type { Choice } from '../spell/question';
import ElementMark from './ElementMark.vue';
import MuteButton from './MuteButton.vue';
import { useNoSelect } from './noSelect';
import { play } from '../sound';

const props = defineProps<{ choices: Choice[] }>();
const emit = defineEmits<{ pick: [index: number] }>();

const dialog = ref<HTMLDialogElement | null>(null);
useNoSelect(dialog);
const totalMs = CHOICE_SECONDS * 1000;
const remaining = ref(totalMs);
let deadline = 0;
let frame = 0;
let timer: ReturnType<typeof setTimeout> | undefined;
let picked = false;

const RATING = {
    good: { mark: '◎', text: 'よく きく' },
    normal: { mark: '○', text: 'ふつう' },
    weak: { mark: '△', text: 'きかない' },
    none: { mark: '', text: 'てきが いないよ' }
} as const;
const SUPPORT: Partial<Record<SpellGroup, string>> = { metal: 'なかまを まもる', word: 'なかまを つよく する' };

const cards = computed(() => props.choices.map(c => {
    const support = SUPPORT[c.group];
    return {
        group: c.group,
        name: kana(SPELL_GROUPS[c.group].name),
        // The word in Morse code, or the reading of the kanji
        reading: c.word ?? c.question?.reibun.reading ?? '',
        morse: Boolean(c.word),
        // The phrase, the kanji as □ (its reading is the big word on the card)
        phrase: c.question ? `${c.question.reibun.before}□${c.question.reibun.after}` : '',
        rating: support ? null : RATING[c.rating],
        ratingKind: support ? 'support' : c.rating,
        support
    };
}));

// When the time runs out: ◎ first, then ○ (and the shield and the boost), then △
const ORDER = { good: 0, normal: 1, none: 1, weak: 2 } as const;
function best() {
    let at = 0;
    props.choices.forEach((c, i) => {
        if (ORDER[c.rating] < ORDER[props.choices[at].rating]) at = i;
    });
    return at;
}

function pick(i: number) {
    if (picked) return;
    picked = true;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    play('tap');
    if (dialog.value?.open) dialog.value.close();
    emit('pick', i);
}

function tick() {
    remaining.value = Math.max(0, deadline - performance.now());
    if (!picked) frame = requestAnimationFrame(tick);
}

// Esc cannot take the spell away: a closed dialog takes the best card
function onClose() {
    if (!picked) pick(best());
}

const seconds = computed(() => Math.ceil(remaining.value / 1000));

onMounted(() => {
    dialog.value?.showModal();
    deadline = performance.now() + totalMs;
    timer = setTimeout(() => pick(best()), totalMs);
    frame = requestAnimationFrame(tick);
});
onBeforeUnmount(() => {
    clearTimeout(timer);
    cancelAnimationFrame(frame);
});
</script>

<template>
    <dialog ref="dialog" class="spell-choice no-select" aria-labelledby="choice-title" @cancel.prevent @close="onClose">
        <div class="choice-panel">
            <h2 id="choice-title">どの まほうに する？</h2>
            <div class="choice-time" role="timer" :aria-label="`のこり ${seconds}びょう`">
                <div class="choice-time-bar" :style="{ transform: `scaleX(${remaining / totalMs})` }"></div>
            </div>
            <ul class="cards">
                <li v-for="(c, i) in cards" :key="i">
                    <button type="button" class="card-btn" :class="`is-${c.ratingKind}`" @click="pick(i)">
                        <span class="card-head"><ElementMark :mark="c.group" :size="30" /> {{ c.name }}</span>
                        <span class="card-reading" :class="{ 'is-morse': c.morse }">{{ c.reading }}</span>
                        <span v-if="c.phrase" class="card-phrase">{{ c.phrase }}</span>
                        <span class="card-rating">
                            <template v-if="c.rating"><b v-if="c.rating.mark">{{ c.rating.mark }}</b><span>{{ c.rating.text }}</span></template>
                            <span v-else class="card-support">{{ c.support }}</span>
                        </span>
                    </button>
                </li>
            </ul>
            <p class="choice-hint">みず → ほのお → き → みず の じゅんに つよいよ</p>
        </div>
        <MuteButton @click.stop />
    </dialog>
</template>

<style scoped>
.spell-choice {
    --spell-veil: rgb(18 14 40 / 0.95);
    --spell-text: #f6f3ff;
}

.spell-choice:modal {
    width: 100%;
    height: 100%;
    max-width: none;
    max-height: none;
    margin: 0;
    padding: max(0.75rem, env(safe-area-inset-top)) 1rem max(0.75rem, env(safe-area-inset-bottom));
    border: 0;
    background: var(--spell-veil);
    color: var(--spell-text);
    overflow: auto;
    overscroll-behavior: contain;
}

.spell-choice::backdrop {
    background: transparent;
}

.choice-panel {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    max-width: 44rem;
    margin: 0 auto;
    padding-top: 2.5rem;
}

h2 {
    margin: 0;
    font-family: var(--hand);
    font-size: 1.6rem;
}

.choice-time {
    width: min(100%, 24rem);
    height: 0.75rem;
    border-radius: 999px;
    background: rgb(255 255 255 / 0.15);
    overflow: hidden;
}

.choice-time-bar {
    height: 100%;
    background: #9d93e6;
    transform-origin: left;
}

.cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(6.5rem, 1fr));
    gap: 0.75rem;
    width: 100%;
    margin: 0;
    padding: 0;
    list-style: none;
}

.card-btn {
    display: grid;
    justify-items: center;
    gap: 0.3rem;
    width: 100%;
    min-height: 3rem;
    padding: 0.75rem;
    border: 3px solid rgb(255 255 255 / 0.25);
    border-radius: 1rem;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
}

.card-btn:focus-visible {
    outline: 4px solid #ffd45a;
    outline-offset: 2px;
}

.card-btn.is-good {
    border-color: #ffd45a;
    box-shadow: 0 0 0 3px rgb(255 212 90 / 0.4);
}

.card-btn.is-weak {
    opacity: 0.85;
}

.card-head {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-weight: 700;
    white-space: nowrap;
}

.card-reading {
    font-family: var(--hand);
    font-size: 2rem;
    line-height: 1.2;
}

.card-reading.is-morse {
    font-family: var(--ui);
    font-size: 1.5rem;
    font-weight: 700;
    letter-spacing: 0.05em;
}

.card-phrase {
    font-size: 0.95rem;
    color: var(--muted);
}

.card-rating {
    display: grid;
    justify-items: center;
    font-weight: 700;
    font-size: 0.95rem;
    line-height: 1.3;
    white-space: nowrap;
}

.is-good .card-rating {
    color: #c2410c;
}

.is-weak .card-rating {
    color: var(--muted);
}

.card-support {
    white-space: normal;
}

.choice-hint {
    margin: 0;
    font-size: 0.95rem;
    opacity: 0.85;
}

@media (prefers-reduced-motion: no-preference) {
    .card-btn {
        transition: transform 0.15s;
    }

    .card-btn:hover {
        transform: translateY(-2px);
    }
}
</style>
