# kanji-quiz から取り込んだファイル

- リポジトリ: https://github.com/c1t0d0s0/kanji-quiz
- コミット: `a9d5117035d0aa6ad5a47e5737e4fb73ac4392ef`（2026-11-14、ブランチ `handwriting-look-alikes`。似た字の判定 `lookAlikes` を足したもの。main にはまだ入っていない）
- その前に取り込んだコミット: `85e590a00d21d18acae6298caa401375ead2e38e`（2026-11-12、main）
- ライセンス: MIT（`LICENSE`）。ただし `src/data/kanjivg.ts` と `src/data/lookalikes.ts` は KanjiVG（© Ulrich Apel）由来で CC BY-SA 3.0（ファイル先頭の表記を参照）

## コピーしたファイル（元のパスのまま・中身は変えていない）

| パス | 役割 |
|---|---|
| `src/core/handwriting.ts` | 手書き判定エンジン（`judge` / `traceStroke` / `limitsFor` など） |
| `src/data/kanjivg.ts` | 1,026字の KanjiVG のストローク（CC BY-SA 3.0） |
| `src/data/lookalikes.ts` | 似た字の一覧（`judge` の `lookAlikes` に渡す。CC BY-SA 3.0） |
| `src/data/kanji.ts` | 学年別漢字配当表 |
| `src/data/reibun.ts` / `reibun.txt` | 手書きの出題文 |
| `src/components/WritingPad.vue` | 手書きのマス |
| `src/components/ModelStrokes.vue` | お手本の表示 |
| `scripts/kanjivg.mjs` | `kanjivg.ts` を作り直すスクリプト（`npm run kanjivg`） |
| `scripts/lookalikes.mjs` | `lookalikes.ts` を作り直すスクリプト（`npm run lookalikes`） |
| `tests/handwriting.test.ts` / `tests/helpers/scribble.ts` | 判定エンジンのテスト |
| `LICENSE` | kanji-quiz の MIT ライセンス |

### 切り出したファイル

- `src/core/battle.ts`：元の `src/core/battle.ts` から `hash` と `createRng` の2つの関数だけを、変えずに切り出したもの（`tests/helpers/scribble.ts` と `tests/handwriting.test.ts` が使う）

### 書き直したもの（ここには置いていない）

- `src/app/tegaki.ts` → このゲームの `src/spell/tegaki.ts`（遅延読み込み・つまずきの文言・`verdictMarks`）
- `src/styles.css` の `.tegaki-*` の規則 → このゲームの `src/styles.css`（WritingPad と ModelStrokes は `<style>` を持たないため）

## 更新するとき

1. このファイルのコミットを新しいものに書き換える
2. kanji-quiz をそのコミットにして、上の表のファイルをコピーし直す（`battle.ts` は2つの関数をもう一度切り出す）
3. `npm test` と `npm run build` を通す

コピーしたファイルに不具合を見つけたら、ここでは直さずに kanji-quiz 側で直してから取り込み直す。それまでの回避策は `src/spell/` 側に書く。
