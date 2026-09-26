import { _decorator, Component } from 'cc';
import { GameRoot } from './GameRoot';
const { ccclass } = _decorator;

const PICKUP_RADIUS = 34;
const MAGNET_SPEED = 460;
const DRIFT_SPEED = 62; // 与星空同步下坠，宝石不会停在原地

/** 经验宝石：随星空缓缓下坠，靠近磁吸，碰到即拾取 */
@ccclass('Gem')
export class Gem extends Component {
    public value = 1;
    public attract = false; // 被"吸"道具标记：无视距离强制飞向玩家

    public init(x: number, y: number, value: number) {
        this.value = value;
        this.attract = false;
        this.node.active = true;
        // 钳制在玩家可达范围内，避免边缘宝石够不到
        const reachX = GameRoot.I.halfSize.x - 40;
        if (x > reachX) { x = reachX; }
        if (x < -reachX) { x = -reachX; }
        this.node.setPosition(x, y, 0);
        this.node.setScale(value >= 5 ? 1.5 : 1, value >= 5 ? 1.5 : 1, 1);
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
            root.addXp(this.value);
            root.recycleGem(this);
            return;
        }

        // 被"吸"标记，或磁力道具生效时全屏吸附，否则按吸附范围磁吸
        const magnetRange = root.stats.magnetRange !== undefined ? root.stats.magnetRange : 150;
        const magnetAll = this.attract || root.effectMagnet > 0;
        if (dist < (magnetAll ? 99999 : magnetRange)) {
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
