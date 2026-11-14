<script setup lang="ts">
// --- The mark of an element or a group of spells: a flame, a drop, a leaf (and a shield, a word
// balloon, a star). 'cycle': the three (the boss that changes) ---
import { computed } from 'vue';
import type { Element } from '../spell/elements';
import type { SpellGroup } from '../spell/effects';
import { MARK_PATHS } from '../art/marks';

const props = withDefaults(defineProps<{ mark: SpellGroup | Element | 'cycle'; size?: number }>(), { size: 24 });

const marks = computed(() => (props.mark === 'cycle' ? (['fire', 'water', 'wood'] as const) : [props.mark]).map(m => MARK_PATHS[m]));
</script>

<template>
    <span class="element-mark" aria-hidden="true">
        <svg v-for="(m, i) in marks" :key="i" viewBox="0 0 24 24" :width="mark === 'cycle' ? size * 0.7 : size" :height="mark === 'cycle' ? size * 0.7 : size">
            <path :d="m.d" :fill="m.color" stroke="#2b2340" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" />
        </svg>
    </span>
</template>

<style scoped>
.element-mark {
    display: inline-flex;
    vertical-align: middle;
}
</style>
