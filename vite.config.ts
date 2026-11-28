import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import type { HtmlTagDescriptor, Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

// The Google tag and the build version are the same as in kanji-quiz (vite.config.ts)

const configFile = fileURLToPath(new URL('./config.js', import.meta.url));

/** config.js に書かれた `名前 = '値'` を読む (実行はせず、文字として読み取る) */
function readFromConfigJs(name: string): string {
    if (!existsSync(configFile)) return '';
    const match = readFileSync(configFile, 'utf8').match(new RegExp(`^\\s*(?:const|let|var)\\s+${name}\\s*=\\s*(['"\`])(.*?)\\1`, 'm'));
    return match ? match[2].trim() : '';
}

/** 環境変数があればその値、なければ config.js の値 (GitHub Actions では Variables を環境変数でわたす) */
const setting = (name: string) => (process.env[name] ?? '').trim() || readFromConfigJs(name);

/**
 * Google のタグの ID。GTM-… なら Google タグ マネージャー、G-… なら Google アナリティクス (gtag.js)。
 * なければタグは埋め込まない。
 */
function readGtmId(): string {
    const value = setting('GTM_ID');
    // HTML にそのまま書きこむので、ID の形をしていないものは受けつけない
    if (value && !/^(GTM|G)-[A-Z0-9]+$/.test(value)) {
        throw new Error(`GTM_ID の形式が正しくありません: "${value}" (GTM-XXXXXXX または G-XXXXXXXXXX)`);
    }
    return value;
}

/** GTM-… なら Google タグ マネージャー、G-… なら Google アナリティクス (gtag.js) のタグ */
function googleTags(id: string): HtmlTagDescriptor[] {
    if (id.startsWith('GTM-')) {
        return [
            {
                tag: 'script',
                injectTo: 'head',
                children:
                    "(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});" +
                    "var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;" +
                    "j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);" +
                    `})(window,document,'script','dataLayer','${id}');`
            }
        ];
    }
    return [
        { tag: 'script', injectTo: 'head', attrs: { async: true, src: `https://www.googletagmanager.com/gtag/js?id=${id}` } },
        {
            tag: 'script',
            injectTo: 'head',
            children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${id}');`
        }
    ];
}

function googleTagPlugin(id: string): Plugin {
    return {
        name: 'kanji-magic-google-tag',
        transformIndexHtml: () => (id ? googleTags(id) : [])
    };
}

/**
 * 公開したあとも、ブラウザに少しのあいだ古い index.html が残る。
 * ビルドごとの番号 (できたファイル全部の中身から作る) を <meta name="build"> と version.json に書いておき、
 * index.html の先頭の処理が、古いページを開いたときに新しい版を読みこみ直す。
 */
function buildVersionPlugin(): Plugin {
    return {
        name: 'kanji-magic-build-version',
        apply: 'build',
        enforce: 'post',
        generateBundle(_options, bundle) {
            const pages = Object.keys(bundle).filter(name => name.endsWith('.html'));
            const hash = createHash('sha256');
            for (const name of Object.keys(bundle).sort()) {
                const file = bundle[name];
                hash.update(name);
                hash.update(file.type === 'chunk' ? file.code : file.source);
            }
            const build = hash.digest('hex').slice(0, 10);
            for (const name of pages) {
                const html = bundle[name];
                if (html.type !== 'asset') continue;
                html.source = String(html.source).replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n    <meta name="build" content="${build}">`);
            }
            this.emitFile({ type: 'asset', fileName: 'version.json', source: `${JSON.stringify({ build })}\n` });
        }
    };
}

export default defineConfig({
    // 相対パスで出力し、サブディレクトリでもそのまま配信できるようにする
    base: './',
    plugins: [vue(), googleTagPlugin(readGtmId()), buildVersionPlugin()],
    build: {
        rollupOptions: {
            input: {
                main: fileURLToPath(new URL('./index.html', import.meta.url)),
                practice: fileURLToPath(new URL('./practice.html', import.meta.url)),
                debug: fileURLToPath(new URL('./debug.html', import.meta.url))
            }
        }
    },
    test: {
        // The tests of kanji-quiz (copied as they are) run every time too
        include: ['tests/**/*.test.ts', 'src/vendor/kanji-quiz/tests/**/*.test.ts']
    }
});
