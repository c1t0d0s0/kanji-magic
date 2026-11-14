<script setup lang="ts">
// --- The sound on and off, on every screen (requirements 12). Also in the magic circle, which
// covers the page ---
import { changeSettings, save } from '../store';
import { unlockAudio } from '../sound';

function toggle() {
    unlockAudio();
    changeSettings({ muted: !save.settings.muted });
}
</script>

<template>
    <button type="button" class="mute" :aria-pressed="save.settings.muted" :aria-label="save.settings.muted ? '音を 出す' : '音を 消す'" @click="toggle">
        <span aria-hidden="true">{{ save.settings.muted ? '🔇' : '🔊' }}</span>
    </button>
</template>

<style scoped>
.mute {
    position: fixed;
    top: max(0.5rem, env(safe-area-inset-top));
    right: max(0.5rem, env(safe-area-inset-right));
    z-index: 10;
    width: 3rem;
    height: 3rem;
    border: 1px solid var(--rule);
    border-radius: 50%;
    background: var(--paper);
    font-size: 1.4rem;
    line-height: 1;
    cursor: pointer;
}
</style>
