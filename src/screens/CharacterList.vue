<script setup lang="ts">
// --- キャラクター一覧: simple encyclopedia of allies and enemies ---
// Characters unlocked / met in cleared stages are shown in full with their traits;
// unseen characters appear as mystery silhouettes only.
import { computed, ref } from 'vue';
import CharacterIcon from '../components/CharacterIcon.vue';
import ElementMark from '../components/ElementMark.vue';
import Furi from '../components/Furi.vue';
import { ENEMIES, ENEMY_IDS, type EnemyId } from '../game/enemies';
import { seenEnemies } from '../game/stages';
import { formOf, UNIT_IDS, UNITS, unitStats } from '../game/units';
import { availableUnits, go, save } from '../store';

const tab = ref<'ally' | 'enemy'>('ally');

const unlocked = computed(() => new Set(availableUnits()));
const clearedIds = computed(() =>
    Object.entries(save.stages)
        .filter(([, r]) => r.cleared)
        .map(([id]) => Number(id))
);
const metEnemies = computed(() => seenEnemies(clearedIds.value));

const allies = computed(() =>
    UNIT_IDS.map(id => {
        const open = unlocked.value.has(id);
        const level = save.units[id];
        const s = unitStats(id, level);
        return { id, open, level, form: formOf(level), u: UNITS[id], s };
    })
);

const ENEMY_DESC: Partial<Record<EnemyId, string>> = {
    zako: 'ねむそうな わすれんぼうの [仲間|なかま]',
    hard: 'なべを かぶっていて とても かたい',
    fast: '[足|あし]が ぐるぐる まわって とても [速|はや]い',
    thrower: '[遠|とお]くから まくらを なげてくる',
    boss: 'おおきな ボス。ときどき ねごとを いう',
    kasa: 'かさで [空|そら]を ふわふわ とぶ。[風|かぜ]に よわい',
    bento: 'おにぎりを なげる。[倒|たお]すと お[金|かね]が おおい',
    yawn: 'おおきな あくびで [味方|みかた]を おしてくる'
};

const enemies = computed(() =>
    ENEMY_IDS.map(id => {
        const e = ENEMIES[id];
        return { id, seen: metEnemies.value.has(id), e, desc: e.tip ?? ENEMY_DESC[id] ?? '' };
    })
);

const allyCount = computed(() => allies.value.filter(a => a.open).length);
const enemyCount = computed(() => enemies.value.filter(e => e.seen).length);
</script>

<template>
    <main class="screen char-list">
        <header class="screen-head">
            <button type="button" class="btn" @click="go('title')"><Furi text="[戻|もど]る" /></button>
            <h1><Furi text="キャラクター[一覧|いちらん]" /></h1>
        </header>

        <div class="tabs" role="group" aria-label="表示する 種類">
            <button type="button" class="btn" :class="{ 'btn-primary': tab === 'ally' }" :aria-pressed="tab === 'ally'" @click="tab = 'ally'">
                <Furi text="[味方|みかた]" /> <small>{{ allyCount }} / {{ allies.length }}</small>
            </button>
            <button type="button" class="btn" :class="{ 'btn-primary': tab === 'enemy' }" :aria-pressed="tab === 'enemy'" @click="tab = 'enemy'">
                <Furi text="[敵|てき]" /> <small>{{ enemyCount }} / {{ enemies.length }}</small>
            </button>
        </div>

        <ul v-if="tab === 'ally'" class="grid">
            <li v-for="a in allies" :key="a.id" class="card entry" :class="{ hidden: !a.open }">
                <div class="thumb">
                    <CharacterIcon :kind="a.id" :form="a.open ? a.form : 0" :size="68" :silhouette="!a.open" />
                </div>
                <div class="info">
                    <template v-if="a.open">
                        <p class="name">
                            <ElementMark :mark="a.u.element" :size="18" />
                            <Furi :text="a.s.form.name" />
                        </p>
                        <p class="badges">
                            <span class="tag role"><Furi :text="a.u.role" /></span>
                            <span v-if="a.u.flying" class="tag air"><Furi text="☁️ [空|そら]" /></span>
                            <span v-else-if="a.u.antiAir" class="tag antiair"><Furi text="🎯 [空|そら]OK" /></span>
                            <span v-if="a.u.area" class="tag area"><Furi text="[範囲|はんい]" /></span>
                        </p>
                        <p class="stats"><Furi :text="`Lv${a.level}・${a.u.cost}[円|えん]・[体力|たいりょく] ${a.s.hp}・[攻撃|こうげき] ${a.s.attack}`" /></p>
                    </template>
                    <template v-else>
                        <p class="name mystery">？？？</p>
                        <p class="stats"><Furi :text="`ステージ ${a.u.unlockAfter} を クリアすると [登場|とうじょう]`" /></p>
                    </template>
                </div>
            </li>
        </ul>

        <ul v-else class="grid">
            <li v-for="f in enemies" :key="f.id" class="card entry" :class="{ hidden: !f.seen }">
                <div class="thumb">
                    <CharacterIcon :kind="f.id" :size="68" :silhouette="!f.seen" />
                </div>
                <div class="info">
                    <template v-if="f.seen">
                        <p class="name">
                            <Furi :text="f.e.name" />
                        </p>
                        <p class="badges">
                            <span v-if="f.e.boss" class="tag boss">👹 ボス</span>
                            <span v-if="f.e.flying" class="tag air"><Furi text="☁️ [空|そら]" /></span>
                            <span v-else-if="f.e.antiAir" class="tag antiair"><Furi text="🎯 [対空|たいくう]" /></span>
                            <span v-if="f.e.area" class="tag area"><Furi text="[範囲|はんい]" /></span>
                            <span v-if="f.e.heal" class="tag heal"><Furi text="[回復|かいふく]" /></span>
                            <span v-if="f.e.split" class="tag split"><Furi text="[分裂|ぶんれつ]" /></span>
                            <span v-if="f.e.heavy" class="tag heavy"><Furi text="[重|おも]い" /></span>
                        </p>
                        <p class="desc"><Furi :text="f.desc" /></p>
                    </template>
                    <template v-else>
                        <p class="name mystery">？？？</p>
                        <p class="stats"><Furi text="まだ [出会|であ]っていないよ" /></p>
                    </template>
                </div>
            </li>
        </ul>

        <p class="hint"><Furi text="ステージを クリアすると、そこに [出|で]てきた キャラクターが [見|み]られるように なるよ" /></p>
    </main>
</template>

<style scoped>
.char-list {
    max-width: 72rem;
}

.tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 16.5rem), 1fr));
    gap: 0.6rem;
    margin: 0;
    padding: 0;
    list-style: none;
}

.entry {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.6rem 0.75rem;
}

.entry.hidden {
    background: var(--rule-soft);
}

.thumb {
    display: grid;
    place-items: center;
    flex: none;
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 50%;
    background: var(--rule-soft);
    overflow: hidden;
}

.entry.hidden .thumb {
    background: rgb(0 0 0 / 0.06);
}

.info {
    display: grid;
    gap: 0.2rem;
    min-width: 0;
}

.name {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    margin: 0;
    font-family: var(--hand);
    font-weight: 600;
    line-height: 1.5;
}

.name.mystery {
    color: var(--muted);
}

.badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    margin: 0;
}

.tag {
    display: inline-block;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 700;
    background: var(--rule-soft);
    color: var(--ink);
}

.tag.air { background: #dbeafe; color: #1d4ed8; }
.tag.antiair { background: #fef3c7; color: #b45309; }
.tag.area { background: #ede9fe; color: #6d28d9; }
.tag.boss { background: #fee2e2; color: #b91c1c; }
.tag.heal { background: #dcfce7; color: #15803d; }
.tag.split { background: #f3e8ff; color: #7e22ce; }
.tag.heavy { background: #e5e7eb; color: #374151; }

.stats,
.desc {
    margin: 0;
    font-size: 0.82rem;
    color: var(--muted);
    line-height: 1.4;
}

.hint {
    color: var(--muted);
    font-size: 0.95rem;
}
</style>
