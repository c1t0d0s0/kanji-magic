// --- The elements: 炎・水・木, and which is strong against which ---
// 水 puts out 炎, 炎 burns 木, 木 drinks up 水. A kanji's element comes from, in this order:
//   1. its radical (氵 of 海: 水),
//   2. a part of it (火 in 談, 禾 is not but 木 in 秋 is: KanjiVG names the parts),
//   3. its meaning, for some kanji the shape says nothing of (日 and 赤: 炎, 川: 水, 米: 木).
// The enemies and our units have one too (or none).
import { AFFINITY } from '../config';
import { components, radicals } from './radicals';

export type Element = 'fire' | 'water' | 'wood';
export const ELEMENTS: readonly Element[] = ['fire', 'water', 'wood'];

// The element each one beats
export const BEATS: Record<Element, Element> = { water: 'fire', fire: 'wood', wood: 'water' };

// Name ([kanji|reading] marks, learning/furi.ts), and the colour of its mark
export const ELEMENT_INFO: Record<Element, { name: string; color: string }> = {
    fire: { name: '[炎|ほのお]', color: '#ff6b3d' },
    water: { name: '[水|みず]', color: '#3d9bff' },
    wood: { name: '[木|き]', color: '#3fae4a' }
};

// The parts that make the element (as written in the kanji: 氵 for 水, 灬 for 火, 艹 for 木)
const PARTS: Record<string, Element> = {
    火: 'fire', 灬: 'fire',
    水: 'water', 氵: 'water', 氺: 'water', 雨: 'water',
    木: 'wood', 艹: 'wood', 竹: 'wood'
};

// Kanji whose shape says nothing of the element, by their meaning
export const BY_MEANING: Record<Element, string> = {
    fire: '日赤光夏昼晴明暑陽暖星',
    water: '川冷貝船',
    wood: '米麦'
};

const meaning = new Map<string, Element>(
    ELEMENTS.flatMap(e => [...BY_MEANING[e]].map(k => [k, e] as const))
);

// By the shape only (radical, then parts)
export function elementByShape(kanji: string): Element | null {
    const r = radicals[kanji];
    if (r && PARTS[r]) return PARTS[r];
    for (const p of components[kanji] ?? '') if (PARTS[p]) return PARTS[p];
    return null;
}

export function elementOf(kanji: string): Element | null {
    return elementByShape(kanji) ?? meaning.get(kanji) ?? null;
}

// How much a hit of this element hurts one of that element: spells and units do not count the same
export function affinity(attack: Element | null, target: Element | null, kind: 'spell' | 'unit'): number {
    if (!attack || !target) return 1;
    if (BEATS[attack] === target) return AFFINITY[kind].strong;
    if (BEATS[target] === attack) return AFFINITY[kind].weak;
    return 1;
}
