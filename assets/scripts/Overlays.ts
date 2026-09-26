import { _decorator, Component, Node, Color, Graphics, Label, UITransform } from 'cc';
import { GameRoot } from './GameRoot';
import { Upgrade, Stats } from './Upgrades';
import { SoundFX } from './SoundFX';
const { ccclass } = _decorator;

const CARD_W = 560;
const CARD_H = 110;

/** 暂停面板展示的属性清单 */
const PAUSE_STATS: { label: string; get: (s: Stats) => string }[] = [
    { label: '攻击力', get: s => `${s.damage}` },
    { label: '生命', get: s => `${s.hp} / ${s.maxHp}` },
    { label: '暴击率', get: s => `${Math.round(s.critRate * 100)}%（×${s.critMult}）` },
    { label: '攻击间隔', get: s => `${s.fireInterval.toFixed(2)} 秒` },
    { label: '弹道数量', get: s => `${s.bulletCount} 发` },
    { label: '移动速度', get: s => `+ ${Math.round((s.moveSpeed - 1) * 100)}%` },
    { label: '经验加成', get: s => `+ ${Math.round((s.xpGain - 1) * 100)}%` },
    { label: '磁场范围', get: s => `${Math.round(s.magnetRange)}` },
    { label: '环绕电球', get: s => s.orbs > 0 ? `${s.orbs} 颗` : '无' },
    { label: '跟踪导弹', get: s => s.missiles > 0 ? `${s.missiles} 枚` : '无' },
    { label: '能量护盾', get: s => s.shieldMax > 0 ? (s.shield >= 1 ? '就绪' : '充能中') : '未装备' },
];

/** 弹窗层：升级三选一 / 游戏结束结算 */
@ccclass('Overlays')
export class Overlays extends Component {
    private levelUpPanel: Node = null!;
    private gameOverPanel: Node = null!;
    private pausePanel: Node = null!;
    private pauseStatLabels: { label: Label; value: Label }[] = [];
    private menuPanel: Node = null!;
    private cardRoot: Node = null!;
    private statLabels: Label[] = [];

    private makeLabel(parent: Node, size: number, color: Color, x: number, y: number, text = '', anchorX = 0.5): Label {
        const n = new Node('label');
        const uiT = n.addComponent(UITransform);
        uiT.setAnchorPoint(anchorX, 0.5);
        const l = n.addComponent(Label);
        l.string = text;
        l.fontSize = size;
        l.lineHeight = size + 4;
        l.color = color;
        n.setPosition(x, y, 0);
        parent.addChild(n);
        return l;
    }

    private makeDim(parent: Node): Node {
        const half = GameRoot.I.halfSize;
        const n = new Node('dim');
        n.addComponent(UITransform).setContentSize(half.x * 2, half.y * 2);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(0, 0, 0, 190);
        g.rect(-half.x, -half.y, half.x * 2, half.y * 2);
        g.fill();
        parent.addChild(n);
        return n;
    }

    start() {
        // ---- 升级面板 ----
        this.levelUpPanel = new Node('LevelUpPanel');
        this.node.addChild(this.levelUpPanel);
        this.makeDim(this.levelUpPanel);

        this.makeLabel(this.levelUpPanel, 44, new Color(255, 224, 130), 0, 470, '升 级 !');
        this.makeLabel(this.levelUpPanel, 22, Color.WHITE, 0, 420, '选择一项强化');

        this.cardRoot = new Node('Cards');
        this.levelUpPanel.addChild(this.cardRoot);

        // ---- 结算面板 ----
        this.gameOverPanel = new Node('GameOverPanel');
        this.node.addChild(this.gameOverPanel);
        this.makeDim(this.gameOverPanel);

        this.makeLabel(this.gameOverPanel, 56, new Color(224, 85, 85), 0, 320, '游戏结束');
        const texts = ['存活时间：', '最终等级：', '击杀怪物：'];
        for (let i = 0; i < 3; i++) {
            this.statLabels.push(this.makeLabel(this.gameOverPanel, 26, Color.WHITE, 0, 220 - i * 52, texts[i]));
        }

        // 重开按钮
        const btn = new Node('RestartBtn');
        btn.addComponent(UITransform).setContentSize(280, 84);
        const g = btn.addComponent(Graphics);
        g.fillColor = new Color(79, 195, 247);
        g.roundRect(-140, -42, 280, 84, 16);
        g.fill();
        btn.setPosition(0, -60, 0);
        this.makeLabel(btn, 30, new Color(16, 49, 46), 0, 0, '再来一局');
        btn.on(Node.EventType.TOUCH_END, () => { GameRoot.I.restart(); });
        this.gameOverPanel.addChild(btn);

        // ---- 暂停面板（含属性总结） ----
        this.pausePanel = new Node('PausePanel');
        this.node.addChild(this.pausePanel);
        this.makeDim(this.pausePanel);
        this.makeLabel(this.pausePanel, 48, new Color(103, 232, 249), 0, 430, '已暂停');
        this.makeLabel(this.pausePanel, 22, new Color(160, 174, 192), 0, 372, '按 空格 / Esc 继续');

        // 属性两列排布（左列 6 项、右列 5 项）
        PAUSE_STATS.forEach((def, i) => {
            const col = i < 6 ? 0 : 1;
            const row = i % 6;
            const x = col === 0 ? -330 : 40;
            const y = 250 - row * 76;

            const chip = new Node('stat');
            chip.addComponent(UITransform).setContentSize(290, 56);
            const g = chip.addComponent(Graphics);
            g.fillColor = new Color(30, 38, 60, 160);
            g.roundRect(0, -28, 290, 56, 10);
            g.fill();
            chip.setPosition(x, y, 0);
            this.pausePanel.addChild(chip);

            const label = this.makeLabel(chip, 19, new Color(148, 163, 184), 16, 0, def.label, 0);
            const value = this.makeLabel(chip, 22, Color.WHITE, 274, 0, '', 1);
            void label;
            this.pauseStatLabels.push({ label, value });
        });

        // ---- 开始界面 ----
        this.menuPanel = new Node('MenuPanel');
        this.node.addChild(this.menuPanel);
        this.makeLabel(this.menuPanel, 64, new Color(103, 232, 249), 0, 300, 'NEON');
        this.makeLabel(this.menuPanel, 64, Color.WHITE, 0, 226, 'STARFIGHTER');
        this.makeLabel(this.menuPanel, 30, new Color(148, 163, 184), 0, 150, '霓 虹 星 际 战 机');
        this.makeLabel(this.menuPanel, 18, new Color(103, 232, 249, 160), 0, 96, '- - - ✦ - - -');

        const startBtn = new Node('StartBtn');
        startBtn.addComponent(UITransform).setContentSize(320, 92);
        const sg = startBtn.addComponent(Graphics);
        sg.fillColor = new Color(103, 232, 249);
        sg.roundRect(-160, -46, 320, 92, 18);
        sg.fill();
        sg.strokeColor = new Color(224, 255, 255);
        sg.lineWidth = 4;
        sg.roundRect(-160, -46, 320, 92, 18);
        sg.stroke();
        startBtn.setPosition(0, -10, 0);
        this.makeLabel(startBtn, 32, new Color(8, 20, 30), 0, 0, '开始新游戏');
        startBtn.on(Node.EventType.TOUCH_END, () => { GameRoot.I.startGame(); });
        this.menuPanel.addChild(startBtn);

        this.makeLabel(this.menuPanel, 18, new Color(148, 163, 184), 0, -110, '点击按钮 或 按 空格 开始');
        this.makeLabel(this.menuPanel, 18, new Color(148, 163, 184), 0, -190, 'WASD / 方向键 / 按住拖动  移动');
        this.makeLabel(this.menuPanel, 18, new Color(148, 163, 184), 0, -228, '空格 / Esc  暂停      V  切换战机');
        this.makeLabel(this.menuPanel, 18, new Color(148, 163, 184), 0, -266, '击杀敌机 · 拾取强化 · 活下去');

        // GameRoot.onLoad 早于本 start：按当前状态决定初始显示（开局进开始界面）
        if (GameRoot.I.state === 'menu') {
            this.showMenu();
        } else {
            this.hideAll();
        }
    }

    // ---------------- 升级三选一 ----------------

    private selIndex = 0;
    private cardNodes: Node[] = [];
    private choices: Upgrade[] = [];

    public showLevelUp(choices: Upgrade[]) {
        this.cardRoot.destroyAllChildren();
        this.cardNodes = [];
        this.choices = choices;

        choices.forEach((up, i) => {
            const card = new Node(`card-${i}`);
            card.addComponent(UITransform).setContentSize(CARD_W, CARD_H);
            card.setPosition(0, 300 - i * (CARD_H + 24), 0);

            const g = card.addComponent(Graphics);
            g.fillColor = new Color(43, 53, 80);
            g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
            g.fill();
            g.strokeColor = up.color;
            g.lineWidth = 4;
            g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
            g.stroke();

            // 键盘选中高亮框（白色外框，默认隐藏）
            const hl = new Node('hl');
            const hg = hl.addComponent(Graphics);
            hg.strokeColor = Color.WHITE;
            hg.lineWidth = 5;
            hg.roundRect(-CARD_W / 2 - 7, -CARD_H / 2 - 7, CARD_W + 14, CARD_H + 14, 19);
            hg.stroke();
            hl.active = false;
            card.addChild(hl);

            // 左侧圆形图标
            const icon = new Node('icon');
            icon.addComponent(UITransform).setContentSize(64, 64);
            const ig = icon.addComponent(Graphics);
            ig.fillColor = up.color;
            ig.circle(0, 0, 32);
            ig.fill();
            icon.setPosition(-CARD_W / 2 + 64, 0, 0);
            card.addChild(icon);
            this.makeLabel(card, 34, Color.WHITE, -CARD_W / 2 + 64, 0, up.char);
            this.makeLabel(card, 28, Color.WHITE, -CARD_W / 2 + 120, 22, up.name, 0);
            this.makeLabel(card, 20, new Color(159, 176, 208), -CARD_W / 2 + 120, -20, up.desc, 0);

            card.on(Node.EventType.TOUCH_END, () => {
                this.selIndex = i;
                GameRoot.I.chooseUpgrade(up);
            });

            this.cardRoot.addChild(card);
            this.cardNodes.push(card);
        });

        this.selIndex = 0;
        this.updateHighlight();
        this.levelUpPanel.active = true;
    }

    /** 键盘 W/S 上下切换（循环滚动） */
    public moveSel(d: number) {
        if (!this.levelUpPanel.active || this.cardNodes.length === 0) return;
        const n = this.cardNodes.length;
        this.selIndex = (this.selIndex + d + n) % n;
        SoundFX.I.pick();
        this.updateHighlight();
    }

    /** 键盘空格/回车确认当前选中项 */
    public confirmSel() {
        if (!this.levelUpPanel.active) return;
        const up = this.choices[this.selIndex];
        if (!up) return;
        GameRoot.I.chooseUpgrade(up);
    }

    private updateHighlight() {
        this.cardNodes.forEach((n, i) => {
            const sel = i === this.selIndex;
            const hl = n.getChildByName('hl');
            if (hl) { hl.active = sel; }
            n.setScale(sel ? 1.04 : 1, sel ? 1.04 : 1, 1);
        });
    }

    public showGameOver(elapsed: number, level: number, kills: number) {
        const sec = Math.floor(elapsed);
        const mm = String(Math.floor(sec / 60)).padStart(2, '0');
        const ss = String(sec % 60).padStart(2, '0');
        this.statLabels[0].string = `存活时间：${mm}:${ss}`;
        this.statLabels[1].string = `最终等级：Lv.${level}`;
        this.statLabels[2].string = `击杀怪物：${kills}`;
        this.gameOverPanel.active = true;
    }

    public showPaused() {
        // 填充当前属性数值
        const s = GameRoot.I.stats;
        PAUSE_STATS.forEach((def, i) => {
            this.pauseStatLabels[i].value.string = def.get(s);
        });
        this.pausePanel.active = true;
    }

    public showMenu() {
        if (this.menuPanel) { this.menuPanel.active = true; }
    }

    public hideAll() {
        if (this.levelUpPanel) { this.levelUpPanel.active = false; }
        if (this.gameOverPanel) { this.gameOverPanel.active = false; }
        if (this.pausePanel) { this.pausePanel.active = false; }
        if (this.menuPanel) { this.menuPanel.active = false; }
    }
}
