import { _decorator, Component, Node, Vec3, Color, Graphics, tween, UIOpacity, UITransform } from 'cc';
import { GameRoot } from './GameRoot';
import { SoundFX } from './SoundFX';
const { ccclass } = _decorator;

export type EnemyKind = 'chaser' | 'shooter' | 'speeder' | 'splitter' | 'mini' | 'boss'
    | 'bomber' | 'turret' | 'healer';

/** 精英词条：任意普通敌机可携带（Boss/炮台除外） */
export type EnemyAffix = '' | 'swift' | 'split' | 'barrage' | 'rich';

export const AFFIX_INFO: Record<Exclude<EnemyAffix, ''>, { name: string; color: string; desc: string }> = {
    swift: { name: '疾风', color: '#38bdf8', desc: '移动速度大幅提升' },
    split: { name: '分裂', color: '#4ade80', desc: '死亡时裂成两只小猎手' },
    barrage: { name: '弹幕', color: '#fb7185', desc: '死亡时放出环形弹幕' },
    rich: { name: '贪婪', color: '#fbbf24', desc: '双倍掉落，必掉道具概率大增' },
};

/**
 * 《霓虹深空》敌机图鉴：
 * - chaser  猎手   红三角：紧追玩家，接触伤害
 * - shooter 巡卫   紫五边形：保持中距离悬停，发射瞄准光球
 * - speeder 突袭者 粉菱形：锁定一条直线高速冲过屏幕
 * - splitter 分裂体 绿方块：死亡时裂成两只小猎手
 * - mini    小猎手 红小三角：分裂体的碎片，快而脆
 * - boss    典狱官 金六边形：巨型 Boss，螺旋双臂弹幕
 * - bomber  自爆蜂 橙圆蜂：贴近后点燃引信，1 秒后自爆
 * - turret  哨戒炮  灰八边：固定悬浮缓慢转向，发射扇形弹幕
 * - healer  治愈者 白绿十字：悬停远处，周期治疗周围敌机
 */
@ccclass('Enemy')
export class Enemy extends Component {
    public maxHp = 2;
    public hp = 2;
    public speed = 100;
    public kind: EnemyKind = 'chaser';
    public affix: EnemyAffix = '';
    public isElite = false;
    public isBoss = false;
    public dead = false;

    /** 冰缓剩余时间与移速倍率（冰冻弹/冰冻力场） */
    public slowT = 0;
    public slowFactor = 1;

    private flashT = 0;
    private baseScale = 1;
    private shootTimer = 0;
    private spiralAngle = 0;
    private spinSpeed = 0;
    private vx = 0;
    private vy = 0;
    private fuseT = -1;        // 自爆蜂引信（-1 未点燃）
    private lifeT = 0;         // 炮台寿命
    private healT = 0;         // 治疗脉冲计时
    private turretAngle = 0;   // 炮台炮管朝向（0=正上方）
    private enrageT = 25;      // Boss 狂暴倒计时
    private enraged = false;   // Boss 是否已狂暴
    private builtKey = '';     // 已绘制外观的键（种类|词条）
    private shapeNode: Node = null!;
    private hpBarNode: Node = null!;
    private hpFill: Node = null!;
    private affixNode: Node = null!;
    private iceNode: Node = null!;

    public init(scale: number, elapsedSec: number, kind: EnemyKind = 'chaser', affix: EnemyAffix = '') {
        this.kind = kind;
        this.isBoss = kind === 'boss';
        this.affix = (kind === 'boss' || kind === 'turret' || kind === 'mini') ? '' : affix;
        this.isElite = scale > 1 || this.affix !== '';
        this.baseScale = scale;
        this.dead = false;
        this.flashT = 0;
        this.spiralAngle = GameRoot.I.rand() * Math.PI * 2;
        this.slowT = 0;
        this.slowFactor = 1;
        this.fuseT = -1;
        this.lifeT = 0;
        this.healT = 1.2;
        this.enrageT = 25;
        this.enraged = false;

        // 血量成长：线性 + 二次项，越到后期怪越硬
        const ts = 1 + elapsedSec / 40 + Math.pow(elapsedSec / 90, 2);

        switch (kind) {
            case 'shooter':
                this.maxHp = Math.max(1, Math.round(2.5 * ts));
                this.speed = 85;
                this.spinSpeed = 60;
                this.shootTimer = 1.2 + GameRoot.I.rand() * 1.2;
                break;
            case 'speeder':
                this.maxHp = Math.max(1, Math.round(1.2 * ts));
                this.speed = 250 + GameRoot.I.rand() * 80;
                this.spinSpeed = 0;
                break;
            case 'splitter':
                this.maxHp = Math.max(1, Math.round(3 * ts));
                this.speed = 55;
                this.spinSpeed = 45;
                break;
            case 'mini':
                this.maxHp = Math.max(1, Math.round(ts * 0.6));
                this.speed = 150 + GameRoot.I.rand() * 40;
                this.spinSpeed = 0;
                break;
            case 'boss':
                this.maxHp = Math.round((45 + elapsedSec * 0.8) * (1 + elapsedSec / 240));
                this.speed = 42;
                this.spinSpeed = 36;
                this.shootTimer = 1.2;
                break;
            case 'bomber':
                this.maxHp = Math.max(1, Math.round(1.6 * ts));
                this.speed = 130 + GameRoot.I.rand() * 40 + Math.min(elapsedSec, 60);
                this.spinSpeed = 0;
                break;
            case 'turret':
                this.maxHp = Math.max(6, Math.round(7 * ts));
                this.speed = 0;
                this.spinSpeed = 0;
                this.lifeT = 26;
                this.shootTimer = 1.6;
                this.turretAngle = GameRoot.I.rand() * Math.PI * 2;
                break;
            case 'healer':
                this.maxHp = Math.max(2, Math.round(4 * ts));
                this.speed = 95;
                this.spinSpeed = 30;
                this.healT = 2.2;
                break;
            default:
                this.maxHp = Math.max(1, Math.round(2 * ts * (this.isElite ? 5 : 1)));
                this.speed = (70 + GameRoot.I.rand() * 40 + Math.min(elapsedSec, 70)) * (this.isElite ? 0.75 : 1);
                this.spinSpeed = 0;
        }

        // 词条加成：血量大幅上调 + 各自特效
        if (this.affix) {
            this.maxHp = Math.max(this.maxHp, Math.round(this.maxHp * 2.2));
            if (this.affix === 'swift') { this.speed *= 1.55; }
            this.baseScale = Math.max(scale, 1.22);
        }
        // 威胁等级增幅：血量指数倍增 + 移速提升（后期持续施压）
        this.maxHp = Math.max(1, Math.round(this.maxHp * GameRoot.I.threatHpMul()));
        this.speed *= GameRoot.I.threatSpeedMul();
        this.hp = this.maxHp;

        this.node.setScale(this.baseScale, this.baseScale, 1);
        this.node.active = true;
        const op = this.node.getComponent(UIOpacity);
        if (op) { op.opacity = 255; }

        this.buildVisual();
        if (kind === 'turret') {
            this.spawnTurretPos();
        } else {
            this.spawnAtEdge();
        }
        if (kind === 'speeder') {
            const p = GameRoot.I.playerNode.getPosition();
            const e = this.node.getPosition();
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.vx = dx / dist * this.speed;
            this.vy = dy / dist * this.speed;
        }
    }

    /** 几何造型（外观只由 种类|词条 决定，池化复用键未变时跳过 Graphics 重建） */
    private buildVisual() {
        const visKey = this.kind + '|' + this.affix;
        if (visKey === this.builtKey) {
            // 复用同款外观：只复位动态状态
            if (this.hpBarNode) {
                this.hpBarNode.setScale(1, 1, 1);
                this.hpFill.setScale(1, 1, 1);
                this.hpBarNode.active = false;
            }
            if (this.iceNode) { this.iceNode.active = false; }
            if (this.affixNode) { this.affixNode.active = this.affix !== ''; }
            return;
        }
        this.builtKey = visKey;
        if (!this.shapeNode) {
            this.shapeNode = new Node('shape');
            this.node.addChild(this.shapeNode);
            this.shapeNode.addComponent(UITransform).setContentSize(60, 60);
        }
        const g = this.shapeNode.getComponent(Graphics) || this.shapeNode.addComponent(Graphics);
        g.clear();
        const kind = this.kind;

        if (kind === 'chaser' || kind === 'mini' || kind === 'speeder') {
            const c = kind === 'speeder' ? new Color(244, 114, 182) : new Color(244, 63, 94);
            g.fillColor = new Color(c.r, c.g, c.b, 70);
            g.circle(0, 0, kind === 'speeder' ? 26 : 24);
            g.fill();
            g.fillColor = c;
            if (kind === 'speeder') {
                // 菱形
                g.moveTo(0, -26); g.lineTo(13, 0); g.lineTo(0, 26); g.lineTo(-13, 0); g.close(); g.fill();
            } else {
                // 三角
                g.moveTo(0, -22); g.lineTo(19, 14); g.lineTo(-19, 14); g.close(); g.fill();
            }
            g.fillColor = Color.WHITE;
            g.circle(0, 2, 4);
            g.fill();
        } else if (kind === 'shooter') {
            g.fillColor = new Color(167, 139, 250, 70);
            g.circle(0, 0, 26);
            g.fill();
            g.fillColor = new Color(167, 139, 250);
            this.polygon(g, 5, 22);
            g.fill();
            g.fillColor = new Color(237, 233, 254);
            g.circle(0, 0, 6);
            g.fill();
        } else if (kind === 'splitter') {
            g.fillColor = new Color(52, 211, 153, 70);
            g.circle(0, 0, 27);
            g.fill();
            g.fillColor = new Color(52, 211, 153);
            g.roundRect(-19, -19, 38, 38, 6);
            g.fill();
            g.strokeColor = new Color(6, 78, 59);
            g.lineWidth = 4;
            g.moveTo(-19, 0); g.lineTo(19, 0); g.moveTo(0, -19); g.lineTo(0, 19);
            g.stroke();
        } else if (kind === 'bomber') {
            // 自爆蜂：琥珀色圆蜂 + 双条纹 + 小翅
            g.fillColor = new Color(251, 146, 60, 70);
            g.circle(0, 0, 25);
            g.fill();
            g.fillColor = new Color(217, 119, 6);
            g.moveTo(-22, -6); g.lineTo(-30, -16); g.lineTo(-14, -14); g.close(); g.fill();
            g.moveTo(22, -6); g.lineTo(30, -16); g.lineTo(14, -14); g.close(); g.fill();
            g.fillColor = new Color(251, 191, 36);
            g.circle(0, 0, 18);
            g.fill();
            g.fillColor = new Color(120, 53, 15);
            g.roundRect(-18, -3, 36, 6, 3); g.fill();
            g.roundRect(-14, 7, 28, 5, 2.5); g.fill();
            g.fillColor = Color.WHITE;
            g.circle(-6, -8, 3); g.circle(6, -8, 3); g.fill();
        } else if (kind === 'turret') {
            // 哨戒炮：灰蓝八边形基座 + 双炮管
            g.fillColor = new Color(100, 116, 139, 60);
            g.circle(0, 0, 30);
            g.fill();
            g.fillColor = new Color(71, 85, 105);
            this.polygon(g, 8, 26);
            g.fill();
            g.strokeColor = new Color(148, 163, 184);
            g.lineWidth = 3;
            this.polygon(g, 8, 26);
            g.stroke();
            g.fillColor = new Color(203, 213, 225);
            g.roundRect(-9, 0, 6, 30, 3); g.fill();
            g.roundRect(3, 0, 6, 30, 3); g.fill();
            g.fillColor = new Color(226, 232, 240);
            g.circle(0, 0, 9);
            g.fill();
            g.fillColor = new Color(244, 63, 94);
            g.circle(0, 0, 4);
            g.fill();
        } else if (kind === 'healer') {
            // 治愈者：白绿十字 + 光环
            g.fillColor = new Color(52, 211, 153, 55);
            g.circle(0, 0, 28);
            g.fill();
            g.fillColor = new Color(167, 243, 208);
            g.roundRect(-7, -20, 14, 40, 6); g.fill();
            g.roundRect(-20, -7, 40, 14, 6); g.fill();
            g.strokeColor = new Color(16, 185, 129);
            g.lineWidth = 3;
            g.circle(0, 0, 21);
            g.stroke();
        } else if (this.isBoss) {
            g.fillColor = new Color(251, 191, 36, 60);
            g.circle(0, 0, 70);
            g.fill();
            g.fillColor = new Color(251, 191, 36);
            this.polygon(g, 6, 62);
            g.fill();
            g.strokeColor = new Color(120, 53, 15);
            g.lineWidth = 5;
            g.circle(0, 0, 30);
            g.stroke();
            g.fillColor = new Color(254, 243, 199);
            g.circle(0, 0, 14);
            g.fill();
        }

        // 血条（Boss 用顶部大血条，自身不画）
        if (kind !== 'boss') {
            if (!this.hpBarNode) {
                this.hpBarNode = new Node('hpbar');
                this.node.addChild(this.hpBarNode);
                const bgG = this.hpBarNode.addComponent(Graphics);
                bgG.fillColor = new Color(10, 10, 20, 160);
                bgG.roundRect(-23, -36, 46, 5, 2.5);
                bgG.fill();
                this.hpFill = new Node('hpfill');
                this.hpBarNode.addChild(this.hpFill);
                const fG = this.hpFill.addComponent(Graphics);
                fG.fillColor = new Color(244, 63, 94);
                fG.roundRect(-21, -35, 42, 3, 1.5);
                fG.fill();
            }
            this.hpBarNode.setScale(1, 1, 1);
            this.hpFill.setScale(1, 1, 1);
            this.hpBarNode.active = false;
        }

        // 词条光环：旋转发光描边
        if (this.affix) {
            if (!this.affixNode) {
                this.affixNode = new Node('affixRing');
                this.node.addChild(this.affixNode);
            }
            const ag = this.affixNode.getComponent(Graphics) || this.affixNode.addComponent(Graphics);
            ag.clear();
            const col = new Color();
            col.fromHEX(AFFIX_INFO[this.affix as Exclude<EnemyAffix, ''>].color);
            ag.strokeColor = new Color(col.r, col.g, col.b, 200);
            ag.lineWidth = 4;
            ag.circle(0, 0, 33);
            ag.stroke();
            ag.strokeColor = new Color(col.r, col.g, col.b, 80);
            ag.lineWidth = 9;
            ag.circle(0, 0, 37);
            ag.stroke();
            // 光环缺口造型（四段弧），旋转时有机械感
            for (let i = 0; i < 4; i++) {
                ag.strokeColor = new Color(col.r, col.g, col.b, 230);
                ag.lineWidth = 5;
                ag.moveTo(Math.sin(i * Math.PI / 2) * 44, Math.cos(i * Math.PI / 2) * 44);
                ag.lineTo(Math.sin(i * Math.PI / 2 + 0.35) * 44, Math.cos(i * Math.PI / 2 + 0.35) * 44);
                ag.stroke();
            }
        } else if (this.affixNode) {
            this.affixNode.active = false;
        }

        // 冰缓光环（懒创建，被冰缓时显示）
        if (!this.iceNode) {
            this.iceNode = new Node('iceRing');
            this.node.addChild(this.iceNode);
            const ig = this.iceNode.addComponent(Graphics);
            ig.strokeColor = new Color(125, 211, 252, 220);
            ig.lineWidth = 3;
            ig.circle(0, 0, 31);
            ig.stroke();
            ig.strokeColor = new Color(224, 242, 254, 120);
            ig.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const a = i / 6 * Math.PI * 2;
                ig.moveTo(Math.sin(a) * 22, Math.cos(a) * 22);
                ig.lineTo(Math.sin(a) * 30, Math.cos(a) * 30);
                ig.stroke();
            }
        }
        this.iceNode.active = false;
        if (this.affixNode) { this.affixNode.active = this.affix !== ''; }
    }

    private polygon(g: Graphics, sides: number, r: number) {
        g.moveTo(0, -r);
        for (let i = 1; i < sides; i++) {
            const a = (i / sides) * Math.PI * 2;
            g.lineTo(Math.sin(a) * r, -Math.cos(a) * r);
        }
        g.close();
    }

    /** 刷出位置：不从下方出现——上边 60%，左右两侧上半段各 20%；Boss 固定顶部中央 */
    private spawnAtEdge() {
        const half = GameRoot.I.halfSize;
        const margin = 60;

        if (this.isBoss) {
            this.node.setPosition(0, half.y + margin, 0);
            return;
        }

        const roll = GameRoot.I.rand();
        let x = 0, y = 0;
        if (roll < 0.6) {
            x = (GameRoot.I.rand() * 2 - 1) * half.x;
            y = half.y + margin;
        } else if (roll < 0.8) {
            x = -half.x - margin;
            y = GameRoot.I.rand() * half.y;
        } else {
            x = half.x + margin;
            y = GameRoot.I.rand() * half.y;
        }
        this.node.setPosition(x, y, 0);
    }

    /** 哨戒炮：直接在屏幕上半区现形（不进不退，作为走位障碍） */
    private spawnTurretPos() {
        const half = GameRoot.I.halfSize;
        const x = (GameRoot.I.rand() * 2 - 1) * (half.x - 90);
        const y = half.y * 0.25 + GameRoot.I.rand() * (half.y * 0.75 - 80);
        this.node.setPosition(x, y, 0);
    }

    /** 冰缓：取更慢的倍率，刷新持续时间 */
    public applySlow(factor: number, dur: number) {
        if (this.dead) return;
        this.slowFactor = Math.min(this.slowT > 0 ? this.slowFactor : 1, factor);
        this.slowT = Math.max(this.slowT, dur);
    }

    /** 治疗者脉冲回复 */
    public heal(amount: number) {
        if (this.dead) return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }

    update(dt: number) {
        if (GameRoot.I.state !== 'playing' || this.dead) return;

        const p = GameRoot.I.playerNode.getPosition();
        const e = this.node.getPosition();
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // 冰缓计时与视觉
        if (this.slowT > 0) {
            this.slowT -= dt;
            if (this.slowT <= 0) { this.slowFactor = 1; }
        }
        if (this.iceNode) {
            this.iceNode.active = this.slowT > 0;
            if (this.iceNode.active) { this.iceNode.angle += 90 * dt; }
        }
        if (this.affixNode && this.affix) { this.affixNode.angle -= 70 * dt; }

        const sf = this.slowT > 0 ? this.slowFactor : 1;

        // 造型旋转 / 朝向
        if (this.kind === 'chaser' || this.kind === 'mini') {
            this.shapeNode.angle = Math.atan2(-dx, dy) * 180 / Math.PI;
        } else if (this.kind === 'speeder') {
            this.shapeNode.angle = Math.atan2(-this.vx, this.vy) * 180 / Math.PI;
        } else if (this.kind === 'bomber') {
            this.shapeNode.angle = Math.atan2(-dx, dy) * 180 / Math.PI;
        } else if (this.spinSpeed) {
            this.shapeNode.angle += this.spinSpeed * dt * sf;
        }

        switch (this.kind) {
            case 'speeder':
                this.node.setPosition(e.x + this.vx * sf * dt, e.y + this.vy * sf * dt, 0);
                this.checkFlee();
                break;
            case 'bomber': {
                // 追击；贴近点燃引信，引信期间减速逼近，归零自爆
                const chase = this.fuseT >= 0 ? 0.25 : 1;
                this.node.setPosition(e.x + dx / dist * this.speed * chase * sf * dt, e.y + dy / dist * this.speed * chase * sf * dt, 0);
                if (this.fuseT < 0 && dist < 95) {
                    this.fuseT = 1.0;
                    SoundFX.I.fuse();
                }
                if (this.fuseT >= 0) {
                    this.fuseT -= dt;
                    // 引信闪烁：越接近爆炸越快
                    const op = this.node.getComponent(UIOpacity);
                    if (op) {
                        const f = Math.max(this.fuseT, 0);
                        op.opacity = Math.floor(f * 14) % 2 === 0 ? 255 : 90;
                    }
                    if (this.fuseT <= 0) {
                        this.explodeSelf();
                        return;
                    }
                }
                break;
            }
            case 'turret': {
                // 悬浮不动，炮管缓慢转向玩家，周期扇形弹幕，寿命归零自动离场
                const desired = Math.atan2(dx, dy);
                let diff = desired - this.turretAngle;
                while (diff > Math.PI) { diff -= Math.PI * 2; }
                while (diff < -Math.PI) { diff += Math.PI * 2; }
                this.turretAngle += Math.max(-0.55 * dt, Math.min(0.55 * dt, diff));
                this.shapeNode.angle = -this.turretAngle * 180 / Math.PI;
                this.shootTimer -= dt;
                if (this.shootTimer <= 0) {
                    this.shootTimer = 2.6;
                    for (let i = -2; i <= 2; i++) {
                        GameRoot.I.spawnEnemyBullet(e.x, e.y, this.turretAngle + i * 0.21, 215);
                    }
                    SoundFX.I.enemyShoot();
                }
                this.lifeT -= dt;
                if (this.lifeT <= 0) {
                    this.dead = true;
                    GameRoot.I.recycleEnemy(this);
                    return;
                }
                break;
            }
            case 'healer': {
                // 悬停远处：太远靠近、太近后撤，周期治疗脉冲
                if (dist > 520) {
                    this.node.setPosition(e.x + dx / dist * this.speed * sf * dt, e.y + dy / dist * this.speed * sf * dt, 0);
                } else if (dist < 380) {
                    this.node.setPosition(e.x - dx / dist * this.speed * 0.6 * sf * dt, e.y - dy / dist * this.speed * 0.6 * sf * dt, 0);
                }
                this.healT -= dt;
                if (this.healT <= 0) {
                    this.healT = 2.4;
                    GameRoot.I.healPulse(this.node.getPosition());
                }
                break;
            }
            case 'shooter': {
                if (dist > 420) {
                    this.node.setPosition(e.x + dx / dist * this.speed * sf * dt, e.y + dy / dist * this.speed * sf * dt, 0);
                } else if (dist < 300) {
                    this.node.setPosition(e.x - dx / dist * this.speed * 0.5 * sf * dt, e.y - dy / dist * this.speed * 0.5 * sf * dt, 0);
                }
                this.shootTimer -= dt;
                if (this.shootTimer <= 0 && dist < 800) {
                    this.shootTimer = 2.2 + GameRoot.I.rand() * 1.2;
                    GameRoot.I.spawnEnemyBullet(e.x, e.y, Math.atan2(dx, dy), 330);
                    SoundFX.I.enemyShoot();
                }
                break;
            }
            case 'boss': {
                // 缓慢逼近，贴近后悬停
                if (dist > 260) {
                    this.node.setPosition(e.x + dx / dist * this.speed * dt, e.y + dy / dist * this.speed * dt, 0);
                }
                // 狂暴：25 秒内未被击杀则火力全开（对后期成型的 DPS 是硬检验）
                if (!this.enraged) {
                    this.enrageT -= dt;
                    if (this.enrageT <= 0) {
                        this.enraged = true;
                        this.speed *= 1.5;
                        SoundFX.I.bossAlarm();
                        GameRoot.I.spawnRingFx(e.x, e.y, 150, new Color(244, 63, 94, 220), 6, 0.5);
                    }
                }
                // 螺旋弹幕（狂暴后四臂 + 更快）
                this.shootTimer -= dt;
                if (this.shootTimer <= 0) {
                    this.shootTimer = this.enraged ? 0.18 : 0.26;
                    this.spiralAngle += 0.44;
                    const arms = this.enraged ? 4 : 2;
                    for (let i = 0; i < arms; i++) {
                        GameRoot.I.spawnEnemyBullet(e.x, e.y, this.spiralAngle + i * Math.PI * 2 / arms, 240);
                    }
                }
                break;
            }
            default: {
                // chaser / mini / splitter 追击
                this.node.setPosition(e.x + dx / dist * this.speed * sf * dt, e.y + dy / dist * this.speed * sf * dt, 0);
            }
        }

        // 受击闪烁
        if (this.flashT > 0) {
            this.flashT -= dt;
            const op = this.node.getComponent(UIOpacity);
            if (op) { op.opacity = this.flashT > 0 ? 120 : 255; }
        }

        // 血条
        if (this.hpBarNode) {
            const show = this.hp < this.maxHp;
            this.hpBarNode.active = show;
            if (show) {
                this.hpFill.setScale(Math.max(this.hp / this.maxHp, 0.001), 1, 1);
            }
        }
    }

    /** 自爆蜂引爆：对玩家范围伤害，自身无掉落 */
    private explodeSelf() {
        this.dead = true;
        const pos = this.node.getPosition();
        GameRoot.I.bomberExplode(pos);
        const op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        tween(this.node)
            .to(0.15, { scale: new Vec3(this.baseScale * 1.4, this.baseScale * 1.4, 1) })
            .call(() => { GameRoot.I.recycleEnemy(this); })
            .start();
        tween(op).to(0.15, { opacity: 0 }).start();
    }

    /** 冲锋机冲出屏幕后静默回收 */
    private checkFlee() {
        const half = GameRoot.I.halfSize;
        const e = this.node.getPosition();
        const m = 200;
        if (e.x < -half.x - m || e.x > half.x + m || e.y < -half.y - m || e.y > half.y + m) {
            this.dead = true;
            GameRoot.I.recycleEnemy(this);
        }
    }

    /** 击杀掉落的经验值/金币价值 */
    public gemValue(): number {
        let v = 1;
        if (this.isBoss) { v = 30; }
        else if (this.kind === 'mini') { v = 0; }
        else if (this.kind === 'shooter') { v = 2; }
        else if (this.kind === 'splitter') { v = 3; }
        else if (this.kind === 'bomber') { v = 2; }
        else if (this.kind === 'turret') { v = 4; }
        else if (this.kind === 'healer') { v = 3; }
        else if (this.isElite) { v = 5; }
        if (this.affix) { v = Math.max(v, 4) + 2; }
        if (this.affix === 'rich') { v *= 2; }
        return v;
    }

    /** 被子弹击中，返回是否死亡 */
    public hurt(damage: number): boolean {
        if (this.dead) { return false; }
        this.hp -= damage;
        this.flashT = 0.08;
        const op = this.node.getComponent(UIOpacity);
        if (op) { op.opacity = 120; }

        // 击退（Boss/炮台不可击退）
        if (!this.isBoss && this.kind !== 'turret') {
            const p = GameRoot.I.playerNode.getPosition();
            const e = this.node.getPosition();
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.node.setPosition(e.x + dx / dist * 8, e.y + dy / dist * 8, 0);
        }

        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }

    private die() {
        this.dead = true;
        GameRoot.I.onEnemyKilled(this);

        // 分裂体 / 分裂词条死亡：裂成两只小猎手
        if (this.kind === 'splitter' || this.affix === 'split') {
            GameRoot.I.spawnMinis(this.node.getPosition());
        }
        // 弹幕词条：死亡放出环形弹幕
        if (this.affix === 'barrage') {
            GameRoot.I.enemyDeathBarrage(this.node.getPosition());
        }

        const op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        tween(this.node)
            .to(0.15, { scale: new Vec3(this.baseScale * 0.3, this.baseScale * 0.3, 1) })
            .call(() => { GameRoot.I.recycleEnemy(this); })
            .start();
        tween(op)
            .to(0.15, { opacity: 0 })
            .start();
    }
}
