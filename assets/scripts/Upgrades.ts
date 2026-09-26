import { Color } from 'cc';

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
}

export function createBaseStats(): Stats {
    return {
        hp: 5,
        maxHp: 5,
        damage: 1,
        moveSpeed: 1,
        fireInterval: 0.3,
        bulletCount: 1,
        xpGain: 1,
        orbs: 0,
        missiles: 0,
        magnetRange: 150,
        critRate: 0.05,
        critMult: 2,
        shieldMax: 0,
        shield: 0,
        shieldTimer: 0,
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
        apply(s) { s.damage += 1; },
    },
    {
        id: 'speed',
        name: '移动速度 +15%',
        desc: '移动更灵活，方便走位躲弹',
        char: '速',
        color: hex('#4fc3f7'),
        weight: 10,
        canOffer(s) { return s.moveSpeed < 2; },
        apply(s) { s.moveSpeed += 0.15; },
    },
    {
        id: 'hp',
        name: '生命上限 +1',
        desc: '上限 +1，并回复 2 点生命',
        char: '命',
        color: hex('#66bb6a'),
        weight: 10,
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
        apply(s) { s.fireInterval = Math.max(0.1, s.fireInterval * 0.88); },
    },
    {
        id: 'multi',
        name: '多重射击',
        desc: '同时多发出一颗子弹',
        char: '弹',
        color: hex('#ab47bc'),
        weight: 5,
        canOffer(s) { return s.bulletCount < 5; },
        apply(s) { s.bulletCount += 1; },
    },
    {
        id: 'heal',
        name: '恢复药剂',
        desc: '立即回复 3 点生命',
        char: '回',
        color: hex('#26a69a'),
        weight: 8,
        canOffer(s) { return s.hp < s.maxHp; },
        apply(s) { s.hp = Math.min(s.maxHp, s.hp + 3); },
    },
    {
        id: 'xpGain',
        name: '经验加持',
        desc: '获得经验 +25%',
        char: '验',
        color: hex('#7e57c2'),
        weight: 6,
        canOffer(s) { return s.xpGain < 2.5; },
        apply(s) { s.xpGain += 0.25; },
    },
    {
        id: 'orbit',
        name: '环绕电球 +1',
        desc: '电球绕身旋转，撞击敌人',
        char: '球',
        color: hex('#67e8f9'),
        weight: 7,
        canOffer(s) { return s.orbs < 4; },
        apply(s) { s.orbs += 1; },
    },
    {
        id: 'missile',
        name: '跟踪导弹 +1',
        desc: '每 2.4 秒自动锁定敌机发射',
        char: '导',
        color: hex('#fb923c'),
        weight: 8,
        canOffer(s) { return s.missiles < 4; },
        apply(s) { s.missiles += 1; },
    },
    {
        id: 'magnetRange',
        name: '磁场强化',
        desc: '能量吸附范围 +80',
        char: '场',
        color: hex('#22d3ee'),
        weight: 8,
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
        canOffer(s) { return s.shieldMax < 1; },
        apply(s) { s.shieldMax = 1; s.shield = 1; },
    },
];

/** 加权随机抽出三个不重复的升级选项 */
export function rollUpgrades(stats: Stats): Upgrade[] {
    const available = UPGRADES.filter(u => !u.canOffer || u.canOffer(stats));
    const picked: Upgrade[] = [];
    const bag = available.slice();

    while (picked.length < 3 && bag.length > 0) {
        const total = bag.reduce((sum, u) => sum + u.weight, 0);
        let roll = Math.random() * total;
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
