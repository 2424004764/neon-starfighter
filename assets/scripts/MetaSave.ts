/**
 * 局外存档（localStorage）：数据核心 / 机库永久强化 / 成就 / 每日挑战最佳成绩
 * 全部同步读写，体量极小，无需异步
 */

export interface MetaLevels {
    armor: number;        // 机体装甲：初始生命 +1/级
    calibration: number;  // 出厂校准：攻击力 +8%/级
    engine: number;       // 引擎调校：移速 +6%/级
    magnet: number;       // 磁力线圈：吸附范围 +60/级
    shield: number;       // 应急护盾：开局自带护盾
    missile: number;      // 导弹挂架：开局自带导弹（每级 1 枚）
    crit: number;         // 出锋校靶：初始暴击率 +4%/级
    xpData: number;       // 经验协议：经验获取 +8%/级
    orbs: number;         // 电球预装：开局自带环绕电球（每级 1 颗）
    dash: number;         // 推进器：冲刺冷却 -0.3 秒/级
    startGold: number;    // 战备资金：波次模式开局金币 +30/级
    luck: number;         // 幸运合约：道具掉率 +25%/级
}

export interface MetaDef {
    id: keyof MetaLevels;
    name: string;
    desc: string;
    char: string;
    color: string;
    costs: number[];      // 每级价格
}

export const META_DEFS: MetaDef[] = [
    { id: 'armor', name: '机体装甲', desc: '初始生命上限 +1', char: '甲', color: '#66bb6a', costs: [10, 30, 60, 120, 240] },
    { id: 'calibration', name: '出厂校准', desc: '攻击力 +8%', char: '校', color: '#e05555', costs: [8, 24, 48, 96, 180] },
    { id: 'engine', name: '引擎调校', desc: '移动速度 +6%', char: '擎', color: '#4fc3f7', costs: [6, 18, 40, 80] },
    { id: 'magnet', name: '磁力线圈', desc: '初始吸附范围 +60', char: '磁', color: '#22d3ee', costs: [6, 14, 30, 60] },
    { id: 'shield', name: '应急护盾', desc: '开局自带护盾模块', char: '盾', color: '#94a3b8', costs: [40] },
    { id: 'missile', name: '导弹挂架', desc: '开局自带跟踪导弹', char: '导', color: '#fb923c', costs: [50, 150] },
    { id: 'crit', name: '出锋校靶', desc: '初始暴击率 +4%', char: '靶', color: '#ff8a4d', costs: [12, 36, 72] },
    { id: 'xpData', name: '经验协议', desc: '经验获取 +8%', char: '验', color: '#a78bfa', costs: [10, 30, 60] },
    { id: 'orbs', name: '电球预装', desc: '开局自带环绕电球', char: '球', color: '#67e8f9', costs: [60, 160] },
    { id: 'dash', name: '推进器', desc: '冲刺冷却 -0.3 秒', char: '推', color: '#7dd3fc', costs: [15, 45, 90] },
    { id: 'startGold', name: '战备资金', desc: '波次模式开局金 +30', char: '资', color: '#fbbf24', costs: [8, 20, 40] },
    { id: 'luck', name: '幸运合约', desc: '道具掉率 +25%', char: '运', color: '#f472b6', costs: [20, 60] },
];

export interface AchievementDef {
    id: string;
    name: string;
    desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
    { id: 'firstBlood', name: '首杀', desc: '击杀第一只敌机' },
    { id: 'slayer', name: '百人斩', desc: '单局击杀 100 只敌机' },
    { id: 'bossKiller', name: '猎首', desc: '击败一只 Boss（解锁黑洞弹）' },
    { id: 'eliteHunter', name: '精英猎人', desc: '单局击杀 5 只精英/词条怪（解锁冰冻力场）' },
    { id: 'veteran', name: '达人', desc: '单局达到 10 级（解锁镭射）' },
    { id: 'dasher', name: '冲刺者', desc: '单局使用 30 次冲刺' },
    { id: 'tycoon', name: '大富翁', desc: '单局拾取 100 金币' },
    { id: 'survivor', name: '生存者', desc: '无尽模式存活 5 分钟' },
];

const KEY = 'neon-starfighter-meta-v1';

interface SaveData {
    cores: number;
    meta: MetaLevels;
    achievements: string[];
    dailyBest: Record<string, number>;   // 'YYYY-MM-DD' -> 存活秒数
    totalKills: number;
}

function defaultData(): SaveData {
    return {
        cores: 0,
        meta: { armor: 0, calibration: 0, engine: 0, magnet: 0, shield: 0, missile: 0, crit: 0, xpData: 0, orbs: 0, dash: 0, startGold: 0, luck: 0 },
        achievements: [],
        dailyBest: {},
        totalKills: 0,
    };
}

let cache: SaveData | null = null;

function load(): SaveData {
    if (cache) return cache;
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            cache = Object.assign(defaultData(), parsed);
            cache.meta = Object.assign(defaultData().meta, parsed.meta || {});
            return cache;
        }
    } catch (e) { /* 损坏存档当作新档 */ }
    cache = defaultData();
    return cache;
}

function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(load()));
    } catch (e) { /* 隐私模式等写入失败时静默 */ }
}

/** 当前数据核心余额 */
export function cores(): number { return load().cores; }

/** 结算数据核心入账 */
export function addCores(n: number) {
    if (n <= 0) return;
    load().cores += n;
    save();
}

/** 机库某项强化等级 */
export function metaLevel(id: keyof MetaLevels): number { return load().meta[id]; }

/** 购买机库强化下一级，返回是否成功 */
export function buyMeta(id: keyof MetaLevels): boolean {
    const d = load();
    const def = META_DEFS.find(m => m.id === id)!;
    const lv = d.meta[id];
    if (lv >= def.costs.length) return false;
    const cost = def.costs[lv];
    if (d.cores < cost) return false;
    d.cores -= cost;
    d.meta[id] = lv + 1;
    save();
    return true;
}

/** 是否已解锁某成就 */
export function hasAchievement(id: string): boolean {
    return load().achievements.indexOf(id) >= 0;
}

/** 解锁成就，返回是否为新解锁（用于 toast） */
export function unlock(id: string): boolean {
    const d = load();
    if (d.achievements.indexOf(id) >= 0) return false;
    d.achievements.push(id);
    save();
    return true;
}

export function achievementCount(): number { return load().achievements.length; }

/** 今日日期串（本地时区） */
export function todayKey(): string {
    const t = new Date();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    return `${t.getFullYear()}-${mm}-${dd}`;
}

/** 每日挑战最佳成绩（秒），无记录返回 -1 */
export function dailyBest(day: string): number {
    const v = load().dailyBest[day];
    return typeof v === 'number' ? v : -1;
}

/** 记录每日挑战成绩，返回是否刷新纪录 */
export function setDailyBest(day: string, sec: number): boolean {
    const d = load();
    if (sec <= (d.dailyBest[day] || -1)) return false;
    d.dailyBest[day] = sec;
    save();
    return true;
}

export function addTotalKills(n: number) {
    load().totalKills += n;
    save();
}

export function totalKills(): number { return load().totalKills; }

// ---------------- 可播种随机（每日挑战用） ----------------

/** mulberry32：种子固定则序列完全一致 */
export function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return function () {
        a |= 0; a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function hashSeed(str: string): number {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}
