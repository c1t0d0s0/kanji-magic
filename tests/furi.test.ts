import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STAGES } from '../src/game/stages';
import { UNITS, UNIT_IDS } from '../src/game/units';
import { bareKanji, kana, plain, segments, textFor } from '../src/learning/furi';
import { SPELL_GROUPS } from '../src/spell/effects';
import { ELEMENT_INFO } from '../src/spell/elements';

const KANA = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u;

describe('furigana', () => {
    it('puts the reading over the kanji not learned at the grade set, and only those', () => {
        const t = '[魔法|まほう]の [本|ほん]を [読|よ]もう';
        expect(segments(t, 1)).toEqual([
            { text: '魔法', ruby: 'まほう' }, { text: 'の ', ruby: null }, { text: '本', ruby: null }, { text: 'を ', ruby: null },
            { text: '読', ruby: 'よ' }, { text: 'もう', ruby: null }
        ]);
        // 読 is learned in the 2nd grade; 魔 and 法 are not school kanji of the 1st to the 4th
        expect(segments(t, 2).filter(s => s.ruby).map(s => s.text)).toEqual(['魔法']);
        expect(plain(t)).toBe('魔法の 本を 読もう');
        expect(kana(t)).toBe('まほうの ほんを よもう');
        expect(textFor(t, 1)).toBe('まほうの 本を よもう');
        expect(segments('ステージ 3', 1)).toEqual([{ text: 'ステージ 3', ruby: null }]);
        // Kanji that are not of the elementary school have the reading at every grade
        for (const g of [1, 6]) expect(segments('[撃|う]つ [壁|かべ]', g).filter(s => s.ruby).map(s => s.text)).toEqual(['撃', '壁']);
    });

    it('every kanji of the names of the game has its reading, in kana', () => {
        const texts = [
            ...STAGES.map(s => s.name),
            ...UNIT_IDS.flatMap(id => [UNITS[id].role, ...UNITS[id].forms.map(f => f.name)]),
            ...Object.values(SPELL_GROUPS).flatMap(g => [g.name, g.does]), ...Object.values(ELEMENT_INFO).map(e => e.name)
        ];
        for (const t of texts) {
            expect(bareKanji(t), t).toEqual([]);
            for (const m of t.matchAll(/\[([^\]|]+)\|([^\]]+)\]/g)) expect(m[2], t).toMatch(KANA);
        }
    });

    // The pages are checked as written: a kanji outside a [kanji|reading] mark would be shown to a
    // child who has not learned it (aria-label is read aloud, not shown: it may have kanji)
    const template = (file: string) => {
        const s = readFileSync(file, 'utf8');
        return s.slice(s.indexOf('<template>'), s.lastIndexOf('</template>'))
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/:?aria-label="[^"]*"/g, '');
    };
    const vue = (dir: string) => readdirSync(dir).filter(f => f.endsWith('.vue')).map(f => `${dir}/${f}`);

    it('no kanji without its reading on the screens', () => {
        const files = [...vue('src/screens'), ...vue('src/components').filter(f => !/Spell|Debug/.test(f))];
        expect(files.length).toBeGreaterThan(10);
        for (const f of files) expect(bareKanji(template(f)), f).toEqual([]);
    });

    it('no kanji at all in the magic circle and the practice page (they would give the answer away)', () => {
        for (const f of ['src/components/SpellOverlay.vue', 'src/components/SpellChoice.vue', 'src/components/SpellPrompt.vue', 'src/practice/PracticeApp.vue']) {
            expect(kana(template(f)).match(/\p{Script=Han}/gu), f).toBeNull();
        }
    });
});
