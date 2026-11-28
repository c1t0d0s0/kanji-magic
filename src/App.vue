<script setup lang="ts">
// --- The game: one screen at a time (title → stages → 編成 → battle → result, the 魔法書, せってい,
// クレジット) and the mute button over all of them ---
import { onMounted, watchEffect } from 'vue';
import MuteButton from './components/MuteButton.vue';
import SiteFooter from './components/SiteFooter.vue';
import TitleScreen from './screens/TitleScreen.vue';
import StageSelect from './screens/StageSelect.vue';
import FormationScreen from './screens/FormationScreen.vue';
import BattleScreen from './screens/BattleScreen.vue';
import ResultScreen from './screens/ResultScreen.vue';
import MagicBook from './screens/MagicBook.vue';
import CharacterList from './screens/CharacterList.vue';
import SettingsScreen from './screens/SettingsScreen.vue';
import CreditsScreen from './screens/CreditsScreen.vue';
import { unlockAudio } from './sound';
import { textFor } from './learning/furi';
import { save, ui } from './store';
import { useFitScreen } from './fitScreen';

// Browsers allow sound only after a tap
onMounted(() => document.addEventListener('pointerdown', unlockAudio, { once: true }));
// On a PC: as big as the window allows, without scrolling
useFitScreen(() => ui.screen, () => ui.screen === 'battle');
// The tab's title: no ruby there, so the kanji not learned yet are in kana
watchEffect(() => (document.title = textFor('KM[魔法|まほう][大|だい][戦争|せんそう]', save.settings.grade)));
</script>

<template>
    <TitleScreen v-if="ui.screen === 'title'" />
    <StageSelect v-else-if="ui.screen === 'stages'" />
    <FormationScreen v-else-if="ui.screen === 'formation'" />
    <BattleScreen v-else-if="ui.screen === 'battle'" />
    <ResultScreen v-else-if="ui.screen === 'result'" />
    <MagicBook v-else-if="ui.screen === 'book'" />
    <CharacterList v-else-if="ui.screen === 'characters'" />
    <SettingsScreen v-else-if="ui.screen === 'settings'" />
    <CreditsScreen v-else-if="ui.screen === 'credits'" />
    <!-- The battle has its own (it is part of its page) -->
    <MuteButton v-if="ui.screen !== 'battle'" />
    <SiteFooter v-if="ui.screen !== 'battle'" />
</template>
