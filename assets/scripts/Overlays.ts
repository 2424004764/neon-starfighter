import { _decorator, Component, Node, Color, Graphics, Label, UITransform, tween, UIOpacity, Vec3, EventTouch } from 'cc';
import { GameRoot } from './GameRoot';
import { Upgrade, Stats } from './Upgrades';
import * as MetaSave from './MetaSave';
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
    { label: '闪电链', get: s => s.chain > 0 ? `Lv.${s.chain}` : '无' },
    { label: '镭射光束', get: s => s.laser > 0 ? `Lv.${s.laser}` : '无' },
    { label: '黑洞弹', get: s => s.blackhole > 0 ? `Lv.${s.blackhole}` : '无' },
    { label: '冰冻弹', get: s => s.freeze > 0 ? `Lv.${s.freeze}` : '无' },
    { label: '能量护盾', get: s => s.shieldMax > 0 ? (s.shield >= 1 ? '就绪' : '充能中') : '未装备' },
];

/** 弹窗层：菜单 / 升级三选一 / 补给站商店 / 机库强化 / 成就 / 暂停 / 游戏结束 / toast */
@ccclass('Overlays')
export class Overlays extends Component {
    private levelUpPanel: Node = null!;
    private gameOverPanel: Node = null!;
    private pausePanel: Node = null!;
    private pauseStatLabels: { label: Label; value: Label }[] = [];
    private menuPanel: Node = null!;
    private shopPanel: Node = null!;
    private metaPanel: Node = null!;
    private achPanel: Node = null!;
    private galleryPanel: Node = null!;
    private toastNode: Node = null!;
    private toastLabel: Label = null!;
    private toastQueue: string[] = [];
    private toastBusy = false;
    private menuCoresLabel: Label = null!;
    private menuDailyLabel: Label = null!;
    private cardRoot: Node = null!;
    private statLabels: Label[] = [];
    private gameOverExtra: Label[] = [];
    private shopGoldLabel: Label = null!;
    private shopCardsRoot: Node = null!;
    private metaCoresLabel: Label = null!;
    private metaCardsRoot: Node = null!;

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

    /** 通用按钮：圆角矩形 + 文本 + 点击回调 */
    private makeBtn(parent: Node, w: number, h: number, fillColor: string, textColor: string, text: string, size: number, x: number, y: number, cb: () => void, stroke = ''): Node {
        const btn = new Node('btn');
        btn.addComponent(UITransform).setContentSize(w, h);
        const g = btn.addComponent(Graphics);
        const fc = new Color();
        fc.fromHEX(fillColor);
        g.fillColor = fc;
        g.roundRect(-w / 2, -h / 2, w, h, Math.min(18, h / 4));
        g.fill();
        if (stroke) {
            const sc = new Color();
            sc.fromHEX(stroke);
            g.strokeColor = sc;
            g.lineWidth = 4;
            g.roundRect(-w / 2, -h / 2, w, h, Math.min(18, h / 4));
            g.stroke();
        }
        const tc = new Color();
        tc.fromHEX(textColor);
        this.makeLabel(btn, size, tc, 0, 0, text);
        btn.setPosition(x, y, 0);
        btn.on(Node.EventType.TOUCH_END, cb);
        parent.addChild(btn);
        return btn;
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

        this.makeLabel(this.gameOverPanel, 56, new Color(224, 85, 85), 0, 340, '游戏结束');
        const texts = ['存活时间：', '最终等级：', '击杀怪物：'];
        for (let i = 0; i < 3; i++) {
            this.statLabels.push(this.makeLabel(this.gameOverPanel, 26, Color.WHITE, 0, 250 - i * 46, texts[i]));
        }
        // 额外两行：数据核心结算 / 每日纪录
        this.gameOverExtra.push(this.makeLabel(this.gameOverPanel, 24, new Color(251, 191, 36), 0, 112, ''));
        this.gameOverExtra.push(this.makeLabel(this.gameOverPanel, 20, new Color(103, 232, 249), 0, 76, ''));

        // 重开按钮 + 主菜单按钮
        this.makeBtn(this.gameOverPanel, 280, 84, '#4fc3f7', '#103130', '再来一局', 30, 0, -10, () => { GameRoot.I.restart(); });
        this.makeBtn(this.gameOverPanel, 280, 64, '#1e293b', '#cbd5e1', '回主菜单', 24, 0, -110, () => { GameRoot.I.backToMenu(); });

        // ---- 暂停面板（含属性总结） ----
        this.pausePanel = new Node('PausePanel');
        this.node.addChild(this.pausePanel);
        this.makeDim(this.pausePanel);
        this.makeLabel(this.pausePanel, 48, new Color(103, 232, 249), 0, 500, '已暂停');
        this.makeLabel(this.pausePanel, 22, new Color(160, 174, 192), 0, 448, '按 空格 / Esc 继续 · Shift 冲刺');
        this.makeBtn(this.pausePanel, 260, 62, '#1e293b', '#cbd5e1', '回主菜单', 24, 0, -510, () => { GameRoot.I.backToMenu(); });

        // 属性两列排布（左列 8 项、右列 7 项）
        const rows = Math.ceil(PAUSE_STATS.length / 2);
        PAUSE_STATS.forEach((def, i) => {
            const col = i < rows ? 0 : 1;
            const row = col === 0 ? i : i - rows;
            const x = col === 0 ? -330 : 40;
            const y = 360 - row * 58;

            const chip = new Node('stat');
            chip.addComponent(UITransform).setContentSize(290, 48);
            const g = chip.addComponent(Graphics);
            g.fillColor = new Color(30, 38, 60, 160);
            g.roundRect(0, -24, 290, 48, 10);
            g.fill();
            chip.setPosition(x, y, 0);
            this.pausePanel.addChild(chip);

            const label = this.makeLabel(chip, 18, new Color(148, 163, 184), 16, 0, def.label, 0);
            const value = this.makeLabel(chip, 20, Color.WHITE, 274, 0, '', 1);
            void label;
            this.pauseStatLabels.push({ label, value });
        });

        // ---- 补给站（波次商店） ----
        this.buildShopPanel();

        // ---- 机库强化 ----
        this.buildMetaPanel();

        // ---- 成就 ----
        this.buildAchPanel();

        // ---- 敌机图鉴 ----
        this.buildGalleryPanel();

        // ---- toast ----
        this.buildToast();

        // ---- 开始界面 ----
        this.buildMenu();

        // 新建节点默认可见：先全部隐藏，再按当前状态显示对应面板
        this.hideAll();
        if (GameRoot.I.state === 'menu') {
            this.showMenu();
        }
    }

    // ---------------- 开始界面 ----------------

    private buildMenu() {
        this.menuPanel = new Node('MenuPanel');
        this.node.addChild(this.menuPanel);
        this.makeLabel(this.menuPanel, 64, new Color(103, 232, 249), 0, 428, 'NEON');
        this.makeLabel(this.menuPanel, 58, Color.WHITE, 0, 356, 'STARFIGHTER');
        this.makeLabel(this.menuPanel, 28, new Color(148, 163, 184), 0, 292, '霓 虹 星 际 战 机');
        this.makeLabel(this.menuPanel, 18, new Color(103, 232, 249, 160), 0, 244, '- - - ✦ - - -');
        this.menuCoresLabel = this.makeLabel(this.menuPanel, 24, new Color(251, 191, 36), 0, 200, '数据核心 ◆ 0');

        // 三种模式
        this.makeBtn(this.menuPanel, 340, 96, '#67e8f9', '#082028', '无尽模式', 34, 0, 104, () => { GameRoot.I.startGame('endless'); }, '#e0ffff');
        this.makeLabel(this.menuPanel, 15, new Color(148, 163, 184), 0, 54, '不断变强的敌潮，活下去', 0);
        this.makeBtn(this.menuPanel, 340, 72, '#334155', '#e2e8f0', '波次商店', 26, 0, -16, () => { GameRoot.I.startGame('waves'); }, '#64748b');
        this.makeBtn(this.menuPanel, 340, 72, '#7c3aed', '#ede9fe', '每日挑战', 26, 0, -110, () => { GameRoot.I.startGame('daily'); }, '#a78bfa');
        this.menuDailyLabel = this.makeLabel(this.menuPanel, 15, new Color(167, 139, 250), 0, -156, '今日最佳 --:--');

        // 机库 / 成就 / 敌机图鉴
        this.makeBtn(this.menuPanel, 216, 64, '#1e293b', '#fbbf24', '机库强化', 22, -236, -212, () => { this.showMeta(); }, '#fbbf24');
        this.makeBtn(this.menuPanel, 216, 64, '#1e293b', '#67e8f9', '成 就', 22, 0, -212, () => { this.showAch(); }, '#67e8f9');
        this.makeBtn(this.menuPanel, 216, 64, '#1e293b', '#fda4af', '敌机图鉴', 22, 236, -212, () => { this.showGallery(); }, '#fda4af');

        this.makeLabel(this.menuPanel, 17, new Color(148, 163, 184), 0, -282, 'WASD / 方向键 / 按住拖动  移动');
        this.makeLabel(this.menuPanel, 17, new Color(148, 163, 184), 0, -314, 'Shift 冲刺      空格 / Esc  暂停      V  切换战机');
        this.makeLabel(this.menuPanel, 17, new Color(148, 163, 184), 0, -346, '击杀敌机 · 拾取强化 · 结算数据核心 · 强化机库');
    }

    public showMenu() {
        if (!this.menuPanel) return;
        // 刷新数据核心与每日最佳
        this.menuCoresLabel.string = `数据核心 ◆ ${MetaSave.cores()}`;
        const best = MetaSave.dailyBest(MetaSave.todayKey());
        this.menuDailyLabel.string = best >= 0
            ? `今日最佳 ${Math.floor(best / 60)}:${String(best % 60).padStart(2, '0')}`
            : '今日最佳 --:--（尚未挑战）';
        this.menuPanel.active = true;
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
            const card = this.makeUpgradeCard(up, () => {
                this.selIndex = i;
                GameRoot.I.chooseUpgrade(up);
            });
            card.setPosition(0, 300 - i * (CARD_H + 24), 0);
            this.cardRoot.addChild(card);
            this.cardNodes.push(card);
        });

        this.selIndex = 0;
        this.updateHighlight();
        this.levelUpPanel.active = true;
    }

    /** 升级选项卡片（升级面板与商店共用外观） */
    private makeUpgradeCard(up: Upgrade, onTap: () => void): Node {
        const card = new Node('card');
        card.addComponent(UITransform).setContentSize(CARD_W, CARD_H);

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
        this.makeLabel(card, 26, Color.WHITE, -CARD_W / 2 + 120, 22, up.name, 0);
        this.makeLabel(card, 19, new Color(159, 176, 208), -CARD_W / 2 + 120, -20, up.desc, 0);

        card.on(Node.EventType.TOUCH_END, onTap);
        return card;
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

    // ---------------- 补给站（波次商店） ----------------

    private buildShopPanel() {
        this.shopPanel = new Node('ShopPanel');
        this.node.addChild(this.shopPanel);
        this.makeDim(this.shopPanel);
        this.makeLabel(this.shopPanel, 42, new Color(251, 191, 36), 0, 480, '补 给 站');
        this.makeLabel(this.shopPanel, 20, new Color(148, 163, 184), 0, 432, '花金币强化，下一波更凶');
        this.shopGoldLabel = this.makeLabel(this.shopPanel, 28, new Color(251, 191, 36), 0, 388, '金 0');
        this.shopCardsRoot = new Node('ShopCards');
        this.shopPanel.addChild(this.shopCardsRoot);
    }

    public showShop(offers: (Upgrade | null)[], gold: number, wave: number, rerollCost: number) {
        this.rebuildShop(offers, gold, wave, rerollCost);
        this.shopPanel.active = true;
    }

    /** 购买后局部刷新（价格/金币/售罄状态） */
    public updateShop(offers: (Upgrade | null)[], gold: number) {
        const wave = GameRoot.I.wave;
        this.rebuildShop(offers, gold, wave, 8 + GameRoot.I.shopRerolls * 4);
    }

    private rebuildShop(offers: (Upgrade | null)[], gold: number, wave: number, rerollCost: number) {
        this.shopCardsRoot.destroyAllChildren();
        this.shopGoldLabel.string = `金 ${gold}    ·    第 ${wave} 波结束`;
        const locks = GameRoot.I.shopLocks;

        offers.forEach((up, i) => {
            if (!up) {
                // 售罄占位
                const sold = new Node('sold');
                sold.addComponent(UITransform).setContentSize(CARD_W, CARD_H);
                const sg = sold.addComponent(Graphics);
                sg.fillColor = new Color(25, 30, 46, 200);
                sg.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
                sg.fill();
                sold.setPosition(0, 300 - i * (CARD_H + 18), 0);
                this.shopCardsRoot.addChild(sold);
                this.makeLabel(sold, 22, new Color(100, 116, 139), 0, 0, '已购买');
                return;
            }
            const price = up.price ?? 25;
            const card = this.makeUpgradeCard(up, () => { GameRoot.I.buyShopOffer(i); });
            card.name = 'offer' + i;    // 记录槽位下标，供键盘选中反查
            // 右侧价格标签
            const afford = gold >= price;
            this.makeLabel(card, 24, afford ? new Color(251, 191, 36) : new Color(248, 113, 113), CARD_W / 2 - 70, 10, `◆${price}`);
            if (locks[i]) {
                // 锁定卡片：左侧金色书签条
                const strip = new Node('lockstrip');
                const lg = strip.addComponent(Graphics);
                lg.fillColor = new Color(245, 158, 11, 235);
                lg.roundRect(-CARD_W / 2 + 3, -CARD_H / 2 + 4, 8, CARD_H - 8, 4);
                lg.fill();
                card.addChild(strip);
            }
            this.makeLockBtn(card, i, !!locks[i]);
            card.setPosition(0, 300 - i * (CARD_H + 18), 0);
            this.shopCardsRoot.addChild(card);
        });

        // 刷新货架 / 开始下一波（destroyAllChildren 已连同卡片一起清掉旧按钮，直接重建）
        const reroll = this.makeBtn(this.shopCardsRoot, 300, 62, '#334155', '#e2e8f0', `刷新货架 ◆${rerollCost}`, 22, 0, -232, () => { GameRoot.I.rerollShop(); });
        reroll.name = 'reroll';
        const next = this.makeBtn(this.shopCardsRoot, 400, 84, '#66bb6a', '#0a2412', `开始第 ${wave + 1} 波  ⏎`, 30, 0, -328, () => { GameRoot.I.nextWave(); });
        next.name = 'next';
        this.makeLabel(this.shopCardsRoot, 15, new Color(100, 116, 139), 0, -378, 'W/S 选择 · 空格购买 · L 锁定 · 回车下一波');

        // 键盘选中态
        this.shopSel = 0;
        this.highlightShop();
    }

    /** 卡片右下角锁定按钮：锁定后该道具刷新与下一波都原位保留 */
    private makeLockBtn(card: Node, offerIndex: number, locked: boolean) {
        const btn = new Node('lockbtn');
        btn.addComponent(UITransform).setContentSize(132, 34);
        const g = btn.addComponent(Graphics);
        g.fillColor = locked ? new Color(180, 83, 9) : new Color(30, 41, 59);
        g.roundRect(-66, -17, 132, 34, 10);
        g.fill();
        g.strokeColor = locked ? new Color(245, 158, 11) : new Color(71, 85, 105);
        g.lineWidth = 2;
        g.roundRect(-66, -17, 132, 34, 10);
        g.stroke();
        this.makeLabel(btn, 17, locked ? new Color(255, 247, 237) : new Color(148, 163, 184), 0, 0, locked ? '已锁定' : '锁定');
        btn.setPosition(CARD_W / 2 - 76, -30, 0);
        btn.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            e.propagationStopped = true;    // 阻止冒泡触发卡片购买
            GameRoot.I.toggleShopLock(offerIndex);
        });
        card.addChild(btn);
    }

    private shopSel = 0;

    private highlightShop() {
        // 卡片节点（带高亮框子节点的即卡片；按钮/文本无 hl 子节点自动跳过）
        const cardNodes = this.shopCardsRoot.children.filter(n => n.getChildByName('hl'));
        cardNodes.forEach(n => {
            const hl = n.getChildByName('hl');
            if (hl) { hl.active = false; }
            n.setScale(1, 1, 1);
        });
        if (cardNodes[this.shopSel]) {
            const n = cardNodes[this.shopSel];
            const hl = n.getChildByName('hl');
            if (hl) { hl.active = true; }
            n.setScale(1.03, 1.03, 1);
        }
    }

    public moveShopSel(d: number) {
        if (!this.shopPanel.active) return;
        const n = this.shopCardsRoot.children.filter(c => c.getChildByName('hl')).length;
        if (n === 0) return;
        this.shopSel = (this.shopSel + d + n) % n;
        SoundFX.I.pick();
        this.highlightShop();
    }

    /** 键盘当前选中卡片对应的商店槽位下标（卡片 name 为 offer{i}，售罄占位无卡片会被跳过） */
    private selectedOfferIndex(): number {
        const cardNodes = this.shopCardsRoot.children.filter(n => n.getChildByName('hl'));
        const n = cardNodes[this.shopSel];
        const m = n && /^offer(\d+)$/.exec(n.name);
        return m ? parseInt(m[1], 10) : -1;
    }

    public confirmShopSel() {
        if (!this.shopPanel.active) return;
        const idx = this.selectedOfferIndex();
        if (idx >= 0) { GameRoot.I.buyShopOffer(idx); }
    }

    /** 键盘 L 键：锁定/解锁当前选中槽位 */
    public toggleShopSelLock() {
        if (!this.shopPanel.active) return;
        const idx = this.selectedOfferIndex();
        if (idx >= 0) { GameRoot.I.toggleShopLock(idx); }
    }

    // ---------------- 机库强化 ----------------

    private buildMetaPanel() {
        this.metaPanel = new Node('MetaPanel');
        this.node.addChild(this.metaPanel);
        this.makeDim(this.metaPanel);
        this.makeLabel(this.metaPanel, 44, new Color(251, 191, 36), 0, 560, '机 库 强 化');
        this.makeLabel(this.metaPanel, 20, new Color(148, 163, 184), 0, 516, '数据核心兑换的永久出厂加成（所有模式生效）');
        this.metaCoresLabel = this.makeLabel(this.metaPanel, 26, new Color(251, 191, 36), 0, 474, '数据核心 ◆ 0');
        this.metaCardsRoot = new Node('MetaCards');
        this.metaPanel.addChild(this.metaCardsRoot);
    }

    public showMeta() {
        this.hideAll();
        this.rebuildMeta();
        this.metaPanel.active = true;
    }

    private rebuildMeta() {
        this.metaCardsRoot.destroyAllChildren();
        this.metaCoresLabel.string = `数据核心 ◆ ${MetaSave.cores()}`;

        MetaSave.META_DEFS.forEach((def, i) => {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const x = col === 0 ? -178 : 178;
            const y = 384 - row * 124;

            const lv = MetaSave.metaLevel(def.id);
            const maxed = lv >= def.costs.length;
            const cost = maxed ? 0 : def.costs[lv];
            const afford = !maxed && MetaSave.cores() >= cost;

            const card = new Node('meta-card');
            card.addComponent(UITransform).setContentSize(340, 112);
            const g = card.addComponent(Graphics);
            g.fillColor = new Color(30, 38, 60, 220);
            g.roundRect(-170, -56, 340, 112, 14);
            g.fill();
            const c = new Color();
            c.fromHEX(def.color);
            g.strokeColor = maxed ? c : new Color(51, 65, 85);
            g.lineWidth = 3;
            g.roundRect(-170, -56, 340, 112, 14);
            g.stroke();
            card.setPosition(x, y, 0);
            this.metaCardsRoot.addChild(card);

            // 图标
            const icon = new Node('icon');
            icon.addComponent(UITransform).setContentSize(52, 52);
            const ig = icon.addComponent(Graphics);
            ig.fillColor = c;
            ig.circle(0, 0, 24);
            ig.fill();
            icon.setPosition(-126, 12, 0);
            card.addChild(icon);
            this.makeLabel(card, 24, Color.WHITE, -126, 12, def.char);

            this.makeLabel(card, 21, Color.WHITE, -86, 26, def.name, 0);
            this.makeLabel(card, 15, new Color(148, 163, 184), -86, 3, def.desc, 0);
            // 等级点
            let pips = '';
            for (let k = 0; k < def.costs.length; k++) { pips += k < lv ? '●' : '○'; }
            this.makeLabel(card, 13, new Color(148, 163, 184), -86, -19, `等级 ${pips}`, 0);
            // 价格 / 已满级
            const priceLabel = maxed
                ? this.makeLabel(card, 18, new Color(134, 239, 172), -86, -42, '已满级', 0)
                : this.makeLabel(card, 18, afford ? new Color(251, 191, 36) : new Color(248, 113, 113), -86, -42, `◆ ${cost}  购买`, 0);
            void priceLabel;

            card.on(Node.EventType.TOUCH_END, () => {
                if (MetaSave.buyMeta(def.id)) {
                    SoundFX.I.buy();
                    this.rebuildMeta();
                } else {
                    SoundFX.I.hurt();
                }
            });
        });

        this.makeBtn(this.metaCardsRoot, 280, 68, '#1e293b', '#cbd5e1', '返 回', 26, 0, -376, () => { this.hideAll(); this.showMenu(); });
    }

    // ---------------- 成就 ----------------

    private buildAchPanel() {
        this.achPanel = new Node('AchPanel');
        this.node.addChild(this.achPanel);
        this.makeDim(this.achPanel);
        this.makeLabel(this.achPanel, 44, new Color(103, 232, 249), 0, 500, '成 就');
        this.makeLabel(this.achPanel, 20, new Color(148, 163, 184), 0, 456, `已解锁 ${MetaSave.achievementCount()} / ${MetaSave.ACHIEVEMENTS.length} · 部分成就解锁新内容`);
    }

    public showAch() {
        this.hideAll();
        const list = this.achPanel.getChildByName('list');
        if (list) { list.destroy(); }
        const listNode = new Node('list');
        this.achPanel.addChild(listNode);

        MetaSave.ACHIEVEMENTS.forEach((a, i) => {
            const got = MetaSave.hasAchievement(a.id);
            const row = new Node('ach');
            row.addComponent(UITransform).setContentSize(560, 62);
            const g = row.addComponent(Graphics);
            g.fillColor = got ? new Color(45, 55, 45, 230) : new Color(25, 30, 46, 220);
            g.roundRect(-280, -31, 560, 62, 12);
            g.fill();
            g.strokeColor = got ? new Color(134, 239, 172, 180) : new Color(51, 65, 85);
            g.lineWidth = 2.5;
            g.roundRect(-280, -31, 560, 62, 12);
            g.stroke();
            row.setPosition(0, 330 - i * 74, 0);
            listNode.addChild(row);

            // 状态图标
            const icon = new Node('icon');
            icon.addComponent(UITransform).setContentSize(44, 44);
            const ig = icon.addComponent(Graphics);
            ig.strokeColor = got ? new Color(251, 191, 36) : new Color(71, 85, 105);
            ig.lineWidth = 3;
            ig.circle(0, 0, 20);
            ig.stroke();
            if (got) { ig.fillColor = new Color(251, 191, 36); ig.circle(0, 0, 12); ig.fill(); }
            icon.setPosition(-240, 0, 0);
            row.addChild(icon);

            this.makeLabel(row, 24, got ? new Color(253, 224, 71) : new Color(148, 163, 184), -206, 10, a.name, 0);
            this.makeLabel(row, 17, got ? new Color(199, 224, 180) : new Color(100, 116, 139), -206, -16, a.desc, 0);
        });

        this.makeBtn(listNode, 280, 68, '#1e293b', '#cbd5e1', '返 回', 26, 0, -260, () => { this.hideAll(); this.showMenu(); });
        this.achPanel.active = true;
    }

    // ---------------- 敌机图鉴 ----------------

    /** 图鉴条目：kind 对应 drawEnemyIcon 的画法 */
    private static readonly GALLERY: { kind: string; name: string; color: string; desc: string }[] = [
        { kind: 'chaser', name: '猎手', color: '#f43f5e', desc: '紧追不舍的红色三角，接触造成伤害' },
        { kind: 'shooter', name: '巡卫', color: '#a78bfa', desc: '保持中距离悬停，发射瞄准光球' },
        { kind: 'speeder', name: '突袭者', color: '#f472b6', desc: '锁定一条直线，高速冲过屏幕' },
        { kind: 'splitter', name: '分裂体', color: '#34d399', desc: '行动缓慢，死亡时裂成两只小猎手' },
        { kind: 'bomber', name: '自爆蜂', color: '#fb923c', desc: '贴近后点燃引信 1 秒自爆，保持距离' },
        { kind: 'turret', name: '哨戒炮', color: '#94a3b8', desc: '固定悬浮缓慢转向，发射扇形弹幕' },
        { kind: 'healer', name: '治愈者', color: '#6ee7b7', desc: '悬停远处治疗周围敌机，优先击杀' },
        { kind: 'boss', name: '典狱长 · BOSS', color: '#fbbf24', desc: '巨型六边形，螺旋双臂弹幕，必掉道具' },
        { kind: 'affix', name: '精英词条', color: '#38bdf8', desc: '疾风提速 · 分裂裂怪 · 弹幕死爆 · 贪婪双掉' },
    ];

    private buildGalleryPanel() {
        this.galleryPanel = new Node('GalleryPanel');
        this.node.addChild(this.galleryPanel);
        this.makeDim(this.galleryPanel);
        this.makeLabel(this.galleryPanel, 44, new Color(253, 164, 175), 0, 560, '敌 机 图 鉴');
        this.makeLabel(this.galleryPanel, 20, new Color(148, 163, 184), 0, 514, '认识它们，然后活得更久');
    }

    /** 画敌机造型（与场上实际造型一致的简化版） */
    private drawEnemyIcon(g: Graphics, kind: string) {
        g.clear();
        const poly = (sides: number, r: number) => {
            g.moveTo(0, -r);
            for (let i = 1; i < sides; i++) {
                const a = (i / sides) * Math.PI * 2;
                g.lineTo(Math.sin(a) * r, -Math.cos(a) * r);
            }
            g.close();
        };
        if (kind === 'chaser') {
            g.fillColor = new Color(244, 63, 94, 70); g.circle(0, 0, 24); g.fill();
            g.fillColor = new Color(244, 63, 94);
            g.moveTo(0, -22); g.lineTo(19, 14); g.lineTo(-19, 14); g.close(); g.fill();
            g.fillColor = Color.WHITE; g.circle(0, 2, 4); g.fill();
        } else if (kind === 'shooter') {
            g.fillColor = new Color(167, 139, 250, 70); g.circle(0, 0, 25); g.fill();
            g.fillColor = new Color(167, 139, 250); poly(5, 21); g.fill();
            g.fillColor = new Color(237, 233, 254); g.circle(0, 0, 6); g.fill();
        } else if (kind === 'speeder') {
            g.fillColor = new Color(244, 114, 182, 70); g.circle(0, 0, 25); g.fill();
            g.fillColor = new Color(244, 114, 182);
            g.moveTo(0, -24); g.lineTo(12, 0); g.lineTo(0, 24); g.lineTo(-12, 0); g.close(); g.fill();
            g.fillColor = Color.WHITE; g.circle(0, 2, 3.5); g.fill();
        } else if (kind === 'splitter') {
            g.fillColor = new Color(52, 211, 153, 70); g.circle(0, 0, 25); g.fill();
            g.fillColor = new Color(52, 211, 153); g.roundRect(-17, -17, 34, 34, 5); g.fill();
            g.strokeColor = new Color(6, 78, 59); g.lineWidth = 3.5;
            g.moveTo(-17, 0); g.lineTo(17, 0); g.moveTo(0, -17); g.lineTo(0, 17); g.stroke();
        } else if (kind === 'bomber') {
            g.fillColor = new Color(251, 146, 60, 70); g.circle(0, 0, 24); g.fill();
            g.fillColor = new Color(217, 119, 6);
            g.moveTo(-20, -6); g.lineTo(-27, -15); g.lineTo(-12, -13); g.close(); g.fill();
            g.moveTo(20, -6); g.lineTo(27, -15); g.lineTo(12, -13); g.close(); g.fill();
            g.fillColor = new Color(251, 191, 36); g.circle(0, 0, 16); g.fill();
            g.fillColor = new Color(120, 53, 15);
            g.roundRect(-16, -3, 32, 5, 2.5); g.fill();
            g.roundRect(-12, 6, 24, 4.5, 2); g.fill();
            g.fillColor = Color.WHITE; g.circle(-5, -7, 2.6); g.circle(5, -7, 2.6); g.fill();
        } else if (kind === 'turret') {
            g.fillColor = new Color(100, 116, 139, 60); g.circle(0, 0, 26); g.fill();
            g.fillColor = new Color(71, 85, 105); poly(8, 23); g.fill();
            g.strokeColor = new Color(148, 163, 184); g.lineWidth = 3; poly(8, 23); g.stroke();
            g.fillColor = new Color(203, 213, 225);
            g.roundRect(-8, 0, 5.5, 27, 3); g.fill();
            g.roundRect(2.5, 0, 5.5, 27, 3); g.fill();
            g.fillColor = new Color(226, 232, 240); g.circle(0, 0, 8); g.fill();
            g.fillColor = new Color(244, 63, 94); g.circle(0, 0, 3.5); g.fill();
        } else if (kind === 'healer') {
            g.fillColor = new Color(52, 211, 153, 55); g.circle(0, 0, 26); g.fill();
            g.fillColor = new Color(167, 243, 208);
            g.roundRect(-6, -18, 12, 36, 5); g.fill();
            g.roundRect(-18, -6, 36, 12, 5); g.fill();
            g.strokeColor = new Color(16, 185, 129); g.lineWidth = 3; g.circle(0, 0, 19); g.stroke();
        } else if (kind === 'boss') {
            g.fillColor = new Color(251, 191, 36, 60); g.circle(0, 0, 34); g.fill();
            g.fillColor = new Color(251, 191, 36); poly(6, 30); g.fill();
            g.strokeColor = new Color(120, 53, 15); g.lineWidth = 4; g.circle(0, 0, 15); g.stroke();
            g.fillColor = new Color(254, 243, 199); g.circle(0, 0, 7); g.fill();
        } else if (kind === 'affix') {
            // 精英词条光环：双色圆环 + 四段外弧
            g.strokeColor = new Color(56, 189, 248, 220); g.lineWidth = 4; g.circle(0, 0, 22); g.stroke();
            g.strokeColor = new Color(56, 189, 248, 80); g.lineWidth = 8; g.circle(0, 0, 26); g.stroke();
            g.strokeColor = new Color(56, 189, 248, 230); g.lineWidth = 4.5;
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2;
                g.moveTo(Math.sin(a) * 32, Math.cos(a) * 32);
                g.lineTo(Math.sin(a + 0.4) * 32, Math.cos(a + 0.4) * 32);
                g.stroke();
            }
        }
    }

    public showGallery() {
        this.hideAll();
        const list = this.galleryPanel.getChildByName('list');
        if (list) { list.destroy(); }
        const listNode = new Node('list');
        this.galleryPanel.addChild(listNode);

        Overlays.GALLERY.forEach((d, i) => {
            const row = new Node('row');
            row.addComponent(UITransform).setContentSize(580, 74);
            const g = row.addComponent(Graphics);
            g.fillColor = new Color(25, 30, 46, 220);
            g.roundRect(-290, -37, 580, 74, 12);
            g.fill();
            const c = new Color();
            c.fromHEX(d.color);
            g.strokeColor = new Color(c.r, c.g, c.b, 140);
            g.lineWidth = 2;
            g.roundRect(-290, -37, 580, 74, 12);
            g.stroke();
            row.setPosition(0, 412 - i * 90, 0);
            listNode.addChild(row);

            // 敌机造型图标
            const icon = new Node('icon');
            icon.addComponent(UITransform).setContentSize(60, 60);
            const ig = icon.addComponent(Graphics);
            this.drawEnemyIcon(ig, d.kind);
            icon.setPosition(-242, 0, 0);
            row.addChild(icon);

            this.makeLabel(row, 23, c, -200, 12, d.name, 0);
            this.makeLabel(row, 16, new Color(148, 163, 184), -200, -14, d.desc, 0);
        });

        this.makeBtn(listNode, 280, 68, '#1e293b', '#cbd5e1', '返 回', 26, 0, -496, () => { this.hideAll(); this.showMenu(); });
        this.galleryPanel.active = true;
    }

    // ---------------- toast ----------------

    private buildToast() {
        this.toastNode = new Node('Toast');
        const t = this.toastNode.addComponent(UITransform);
        t.setContentSize(520, 66);
        const g = this.toastNode.addComponent(Graphics);
        g.fillColor = new Color(20, 24, 40, 235);
        g.roundRect(-260, -33, 520, 66, 16);
        g.fill();
        g.strokeColor = new Color(251, 191, 36, 220);
        g.lineWidth = 3;
        g.roundRect(-260, -33, 520, 66, 16);
        g.stroke();
        this.toastLabel = this.makeLabel(this.toastNode, 24, new Color(253, 224, 71), 0, 0, '');
        this.toastNode.setPosition(0, GameRoot.I.halfSize.y + 90, 0);
        this.toastNode.active = false;
        this.node.addChild(this.toastNode);
    }

    /** 成就解锁横幅（队列依次展示） */
    public toast(text: string) {
        this.toastQueue.push(text);
        this.pumpToast();
    }

    private pumpToast() {
        if (this.toastBusy || this.toastQueue.length === 0) return;
        this.toastBusy = true;
        const text = this.toastQueue.shift()!;
        this.toastLabel.string = text;
        this.toastNode.active = true;
        const half = GameRoot.I.halfSize;
        this.toastNode.setPosition(0, half.y + 90, 0);
        tween(this.toastNode)
            .to(0.3, { position: new Vec3(0, half.y - 170, 0) })
            .delay(1.8)
            .to(0.3, { position: new Vec3(0, half.y + 90, 0) })
            .call(() => {
                this.toastNode.active = false;
                this.toastBusy = false;
                this.pumpToast();
            })
            .start();
    }

    // ---------------- 各面板显隐 ----------------

    public showGameOver(elapsed: number, level: number, kills: number) {
        const sec = Math.floor(elapsed);
        const mm = String(Math.floor(sec / 60)).padStart(2, '0');
        const ss = String(sec % 60).padStart(2, '0');
        this.statLabels[0].string = `存活时间：${mm}:${ss}`;
        this.statLabels[1].string = `最终等级：Lv.${level}`;
        this.statLabels[2].string = `击杀怪物：${kills}`;

        const root = GameRoot.I;
        this.gameOverExtra[0].string = `数据核心 +${root.lastCoresEarned}（余额 ◆${MetaSave.cores()}）`;
        if (root.mode === 'daily') {
            const best = MetaSave.dailyBest(MetaSave.todayKey());
            const bmm = String(Math.floor(best / 60)).padStart(2, '0');
            const bss = String(best % 60).padStart(2, '0');
            this.gameOverExtra[1].string = root.lastDailyRecord
                ? `今日新纪录 ${bmm}:${bss} ！`
                : `今日最佳 ${bmm}:${bss}`;
        } else {
            this.gameOverExtra[1].string = '';
        }
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

    public hideAll() {
        if (this.levelUpPanel) { this.levelUpPanel.active = false; }
        if (this.gameOverPanel) { this.gameOverPanel.active = false; }
        if (this.pausePanel) { this.pausePanel.active = false; }
        if (this.menuPanel) { this.menuPanel.active = false; }
        if (this.shopPanel) { this.shopPanel.active = false; }
        if (this.metaPanel) { this.metaPanel.active = false; }
        if (this.achPanel) { this.achPanel.active = false; }
        if (this.galleryPanel) { this.galleryPanel.active = false; }
    }
}
