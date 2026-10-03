import { _decorator, Component, Color, Graphics } from 'cc';
import { GameRoot } from './GameRoot';
const { ccclass } = _decorator;

/**
 * 子弹：直线飞行，飞出屏幕回收
 * hostile=false 玩家电矢（青色光矢）| hostile=true 敌方光球（品红光球）
 */
@ccclass('Bullet')
export class Bullet extends Component {
    public vx = 0;
    public vy = 600;
    public damage = 1;
    public hostile = false;
    private styled: 'player' | 'enemy' | null = null;   // 当前已绘制样式

    /**
     * @param angle 发射角度（弧度），0 表示正上方
     */
    public init(angle: number, speed: number, damage: number, hostile = false) {
        this.vx = Math.sin(angle) * speed;
        this.vy = Math.cos(angle) * speed;
        this.damage = damage;
        this.hostile = hostile;
        this.node.active = true;
        this.setStyle(hostile ? 'enemy' : 'player');
    }

    /** 按阵营绘制外观（同阵营复用时不重绘） */
    public setStyle(style: 'player' | 'enemy') {
        if (this.styled === style) return;
        this.styled = style;
        const g = this.node.getComponent(Graphics);
        if (!g) return;
        g.clear();
        if (style === 'player') {
            // 青色光矢：外发光 + 亮芯
            g.fillColor = new Color(34, 211, 238, 70);
            g.circle(0, 0, 9);
            g.fill();
            g.fillColor = new Color(165, 243, 252);
            g.roundRect(-3, -13, 6, 26, 3);
            g.fill();
        } else {
            // 品红光球：光晕 + 球体
            g.fillColor = new Color(244, 114, 182, 70);
            g.circle(0, 0, 12);
            g.fill();
            g.fillColor = new Color(251, 113, 133);
            g.circle(0, 0, 6);
            g.fill();
        }
    }

    update(dt: number) {
        if (GameRoot.I.state !== 'playing') return;

        const p = this.node.getPosition();
        this.node.setPosition(p.x + this.vx * dt, p.y + this.vy * dt, 0);

        const half = GameRoot.I.halfSize;
        const m = 60;
        if (p.x < -half.x - m || p.x > half.x + m || p.y < -half.y - m || p.y > half.y + m) {
            GameRoot.I.recycleBullet(this);
        }
    }
}
