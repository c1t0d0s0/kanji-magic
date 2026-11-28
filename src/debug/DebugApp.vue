<script setup lang="ts">
// --- Debug gallery: inspect all 10 ally units (x3 forms = 30) and all 16 enemies, live animations,
//     air/ground layers, projectiles, area stomps, and all 5 slapstick KO styles with sound! ---
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { ART } from '../art/characters';
import { drawFly, drawShot, drawStomp, FLY_HEIGHT } from '../art/fx';
import { restPose, type Pose } from '../art/pose';
import ElementMark from '../components/ElementMark.vue';
import { ELEMENT_BODY, ENEMIES, ENEMY_IDS, type EnemyId } from '../game/enemies';
import { UNITS, UNIT_IDS, type UnitId } from '../game/units';
import type { FxWho } from '../game/battle';
import { plain } from '../learning/furi';
import { play, setVolume, unlockAudio } from '../sound';
import type { Element } from '../spell/elements';

type MotionMode = 'auto' | 'walk' | 'attack' | 'windup' | 'hurt' | 'stopped' | 'cheer' | 'shock' | 'ko' | 'dizzy' | 'rest';

const MOTIONS: { id: MotionMode; label: string }[] = [
    { id: 'auto', label: 'ぜんぶ順番' },
    { id: 'walk', label: '歩き・飛行' },
    { id: 'attack', label: '攻撃ループ' },
    { id: 'windup', label: 'ため' },
    { id: 'hurt', label: 'ダメージ' },
    { id: 'stopped', label: '行動不能' },
    { id: 'cheer', label: 'よろこび' },
    { id: 'shock', label: 'びっくり' },
    { id: 'ko', label: 'バッテン目' },
    { id: 'dizzy', label: 'グルグル目' },
    { id: 'rest', label: '待機' }
];

const KO_STYLES = [
    { style: 0, label: '0: ホームラン☆キラーン' },
    { style: 1, label: '1: ボヨンボヨン転がり' },
    { style: 2, label: '2: ぐるぐる竜巻スピン' },
    { style: 3, label: '3: 画面手前ベチャッ' },
    { style: 4, label: '4: ロケット→ヒラヒラ' }
] as const;

const motion = ref<MotionMode>('auto');
const paused = ref(false);
const speed = ref(1);
const enemyElement = ref<Element | 'none'>('none');
const soundOn = ref(true);
const showAllForms = ref(true);
const singleForm = ref<0 | 1 | 2>(0);
const bigKo = ref(false);
const targetAir = ref(false);

// --- Live Stage (KO & Attack Sandbox) ---
interface StageFly {
    who: FxWho;
    x: number;
    ms: number;
    total: number;
    seed: number;
    big: boolean;
}
interface StageShot {
    who: FxWho;
    x: number;
    to: number;
    toFlying: boolean;
    ms: number;
    total: number;
}
interface StageStomp {
    who: FxWho;
    x: number;
    ms: number;
    total: number;
}

const STAGE_W = 860;
const STAGE_H = 300;
const STAGE_GROUND = 248;

const stageCanvas = ref<HTMLCanvasElement | null>(null);
const selected = reactive<{ side: 'ally' | 'enemy'; kind: UnitId | EnemyId; form: 0 | 1 | 2 }>({
    side: 'enemy',
    kind: 'fuusen',
    form: 0
});

let stageFlies: StageFly[] = [];
let stageShots: StageShot[] = [];
let stageStomps: StageStomp[] = [];
let stageShakeMs = 0;
let stageShakeAmp = 0;
let stageAttackMs = 0;
let seedCounter = 0;

function makeWho(side: 'ally' | 'enemy', kind: UnitId | EnemyId, form: 0 | 1 | 2 = 0): FxWho {
    if (side === 'ally') {
        const u = UNITS[kind as UnitId];
        return { kind, form, side, size: u.size, color: u.forms[form].color, element: u.element, flying: u.flying };
    }
    const e = ENEMIES[kind as EnemyId];
    const el = enemyElement.value === 'none' ? null : enemyElement.value;
    return { kind, form: 0, side, size: e.size, color: el ? ELEMENT_BODY[el] : e.color, element: el, flying: e.flying };
}

function selectChar(side: 'ally' | 'enemy', kind: UnitId | EnemyId, form: 0 | 1 | 2 = 0) {
    selected.side = side;
    selected.kind = kind;
    selected.form = form;
}

function playSfx(name: 'fall' | 'allyFall' | 'bossFall' | 'hit') {
    if (!soundOn.value) return;
    unlockAudio();
    setVolume(0.7);
    play(name);
}

function triggerKo(who: FxWho, forcedStyle?: number, x = STAGE_W / 2, isBig = bigKo.value || (who.side === 'enemy' && ENEMIES[who.kind as EnemyId].boss)) {
    // Pick a seed that produces the requested style (note: drawFly uses style = big && s % 2 === 0 ? 3 : s % 5)
    let seed = ++seedCounter;
    if (forcedStyle !== undefined) {
        for (let k = 0; k < 20; k++) {
            const cand = seedCounter * 10 + k;
            const actual = isBig && cand % 2 === 0 ? 3 : cand % 5;
            if (actual === forcedStyle) {
                seed = cand;
                break;
            }
        }
        // If forcedStyle != 3 and big, drawFly forces style 3 on even seeds -> odd seed guarantees forcedStyle!
        if (isBig && forcedStyle !== 3 && seed % 2 === 0) seed += 5;
    }
    stageFlies.push({ who, x, ms: 0, total: isBig ? 1600 : 1350, seed, big: isBig });
    if (isBig) {
        stageShakeMs = Math.max(stageShakeMs, 420);
        stageShakeAmp = Math.max(stageShakeAmp, 8);
    }
    if (who.side === 'ally') playSfx('allyFall');
    else if (ENEMIES[who.kind as EnemyId].boss || isBig) playSfx('bossFall');
    else playSfx('fall');
}

function koSelected(style?: number) {
    const who = makeWho(selected.side, selected.kind, selected.form);
    triggerKo(who, style);
}

function koFromCard(side: 'ally' | 'enemy', kind: UnitId | EnemyId, form: 0 | 1 | 2 = 0) {
    selectChar(side, kind, form);
    triggerKo(makeWho(side, kind, form));
    stageCanvas.value?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function triggerMassKo() {
    const pool: FxWho[] = [
        ...UNIT_IDS.slice(0, 5).map(id => makeWho('ally', id, singleForm.value)),
        ...ENEMY_IDS.slice(0, 7).map(id => makeWho('enemy', id, 0))
    ];
    pool.forEach((who, i) => {
        const x = 110 + ((i * 63) % (STAGE_W - 220));
        triggerKo(who, i % 5, x, i % 3 === 0);
    });
}

function triggerAttack() {
    stageAttackMs = 550;
    const who = makeWho(selected.side, selected.kind, selected.form);
    const x = STAGE_W / 2;
    const to = who.side === 'ally' ? x - 230 : x + 230;
    const range = who.side === 'ally' ? UNITS[who.kind as UnitId].range : ENEMIES[who.kind as EnemyId].range;
    const area = who.side === 'ally' ? UNITS[who.kind as UnitId].area : Boolean(ENEMIES[who.kind as EnemyId].area);
    if (range > 100) {
        stageShots.push({ who, x, to, toFlying: targetAir.value, ms: 0, total: 420 });
    }
    if (area) {
        stageStomps.push({ who, x: range > 100 ? to : x, ms: 0, total: 500 });
    }
    playSfx('hit');
}

// --- Pose generator for cards & live stage ---
function buildPose(t: number, form: 0 | 1 | 2, color: string, mode: MotionMode, seed: number): Pose {
    const base = restPose(form, color, t);
    base.seed = seed;
    switch (mode) {
        case 'rest':
            return base;
        case 'walk':
            return { ...base, walk: 1 };
        case 'windup':
            return { ...base, windup: 0.5 + 0.5 * Math.sin(t / 220) };
        case 'attack': {
            const cyc = (t + seed * 130) % 1300;
            if (cyc < 350) return { ...base, windup: cyc / 350 };
            if (cyc < 700) return { ...base, attack: 1 - (cyc - 350) / 350 };
            return base;
        }
        case 'hurt':
            return { ...base, hurt: 0.4 + 0.6 * Math.abs(Math.sin(t / 150)) };
        case 'stopped':
            return { ...base, stopped: true };
        case 'cheer':
            return { ...base, mood: 'cheer' };
        case 'shock':
            return { ...base, mood: 'shock' };
        case 'ko':
            return { ...base, mood: 'ko' };
        case 'dizzy':
            return { ...base, mood: 'dizzy' };
        case 'auto': {
            const step = Math.floor(((t + seed * 200) % 6000) / 1000);
            const u = ((t + seed * 200) % 1000) / 1000;
            if (step === 0 || step === 1) return { ...base, walk: 1 };
            if (step === 2) return { ...base, windup: u };
            if (step === 3) return { ...base, attack: Math.max(0, 1 - u * 1.4) };
            if (step === 4) return { ...base, hurt: Math.max(0, 1 - u * 1.5) };
            return { ...base, mood: 'cheer' };
        }
    }
}

// --- Card canvases registry ---
const canvases = new Map<string, HTMLCanvasElement>();
function bindCanvas(key: string) {
    return (el: unknown) => {
        if (el instanceof HTMLCanvasElement) canvases.set(key, el);
        else canvases.delete(key);
    };
}

function drawCardCanvas(c: HTMLCanvasElement, side: 'ally' | 'enemy', kind: UnitId | EnemyId, form: 0 | 1 | 2, t: number, seed: number) {
    const W = 132, H = 132;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
    if (c.width !== pw || c.height !== ph) {
        c.width = pw;
        c.height = ph;
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    const who = makeWho(side, kind, form);
    const groundY = H - 18;
    const flying = Boolean(who.flying);
    const bob = flying ? Math.sin(t / 240 + seed) * 4 : 0;
    const pose = buildPose(t, form, who.color, motion.value, seed);
    const jumpUp = kind === 'usagi' && pose.attack > 0 ? Math.sin(Math.PI * pose.attack) * 24 : 0;
    const bodyY = (flying ? groundY - 26 + bob : groundY) - jumpUp;

    // Ground line + shadow
    ctx.fillStyle = flying ? 'rgb(0 0 0 / 0.12)' : 'rgb(0 0 0 / 0.16)';
    ctx.beginPath();
    ctx.ellipse(W / 2, groundY, flying ? 18 : 26, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Scale big bosses so they fit cleanly in the preview box
    const drawSize = Math.min(64, who.size * 1.45);
    ctx.save();
    ctx.translate(W / 2, bodyY);
    if (side === 'ally') ctx.scale(-1, 1);
    ART[kind](ctx, drawSize, pose);
    ctx.restore();
}

function drawStage(t: number, dt: number) {
    const c = stageCanvas.value;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const pw = Math.round(STAGE_W * dpr), ph = Math.round(STAGE_H * dpr);
    if (c.width !== pw || c.height !== ph) {
        c.width = pw;
        c.height = ph;
    }
    const ctx = c.getContext('2d');
    if (!ctx) return;

    stageFlies.forEach(f => (f.ms += dt));
    stageFlies = stageFlies.filter(f => f.ms < f.total);
    stageShots.forEach(s => (s.ms += dt));
    stageShots = stageShots.filter(s => s.ms < s.total);
    stageStomps.forEach(s => (s.ms += dt));
    stageStomps = stageStomps.filter(s => s.ms < s.total);
    stageShakeMs = Math.max(0, stageShakeMs - dt);
    stageAttackMs = Math.max(0, stageAttackMs - dt);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    if (stageShakeMs > 0) {
        const amp = stageShakeAmp * Math.min(1, stageShakeMs / 250);
        ctx.translate(Math.sin(t * 0.14) * amp, Math.cos(t * 0.19) * amp * 0.7);
    }

    // Sky & ground backdrop
    const sky = ctx.createLinearGradient(0, 0, 0, STAGE_GROUND);
    sky.addColorStop(0, '#cfe9ff');
    sky.addColorStop(1, '#f4fbff');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, STAGE_W, STAGE_GROUND);
    ctx.fillStyle = '#a5d68c';
    ctx.fillRect(0, STAGE_GROUND, STAGE_W, STAGE_H - STAGE_GROUND);
    ctx.strokeStyle = '#7cb362';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, STAGE_GROUND);
    ctx.lineTo(STAGE_W, STAGE_GROUND);
    ctx.stroke();

    // Altitude guide line for flying characters
    ctx.save();
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = 'rgb(70 130 200 / 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, STAGE_GROUND - FLY_HEIGHT);
    ctx.lineTo(STAGE_W, STAGE_GROUND - FLY_HEIGHT);
    ctx.stroke();
    ctx.restore();

    // Draw the currently selected character standing/hovering in the center (when not currently flying away alone)
    const who = makeWho(selected.side, selected.kind, selected.form);
    const centerX = STAGE_W / 2;
    const pose = stageAttackMs > 0
        ? { ...restPose(who.form, who.color, t), attack: stageAttackMs / 550 }
        : buildPose(t, who.form, who.color, motion.value, 1);
    const flyBob = who.flying ? Math.sin(t / 240) * 6 : 0;
    const jumpUp = who.kind === 'usagi' && targetAir.value && stageAttackMs > 0
        ? Math.sin(Math.PI * (stageAttackMs / 550)) * (FLY_HEIGHT * 0.72)
        : 0;
    const bodyY = (who.flying ? STAGE_GROUND - FLY_HEIGHT + flyBob : STAGE_GROUND) - jumpUp;

    ctx.fillStyle = who.flying ? 'rgb(0 0 0 / 0.14)' : 'rgb(0 0 0 / 0.2)';
    ctx.beginPath();
    ctx.ellipse(centerX, STAGE_GROUND, who.size * (who.flying ? 0.5 : 0.7), 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(centerX, bodyY);
    if (who.side === 'ally') ctx.scale(-1, 1);
    ART[who.kind](ctx, who.size * 1.3, pose);
    ctx.restore();

    // Target dummy marker for attack tests
    const targetX = who.side === 'ally' ? centerX - 230 : centerX + 230;
    const targetY = targetAir.value ? STAGE_GROUND - FLY_HEIGHT - 20 : STAGE_GROUND - 20;
    ctx.save();
    ctx.strokeStyle = 'rgb(220 60 80 / 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(targetX, targetY, 12, 0, Math.PI * 2);
    ctx.moveTo(targetX - 18, targetY);
    ctx.lineTo(targetX + 18, targetY);
    ctx.moveTo(targetX, targetY - 18);
    ctx.lineTo(targetX, targetY + 18);
    ctx.stroke();
    ctx.restore();

    // Draw active shots, stomps, and slapstick KO flies
    for (const s of stageShots) drawShot(ctx, s.who, s.x, s.to, STAGE_GROUND, s.ms / s.total, s.ms, s.toFlying);
    for (const s of stageStomps) {
        const snd = s.who.kind === 'bell' ? 'ジリリリ！'
            : s.who.kind === 'king' ? 'もくもく〜'
            : s.who.kind === 'tanuki' ? 'ドンドコ！'
            : s.who.kind === 'buta' ? 'ドッカーン！'
            : s.who.kind === 'ufo' ? 'ピピピー！'
            : 'ドスン';
        drawStomp(ctx, s.x, STAGE_GROUND, s.ms / s.total, snd);
    }
    for (const f of stageFlies) {
        const u = Math.min(1, f.ms / f.total);
        if (u < 0.25) {
            const ry = (f.who.flying ? STAGE_GROUND - FLY_HEIGHT : STAGE_GROUND) - 25;
            ctx.strokeStyle = `rgb(255 255 255 / ${1 - u * 4})`;
            ctx.lineWidth = f.big ? 6 : 4;
            ctx.beginPath();
            ctx.arc(f.x, ry, 10 + (f.big ? 170 : 120) * u, 0, Math.PI * 2);
            ctx.stroke();
        }
        drawFly(ctx, f.who, f.x, STAGE_GROUND, u, f.ms, f.seed, f.big);
    }

    ctx.restore();
}

const allyForms = computed<(0 | 1 | 2)[]>(() => (showAllForms.value ? [0, 1, 2] : [singleForm.value]));

const selectedName = computed(() => {
    if (selected.side === 'ally') return plain(UNITS[selected.kind as UnitId].forms[selected.form].name);
    return plain(ENEMIES[selected.kind as EnemyId].name);
});

let raf = 0;
let simTime = 0;
let lastTs = 0;

function tick(ts: number) {
    const rawDt = lastTs ? Math.min(50, ts - lastTs) : 16;
    lastTs = ts;
    const dt = paused.value ? 0 : rawDt * speed.value;
    simTime += dt;

    let idx = 0;
    for (const id of UNIT_IDS) {
        for (const form of allyForms.value) {
            const c = canvases.get(`ally:${id}:${form}`);
            if (c) drawCardCanvas(c, 'ally', id, form, simTime, idx * 1.3 + form * 0.5);
        }
        idx++;
    }
    ENEMY_IDS.forEach((id, i) => {
        const c = canvases.get(`enemy:${id}`);
        if (c) drawCardCanvas(c, 'enemy', id, 0, simTime, i * 1.7 + 10);
    });
    drawStage(simTime, dt);
    raf = requestAnimationFrame(tick);
}

onMounted(() => {
    raf = requestAnimationFrame(tick);
});
onBeforeUnmount(() => cancelAnimationFrame(raf));
</script>

<template>
    <main class="debug-page">
        <header class="debug-head">
            <div>
                <h1>キャラクター デバッグ図鑑</h1>
                <p class="sub">味方 {{ UNIT_IDS.length }}体（×3形態＝{{ UNIT_IDS.length * 3 }}種）＋ 敵 {{ ENEMY_IDS.length }}体 の動き・対空・やられ演出を確認できます</p>
            </div>
            <a href="./" class="btn">← ゲームへ戻る</a>
        </header>

        <section class="card controls">
            <div class="ctrl-group">
                <span class="ctrl-label">モーション</span>
                <div class="btn-row">
                    <button v-for="m in MOTIONS" :key="m.id" type="button" class="chip" :class="{ active: motion === m.id }" @click="motion = m.id">
                        {{ m.label }}
                    </button>
                </div>
            </div>

            <div class="ctrl-row">
                <div class="ctrl-group">
                    <span class="ctrl-label">再生</span>
                    <div class="btn-row">
                        <button type="button" class="chip" @click="paused = !paused">{{ paused ? '▶ 再開' : '⏸ 一時停止' }}</button>
                        <button v-for="sp in [0.25, 0.5, 1, 2]" :key="sp" type="button" class="chip" :class="{ active: speed === sp }" @click="speed = sp">{{ sp }}x</button>
                    </div>
                </div>

                <div class="ctrl-group">
                    <span class="ctrl-label">味方の進化表示</span>
                    <div class="btn-row">
                        <button type="button" class="chip" :class="{ active: showAllForms }" @click="showAllForms = true">3形態すべて</button>
                        <button v-for="f in ([0, 1, 2] as const)" :key="f" type="button" class="chip" :class="{ active: !showAllForms && singleForm === f }" @click="showAllForms = false; singleForm = f">
                            形態{{ f + 1 }}
                        </button>
                    </div>
                </div>

                <div class="ctrl-group">
                    <span class="ctrl-label">敵の属性色</span>
                    <div class="btn-row">
                        <button type="button" class="chip" :class="{ active: enemyElement === 'none' }" @click="enemyElement = 'none'">なし</button>
                        <button v-for="el in (['fire', 'water', 'wood'] as const)" :key="el" type="button" class="chip" :class="{ active: enemyElement === el }" @click="enemyElement = el">
                            <ElementMark :mark="el" :size="16" /> {{ el === 'fire' ? '炎' : el === 'water' ? '水' : '木' }}
                        </button>
                    </div>
                </div>

                <label class="toggle"><input v-model="soundOn" type="checkbox"> 効果音 ON</label>
            </div>
        </section>

        <section class="card stage-box">
            <div class="stage-bar">
                <h2>💥 ライブ確認ステージ：<span class="picked">{{ selectedName }}</span>（{{ selected.kind }}）</h2>
                <div class="btn-row">
                    <button type="button" class="btn btn-primary" @click="triggerAttack">⚡ 攻撃・飛び道具</button>
                    <label class="toggle"><input v-model="targetAir" type="checkbox"> 空ターゲット</label>
                    <label class="toggle"><input v-model="bigKo" type="checkbox"> 大爆発（ボス／魔法トドメ）</label>
                </div>
            </div>
            <div class="btn-row ko-buttons">
                <button v-for="k in KO_STYLES" :key="k.style" type="button" class="chip ko-chip" @click="koSelected(k.style)">{{ k.label }}</button>
                <button type="button" class="chip ko-all" @click="triggerMassKo">🎆 全員まとめてドッカーン！</button>
            </div>
            <canvas ref="stageCanvas" class="stage-canvas" :style="{ aspectRatio: `${STAGE_W} / ${STAGE_H}` }"></canvas>
            <p class="hint">※ 下の各キャラカードをクリック、または「💥 ふっとばす」を押すとこのステージに呼び出して5パターンのやられ演出・小物分離・セリフ・効果音を確認できます。</p>
        </section>

        <section class="gallery-section">
            <h2>味方キャラクター（全{{ UNIT_IDS.length }}体）</h2>
            <div class="grid">
                <article v-for="id in UNIT_IDS" :key="id" class="card char-card" :class="{ selected: selected.side === 'ally' && selected.kind === id }">
                    <header class="char-head">
                        <ElementMark :mark="UNITS[id].element" :size="20" />
                        <strong>{{ plain(UNITS[id].forms[0].name) }}</strong>
                        <code class="cid">{{ id }}</code>
                        <span v-if="UNITS[id].flying" class="tag air">☁️ 空</span>
                        <span v-else-if="UNITS[id].antiAir" class="tag antiair">🎯 対空{{ UNITS[id].antiAirBonus ? `×${UNITS[id].antiAirBonus}` : '' }}</span>
                        <span v-if="UNITS[id].area" class="tag area">範囲</span>
                        <span v-if="UNITS[id].snipe" class="tag snipe">狙撃</span>
                    </header>
                    <p class="meta">
                        コスト {{ UNITS[id].cost }}円・HP {{ UNITS[id].hp }}・攻撃 {{ UNITS[id].attack }}・射程 {{ UNITS[id].range }}・速度 {{ UNITS[id].speed }}・解放 St{{ UNITS[id].unlockAfter }}
                    </p>
                    <div class="forms-row">
                        <div v-for="f in allyForms" :key="f" class="form-cell" :class="{ picked: selected.side === 'ally' && selected.kind === id && selected.form === f }" @click="selectChar('ally', id, f)">
                            <canvas :ref="bindCanvas(`ally:${id}:${f}`)" class="preview"></canvas>
                            <span class="fname">形態{{ f + 1 }}: {{ plain(UNITS[id].forms[f].name) }}</span>
                            <button type="button" class="mini-btn" @click.stop="koFromCard('ally', id, f)">💥 ふっとばす</button>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <section class="gallery-section">
            <h2>敵キャラクター（全{{ ENEMY_IDS.length }}体）</h2>
            <div class="grid enemy-grid">
                <article v-for="id in ENEMY_IDS" :key="id" class="card char-card" :class="{ selected: selected.side === 'enemy' && selected.kind === id }" @click="selectChar('enemy', id, 0)">
                    <header class="char-head">
                        <strong>{{ plain(ENEMIES[id].name) }}</strong>
                        <code class="cid">{{ id }}</code>
                        <span v-if="ENEMIES[id].boss" class="tag boss">👹 ボス</span>
                        <span v-if="ENEMIES[id].flying" class="tag air">☁️ 空</span>
                        <span v-else-if="ENEMIES[id].antiAir" class="tag antiair">🎯 対空</span>
                        <span v-if="ENEMIES[id].area" class="tag area">範囲</span>
                        <span v-if="ENEMIES[id].heal" class="tag heal">回復</span>
                        <span v-if="ENEMIES[id].split" class="tag split">分裂</span>
                        <span v-if="ENEMIES[id].heavy" class="tag heavy">重</span>
                    </header>
                    <p class="meta">
                        HP {{ ENEMIES[id].hp }}・攻撃 {{ ENEMIES[id].attack }}・射程 {{ ENEMIES[id].range }}・速度 {{ ENEMIES[id].speed }}・💰{{ ENEMIES[id].money }}
                    </p>
                    <p v-if="ENEMIES[id].tip" class="tip">{{ plain(ENEMIES[id].tip!) }}</p>
                    <div class="enemy-body">
                        <canvas :ref="bindCanvas(`enemy:${id}`)" class="preview"></canvas>
                        <button type="button" class="mini-btn" @click.stop="koFromCard('enemy', id, 0)">💥 ふっとばす</button>
                    </div>
                </article>
            </div>
        </section>
    </main>
</template>

<style scoped>
.debug-page {
    max-width: 82rem;
    margin: 0 auto;
    padding: 1rem;
    display: grid;
    gap: 1rem;
}

.debug-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
}

.debug-head h1 {
    font-family: var(--hand);
    font-size: 1.8rem;
}

.sub {
    color: var(--muted);
    font-size: 0.95rem;
}

.controls {
    display: grid;
    gap: 0.65rem;
    position: sticky;
    top: 0.5rem;
    z-index: 10;
    background: var(--paper);
}

.ctrl-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem 1.2rem;
}

.ctrl-group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
}

.ctrl-label {
    font-weight: 700;
    font-size: 0.85rem;
    color: var(--muted);
}

.btn-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
}

.chip {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.3rem 0.65rem;
    border: 2px solid var(--rule);
    border-radius: 999px;
    background: var(--paper);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 700;
    cursor: pointer;
}

.chip.active {
    border-color: #6b4fd8;
    background: #6b4fd8;
    color: #fff;
}

.toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
}

.stage-box {
    display: grid;
    gap: 0.6rem;
}

.stage-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
}

.stage-bar h2 {
    font-family: var(--hand);
    font-size: 1.2rem;
}

.picked {
    color: #6b4fd8;
}

.ko-chip {
    border-color: #f76707;
    color: #c2410c;
}

.ko-all {
    border-color: #e03131;
    background: #fff5f5;
    color: #c92a2a;
}

.stage-canvas {
    width: 100%;
    max-width: 54rem;
    margin-inline: auto;
    display: block;
    border-radius: 0.75rem;
    border: 2px solid var(--rule);
    background: #eef7ff;
}

.hint {
    font-size: 0.85rem;
    color: var(--muted);
}

.gallery-section {
    display: grid;
    gap: 0.65rem;
}

.gallery-section h2 {
    font-family: var(--hand);
    font-size: 1.4rem;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 25rem), 1fr));
    gap: 0.75rem;
}

.enemy-grid {
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 15.5rem), 1fr));
}

.char-card {
    display: grid;
    gap: 0.45rem;
    align-content: start;
    cursor: pointer;
    transition: border-color 0.15s;
}

.char-card.selected {
    border-color: #6b4fd8;
    box-shadow: 0 0 0 3px rgb(107 79 216 / 0.18);
}

.char-head {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
}

.cid {
    font-size: 0.75rem;
    padding: 0.05rem 0.35rem;
    border-radius: 0.3rem;
    background: var(--rule-soft);
    color: var(--muted);
}

.tag {
    font-size: 0.72rem;
    font-weight: 700;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
}

.tag.air { background: #dbeafe; color: #1d4ed8; }
.tag.antiair { background: #fef3c7; color: #b45309; }
.tag.area { background: #ede9fe; color: #6d28d9; }
.tag.snipe { background: #fce7f3; color: #be185d; }
.tag.boss { background: #fee2e2; color: #b91c1c; }
.tag.heal { background: #dcfce7; color: #15803d; }
.tag.split { background: #f3e8ff; color: #7e22ce; }
.tag.heavy { background: #e5e7eb; color: #374151; }

.meta {
    font-size: 0.8rem;
    color: var(--muted);
}

.tip {
    font-size: 0.78rem;
    color: #7c2d12;
    background: #fff7ed;
    padding: 0.2rem 0.45rem;
    border-radius: 0.4rem;
}

.forms-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
    gap: 0.45rem;
}

.form-cell,
.enemy-body {
    display: grid;
    justify-items: center;
    gap: 0.25rem;
    padding: 0.35rem;
    border-radius: 0.6rem;
    background: #f4f8f4;
    border: 2px solid transparent;
}

.form-cell.picked {
    border-color: #6b4fd8;
    background: #f3f0ff;
}

.preview {
    width: 8.25rem;
    height: 8.25rem;
    display: block;
}

.fname {
    font-size: 0.75rem;
    font-weight: 700;
    text-align: center;
    line-height: 1.25;
}

.mini-btn {
    padding: 0.2rem 0.55rem;
    border: 1.5px solid #f76707;
    border-radius: 999px;
    background: #fff;
    color: #c2410c;
    font: inherit;
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
}

.mini-btn:hover {
    background: #fff4e6;
}
</style>
