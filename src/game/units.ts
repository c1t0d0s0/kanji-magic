// --- Our units (requirements 5.2): the numbers of level 1, and how a level makes them stronger ---
// The pictures are drawn by src/art/characters.ts, by the id and the form (0, 1, 2); the colour of
// a form is its main colour there.
import { EVOLVE_AT, EVOLVE_BONUS, LEVEL_GROWTH, MAX_LEVEL } from '../config';
import type { Element } from '../spell/elements';

export type UnitId = 'purun' | 'kaeru' | 'neko' | 'pengin' | 'kaba';

export interface UnitForm {
    name: string;
    color: string;
}

export interface UnitType {
    id: UnitId;
    // What it is for (with [kanji|reading] marks, as the names: learning/furi.ts)
    role: string;
    // Its attacks hurt more the enemies of the element this one beats (spell/elements.ts)
    element: Element;
    cost: number;
    // Before the same unit can be sent again
    cooldownMs: number;
    hp: number;
    attack: number;
    // Between two attacks
    attackMs: number;
    // How far it reaches (px of the lane, from its front)
    range: number;
    // px per second
    speed: number;
    // Pushes back what it hits (px)
    knockback: number;
    // Hits everything in its reach, not only the nearest
    area: boolean;
    // Aims first at a こもりうた in its reach (not the nearest)
    snipe?: boolean;
    size: number;
    // The stage to clear before it can be used (0: from the start)
    unlockAfter: number;
    // Level 1, after the 1st evolution, after the 2nd
    forms: readonly [UnitForm, UnitForm, UnitForm];
}

export const UNITS: Record<UnitId, UnitType> = {
    purun: {
        id: 'purun', element: 'water', role: '[壁|かべ]', cost: 50, cooldownMs: 2000, hp: 260, attack: 8, attackMs: 1200, range: 28, speed: 32,
        knockback: 0, area: false, size: 34, unlockAfter: 0,
        forms: [
            { name: 'ぷるりん', color: '#7fd0f2' },
            { name: 'ぷるりんマッチョ', color: '#f29ac0' },
            { name: 'ぷるりん[大仙人|だいせんにん]', color: '#b49af2' }
        ]
    },
    kaeru: {
        id: 'kaeru', element: 'wood', role: '[近|ちか]く', cost: 150, cooldownMs: 4000, hp: 220, attack: 32, attackMs: 1000, range: 32, speed: 36,
        knockback: 0, area: false, size: 36, unlockAfter: 0,
        forms: [
            { name: '[眉毛|まゆげ]ガエル', color: '#7ccf5a' },
            { name: 'げじげじ[眉毛|まゆげ]ガエル', color: '#4fae4a' },
            { name: '[眉毛|まゆげ]が つながった カエル[王|おう]', color: '#2f8f5a' }
        ]
    },
    neko: {
        id: 'neko', element: 'fire', role: '[遠|とお]く', cost: 300, cooldownMs: 6000, hp: 150, attack: 40, attackMs: 1600, range: 240, speed: 30,
        knockback: 0, area: false, snipe: true, size: 34, unlockAfter: 2,
        forms: [
            { name: 'ヒゲ[長|なが]ネコ', color: '#f6b25a' },
            { name: 'ヒゲもじゃネコ', color: '#e8e0d0' },
            { name: 'ヒゲが [地面|じめん]まで [届|とど]く ネコ', color: '#8a8f9c' }
        ]
    },
    pengin: {
        id: 'pengin', element: 'fire', role: '[速|はや]い', cost: 400, cooldownMs: 7000, hp: 240, attack: 45, attackMs: 900, range: 44, speed: 80,
        knockback: 40, area: false, size: 36, unlockAfter: 4,
        forms: [
            { name: 'ローラーペンギン', color: '#3a4a6a' },
            { name: 'ジェットペンギン', color: '#2c5aa0' },
            { name: 'マッハペンギン', color: '#1c1f2e' }
        ]
    },
    kaba: {
        id: 'kaba', element: 'water', role: '[重|おも]い', cost: 600, cooldownMs: 12000, hp: 900, attack: 70, attackMs: 2200, range: 70, speed: 18,
        knockback: 0, area: true, size: 48, unlockAfter: 6,
        forms: [
            { name: 'どすこいカバ', color: '#b7a6c9' },
            { name: '[大関|おおぜき]カバ', color: '#a08cbf' },
            { name: '[横綱|よこづな]カバ', color: '#8a74b0' }
        ]
    }
};

export const UNIT_IDS = Object.keys(UNITS) as UnitId[];

// 0, 1 or 2: the look of a level
export function formOf(level: number): 0 | 1 | 2 {
    if (level >= EVOLVE_AT[1]) return 2;
    if (level >= EVOLVE_AT[0]) return 1;
    return 0;
}

// How much stronger than level 1 (hp and attack)
export function levelPower(level: number): number {
    const l = Math.min(MAX_LEVEL, Math.max(1, Math.floor(level)));
    return (1 + LEVEL_GROWTH * (l - 1)) * (1 + EVOLVE_BONUS * formOf(l));
}

export function unitStats(id: UnitId, level: number) {
    const t = UNITS[id];
    const p = levelPower(level);
    return { ...t, hp: Math.round(t.hp * p), attack: Math.round(t.attack * p), form: t.forms[formOf(level)] };
}

// Units that can be used after clearing up to this stage
export function unlockedUnits(cleared: number): UnitId[] {
    return UNIT_IDS.filter(id => UNITS[id].unlockAfter <= cleared);
}
