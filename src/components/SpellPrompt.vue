<script setup lang="ts">
// --- The question of a spell: a phrase with the kanji to write left as □, its reading under it ---
// The kanji itself is never shown (the child shows that they can write it). Used by the practice
// page, and later by SpellOverlay
import type { Reibun } from '../vendor/kanji-quiz/src/data/reibun';

defineProps<{
    reibun: Reibun;
    // After the spell: the kanji in the □
    answer?: string | null;
}>();
</script>

<template>
    <p class="spell-prompt">
        <span v-if="reibun.before">{{ reibun.before }}</span>
        <span class="spell-blank" :class="{ 'is-answered': answer }">
            <span class="spell-box">{{ answer || '' }}</span>
            <span class="spell-reading">{{ reibun.reading }}</span>
        </span>
        <span v-if="reibun.after">{{ reibun.after }}</span>
    </p>
</template>

<style scoped>
.spell-prompt {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 0.15em;
    font-family: var(--hand);
    font-weight: 600;
    font-size: clamp(1.5rem, 6vw, 2.25rem);
    line-height: 1.4;
}

.spell-blank {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
}

.spell-box {
    display: grid;
    place-items: center;
    min-width: 1.4em;
    height: 1.4em;
    border: 3px solid var(--ink);
    font-family: var(--font-kyokasho);
    background: var(--paper);
}

.is-answered .spell-box {
    border-color: var(--red);
    color: var(--red);
}

.spell-reading {
    font-size: 0.5em;
    line-height: 1.3;
    color: var(--muted);
}
</style>
