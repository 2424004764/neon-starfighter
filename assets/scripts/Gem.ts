import { _decorator, Component, Color, Graphics, UITransform } from 'cc';
import { GameRoot } from './GameRoot';
const { ccclass } = _decorator;

const PICKUP_RADIUS = 34;
const MAGNET_SPEED = 460;
const DRIFT_SPEED = 62; // 与星空同步下坠，宝石不会停在原地

/** 经验宝石 / 金币（波次商店模式货币）：随星空缓缓下坠，靠近磁吸，碰到即拾取 */
@ccclass('Gem')
export class Gem extends Component {
    public value = 1;
    public gold = false;    // true=金币（波次模式） false=经验宝石
    public attract = false; // 被"吸"道具标记：无视距离强制飞向玩家
    private styled: boolean | null = null;   // 当前已绘制类型（true=金币）

    public init(x: number, y: number, value: number, gold = false) {
        this.value = value;
        this.gold = gold;
        this.attract = false;
        this.node.active = true;
        // 钳制在玩家可达范围内，避免边缘宝石够不到
        const reachX = GameRoot.I.halfSize.x - 40;
        if (x > reachX) { x = reachX; }
        if (x < -reachX) { x = -reachX; }
        this.node.setPosition(x, y, 0);
        const sc = value >= 5 ? 1.5 : 1;
        this.node.setScale(sc, sc, 1);
        this.setStyle();
    }

    /** 按类型重绘（同类型复用时不重绘） */
    private setStyle() {
        if (this.styled === this.gold) return;
        this.styled = this.gold;
        const g = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
        if (!g) return;
        g.clear();
        if (this.gold) {
            // 金币：金色六边形 + 亮芯
            g.fillColor = new Color(251, 191, 36, 70);
            g.circle(0, 0, 11);
            g.fill();
            g.fillColor = new Color(251, 191, 36);
            g.moveTo(0, -9); g.lineTo(8, -4.5); g.lineTo(8, 4.5); g.lineTo(0, 9); g.lineTo(-8, 4.5); g.lineTo(-8, -4.5); g.close(); g.fill();
            g.fillColor = new Color(254, 243, 199);
            g.circle(0, 0, 3.5);
            g.fill();
        } else {
            // 经验宝石：青色菱形
            g.fillColor = new Color(103, 232, 249, 70);
            g.circle(0, 0, 10);
            g.fill();
            g.fillColor = new Color(165, 243, 252);
            g.moveTo(0, -8); g.lineTo(5, 0); g.lineTo(0, 8); g.lineTo(-5, 0); g.close(); g.fill();
        }
        if (!this.node.getComponent(UITransform)) {
            this.node.addComponent(UITransform).setContentSize(16, 16);
        }
    }

    update(dt: number) {
        const root = GameRoot.I;
        if (root.state !== 'playing') return;

        const p = root.playerNode.getPosition();
        let g = this.node.getPosition();

        // 拾取
        let dx = p.x - g.x;
        let dy = p.y - g.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < PICKUP_RADIUS) {
            if (this.gold) {
                root.addGold(this.value);
            } else {
                root.addXp(this.value);
            }
            root.recycleGem(this);
            return;
        }

        // 被"吸"标记，或磁力道具生效时全屏吸附，否则按吸附范围磁吸
        const magnetRange = root.stats.magnetRange !== undefined ? root.stats.magnetRange : 150;
        const magnetAll = this.attract || root.effectMagnet > 0;
        if (dist < (magnetAll ? 99999 : magnetRange)) {
            // 磁力道具生效期间进入吸附的宝石打上标记：道具到期后也会继续飞完，不会停在半路
            if (root.effectMagnet > 0) { this.attract = true; }
            const speed = magnetAll ? MAGNET_SPEED + 160 : MAGNET_SPEED;
            const step = Math.min(dist, speed * dt);
            this.node.setPosition(g.x + dx / dist * step, g.y + dy / dist * step, 0);
            return;
        }

        // 无磁吸时随星空缓缓下坠
        g = this.node.getPosition();
        this.node.setPosition(g.x, g.y - DRIFT_SPEED * dt, 0);

        // 坠出屏幕底部则消散
        if (g.y - DRIFT_SPEED * dt < -root.halfSize.y - 30) {
            root.recycleGem(this);
        }
    }
}
