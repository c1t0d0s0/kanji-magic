// --- The saved data: one JSON under kmw:save:v1 in localStorage (requirements 10) ---
// Read once at the start; written after a battle, a change of the settings and each spell.
// Anything missing or broken is taken from the defaults, so an old or damaged save still loads.
// `version` is there for the day the shape changes (migrate() then turns old saves into new ones).
import { MAX_LEVEL } from './config';
import { UNIT_IDS, type UnitId } from './game/units';
import { emptyProgress, type KanjiProgress } from './learning/progress';
import { RECENT } from './learning/picker';

export const SAVE_KEY = 'kmw:save:v1';
export const SAVE_VERSION = 1;
export const DECK_SIZE = 3;

export interface Settings {
    grade: number;
    // この がくねんだけ
    only: boolean;
    // かきじゅんも みる
    strokeOrder: boolean;
    // おてほんを なぞる
    trace: boolean;
    // 0 to 1
    volume: number;
    muted: boolean;
    // How a spell is cast: a kanji written by hand, or a word sent in Morse code (for a PC with no
    // touch screen: src/morse/)
    input: InputMethod;
    // Morse: two keys (パドル: dot and dash) or one key held short or long (電鍵)
    keyer: Keyer;
    // Morse: 初級 shows the code under each letter, 上級 does not
    morseLevel: MorseLevel;
}

export type InputMethod = 'kanji' | 'morse';
export type Keyer = 'paddle' | 'straight';
export type MorseLevel = 'easy' | 'hard';

export interface StageRecord {
    cleared: boolean;
    stars: number;
}

export interface SaveData {
    version: number;
    settings: Settings;
    // By stage id
    stages: Record<number, StageRecord>;
    units: Record<UnitId, number>;
    deck: UnitId[];
    // どんぐり: to make units stronger
    materials: number;
    progress: KanjiProgress[];
    recent: string[];
    // The tutorial has been shown
    tutorialDone: boolean;
}

export function defaultSave(): SaveData {
    return {
        version: SAVE_VERSION,
        settings: { grade: 1, only: false, strokeOrder: false, trace: false, volume: 0.7, muted: false, input: 'kanji', keyer: 'paddle', morseLevel: 'easy' },
        stages: {},
        units: Object.fromEntries(UNIT_IDS.map(id => [id, 1])) as Record<UnitId, number>,
        deck: ['purun', 'kaeru'],
        materials: 0,
        progress: [],
        recent: [],
        tutorialDone: false
    };
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min: number, max: number) =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback);

// An older save into the current shape (none yet: version 1 is the first)
function migrate(raw: Record<string, unknown>): Record<string, unknown> {
    return raw;
}

// Takes what is sound from a save, the defaults for the rest
export function parseSave(text: string | null): SaveData {
    const d = defaultSave();
    if (!text) return d;
    let raw: unknown;
    try {
        raw = JSON.parse(text);
    } catch {
        return d;
    }
    if (!isObject(raw)) return d;
    raw = migrate(raw);
    const r = raw as Record<string, unknown>;
    const s = isObject(r.settings) ? r.settings : {};
    const settings: Settings = {
        grade: Math.round(num(s.grade, d.settings.grade, 1, 6)),
        only: bool(s.only, d.settings.only),
        strokeOrder: bool(s.strokeOrder, d.settings.strokeOrder),
        trace: bool(s.trace, d.settings.trace),
        volume: num(s.volume, d.settings.volume, 0, 1),
        muted: bool(s.muted, d.settings.muted),
        input: oneOf(s.input, ['kanji', 'morse'] as const, d.settings.input),
        keyer: oneOf(s.keyer, ['paddle', 'straight'] as const, d.settings.keyer),
        morseLevel: oneOf(s.morseLevel, ['easy', 'hard'] as const, d.settings.morseLevel)
    };
    const stages: Record<number, StageRecord> = {};
    if (isObject(r.stages)) {
        for (const [id, v] of Object.entries(r.stages)) {
            if (isObject(v) && Number.isInteger(Number(id))) stages[Number(id)] = { cleared: bool(v.cleared, false), stars: Math.round(num(v.stars, 0, 0, 3)) };
        }
    }
    const units = { ...d.units };
    if (isObject(r.units)) for (const id of UNIT_IDS) units[id] = Math.round(num(r.units[id], 1, 1, MAX_LEVEL));
    const deck = Array.isArray(r.deck) ? [...new Set(r.deck.filter((id): id is UnitId => UNIT_IDS.includes(id as UnitId)))].slice(0, DECK_SIZE) : d.deck;
    const progress: KanjiProgress[] = [];
    if (Array.isArray(r.progress)) {
        for (const p of r.progress) {
            if (!isObject(p) || typeof p.char !== 'string' || [...p.char].length !== 1) continue;
            const e = emptyProgress(p.char);
            const count = (v: unknown) => Math.round(num(v, 0, 0, 1e9));
            progress.push({
                char: p.char,
                attempts: count(p.attempts),
                successes: count(p.successes),
                perfects: count(p.perfects),
                lastResult: ['perfect', 'success', 'close', 'fail'].includes(p.lastResult as string) ? (p.lastResult as KanjiProgress['lastResult']) : e.lastResult,
                lastSeen: count(p.lastSeen),
                streak: count(p.streak),
                perfectStreak: count(p.perfectStreak),
                mastered: bool(p.mastered, false),
                practices: count(p.practices)
            });
        }
    }
    const recent = Array.isArray(r.recent) ? r.recent.filter((k): k is string => typeof k === 'string').slice(-RECENT) : [];
    return {
        version: SAVE_VERSION,
        settings,
        stages,
        units,
        deck: deck.length > 0 ? deck : d.deck,
        materials: Math.round(num(r.materials, 0, 0, 1e9)),
        progress,
        recent,
        tutorialDone: bool(r.tutorialDone, false)
    };
}

// No storage (private mode, blocked): the game is played without saving
function storage(): Store | null {
    try {
        return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
        return null;
    }
}

export function loadSave(store: Store | null = storage()): SaveData {
    try {
        return parseSave(store?.getItem(SAVE_KEY) ?? null);
    } catch {
        return defaultSave();
    }
}

export function writeSave(data: SaveData, store: Store | null = storage()) {
    try {
        store?.setItem(SAVE_KEY, JSON.stringify(data));
        return true;
    } catch {
        return false;
    }
}

export function eraseSave(store: Store | null = storage()) {
    try {
        store?.removeItem(SAVE_KEY);
    } catch {
        // Nothing to do: the game goes on with the defaults
    }
}
