import { Color } from 'cc';
import * as MetaSave from './MetaSave';

/** 玩家属性 */
export interface Stats {
    hp: number;
    maxHp: number;
    damage: number;
    moveSpeed: number;      // 移动速度倍率
    fireInterval: number;   // 攻击间隔（秒）
    bulletCount: number;
    xpGain: number;         // 经验获取倍率
    orbs: number;           // 环绕电球数量
    missiles: number;       // 跟踪导弹数量（自动周期发射）
    magnetRange: number;    // 能量吸附范围（像素）
    critRate: number;       // 暴击率（0~1）
    critMult: number;       // 暴击伤害倍率
    shieldMax: number;      // 护盾上限（0/1）
    shield: number;         // 当前护盾（0/1）
    shieldTimer: number;    // 护盾充能倒计时
    chain: number;          // 闪电链等级：暴击时概率雷击跳跃
    laser: number;          // 镭射等级：周期贯穿光束（等级=道数）
    blackhole: number;      // 黑洞弹等级：周期生成吸聚黑洞
    freeze: number;         // 冰冻弹等级：子弹附带减速
    dashCd: number;         // 冲刺冷却（秒），机库推进器可缩短
}

export function createBaseStats(): Stats {
    // 机库永久强化：结算数据核心购买的出厂加成
    const meta = {
        armor: MetaSave.metaLevel('armor'),
        calibration: MetaSave.metaLevel('calibration'),
        engine: MetaSave.metaLevel('engine'),
        magnet: MetaSave.metaLevel('magnet'),
        shield: MetaSave.metaLevel('shield'),
        missile: MetaSave.metaLevel('missile'),
        crit: MetaSave.metaLevel('crit'),
        xpData: MetaSave.metaLevel('xpData'),
        orbs: MetaSave.metaLevel('orbs'),
        dash: MetaSave.metaLevel('dash'),
    };
    return {
        hp: 5 + meta.armor,
        maxHp: 5 + meta.armor,
        damage: Math.max(1, Math.round(1 * (1 + 0.08 * meta.calibration) * 10) / 10),
        moveSpeed: 1 + 0.06 * meta.engine,
        fireInterval: 0.3,
        bulletCount: 1,
        xpGain: 1 + 0.08 * meta.xpData,
        orbs: meta.orbs,
        missiles: meta.missile,
        magnetRange: 150 + 60 * meta.magnet,
        critRate: 0.05 + 0.04 * meta.crit,
        critMult: 2,
        shieldMax: meta.shield,
        shield: meta.shield,
        shieldTimer: 0,
        chain: 0,
        laser: 0,
        blackhole: 0,
        freeze: 0,
        dashCd: Math.max(1.5, 2.6 - 0.3 * meta.dash),
    };
}

function hex(c: string): Color {
    const col = new Color();
    col.fromHEX(c);
    return col;
}

/** 一条升级选项 */
export interface Upgrade {
    id: string;
    name: string;
    desc: string;
    char: string;           // 图标上显示的单个汉字
    color: Color;
    weight: number;
    price?: number;         // 波次商店售价
    req?: string;           // 需要解锁的成就 id
    canOffer?(s: Stats): boolean;
    apply(s: Stats): void;
}

export const UPGRADES: Upgrade[] = [
    {
        id: 'attack',
        name: '攻击力 +1',
        desc: '每颗子弹伤害 +1',
        char: '攻',
        color: hex('#e05555'),
        weight: 10,
        price: 20,
        apply(s) { s.damage += 1; },
    },
    {
        id: 'speed',
        name: '移动速度 +5%',
        desc: '移动更灵活，方便走位躲弹',
        char: '速',
        color: hex('#4fc3f7'),
        weight: 10,
        price: 20,
        canOffer(s) { return s.moveSpeed < 2; },
        apply(s) { s.moveSpeed += 0.05; },
    },
    {
        id: 'hp',
        name: '生命上限 +1',
        desc: '上限 +1，并回复 2 点生命',
        char: '命',
        color: hex('#66bb6a'),
        weight: 10,
        price: 25,
        apply(s) {
            s.maxHp += 1;
            s.hp = Math.min(s.maxHp, s.hp + 2);
        },
    },
    {
        id: 'fireRate',
        name: '射速提升',
        desc: '攻击间隔缩短 12%',
        char: '射',
        color: hex('#ffca28'),
        weight: 8,
        price: 25,
        apply(s) { s.fireInterval = Math.max(0.1, s.fireInterval * 0.88); },
    },
    {
        id: 'multi',
        name: '多重射击',
        desc: '同时多发出一颗子弹',
        char: '弹',
        color: hex('#ab47bc'),
        weight: 5,
        price: 60,
        canOffer(s) { return s.bulletCount < 7; },
        apply(s) { s.bulletCount += 1; },
    },
    {
        id: 'heal',
        name: '恢复药剂',
        desc: '立即回复 3 点生命',
        char: '回',
        color: hex('#26a69a'),
        weight: 8,
        price: 15,
        canOffer(s) { return s.hp < s.maxHp; },
        apply(s) { s.hp = Math.min(s.maxHp, s.hp + 3); },
    },
    {
        id: 'xpGain',
        name: '经验加持',
        desc: '获得经验 +5%',
        char: '验',
        color: hex('#7e57c2'),
        weight: 6,
        price: 20,
        canOffer(s) { return s.xpGain < 2.5; },
        apply(s) { s.xpGain += 0.05; },
    },
    {
        id: 'orbit',
        name: '环绕电球 +1',
        desc: '电球绕身旋转，撞击敌人',
        char: '球',
        color: hex('#67e8f9'),
        weight: 7,
        price: 35,
        canOffer(s) { return s.orbs < 6; },
        apply(s) { s.orbs += 1; },
    },
    {
        id: 'missile',
        name: '跟踪导弹 +1',
        desc: '每 2.4 秒自动锁定敌机发射',
        char: '导',
        color: hex('#fb923c'),
        weight: 8,
        price: 40,
        canOffer(s) { return s.missiles < 6; },
        apply(s) { s.missiles += 1; },
    },
    {
        id: 'magnetRange',
        name: '磁场强化',
        desc: '能量吸附范围 +80',
        char: '场',
        color: hex('#22d3ee'),
        weight: 8,
        price: 18,
        canOffer(s) { return s.magnetRange < 550; },
        apply(s) { s.magnetRange += 80; },
    },
    {
        id: 'crit',
        name: '暴击率 +8%',
        desc: '暴击造成 2 倍伤害',
        char: '暴',
        color: hex('#ff7043'),
        weight: 8,
        price: 25,
        canOffer(s) { return s.critRate < 0.5; },
        apply(s) { s.critRate = Math.min(0.5, s.critRate + 0.08); },
    },
    {
        id: 'shield',
        name: '能量护盾',
        desc: '抵挡一次伤害，12 秒充能',
        char: '盾',
        color: hex('#94a3b8'),
        weight: 7,
        price: 50,
        canOffer(s) { return s.shieldMax < 1; },
        apply(s) { s.shieldMax = 1; s.shield = 1; },
    },
    {
        id: 'chain',
        name: '闪电链',
        desc: '暴击时 50% 概率雷击跳跃，等级越高跳得越多',
        char: '雷',
        color: hex('#a78bfa'),
        weight: 7,
        price: 40,
        canOffer(s) { return s.chain < 5; },
        apply(s) { s.chain += 1; },
    },
    {
        id: 'laser',
        name: '镭射光束',
        desc: '每升一级多一道贯穿光束，自战机向上齐射',
        char: '光',
        color: hex('#f472b6'),
        weight: 6,
        price: 55,
        req: 'veteran',   // 成就「达人」解锁
        canOffer(s) { return s.laser < 5; },
        apply(s) { s.laser += 1; },
    },
    {
        id: 'blackhole',
        name: '黑洞弹',
        desc: '周期生成黑洞，吸聚并碾碎敌机',
        char: '洞',
        color: hex('#818cf8'),
        weight: 6,
        price: 55,
        req: 'bossKiller',   // 成就「猎首」解锁
        canOffer(s) { return s.blackhole < 5; },
        apply(s) { s.blackhole += 1; },
    },
    {
        id: 'freeze',
        name: '冰冻弹',
        desc: '子弹附带冰缓，等级越高冻得越深',
        char: '冰',
        color: hex('#7dd3fc'),
        weight: 7,
        price: 30,
        canOffer(s) { return s.freeze < 5; },
        apply(s) { s.freeze += 1; },
    },
];

/** 每日挑战用可播种随机；默认 Math.random */
let rng: () => number = Math.random;
export function setRng(fn: () => number) { rng = fn; }
export function resetRng() { rng = Math.random; }

/** 加权随机抽出 count 个不重复的升级选项（过滤未解锁与已满级） */
export function rollUpgrades(stats: Stats, count = 3): Upgrade[] {
    const available = UPGRADES.filter(u =>
        (!u.canOffer || u.canOffer(stats)) &&
        (!u.req || MetaSave.hasAchievement(u.req))
    );
    const picked: Upgrade[] = [];
    const bag = available.slice();

    while (picked.length < count && bag.length > 0) {
        const total = bag.reduce((sum, u) => sum + u.weight, 0);
        let roll = rng() * total;
        for (let i = 0; i < bag.length; i++) {
            roll -= bag[i].weight;
            if (roll <= 0) {
                picked.push(bag.splice(i, 1)[0]);
                break;
            }
        }
    }
    return picked;
}
