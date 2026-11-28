// --- How each stage looks: the time of day, the land, a landmark, the ground, the weather and the
// enemy tower (requirements 5.4). Data only: src/art/scenery.ts draws it, render.ts uses it ---

export type Time = 'day' | 'evening' | 'night' | 'cave';
// The far line of the land: round hills, pointed mountains, or nothing (the sea, the clouds)
export type Land = 'hills' | 'mountains' | 'flat';
// Something seen far off, between the far and the near land
export type Landmark = 'none' | 'trees' | 'pines' | 'castle' | 'clocktower' | 'town' | 'rainbow' | 'tower' | 'islands' | 'rocks' | 'hedges';
export type Ground = 'grass' | 'rock' | 'sand' | 'snow' | 'cloud' | 'swamp' | 'stone';
export type Weather = 'none' | 'rain' | 'snow' | 'leaves' | 'petals' | 'shooting' | 'fog' | 'wind' | 'drips' | 'sparkles' | 'fireflies' | 'bubbles';
// What the enemy tower (ねぼすけまくらタワー) wears on its top
export type Topper = 'cap' | 'crown' | 'clock' | 'wizard' | 'helmet' | 'bow';

export interface TowerStyle {
    pillows: readonly [string, string, string];
    cap: string;
    topper: Topper;
}

export interface Scene {
    time: Time;
    // The sky, top and bottom
    sky: readonly [string, string];
    land: Land;
    far: string;
    near: string;
    landmark: Landmark;
    // A band of water between the land and the ground (a lake, the sea)
    water?: string;
    ground: Ground;
    groundColor: string;
    // The line at the edge of the ground
    edge: string;
    weather: Weather;
    clouds: number;
    cloudColor: string;
    tower: TowerStyle;
}

const PILLOWS = ['#c8b6ff', '#ffc8dd', '#bde0fe'] as const;
const TOWER: TowerStyle = { pillows: PILLOWS, cap: '#5b3f8c', topper: 'cap' };

const MEADOW: Scene = {
    time: 'day', sky: ['#9fd3f7', '#eaf7ff'], land: 'hills', far: '#bfe3b0', near: '#a5d68c', landmark: 'none',
    ground: 'grass', groundColor: '#8cc56b', edge: '#76ad58', weather: 'none', clouds: 4, cloudColor: 'rgb(255 255 255 / 0.9)', tower: TOWER
};

const NIGHT_SKY = ['#151b45', '#3d3a7a'] as const;

export const SCENES: Record<number, Scene> = {
    1: MEADOW,
    // わすれんぼうの 森: trees, leaves falling
    2: { ...MEADOW, far: '#9fcf8f', near: '#7fbf6a', landmark: 'trees', groundColor: '#7cb85c', edge: '#5f9a45', weather: 'leaves', clouds: 3 },
    // かちこち 洞窟: a cave, drops from its roof
    3: {
        ...MEADOW, time: 'cave', sky: ['#2b2836', '#5a5470'], land: 'mountains', far: '#4a4560', near: '#5f5878', landmark: 'rocks',
        ground: 'rock', groundColor: '#8a8197', edge: '#6e6680', weather: 'drips', clouds: 0, tower: { pillows: ['#b8c0cc', '#d8dde6', '#9aa5b5'], cap: '#4d5a6e', topper: 'helmet' }
    },
    // ぽいぽい 谷: red cliffs, the wind
    4: {
        ...MEADOW, sky: ['#f6c98a', '#fdebd0'], land: 'mountains', far: '#d9895b', near: '#c4703f', landmark: 'rocks',
        ground: 'sand', groundColor: '#e3b77b', edge: '#c99a5c', weather: 'wind', clouds: 2, tower: { pillows: ['#ffd6a5', '#fdffb6', '#ffadad'], cap: '#9c4f1f', topper: 'cap' }
    },
    // おおわすれんぼうの 城: the evening, a castle far off
    5: {
        ...MEADOW, time: 'evening', sky: ['#ff9e7a', '#ffe1a8'], far: '#c79ab8', near: '#9fc48a', landmark: 'castle',
        groundColor: '#86b865', edge: '#6c9c4f', weather: 'none', clouds: 3, cloudColor: 'rgb(255 230 210 / 0.9)', tower: { pillows: ['#e5383b', '#ffd23f', '#c8b6ff'], cap: '#7a2c4d', topper: 'crown' }
    },
    // はやかぜ 草原: a flat field, petals in the wind
    6: { ...MEADOW, sky: ['#7ec8f0', '#e3f6ff'], land: 'flat', near: '#b5e08f', landmark: 'none', groundColor: '#9ad06f', edge: '#7cb24f', weather: 'petals', clouds: 5 },
    // 岩山 砦: grey mountains, a pot on the tower
    7: {
        ...MEADOW, sky: ['#a9c4d8', '#e6eef4'], land: 'mountains', far: '#9aa3ad', near: '#7f8a94', landmark: 'rocks',
        ground: 'stone', groundColor: '#a8a29a', edge: '#8a847c', weather: 'none', clouds: 3, tower: { pillows: ['#b8c0cc', '#e9e4dc', '#a3b1c2'], cap: '#5c6675', topper: 'helmet' }
    },
    // 消しゴムの 雨: rain from a grey sky
    8: {
        ...MEADOW, sky: ['#8d99a8', '#c9d1db'], far: '#9fb59c', near: '#87a585', groundColor: '#6f9c5d', edge: '#5a8449',
        weather: 'rain', clouds: 6, cloudColor: 'rgb(150 160 175 / 0.95)', tower: { pillows: ['#a2d2ff', '#cdb4db', '#bde0fe'], cap: '#3d5a80', topper: 'cap' }
    },
    // わすれの 迷宮: hedges of a maze, in a fog
    9: {
        ...MEADOW, sky: ['#b7a8d8', '#e7dff5'], land: 'flat', near: '#6aa06a', landmark: 'hedges', groundColor: '#7aa86a', edge: '#5c8a50',
        weather: 'fog', clouds: 1, tower: { pillows: ['#cdb4db', '#ffc8dd', '#b8e0d2'], cap: '#4a3b78', topper: 'bow' }
    },
    // にじいろの 大広間: a rainbow, sparkles
    10: {
        ...MEADOW, sky: ['#ffd1e8', '#e0f4ff'], far: '#d7c4f2', near: '#b6e3c4', landmark: 'rainbow', groundColor: '#a8dca0', edge: '#88c080',
        weather: 'sparkles', clouds: 3, tower: { pillows: ['#ff9aa2', '#ffdac1', '#b5ead7'], cap: '#7a2c4d', topper: 'crown' }
    },
    // りんりん 時計台: the evening, a clock tower far off
    11: {
        ...MEADOW, time: 'evening', sky: ['#f4a259', '#fde4b8'], far: '#d8b18c', near: '#b8c98a', landmark: 'clocktower', ground: 'stone',
        groundColor: '#c9b79c', edge: '#a8967b', weather: 'none', clouds: 3, cloudColor: 'rgb(255 236 210 / 0.9)', tower: { pillows: ['#f2c14e', '#f4a261', '#ffe8a3'], cap: '#9c6644', topper: 'clock' }
    },
    // ふかふか 雲の 道: over the clouds
    12: {
        ...MEADOW, sky: ['#6fb7f2', '#d8f0ff'], land: 'flat', near: '#ffffff', landmark: 'islands', ground: 'cloud', groundColor: '#f4f7ff', edge: '#d6e2f5',
        weather: 'none', clouds: 6, tower: { pillows: ['#ffffff', '#e8f1ff', '#fdf0ff'], cap: '#6c8ebf', topper: 'cap' }
    },
    // ふたごの 沼: a swamp in the mist, fireflies
    13: {
        ...MEADOW, sky: ['#9fb8a0', '#dfe9d7'], far: '#7d9a78', near: '#6a8a5f', landmark: 'trees', water: '#6f8f78', ground: 'swamp',
        groundColor: '#6b8a52', edge: '#55703f', weather: 'fog', clouds: 2, cloudColor: 'rgb(230 240 230 / 0.8)', tower: { pillows: ['#b5179e', '#f72585', '#c9a7e8'], cap: '#3a0ca3', topper: 'bow' }
    },
    // こもりうたの 湖: a lake under the moon, fireflies
    14: {
        ...MEADOW, time: 'night', sky: NIGHT_SKY, far: '#2f4a5e', near: '#30584a', landmark: 'pines', water: '#2b4f7a',
        groundColor: '#3f6b48', edge: '#2f553a', weather: 'fireflies', clouds: 2, cloudColor: 'rgb(120 130 180 / 0.6)', tower: { pillows: ['#ffb3c6', '#c8b6ff', '#a2d2ff'], cap: '#5b3f8c', topper: 'cap' }
    },
    // ゆめのまおうの 塔: the night, the king's tower far off
    15: {
        ...MEADOW, time: 'night', sky: ['#1a0f3a', '#4b2a7a'], land: 'mountains', far: '#3a2a5e', near: '#4a3a6e', landmark: 'tower',
        ground: 'stone', groundColor: '#5e5578', edge: '#4a4262', weather: 'sparkles', clouds: 2, cloudColor: 'rgb(140 110 190 / 0.6)', tower: { pillows: ['#7b2cbf', '#c77dff', '#9d4edd'], cap: '#3c096c', topper: 'wizard' }
    },
    // 真夜中の 町: the houses asleep, a few windows lit
    16: {
        ...MEADOW, time: 'night', sky: NIGHT_SKY, land: 'flat', near: '#2c3354', landmark: 'town', ground: 'stone',
        groundColor: '#55597a', edge: '#43476a', weather: 'none', clouds: 2, cloudColor: 'rgb(110 120 170 / 0.6)', tower: { pillows: ['#a2d2ff', '#cdb4db', '#ffafcc'], cap: '#22223b', topper: 'cap' }
    },
    // 星降る 丘: hills under the stars, stars falling
    17: {
        ...MEADOW, time: 'night', sky: ['#0b1340', '#2e3a8a'], far: '#27406b', near: '#2f5a5a', landmark: 'none',
        groundColor: '#3d6b4a', edge: '#2d5539', weather: 'shooting', clouds: 0, tower: { pillows: ['#ffd23f', '#c8b6ff', '#a2d2ff'], cap: '#14213d', topper: 'cap' }
    },
    // 眠りの 海: the sea in the evening, bubbles
    18: {
        ...MEADOW, time: 'evening', sky: ['#f7a072', '#fde2c0'], land: 'flat', near: '#e9c89a', landmark: 'none', water: '#3f88c5',
        ground: 'sand', groundColor: '#f0d49b', edge: '#d8b878', weather: 'bubbles', clouds: 3, cloudColor: 'rgb(255 228 205 / 0.9)', tower: { pillows: ['#90e0ef', '#caf0f8', '#ffd6a5'], cap: '#0077b6', topper: 'bow' }
    },
    // わすれ 山脈: snowy mountains, snow falling
    19: {
        ...MEADOW, sky: ['#b8cbe0', '#eef3f8'], land: 'mountains', far: '#c9d6e6', near: '#a7bcd2', landmark: 'pines', ground: 'snow',
        groundColor: '#f2f6fb', edge: '#d3dfec', weather: 'snow', clouds: 4, cloudColor: 'rgb(235 240 248 / 0.95)', tower: { pillows: ['#ffffff', '#d7e3fc', '#ffcad4'], cap: '#3d5a80', topper: 'helmet' }
    },
    // 夢の 果て: a dream: floating islands, sparkles, a rainbow
    20: {
        ...MEADOW, time: 'night', sky: ['#3a1c71', '#d76d77'], land: 'flat', near: '#8e6cc4', landmark: 'islands', ground: 'cloud',
        groundColor: '#e6dcf7', edge: '#c8b6ff', weather: 'sparkles', clouds: 3, cloudColor: 'rgb(255 220 240 / 0.7)', tower: { pillows: ['#c77dff', '#ffafcc', '#ffd23f'], cap: '#3c096c', topper: 'wizard' }
    },
    // --- Stages 21–30: Sky, Storm, Starry Realms, and the Cosmic Dream ---
    // 21: 虹の 雲海
    21: {
        ...MEADOW, sky: ['#74c0fc', '#ffe3ec'], land: 'flat', near: '#f8f0fc', landmark: 'rainbow', ground: 'cloud',
        groundColor: '#fff5fa', edge: '#f3d9fa', weather: 'petals', clouds: 5, tower: { pillows: ['#ffc8dd', '#bde0fe', '#fff3b0'], cap: '#7b2cbf', topper: 'bow' }
    },
    // 22: 空飛ぶ 広場
    22: {
        ...MEADOW, time: 'evening', sky: ['#f783ac', '#ffe066'], land: 'flat', near: '#f3d9fa', landmark: 'islands', ground: 'stone',
        groundColor: '#dfd3e3', edge: '#b8a8c4', weather: 'wind', clouds: 4, cloudColor: 'rgb(255 235 220 / 0.85)', tower: { pillows: ['#ff9f1c', '#ffd23f', '#a2d2ff'], cap: '#9d4edd', topper: 'clock' }
    },
    // 23: 時計の 迷宮
    23: {
        ...MEADOW, time: 'night', sky: ['#1b263b', '#415a77'], land: 'flat', near: '#3a5a40', landmark: 'hedges', ground: 'stone',
        groundColor: '#5c677d', edge: '#465066', weather: 'fireflies', clouds: 2, cloudColor: 'rgb(140 160 195 / 0.5)', tower: { pillows: ['#f2c14e', '#c8b6ff', '#e9c46a'], cap: '#1b263b', topper: 'clock' }
    },
    // 24: 氷の 洞窟
    24: {
        ...MEADOW, time: 'cave', sky: ['#16324f', '#3e92cc'], land: 'mountains', far: '#2a628f', near: '#4ea8de', landmark: 'rocks',
        ground: 'snow', groundColor: '#dff3ff', edge: '#a9d6f5', weather: 'drips', clouds: 0, tower: { pillows: ['#caf0f8', '#90e0ef', '#ffffff'], cap: '#023e8a', topper: 'helmet' }
    },
    // 25: 大わすれ 火山 (Boss)
    25: {
        ...MEADOW, time: 'evening', sky: ['#c92a2a', '#ff922b'], land: 'mountains', far: '#7f1d1d', near: '#5c2b29', landmark: 'castle',
        ground: 'rock', groundColor: '#6b4c4c', edge: '#4d3333', weather: 'sparkles', clouds: 3, cloudColor: 'rgb(255 180 140 / 0.7)', tower: { pillows: ['#e5383b', '#ff9f1c', '#ffd23f'], cap: '#590d22', topper: 'crown' }
    },
    // 26: 嵐の 海
    26: {
        ...MEADOW, time: 'night', sky: ['#0d1b2a', '#2b4c7e'], land: 'flat', near: '#1d3557', landmark: 'none', water: '#1b4965',
        ground: 'sand', groundColor: '#7b8fa1', edge: '#5c7082', weather: 'rain', clouds: 6, cloudColor: 'rgb(70 90 120 / 0.85)', tower: { pillows: ['#4cc9f0', '#4895ef', '#cdb4db'], cap: '#0d1b2a', topper: 'helmet' }
    },
    // 27: 星空の 町
    27: {
        ...MEADOW, time: 'night', sky: ['#10002b', '#3c096c'], land: 'flat', near: '#240046', landmark: 'town', ground: 'stone',
        groundColor: '#4a4e69', edge: '#33364d', weather: 'shooting', clouds: 1, cloudColor: 'rgb(130 100 180 / 0.5)', tower: { pillows: ['#ffd23f', '#ff8fab', '#9d4edd'], cap: '#240046', topper: 'bow' }
    },
    // 28: 眠りの 雪原
    28: {
        ...MEADOW, time: 'night', sky: ['#1d2d44', '#4a6fa5'], land: 'mountains', far: '#5c7fa3', near: '#7b9ec2', landmark: 'pines',
        ground: 'snow', groundColor: '#e9f1fb', edge: '#c2d4ea', weather: 'snow', clouds: 4, cloudColor: 'rgb(200 220 245 / 0.75)', tower: { pillows: ['#ffffff', '#bde0fe', '#c8b6ff'], cap: '#1d2d44', topper: 'wizard' }
    },
    // 29: 夢の 回廊
    29: {
        ...MEADOW, time: 'evening', sky: ['#5a189a', '#ff70a6'], land: 'mountains', far: '#7b2cbf', near: '#9d4edd', landmark: 'tower',
        ground: 'stone', groundColor: '#7d6b91', edge: '#5d4d70', weather: 'fog', clouds: 3, cloudColor: 'rgb(240 190 230 / 0.65)', tower: { pillows: ['#ff70a6', '#c77dff', '#ffd23f'], cap: '#3c096c', topper: 'crown' }
    },
    // 30: わすれの 宇宙 (Final Boss)
    30: {
        ...MEADOW, time: 'night', sky: ['#050517', '#240046'], land: 'flat', near: '#3c096c', landmark: 'islands', ground: 'cloud',
        groundColor: '#d0bfff', edge: '#9775fa', weather: 'shooting', clouds: 2, cloudColor: 'rgb(180 140 255 / 0.45)', tower: { pillows: ['#ffd23f', '#72efdd', '#ff4d6d'], cap: '#10002b', topper: 'wizard' }
    }
};

export function sceneOf(stageId: number): Scene {
    return SCENES[stageId] ?? MEADOW;
}
