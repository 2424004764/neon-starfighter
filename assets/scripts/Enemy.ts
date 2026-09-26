import { _decorator, Component, Node, Vec3, Color, Graphics, tween, UIOpacity, UITransform } from 'cc';
import { GameRoot } from './GameRoot';
import { SoundFX } from './SoundFX';
const { ccclass } = _decorator;

export type EnemyKind = 'chaser' | 'shooter' | 'speeder' | 'splitter' | 'mini' | 'boss';

/**
 * 《霓虹深空》敌机图鉴：
 * - chaser  猎手   红三角：紧追玩家，接触伤害
 * - shooter 巡卫   紫五边形：保持中距离悬停，发射瞄准光球
 * - speeder 突袭者 粉菱形：锁定一条直线高速冲过屏幕
 * - splitter 分裂体 绿方块：死亡时裂成两只小猎手
 * - mini    小猎手 红小三角：分裂体的碎片，快而脆
 * - boss    典狱官 金六边形：巨型 Boss，螺旋双臂弹幕
 */
@ccclass('Enemy')
export class Enemy extends Component {
    public maxHp = 2;
    public hp = 2;
    public speed = 100;
    public kind: EnemyKind = 'chaser';
    public isElite = false;
    public isBoss = false;
    public dead = false;

    private flashT = 0;
    private baseScale = 1;
    private shootTimer = 0;
    private spiralAngle = 0;
    private spinSpeed = 0;
    private vx = 0;
    private vy = 0;
    private shapeNode: Node = null!;
    private hpBarNode: Node = null!;
    private hpFill: Node = null!;

    public init(scale: number, elapsedSec: number, kind: EnemyKind = 'chaser') {
        this.kind = kind;
        this.isBoss = kind === 'boss';
        this.isElite = scale > 1;
        this.baseScale = scale;
        this.dead = false;
        this.flashT = 0;
        this.spiralAngle = Math.random() * Math.PI * 2;

        // 血量成长：线性 + 二次项，越到后期怪越硬
        const ts = 1 + elapsedSec / 40 + Math.pow(elapsedSec / 90, 2);

        switch (kind) {
            case 'shooter':
                this.maxHp = Math.max(1, Math.round(2.5 * ts));
                this.speed = 85;
                this.spinSpeed = 60;
                this.shootTimer = 1.2 + Math.random() * 1.2;
                break;
            case 'speeder':
                this.maxHp = Math.max(1, Math.round(1.2 * ts));
                this.speed = 250 + Math.random() * 80;
                this.spinSpeed = 0;
                break;
            case 'splitter':
                this.maxHp = Math.max(1, Math.round(3 * ts));
                this.speed = 55;
                this.spinSpeed = 45;
                break;
            case 'mini':
                this.maxHp = Math.max(1, Math.round(ts * 0.6));
                this.speed = 150 + Math.random() * 40;
                this.spinSpeed = 0;
                break;
            case 'boss':
                this.maxHp = Math.round((45 + elapsedSec * 0.8) * (1 + elapsedSec / 240));
                this.speed = 42;
                this.spinSpeed = 36;
                this.shootTimer = 1.2;
                break;
            default:
                this.maxHp = Math.max(1, Math.round(2 * ts * (this.isElite ? 5 : 1)));
                this.speed = (70 + Math.random() * 40 + Math.min(elapsedSec, 70)) * (this.isElite ? 0.75 : 1);
                this.spinSpeed = 0;
        }
        this.hp = this.maxHp;

        this.node.setScale(scale, scale, 1);
        this.node.active = true;
        const op = this.node.getComponent(UIOpacity);
        if (op) { op.opacity = 255; }

        this.buildVisual();
        this.spawnAtEdge();
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

    /** 几何造型（对象池复用时重绘） */
    private buildVisual() {
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

        const roll = Math.random();
        let x = 0, y = 0;
        if (roll < 0.6) {
            x = (Math.random() * 2 - 1) * half.x;
            y = half.y + margin;
        } else if (roll < 0.8) {
            x = -half.x - margin;
            y = Math.random() * half.y;
        } else {
            x = half.x + margin;
            y = Math.random() * half.y;
        }
        this.node.setPosition(x, y, 0);
    }

    update(dt: number) {
        if (GameRoot.I.state !== 'playing' || this.dead) return;

        const p = GameRoot.I.playerNode.getPosition();
        const e = this.node.getPosition();
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // 造型旋转 / 朝向
        if (this.kind === 'chaser' || this.kind === 'mini') {
            this.shapeNode.angle = Math.atan2(-dx, dy) * 180 / Math.PI;
        } else if (this.kind === 'speeder') {
            this.shapeNode.angle = Math.atan2(-this.vx, this.vy) * 180 / Math.PI;
        } else if (this.spinSpeed) {
            this.shapeNode.angle += this.spinSpeed * dt;
        }

        switch (this.kind) {
            case 'speeder':
                this.node.setPosition(e.x + this.vx * dt, e.y + this.vy * dt, 0);
                this.checkFlee();
                break;
            case 'shooter': {
                if (dist > 420) {
                    this.node.setPosition(e.x + dx / dist * this.speed * dt, e.y + dy / dist * this.speed * dt, 0);
                } else if (dist < 300) {
                    this.node.setPosition(e.x - dx / dist * this.speed * 0.5 * dt, e.y - dy / dist * this.speed * 0.5 * dt, 0);
                }
                this.shootTimer -= dt;
                if (this.shootTimer <= 0 && dist < 800) {
                    this.shootTimer = 2.2 + Math.random() * 1.2;
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
                // 螺旋双臂弹幕
                this.shootTimer -= dt;
                if (this.shootTimer <= 0) {
                    this.shootTimer = 0.26;
                    this.spiralAngle += 0.44;
                    GameRoot.I.spawnEnemyBullet(e.x, e.y, this.spiralAngle, 240);
                    GameRoot.I.spawnEnemyBullet(e.x, e.y, this.spiralAngle + Math.PI, 240);
                }
                break;
            }
            default: {
                // chaser / mini / splitter 追击
                this.node.setPosition(e.x + dx / dist * this.speed * dt, e.y + dy / dist * this.speed * dt, 0);
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

    /** 击杀掉落的经验值 */
    public gemValue(): number {
        if (this.isBoss) { return 30; }
        if (this.kind === 'mini') { return 0; }
        if (this.isElite) { return 5; }
        if (this.kind === 'shooter') { return 2; }
        if (this.kind === 'splitter') { return 3; }
        return 1;
    }

    /** 被子弹击中，返回是否死亡 */
    public hurt(damage: number): boolean {
        if (this.dead) { return false; }
        this.hp -= damage;
        this.flashT = 0.08;
        const op = this.node.getComponent(UIOpacity);
        if (op) { op.opacity = 120; }

        // 击退（Boss 不可击退）
        if (!this.isBoss) {
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

        // 分裂体死亡：裂成两只小猎手
        if (this.kind === 'splitter') {
            GameRoot.I.spawnMinis(this.node.getPosition());
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
