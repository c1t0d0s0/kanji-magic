# KM魔法大戦争

小学1〜6年生向けの、横スクロールの拠点攻防ゲームです。出された漢字を手書きすると、魔法陣が発動して必殺技が出ます。要件は [requirements.md](requirements.md) にあります。

要件の Phase 1〜6 をひととおり作ってあります（バトル・30ステージ・味方10種・敵16種・空と対空・敵の魔法とまもりの魔法・ステージ11からの敵の弱点と大群・ユニットの進化・魔法陣・魔法書・キャラクター一覧・設定・効果音・クレジット）。数値の調整は、実際に遊んでもらいながら `src/config.ts` と `src/game/stages.ts` で行います。

## 動かしかた

Node.js 20.19 以上（推奨 24）

```sh
npm install
npm run dev      # 開発サーバー。/practice.html が漢字・モールス信号の練習ページ（?debug で判定の数値も出る）、/debug.html が全キャラクター＆動き確認用のデバッグページ
npm test         # Vitest（流用した kanji-quiz のテストも走る。ステージを自動で遊ぶテストもある：ステージ11からは工夫しないと勝てないことも確かめる）
npm run build    # vue-tsc --noEmit と vite build。dist/ に静的ファイルを出力する
npm run radicals # KanjiVG から src/spell/radicals.ts（部首のデータ）を作り直す
```

Google タグを埋め込むときは、`config.example.js` を `config.js` にコピーして `GTM_ID` を書きます（環境変数 `GTM_ID` があればそちらを使います）。空なら何も埋め込みません。

## 構成

- `src/vendor/kanji-quiz/`：kanji-quiz から**中身を変えずに**コピーしたファイル（判定エンジン・KanjiVG のデータ・配当表・例文・WritingPad・ModelStrokes）。どのコミットから取ったかと更新の手順は [VENDOR.md](src/vendor/kanji-quiz/VENDOR.md) にあります
- `src/spell/tegaki.ts`：判定エンジンと KanjiVG データの遅延読み込み、つまずきを子どもに伝える文言
- `src/spell/grade.ts`：`judge` を2回（書き順あり・なし）呼んで、かんぺき／せいこう／おしい／ふはつに分ける
- `src/spell/effects.ts`：漢字 → 魔法のグループ（炎・水・木・金・言葉・不思議）と、その効果と威力
- `src/spell/radicals.ts`：1,026字の部首（`radicals`）と部品（`components`）。`scripts/radicals.mjs` が KanjiVG から作る（手で直さない）
- `src/spell/elements.ts`：漢字の属性（炎・水・木。部首 → 部品 → 意味の表の順に決める）と、相性の倍率
- `src/spell/timer.ts`・`src/spell/question.ts`：書く時間（10〜30秒）と、出題（例文の□）
- `src/components/SpellChoice.vue`：魔法陣の前の3択（属性のマーク・読み・いまの敵への効き目）。敵の魔法が来るときは4枚目の「まもり」
- `src/components/SpellOverlay.vue`：魔法陣。制限時間・ルーンの光・自動の発動・お手本の表示・なぞりモード
- `src/components/MorseOverlay.vue`・`src/morse/`：モールス信号の魔法（設定で選ぶ。タッチのできない PC 向け）。`code.ts`（A–Z・0–9 の符号）・`paddleRepeater.ts`（パドルの連続打鍵）・`keyer.ts`（パドル／電鍵とキーボード、文字の確定）・`spell.ts`（打つ言葉・制限時間・結果）。打鍵のしくみと符号の表は [Morse Master](https://github.com/c1t0d0s0/morse-master)（同じ作者、MIT）から移植した
- `src/config.ts`：調整用の定数（`PERFECT_MARGIN`・制限時間・魔法の基本値・お金・魔力・レベル・報酬など）
- `src/game/`：バトル本体（Vue に依存しない）。`battle.ts`（状態と1ステップの処理）・`loop.ts`（60Hz の固定ステップ）・`render.ts`（Canvas への描画）・`units.ts`・`enemies.ts`・`stages.ts`（30ステージのデータ）
- `src/game/scenes.ts`・`src/art/scenery.ts`：ステージごとの見た目（時間帯・地形・目印・地面・天気・敵の城の飾り）のデータと、その描画
- `src/art/`：キャラクター（へんてこ生き物・わすれんぼう）・きのこハウス・まくらタワー・ふっとびなどの絵。画像ファイルは使わず、Canvas 2D のパスで描く（Vue に依存しない）。`characters.ts` の `ART` が種類ごとの描画関数で、HTML 側では `src/components/CharacterIcon.vue` から使う
- `src/learning/`：`progress.ts`（漢字ごとの成績）・`picker.ts`（出題の重み付け）・`visible.ts`（設定した学年より上の漢字を画面に出さない）
- `src/storage.ts`・`src/store.ts`：localStorage の保存（`kmw:save:v1`）と、画面どうしで共有する状態
- `src/sound.ts`：Web Audio で作る効果音
- `src/screens/`：タイトル・ステージ選択・編成・バトル・リザルト・魔法書・設定・クレジット
- `src/practice/`：練習ページ（`practice.html`）

## ライセンス

このゲームのコードは MIT です（[LICENSE](LICENSE)）。ただし、次のものは別のライセンスです。

- **KanjiVG**：`src/vendor/kanji-quiz/src/data/kanjivg.ts`・`src/vendor/kanji-quiz/src/data/lookalikes.ts`・`src/spell/radicals.ts` は KanjiVG を元にしたデータで、**CC BY-SA 3.0** です
  - KanjiVG © Ulrich Apel — https://kanjivg.tagaini.net
  - ライセンス：Creative Commons Attribution-Share Alike 3.0（https://creativecommons.org/licenses/by-sa/3.0/）
- **Morse Master**：`src/morse/paddleRepeater.ts`・`src/morse/code.ts`・`src/morse/keyer.ts`・`src/sound.ts` の側音・`tests/paddleRepeater.test.ts` は Morse Master（https://github.com/c1t0d0s0/morse-master）を元にしていて、MIT です（作者が同じ）
- **kanji-quiz**：`src/vendor/kanji-quiz/` のファイルは kanji-quiz（https://github.com/c1t0d0s0/kanji-quiz）のもので、MIT です（[src/vendor/kanji-quiz/LICENSE](src/vendor/kanji-quiz/LICENSE)）
