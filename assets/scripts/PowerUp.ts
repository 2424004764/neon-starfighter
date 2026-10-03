import { _decorator, Component, Node, Color, Graphics, Label, UITransform } from 'cc';
import { GameRoot } from './GameRoot';
const { ccclass } = _decorator;

export type PowerUpKind = 'magnet' | 'vacuum' | 'rage' | 'heal1' | 'heal3' | 'crit' | 'invinc' | 'shield' | 'xp2' | 'freezeField';

const KIND_DEFS: Record<PowerUpKind, { char: string; color: Color }> = {
    magnet: { char: '磁', color: new Color(103, 232, 249) },
    vacuum: { char: '吸', color: new Color(167, 139, 250) },
    rage: { char: '狂', color: new Color(244, 63, 94) },
    heal1: { char: '愈', color: new Color(134, 239, 172) },
    heal3: { char: '疗', color: new Color(16, 185, 129) },
    crit: { char: '暴', color: new Color(255, 138, 61) },
    invinc: { char: '无', color: new Color(255, 223, 128) },
    shield: { char: '盾', color: new Color(148, 163, 184) },
    xp2: { char: '倍', color: new Color(251, 191, 36) },
    freezeField: { char: '冻', color: new Color(125, 211, 252) },
};

const FALL_SPEED = 95;

/**
 * 随机道具：击毁敌机有概率掉落，随星空缓缓下坠
 * 触碰即生效：磁力 / 狂暴 / 医疗 / 护盾充能 / 双倍经验
 */
@ccclass('PowerUp')
export class PowerUp extends Component {
    public kind: PowerUpKind = 'magnet';
    private spin = 0;

    public init(kind: PowerUpKind, x: number, y: number) {
        this.kind = kind;
        this.spin = Math.random() * Math.PI * 2;
        this.node.active = true;
        // 钳制在玩家可达范围内，避免掉在边缘外捡不到
        const reachX = GameRoot.I.halfSize.x - 40;
        if (x > reachX) { x = reachX; }
        if (x < -reachX) { x = -reachX; }
        this.node.setPosition(x, y, 0);

        // 绘制外观：旋转圆角方块 + 道具字
        if (!this.node.getChildByName('box')) {
            const box = new Node('box');
            box.addComponent(UITransform).setContentSize(40, 40);
            const g = box.addComponent(Graphics);
            g.fillColor = new Color(15, 18, 32);
            g.roundRect(-19, -19, 38, 38, 9);
            g.fill();
            const label = new Node('char');
            label.addComponent(UITransform).setContentSize(40, 40);
            const l = label.addComponent(Label);
            l.fontSize = 26;
            l.lineHeight = 30;
            l.color = Color.WHITE;
            l.string = '';
            box.addChild(label);
            this.node.addChild(box);
        }
        const box = this.node.getChildByName('box')!;
        const g = box.getComponent(Graphics)!;
        const def = KIND_DEFS[this.kind];
        g.clear();
        g.strokeColor = def.color;
        g.lineWidth = 3;
        g.roundRect(-19, -19, 38, 38, 9);
        g.stroke();
        g.fillColor = new Color(def.color.r, def.color.g, def.color.b, 40);
        g.roundRect(-19, -19, 38, 38, 9);
        g.fill();
        box.getChildByName('char')!.getComponent(Label)!.string = def.char;
    }

    update(dt: number) {
        const root = GameRoot.I;
        if (root.state !== 'playing') return;

        const p = this.node.getPosition();
        const y = p.y - FALL_SPEED * dt;
        this.spin += 1.6 * dt;
        this.node.getChildByName('box')!.angle = Math.sin(this.spin) * 14;
        this.node.setPosition(p.x, y, 0);

        const half = root.halfSize;
        if (y < -half.y - 40) {
            root.recyclePowerUp(this);
            return;
        }

        // 拾取判定
        const pp = root.playerNode.getPosition();
        const dx = pp.x - p.x;
        const dy = pp.y - y;
        if (dx * dx + dy * dy < 46 * 46) {
            root.applyPowerUp(this.kind);
            root.recyclePowerUp(this);
        }
    }
}
