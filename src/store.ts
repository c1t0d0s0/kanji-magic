// --- What the screens share: the saved data (reactive) and the actions that change it ---
// The battle itself is not here (game/battle.ts, not reactive): only what is kept between screens.
import { reactive, shallowRef } from 'vue';
import { MAX_LEVEL, upgradeCost } from './config';
import { rewardOf } from './game/battle';
import { STAGES, type Stage } from './game/stages';
import { unlockedUnits, type UnitId } from './game/units';
import { recordSpell, type KanjiProgress, type ProgressMap } from './learning/progress';
import { pushRecent } from './learning/picker';
import type { SpellOutcome } from './spell/grade';
import { DECK_SIZE, defaultSave, eraseSave, loadSave, writeSave, type SaveData, type Settings } from './storage';
import { setVolume } from './sound';

export const save = reactive<SaveData>(loadSave());

// The progress by kanji (a Map, for the picker); kept in step with save.progress
export const progress: ProgressMap = new Map(save.progress.map(p => [p.char, p]));

export function persist() {
    writeSave(save);
}

export type Screen = 'title' | 'stages' | 'formation' | 'battle' | 'result' | 'book' | 'characters' | 'settings' | 'credits';

export interface BattleReport {
    stage: Stage;
    won: boolean;
    stars: number;
    reward: number;
    firstClear: boolean;
    spells: SpellOutcome[];
    // The spells were sent in Morse code (the せってい of the battle), even when none was cast
    morse: boolean;
}

export const ui = reactive({
    screen: 'title' as Screen,
    stageId: 1
});
export const lastReport = shallowRef<BattleReport | null>(null);

export function go(screen: Screen) {
    ui.screen = screen;
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
}

// --- Stages ---
// The highest stage cleared in a row from the first (0: none)
export function clearedUpTo(): number {
    let n = 0;
    for (const s of STAGES) {
        if (save.stages[s.id]?.cleared) n = s.id;
        else break;
    }
    return n;
}

export const isOpen = (id: number) => id <= clearedUpTo() + 1;

// --- Units ---
export function availableUnits(): UnitId[] {
    return unlockedUnits(clearedUpTo());
}

// Units newly usable are put in the deck while there is room
export function fillDeck() {
    for (const id of availableUnits()) {
        if (save.deck.length >= DECK_SIZE) break;
        if (!save.deck.includes(id)) save.deck.push(id);
    }
    save.deck = save.deck.filter(id => availableUnits().includes(id));
}

export function toggleDeck(id: UnitId) {
    if (save.deck.includes(id)) {
        if (save.deck.length > 1) save.deck = save.deck.filter(d => d !== id);
    } else if (save.deck.length < DECK_SIZE && availableUnits().includes(id)) save.deck.push(id);
    persist();
}

export function canUpgradeUnit(id: UnitId) {
    const level = save.units[id];
    return level < MAX_LEVEL && save.materials >= upgradeCost(level);
}

export function upgradeUnit(id: UnitId) {
    if (!canUpgradeUnit(id)) return false;
    save.materials -= upgradeCost(save.units[id]);
    save.units[id]++;
    persist();
    return true;
}

// --- Spells and battles ---
export function recordOutcome(outcome: SpellOutcome) {
    const p: KanjiProgress = recordSpell(progress, outcome, Date.now());
    const at = save.progress.findIndex(q => q.char === p.char);
    if (at >= 0) save.progress[at] = p;
    else save.progress.push(p);
    save.recent = pushRecent(save.recent, outcome.kanji);
    persist();
}

export function finishBattle(stage: Stage, won: boolean, stars: number, spells: SpellOutcome[], morse = false): BattleReport {
    const before = save.stages[stage.id];
    const firstClear = won && !before?.cleared;
    const perfects = spells.filter(s => s.grade === 'perfect' && !s.traced).length;
    const reward = rewardOf(stage, won, firstClear, perfects);
    save.materials += reward;
    if (won) save.stages[stage.id] = { cleared: true, stars: Math.max(stars, before?.stars ?? 0) };
    if (stage.tutorial && won) save.tutorialDone = true;
    fillDeck();
    persist();
    const report = { stage, won, stars, reward, firstClear, spells, morse };
    lastReport.value = report;
    return report;
}

// --- Settings ---
export function changeSettings(next: Partial<Settings>) {
    Object.assign(save.settings, next);
    setVolume(save.settings.muted ? 0 : save.settings.volume);
    persist();
}

export function eraseAll() {
    eraseSave();
    Object.assign(save, defaultSave());
    progress.clear();
    setVolume(save.settings.volume);
    persist();
}

setVolume(save.settings.muted ? 0 : save.settings.volume);
