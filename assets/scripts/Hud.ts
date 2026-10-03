import { _decorator, Component, Node, Color, Graphics, Label, UITransform } from 'cc';
import { GameRoot } from './GameRoot';
import { Player } from './Player';
const { ccclass } = _decorator;

interface BuffChip {
    root: Node;
    bar: Node;
    box: Graphics;
}

/** HUD：血条 / 经验条 / 等级 / 时间 / 击杀数 / 金币·波次 / 道具状态栏（含冲刺冷却） */
@ccclass('Hud')
export class Hud extends Component {
    private hpFill: Graphics = null!;
    private hpLabel: Label = null!;
    private xpFill: Node = null!;
    private xpBarBg: Node = null!;
    private lvLabel: Label = null!;
    private timeLabel: Label = null!;
    private killLabel: Label = null!;
    private atkLabel: Label = null!;
    private modeTag: Label = null!;
    private threatLabel: Label = null!;
    private waveLabel: Label = null!;
    private bossRoot: Node = null!;
    private bossFill: Node = null!;
    private buffChips: Map<string, BuffChip> = new Map();
    private buffRow: Node = null!;
    private hudRoot: Node = null!;
    private hpBarW = 300;
    private xpBarW = 720;

    private static BUFF_STYLE: Record<string, { char: string; color: Color }> = {
        magnet: { char: '磁', color: new Color(103, 232, 249) },
        rage: { char: '狂', color: new Color(244, 63, 94) },
        xp2: { char: '倍', color: new Color(251, 191, 36) },
        invinc: { char: '无', color: new Color(255, 223, 128) },
        shield: { char: '盾', color: new Color(148, 163, 184) },
        dash: { char: '冲', color: new Color(125, 211, 252) },
    };

    private makeLabel(parent: Node, size: number, color: Color, x: number, y: number, anchorX = 0.5): Label {
        const n = new Node('label');
        const uiT = n.addComponent(UITransform);
        uiT.setAnchorPoint(anchorX, 0.5);
        const l = n.addComponent(Label);
        l.string = '';
        l.fontSize = size;
        l.lineHeight = size + 4;
        l.color = color;
        n.setPosition(x, y, 0);
        parent.addChild(n);
        return l;
    }

    private makeBar(parent: Node, w: number, h: number, bgColor: Color, fillColor: Color, x: number, y: number) {
        const bg = new Node('bar-bg');
        const bgT = bg.addComponent(UITransform);
        bgT.setAnchorPoint(0, 0.5);
        const bgG = bg.addComponent(Graphics);
        bgG.fillColor = bgColor;
        bgG.roundRect(0, -h / 2, w, h, h / 2);
        bgG.fill();
        bg.setPosition(x, y, 0);
        parent.addChild(bg);

        const fill = new Node('bar-fill');
        const fillT = fill.addComponent(UITransform);
        fillT.setAnchorPoint(0, 0.5);
        const fillG = fill.addComponent(Graphics);
        fillG.fillColor = fillColor;
        fillG.roundRect(2, -h / 2 + 2, w - 4, h - 4, (h - 4) / 2);
        fillG.fill();
        bg.addChild(fill);

        return { bg, fill };
    }

    start() {
        const half = GameRoot.I.halfSize;
        const left = -half.x + 16;
        const top = half.y;
        // HUD 独立容器：开始界面时只隐藏这一层，不影响 Canvas 上其他组件
        this.hudRoot = new Node('HudRoot');
        this.node.addChild(this.hudRoot);
        const root = this.hudRoot;

        // 血条
        this.hpBarW = 300;
        this.makeBar(root, this.hpBarW, 22, new Color(0, 0, 0, 120), new Color(102, 187, 106), left, top - 34);
        this.hpFill = root.children[root.children.length - 1].getChildByName('bar-fill')!.getComponent(Graphics)!;
        this.hpLabel = this.makeLabel(root, 14, Color.WHITE, left + this.hpBarW / 2, top - 34);

        // 等级
        this.lvLabel = this.makeLabel(root, 22, new Color(255, 224, 130), left + 2, top - 78, 0);

        // 经验条（全宽，波次模式隐藏）
        this.xpBarW = half.x * 2;
        const xpBar = this.makeBar(root, this.xpBarW, 8, new Color(0, 0, 0, 100), new Color(79, 195, 247), -half.x, top - 100);
        this.xpFill = xpBar.fill;
        this.xpBarBg = xpBar.bg;

        // 右上角时间与击杀
        const right = half.x - 16;
        this.timeLabel = this.makeLabel(root, 26, Color.WHITE, right, top - 34, 1);
        this.killLabel = this.makeLabel(root, 18, new Color(255, 170, 170), right, top - 68, 1);
        // 攻击力
        this.atkLabel = this.makeLabel(root, 18, new Color(255, 152, 118), right, top - 96, 1);
        // 模式标签：波次=金币，每日=每日挑战，无尽不显示
        this.modeTag = this.makeLabel(root, 20, new Color(251, 191, 36), right, top - 126, 1);
        // 威胁等级（等级 1 起显示，颜色逐级升级）
        this.threatLabel = this.makeLabel(root, 18, new Color(250, 200, 60), right, top - 154, 1);

        // 波次号（顶部中央，仅波次模式）
        this.waveLabel = this.makeLabel(root, 22, new Color(167, 243, 208), 0, top - 122);

        // Boss 血条（顶部中央，默认隐藏）
        this.bossRoot = new Node('BossBar');
        this.bossRoot.setPosition(0, top - 160, 0);
        root.addChild(this.bossRoot);
        this.makeLabel(this.bossRoot, 18, new Color(255, 120, 120), 0, 22, 'BOSS');
        const bossBar = this.makeBar(this.bossRoot, 480, 16, new Color(0, 0, 0, 120), new Color(224, 85, 110), -240, 0);
        this.bossFill = bossBar.fill;
        this.bossRoot.active = false;

        // 道具状态栏（经验条下方，图标块 + 剩余时间条）
        this.buffRow = new Node('BuffRow');
        this.buffRow.setPosition(left + 20, top - 148, 0);
        root.addChild(this.buffRow);

        // 按 GameRoot 当前状态决定初始显隐
        this.hudRoot.active = GameRoot.I.state !== 'menu';
    }

    /** 显示/隐藏整个 HUD（开始界面时隐藏） */
    public setHidden(hidden: boolean) {
        if (this.hudRoot) { this.hudRoot.active = !hidden; }
    }

    /** 创建一个道具状态图标块 */
    private makeBuffChip(key: string): BuffChip {
        const style = Hud.BUFF_STYLE[key];
        const chip = new Node('buff-' + key);
        chip.addComponent(UITransform).setContentSize(40, 40);
        const box = chip.addComponent(Graphics);
        box.fillColor = new Color(12, 15, 28, 220);
        box.roundRect(-19, -19, 38, 38, 8);
        box.fill();
        box.strokeColor = style.color;
        box.lineWidth = 2.5;
        box.roundRect(-19, -19, 38, 38, 8);
        box.stroke();
        this.makeLabel(chip, 20, style.color, 0, 4, style.char);

        // 底部剩余时间条
        const barBg = new Node('bar');
        const barG = barBg.addComponent(Graphics);
        barG.fillColor = new Color(255, 255, 255, 60);
        barG.roundRect(-15, -15, 30, 4, 2);
        barG.fill();
        chip.addChild(barBg);
        const bar = new Node('bar-fill');
        const barG2 = bar.addComponent(Graphics);
        barG2.fillColor = style.color;
        barG2.roundRect(-15, -15, 30, 4, 2);
        barG2.fill();
        barBg.addChild(bar);

        this.buffRow.addChild(chip);
        return { root: chip, bar, box };
    }

    /** 刷新道具状态栏：按当前生效效果增删图标块 */
    private updateBuffChips(root: GameRoot) {
        // 收集当前应显示的效果（按固定顺序）
        const wanted: { key: string; frac: number }[] = [];
        if (root.effectMagnet > 0) {
            wanted.push({ key: 'magnet', frac: root.effectMagnet / GameRoot.EFFECT_DURATION.magnet });
        }
        if (root.effectRage > 0) {
            wanted.push({ key: 'rage', frac: root.effectRage / GameRoot.EFFECT_DURATION.rage });
        }
        if (root.effectXp2 > 0) {
            wanted.push({ key: 'xp2', frac: root.effectXp2 / GameRoot.EFFECT_DURATION.xp2 });
        }
        if (root.effectInvinc > 0) {
            wanted.push({ key: 'invinc', frac: root.effectInvinc / GameRoot.EFFECT_DURATION.invinc });
        }
        if (root.stats.shieldMax > 0) {
            // 护盾：就绪时常亮满条；破碎后显示充能进度
            const ready = root.stats.shield >= 1;
            const frac = ready ? 1 : Math.min(Math.max(1 - root.stats.shieldTimer / GameRoot.EFFECT_DURATION.shieldRecharge, 0), 1);
            wanted.push({ key: 'shield', frac });
        }
        // 冲刺冷却：就绪满条，冷却时显示充能进度
        const player = root.playerNode.getComponent(Player);
        if (player) {
            const frac = 1 - Math.max(player.dashCdT, 0) / root.stats.dashCd;
            wanted.push({ key: 'dash', frac: Math.min(frac, 1) });
        }

        // 删除不再生效的
        for (const [key, chip] of this.buffChips) {
            if (!wanted.some(w => w.key === key)) {
                chip.root.destroy();
                this.buffChips.delete(key);
            }
        }

        // 按顺序排布并更新时间条
        wanted.forEach((w, i) => {
            let chip = this.buffChips.get(w.key);
            if (!chip) {
                chip = this.makeBuffChip(w.key);
                this.buffChips.set(w.key, chip);
            }
            chip.root.setPosition(i * 46, 0, 0);
            chip.bar.setScale(Math.max(w.frac, 0.001), 1, 1);
            chip.bar.setPosition(-(1 - w.frac) * 15, 0, 0);
        });
    }

    update() {
        const root = GameRoot.I;
        if (!root || !this.hpLabel) return;
        const s = root.stats;

        this.hpFill.node.setScale(Math.max(s.hp / s.maxHp, 0.001), 1, 1);
        this.hpLabel.string = `HP ${s.hp}/${s.maxHp}`;
        this.lvLabel.string = `Lv.${root.level}`;

        // 波次模式：无经验条，改显波次倒计时；其余模式正常显示经验
        const waves = root.mode === 'waves';
        this.xpBarBg.active = !waves;
        this.xpFill.active = !waves;
        if (!waves) {
            this.xpFill.setScale(Math.min(root.xp / root.xpToNext, 1), 1, 1);
        }

        let sec: number;
        if (waves) {
            sec = Math.max(0, Math.ceil(root.waveTime));
            this.waveLabel.string = `第 ${root.wave} 波`;
            this.modeTag.string = `◆ ${root.gold}`;
        } else {
            sec = Math.floor(root.elapsed);
            this.waveLabel.string = '';
            this.modeTag.string = root.mode === 'daily' ? '每日挑战' : '';
        }
        const mm = String(Math.floor(sec / 60)).padStart(2, '0');
        const ss = String(sec % 60).padStart(2, '0');
        this.timeLabel.string = `${mm}:${ss}`;
        this.killLabel.string = `击杀 ${root.kills}`;
        // 攻击力
        this.atkLabel.string = `攻 ${s.damage}`;

        // 威胁等级：绿黄→橙→红→紫逐级告警
        const threat = root.threatLevel();
        if (threat > 0) {
            this.threatLabel.string = `威胁 Lv.${threat}`;
            this.threatLabel.color = threat >= 12
                ? new Color(216, 110, 255)
                : threat >= 8 ? new Color(248, 100, 100)
                    : threat >= 4 ? new Color(251, 146, 60)
                        : new Color(250, 200, 60);
        } else {
            this.threatLabel.string = '';
        }

        // Boss 血条
        const boss = root.boss;
        const showBoss = !!(boss && !boss.dead && boss.node.activeInHierarchy);
        this.bossRoot.active = showBoss;
        if (showBoss) {
            this.bossFill.setScale(Math.max(boss.hp / boss.maxHp, 0.001), 1, 1);
        }

        // 道具状态栏
        this.updateBuffChips(root);
    }
}
