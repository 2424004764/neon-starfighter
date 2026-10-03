import { _decorator, Component, Color, Graphics } from 'cc';
import { GameRoot } from './GameRoot';
import { SoundFX } from './SoundFX';
import { Enemy } from './Enemy';
const { ccclass } = _decorator;

const TURN_RATE = 5.2;     // 转向速率（弧度/秒）
const BASE_SPEED = 300;
const ACCEL = 460;
const MAX_SPEED = 800;
const LIFETIME = 6;

/**
 * 跟踪导弹：发射后自动锁定最近的敌机
 * 带转向速率限制的追踪弹，命中造成伤害
 */
@ccclass('Missile')
export class Missile extends Component {
    public damage = 2;
    private angle = 0;          // 航向角（0=正上方，与子弹一致）
    private speed = BASE_SPEED;
    private life = LIFETIME;
    private target: Enemy | null = null;
    private drawn = false;     // 外观无变化，池化复用不重绘

    public init(target: Enemy | null, damage: number, initialAngle: number) {
        this.target = target;
        this.damage = damage;
        this.angle = initialAngle;
        this.speed = BASE_SPEED;
        this.life = LIFETIME;
        this.node.active = true;
        this.node.angle = initialAngle * 180 / Math.PI;
        this.draw();
    }

    private draw() {
        if (this.drawn) return;
        this.drawn = true;
        const g = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
        g.clear();
        g.fillColor = new Color(251, 146, 60, 70);
        g.circle(0, 0, 9);
        g.fill();
        g.fillColor = new Color(253, 224, 71);
        g.moveTo(0, -10); g.lineTo(4.5, 8); g.lineTo(-4.5, 8); g.close(); g.fill();
        g.fillColor = Color.WHITE;
        g.circle(0, 2, 2.5);
        g.fill();
    }

    /** 目标死亡或失联时重新锁定最近的敌机 */
    private acquireTarget(): Enemy | null {
        if (this.target && !this.target.dead && this.target.node.activeInHierarchy) {
            return this.target;
        }
        this.target = GameRoot.I.findNearestEnemy(this.node.getPosition());
        return this.target;
    }

    update(dt: number) {
        const root = GameRoot.I;
        if (root.state !== 'playing') return;

        this.life -= dt;
        if (this.life <= 0) {
            root.recycleMissile(this);
            return;
        }

        const t = this.acquireTarget();
        if (t) {
            const tp = t.node.getPosition();
            const mp = this.node.getPosition();
            const desired = Math.atan2(tp.x - mp.x, tp.y - mp.y);
            // 带角度环绕的最短转向
            let diff = desired - this.angle;
            while (diff > Math.PI) { diff -= Math.PI * 2; }
            while (diff < -Math.PI) { diff += Math.PI * 2; }
            const maxTurn = TURN_RATE * dt;
            this.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
            this.node.angle = this.angle * 180 / Math.PI;

            // 命中判定
            const r = 30 * t.node.scale.x + 10;
            const dx = tp.x - mp.x;
            const dy = tp.y - mp.y;
            if (dx * dx + dy * dy < r * r) {
                GameRoot.I.dealDamage(t, this.damage);
                SoundFX.I.hit();
                root.recycleMissile(this);
                return;
            }
        }

        this.speed = Math.min(MAX_SPEED, this.speed + ACCEL * dt);
        const mp = this.node.getPosition();
        const nx = mp.x + Math.sin(this.angle) * this.speed * dt;
        const ny = mp.y + Math.cos(this.angle) * this.speed * dt;
        this.node.setPosition(nx, ny, 0);

        const half = root.halfSize;
        if (nx < -half.x - 80 || nx > half.x + 80 || ny < -half.y - 80 || ny > half.y + 80) {
            root.recycleMissile(this);
        }
    }
}
