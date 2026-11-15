// --- A kanji to write, and the phrase that asks for it (the kanji left as □) ---
// pickQuestion: any kanji of the grade or below, not one of the last few (the practice page).
// The battle chooses the kanji with learning/picker.ts and asks it with questionFor
import { kanjiDatabase, type KanjiItem } from '../vendor/kanji-quiz/src/data/kanji';
import { reibunList, type Reibun } from '../vendor/kanji-quiz/src/data/reibun';
import type { SpellGroup } from './effects';

export interface Question {
    item: KanjiItem;
    reibun: Reibun;
}

// One of the 3 kanji to choose from before the magic circle (components/SpellChoice.vue)
export interface Choice {
    // The kanji to write (the kanji way), or
    question?: Question;
    // the word to send in Morse code (src/morse/: FIRE1A)
    word?: string;
    group: SpellGroup;
    // まもり, against the enemy's magic: whatever the kanji, it puts up the barrier of かね (group metal)
    guard?: boolean;
    // How well it would work on the enemies there now (game/battle.ts spellRating)
    rating: 'good' | 'normal' | 'weak' | 'none';
}

// The kanji asked last are left out (the list is changed: the new kanji goes in it)
export const RECENT = 5;

export function pickQuestion(grade: number, recent: string[], random: () => number = Math.random): Question {
    const all = kanjiDatabase.filter(k => k.grade <= grade);
    const fresh = all.filter(k => !recent.includes(k.kanji));
    const list = fresh.length > 0 ? fresh : all;
    const item = list[Math.floor(random() * list.length)];
    recent.push(item.kanji);
    while (recent.length > RECENT) recent.shift();
    return questionFor(item, random);
}

// One of the phrases of the kanji, the kanji left as □
export function questionFor(item: KanjiItem, random: () => number = Math.random): Question {
    const phrases = reibunList.get(item.kanji) ?? [];
    const reibun = phrases[Math.floor(random() * phrases.length)] ?? { before: '', reading: item.readings[0], after: '' };
    return { item, reibun };
}
