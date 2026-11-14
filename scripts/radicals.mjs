// Makes src/spell/radicals.ts (the radical of each of the 1,026 kanji) from a release of KanjiVG.
// Usage: npm run radicals            (downloads the release kanji-quiz took its strokes from)
//        npm run radicals -- file.xml.gz
// The release is read from src/vendor/kanji-quiz/scripts/kanjivg.mjs, so the radicals come from
// the same KanjiVG as the strokes. KanjiVG is © Ulrich Apel, CC BY-SA 3.0; the file written is
// under the same licence.
import { readFileSync, writeFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const file = path => fileURLToPath(new URL(path, root));
const vendor = 'src/vendor/kanji-quiz/';
const RELEASE = readFileSync(file(`${vendor}scripts/kanjivg.mjs`), 'utf8').match(/const RELEASE = '(r\d+)'/)[1];
const SOURCE = `https://github.com/KanjiVG/kanjivg/releases/download/${RELEASE}/kanjivg-${RELEASE.slice(1)}.xml.gz`;
const out = file('src/spell/radicals.ts');
const kanjiList = [...readFileSync(file(`${vendor}src/data/kanji.ts`), 'utf8').matchAll(/kanji: "(.)"/g)].map(m => m[1]);

// KanjiVG marks the radical of a kanji: "general" when the two dictionaries it follows agree,
// "tradit" (the 214 radicals of the Kangxi dictionary, as Japanese dictionaries use) and "nelson"
// when they do not. The first one found in this order is taken
const KINDS = ['general', 'tradit', 'nelson'];

async function load() {
    const path = process.argv[2];
    if (path) return readFileSync(path);
    const res = await fetch(SOURCE);
    if (!res.ok) throw new Error(`${SOURCE}: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
}

const attr = (tag, name) => tag.match(new RegExp(`kvg:${name}="([^"]*)"`))?.[1];

const xml = gunzipSync(await load()).toString('utf8');
const header = xml.match(/<!--([\s\S]*?)-->/)[1].trim();
const radicals = {};
const missing = [];
for (const kanji of kanjiList) {
    const code = kanji.codePointAt(0).toString(16).padStart(5, '0');
    // Only the standard form (not the -Kaisho and other variants)
    const block = xml.match(new RegExp(`<kanji id="kvg:kanji_${code}">([\\s\\S]*?)</kanji>`));
    const marked = block ? [...block[1].matchAll(/<g [^>]*kvg:radical="[^"]*"[^>]*>/g)].map(m => m[0]) : [];
    const rank = tag => {
        const at = KINDS.indexOf(attr(tag, 'radical'));
        return at < 0 ? KINDS.length : at;
    };
    const best = marked.sort((a, b) => rank(a) - rank(b))[0];
    // The form written in the kanji (氵 for 海), or the kanji it stands for when it has no form
    const radical = best && (attr(best, 'element') ?? attr(best, 'original'));
    if (!radical) missing.push(kanji);
    else radicals[kanji] = radical;
}
if (missing.length) throw new Error(`No radical in KanjiVG: ${missing.join('')}`);

const body = Object.entries(radicals).map(([k, r]) => `    ${k}: '${r}'`).join(',\n');
writeFileSync(out, `// The radical of each of the 1,026 kanji, made by scripts/radicals.mjs (npm run radicals) from
// KanjiVG ${RELEASE} (https://kanjivg.tagaini.net), the release the strokes of kanji-quiz come from.
// Do not edit by hand. The radical is written as it looks in the kanji (氵 for 海, 灬 for 点).
//
// This file is a work based on KanjiVG and is distributed under the same licence (CC BY-SA 3.0),
// unlike the rest of this repository (MIT). The notice of KanjiVG:
/*
${header}
*/
export const radicals: Record<string, string> = {
${body}
};
`);
console.log(`${Object.keys(radicals).length} kanji, ${new Set(Object.values(radicals)).size} radicals → ${out}`);
