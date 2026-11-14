<script setup lang="ts">
// --- A text with kanji: furigana over the kanji of a grade later than the one set ---
// `text` is written with marks: "[魔法|まほう]の [本|ほん]" (see learning/furi.ts)
import { computed } from 'vue';
import { segments } from '../learning/furi';
import { save } from '../store';

const props = defineProps<{ text: string }>();
const parts = computed(() => segments(props.text, save.settings.grade));
</script>

<template>
    <template v-for="(p, i) in parts" :key="i">
        <ruby v-if="p.ruby">{{ p.text }}<rp>(</rp><rt>{{ p.ruby }}</rt><rp>)</rp></ruby>
        <template v-else>{{ p.text }}</template>
    </template>
</template>
