import { _decorator, Component, Node, Vec3, Color, Graphics, Label, UITransform, UIOpacity, view, ResolutionPolicy, input, Input, EventKeyboard, KeyCode, tween, Tween, Mask } from 'cc';
import { Stats, createBaseStats, rollUpgrades, Upgrade } from './Upgrades';
import * as MetaSave from './MetaSave';
import { Player } from './Player';
import { Enemy, EnemyKind, EnemyAffix } from './Enemy';
import { Bullet } from './Bullet';
import { Missile } from './Missile';
import { Gem } from './Gem';
import { PowerUp, PowerUpKind } from './PowerUp';
import { Hud } from './Hud';
import { Overlays } from './Overlays';
import { SoundFX } from './SoundFX';
const { ccclass, executionOrder } = _decorator;

export type GameMode = 'endless' | 'waves' | 'daily';

interface Blackhole { node: Node; ring: Node; life: number; dmgTick: number; level: number; }

/** 复用型飘字（伤害数字是后期最大节点开销，必须走对象池） */
interface FloatItem { node: Node; label: Label; op: UIOpacity; }

/**
 * 《霓虹深空》主控：状态机 / 刷怪 / 碰撞 / 经验升级 / 对象池 / 模式与结算
 * 视觉全部由代码绘制，不依赖图片资源
 */
@ccclass('GameRoot')
@executionOrder(-1000)
export class GameRoot extends Component {
    public static I: GameRoot = null!;

    /** 道具效果持续时长（秒），Hud 状态栏与效果计时共用 */
    public static readonly EFFECT_DURATION = { magnet: 6, rage: 8, xp2: 10, shieldRecharge: 12, invinc: 5, freezeField: 2.5 };

    public state: 'menu' | 'playing' | 'paused' | 'levelup' | 'shop' | 'gameover' = 'menu';
    public mode: GameMode = 'endless';
    public stats: Stats = createBaseStats();
    public level = 1;
    public xp = 0;
    public xpToNext = 5;
    public kills = 0;
    public elapsed = 0;
    public halfSize: Vec3 = new Vec3(360, 640, 0);

    /** 波次商店模式：金币 / 当前波 / 本波剩余时间 */
    public gold = 0;
    public wave = 0;
    public waveTime = 0;
    public shopRerolls = 0;
    public shopOffers: Upgrade[] = [];

    /** 结算数据核心与每日纪录（gameover 面板读取） */
    public lastCoresEarned = 0;
    public lastDailyRecord = false;

    public playerNode: Node = null!;
    public bullets: Bullet[] = [];
    public missiles: Missile[] = [];
    public enemys: Enemy[] = [];
    public gems: Gem[] = [];
    public boss: Enemy | null = null;
    public blackholes: Blackhole[] = [];

    // 单局统计（成就用）
    public runDashes = 0;
    public runGoldPicked = 0;
    public runEliteKills = 0;

    // 道具效果（剩余秒数，0 表示无）
    public effectMagnet = 0;
    public effectRage = 0;
    public effectXp2 = 0;
    public effectInvinc = 0;

    /** 游戏随机源：每日挑战换为种子随机，保证全球玩家同序列 */
    public rng: () => number = Math.random;

    private ready = false;
    private pendingLevelUps = 0;
    private spawnTimer = 0;
    private eliteTimer = 15;
    private bossTimer = 45;
    private turretTimer = 55;
    private waveBossDone = 0;   // 波次模式：本波是否已出 Boss
    private lastThreat = -1;    // 已播报过的威胁等级
    private bulletPool: Bullet[] = [];
    private missilePool: Missile[] = [];
    private powerPool: PowerUp[] = [];
    private enemyPool: Enemy[] = [];
    private gemPool: Gem[] = [];
    private floatPool: FloatItem[] = [];
    private floatActive: FloatItem[] = [];
    private static readonly FLOAT_CAP = 26;   // 同屏飘字上限
    private hostileBullets = 0;               // 场上敌方光球数（性能熔断用）
    private fxLive = 0;                       // 存活中的短命特效数（弧/环/束）
    private worldLayer: Node = null!;
    private stars: { node: Node; speed: number; op: UIOpacity; maxOp: number; twFreq: number; twPhase: number }[] = [];
    private nebulae: { node: Node; speed: number; op: UIOpacity; baseX: number; swayAmp: number; swayFreq: number; pulseFreq: number; phase: number }[] = [];
    private meteors: { node: Node; vx: number; vy: number; life: number; op: UIOpacity }[] = [];
    private visualT = 0;
    private meteorTimer = 4;
    private hud: Hud = null!;
    private overlays: Overlays = null!;

    onLoad() {
        GameRoot.I = this;

        // 竖屏 720x1280 固定画幅：宽窗口时两侧留黑边，游戏区域永远居中
        view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);

        // 窗口/面板尺寸变化时重新适配画幅（嵌入式浏览器拖拽分栏后画布不会自动重投影）
        window.addEventListener('resize', () => {
            view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
        });

        // 音效上下文（首次触摸后激活）
        SoundFX.I.init();
        input.on(Input.EventType.TOUCH_START, () => { SoundFX.I.init(); });

        // 键盘：Esc 暂停 / 各面板专用键
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);

        // 世界层（星空 + 实体），并用矩形遮罩把内容严格裁剪在画幅内
        this.worldLayer = new Node('World');
        this.node.addChild(this.worldLayer);
        const worldT = this.worldLayer.addComponent(UITransform);
        worldT.setContentSize(720, 1280);
        this.worldLayer.addComponent(Mask);
        this.buildStarfield();

        // 玩家
        const p = new Node('Player');
        p.addComponent(UITransform).setContentSize(56, 56);
        p.addComponent(UIOpacity);
        this.worldLayer.addChild(p);
        p.addComponent(Player);
        this.playerNode = p;

        this.hud = this.node.addComponent(Hud)!;
        this.overlays = this.node.addComponent(Overlays)!;

        this.ready = true;
        this.restart();
        // 进入开始界面：从菜单选择模式后正式开局
        this.hud.setHidden(true);
        this.state = 'menu';
        this.overlays.showMenu();
    }

    /** 统一随机：影响玩法的掷点都走这里（每日挑战可播种） */
    public rand(): number { return this.rng(); }

    /** 星云色块 + 三层视差星空（范围限定在画幅内） */
    private buildStarfield() {
        const vs = view.getVisibleSize();
        const halfX = vs.width / 2;
        const halfY = vs.height / 2;

        // 星云：大而柔和的彩色光斑，缓慢下漂
        const nebulaColors = [
            new Color(120, 60, 220), new Color(30, 120, 220), new Color(220, 60, 160),
            new Color(40, 180, 190), new Color(150, 90, 240), new Color(60, 90, 220),
        ];
        for (let i = 0; i < 6; i++) {
            const n = new Node('nebula' + i);
            n.addComponent(UITransform).setContentSize(560, 560);
            const g = n.addComponent(Graphics);
            const c = nebulaColors[i];
            g.fillColor = new Color(c.r, c.g, c.b, 9);
            g.circle(0, 0, 270);
            g.fill();
            g.fillColor = new Color(c.r, c.g, c.b, 14);
            g.circle(0, 0, 190);
            g.fill();
            g.fillColor = new Color(c.r, c.g, c.b, 18);
            g.circle(0, 0, 115);
            g.fill();
            const op = n.addComponent(UIOpacity);
            op.opacity = 200;
            const baseX = (Math.random() * 2 - 1) * (halfX - 120);
            n.setPosition(baseX, (Math.random() * 2 - 1) * (halfY + 200), 0);
            this.worldLayer.addChild(n);
            this.nebulae.push({
                node: n, speed: 9 + (i % 3) * 5, op, baseX,
                swayAmp: 30 + Math.random() * 40,          // 横向摆动幅度
                swayFreq: 0.25 + Math.random() * 0.4,      // 摆动频率
                pulseFreq: 0.4 + Math.random() * 0.5,      // 呼吸明暗频率
                phase: Math.random() * Math.PI * 2,
            });
        }

        for (let i = 0; i < 72; i++) {
            const n = new Node('star');
            n.addComponent(UITransform).setContentSize(4, 4);
            const g = n.addComponent(Graphics);
            const roll = Math.random();
            const r = roll < 0.6 ? 1 : roll < 0.9 ? 1.6 : 2.4;
            const c = roll < 0.6
                ? new Color(148, 163, 184, 110)
                : roll < 0.9
                    ? new Color(103, 232, 249, 150)
                    : new Color(224, 255, 255, 210);
            g.fillColor = c;
            g.circle(0, 0, r);
            g.fill();
            n.setPosition((Math.random() * 2 - 1) * (halfX + 10), (Math.random() * 2 - 1) * (halfY + 10), 0);
            const op = n.addComponent(UIOpacity);
            this.worldLayer.addChild(n);
            this.stars.push({
                node: n, speed: 22 + r * 22, op,
                maxOp: r < 0.6 ? 150 : r < 0.9 ? 210 : 255,
                twFreq: 1.2 + Math.random() * 2.2,         // 闪烁频率
                twPhase: Math.random() * Math.PI * 2,
            });
        }
    }

    /** 流星：斜向划过，尾部渐隐 */
    private spawnMeteor() {
        const n = new Node('meteor');
        n.addComponent(UITransform).setContentSize(20, 110);
        const g = n.addComponent(Graphics);
        // 尾迹（沿 -y 方向拖出，越远越淡）
        const seg = [
            { len: 34, a: 170 }, { len: 34, a: 95 }, { len: 42, a: 40 },
        ];
        let y = 0;
        for (const s of seg) {
            g.strokeColor = new Color(200, 245, 255, s.a);
            g.lineWidth = 2.5;
            g.moveTo(0, y);
            g.lineTo(0, y - s.len);
            g.stroke();
            y -= s.len;
        }
        g.fillColor = new Color(103, 232, 249, 90);
        g.circle(0, 0, 6);
        g.fill();
        g.fillColor = new Color(240, 255, 255);
        g.circle(0, 0, 2.5);
        g.fill();

        const op = n.addComponent(UIOpacity);
        const half = this.halfSize;
        const dir = Math.random() < 0.5 ? 1 : -1;
        // 速度大范围随机：有的慢悠悠飘过，有的呼啸而过
        const speed = 160 + Math.random() * 380;
        const vx = dir * speed * (0.45 + Math.random() * 0.25);
        const vy = -speed;
        n.setPosition(dir * (100 + Math.random() * 200) * -1, half.y + 80, 0);
        // 让局部 +y（头部方向）对齐速度方向：θ = atan2(-vx, vy)
        n.angle = Math.atan2(-vx, vy) * 180 / Math.PI;
        // 寿命随速度自适应，保证慢流星也能划完屏幕
        const life = Math.min(4.5, Math.max(1.6, (this.halfSize.y * 2.4) / speed));
        this.worldLayer.addChild(n);
        this.meteors.push({ node: n, vx, vy, life, op });
    }

    /** 键盘：菜单空格开局；升级/商店选卡；Esc 暂停（空格已让位给冲刺） */
    private onKeyDown(e: EventKeyboard) {
        if (this.state === 'menu') {
            if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER) {
                this.startGame('endless');
            }
            return;
        }
        if (this.state === 'levelup') {
            if (e.keyCode === KeyCode.KEY_W || e.keyCode === KeyCode.ARROW_UP) {
                this.overlays.moveSel(-1);
            } else if (e.keyCode === KeyCode.KEY_S || e.keyCode === KeyCode.ARROW_DOWN) {
                this.overlays.moveSel(1);
            } else if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER) {
                this.overlays.confirmSel();
            }
            return;
        }
        if (this.state === 'shop') {
            if (e.keyCode === KeyCode.KEY_W || e.keyCode === KeyCode.ARROW_UP) {
                this.overlays.moveShopSel(-1);
            } else if (e.keyCode === KeyCode.KEY_S || e.keyCode === KeyCode.ARROW_DOWN) {
                this.overlays.moveShopSel(1);
            } else if (e.keyCode === KeyCode.SPACE) {
                this.overlays.confirmShopSel();
            } else if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.KEY_N || e.keyCode === KeyCode.KEY_R) {
                this.nextWave();
            }
            return;
        }
        if (e.keyCode === KeyCode.ESCAPE || e.keyCode === KeyCode.SPACE) {
            this.togglePause();
        }
    }

    /** 从开始界面选择模式正式开局 */
    public startGame(mode: GameMode) {
        if (this.state !== 'menu') return;
        this.mode = mode;
        if (mode === 'daily') {
            // 当天全球同一套序列：日期做种子
            this.rng = MetaSave.mulberry32(MetaSave.hashSeed('neon-daily-' + MetaSave.todayKey()));
        } else {
            this.rng = Math.random;
        }
        this.hud.setHidden(false);
        this.overlays.hideAll();
        this.restart();
        SoundFX.I.pick();
    }

    /** 暂停 / 继续游戏（升级选择与结算界面时无效） */
    public togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.overlays.showPaused();
            SoundFX.I.pick();
        } else if (this.state === 'paused') {
            this.state = 'playing';
            this.overlays.hideAll();
            SoundFX.I.pick();
        }
    }

    /** 回主菜单（清场但保留局外存档状态） */
    public backToMenu() {
        this.clearWorld();
        this.state = 'menu';
        this.hud.setHidden(true);
        this.overlays.hideAll();
        this.overlays.showMenu();
        SoundFX.I.pick();
    }

    update(dt: number) {
        if (!this.ready) return;

        const uiT = this.node.getComponent(UITransform);
        if (uiT) {
            this.halfSize.set(uiT.width / 2, uiT.height / 2, 0);
        }

        // 暂停时整个世界冻结
        if (this.state === 'paused') return;

        // 背景视觉时钟（升级选卡/购物时宇宙仍在流动）
        this.visualT += dt;
        const vt = this.visualT;

        // 星空下落（视差）+ 闪烁
        for (const s of this.stars) {
            const p = s.node.position;
            let y = p.y - s.speed * dt;
            if (y < -this.halfSize.y - 12) {
                y = this.halfSize.y + 12;
                s.node.setPosition((Math.random() * 2 - 1) * (this.halfSize.x + 12), y, 0);
                continue;
            }
            s.node.setPosition(p.x, y, 0);
            s.op.opacity = Math.round(s.maxOp * (0.55 + 0.45 * Math.sin(vt * s.twFreq + s.twPhase)));
        }

        // 星云：下漂 + 横向摆动 + 呼吸缩放与明暗
        for (const nb of this.nebulae) {
            const p = nb.node.position;
            let y = p.y - nb.speed * dt;
            if (y < -this.halfSize.y - 320) {
                y = this.halfSize.y + 340;
                nb.baseX = (Math.random() * 2 - 1) * (this.halfSize.x - 120);
            }
            const x = nb.baseX + Math.sin(vt * nb.swayFreq + nb.phase) * nb.swayAmp;
            nb.node.setPosition(x, y, 0);
            const breathe = 1 + 0.06 * Math.sin(vt * nb.pulseFreq + nb.phase);
            nb.node.setScale(breathe, breathe, 1);
            nb.op.opacity = Math.round(200 + 55 * Math.sin(vt * nb.pulseFreq * 0.8 + nb.phase));
        }

        // 流星生成与飞行
        this.meteorTimer -= dt;
        if (this.meteorTimer <= 0) {
            this.meteorTimer = 5 + Math.random() * 7;
            this.spawnMeteor();
        }
        for (let i = this.meteors.length - 1; i >= 0; i--) {
            const m = this.meteors[i];
            m.life -= dt;
            const p = m.node.position;
            m.node.setPosition(p.x + m.vx * dt, p.y + m.vy * dt, 0);
            m.op.opacity = Math.round(255 * Math.min(1, m.life / 0.35));
            const half = this.halfSize;
            if (m.life <= 0 || p.x < -half.x - 160 || p.x > half.x + 160 || p.y < -half.y - 120) {
                m.node.destroy();
                this.meteors.splice(i, 1);
            }
        }

        if (this.state !== 'playing') return;

        this.elapsed += dt;

        // 威胁等级提升：全场播报 + 警报 + 红色脉冲
        const threat = this.threatLevel();
        if (threat > this.lastThreat) {
            this.lastThreat = threat;
            if (threat > 0) {
                this.overlays.toast(`⚠ 威胁等级 ${threat} · 敌军增援抵达`);
                SoundFX.I.bossAlarm();
                const pp = this.playerNode.getPosition();
                this.spawnRingFx(pp.x, pp.y, 660, new Color(244, 63, 94, 150), 6, 0.7);
            }
        }

        this.spawnLogic(dt);
        this.checkCollisions();
        this.updateBlackholes(dt);

        // 道具效果倒计时
        if (this.effectMagnet > 0) { this.effectMagnet -= dt; }
        if (this.effectRage > 0) { this.effectRage -= dt; }
        if (this.effectXp2 > 0) { this.effectXp2 -= dt; }
        if (this.effectInvinc > 0) { this.effectInvinc -= dt; }

        // 波次模式：本波倒计时结束 → 进商店
        if (this.mode === 'waves') {
            this.waveTime -= dt;
            if (this.waveTime <= 0) {
                this.endWave();
                return;
            }
        }

        // 无尽模式存活 5 分钟成就
        if (this.mode === 'endless' && this.elapsed >= 300) {
            this.tryUnlock('survivor');
        }

        if (this.pendingLevelUps > 0) {
            this.state = 'levelup';
            SoundFX.I.levelup();
            this.overlays.showLevelUp(rollUpgrades(this.stats));
        }
    }

    // ---------------- 刷怪 ----------------

    /** 波次模式的难度基准秒数（复用无尽模式的成长曲线） */
    private difficultySec(): number {
        return this.mode === 'waves' ? 20 + this.wave * 15 : this.elapsed;
    }

    /** 威胁等级：无尽每 75 秒 +1，波次每 2 波 +1（敌军指数增强的基准） */
    public threatLevel(): number {
        return this.mode === 'waves' ? Math.floor((this.wave - 1) / 2) : Math.floor(this.elapsed / 75);
    }

    /** 威胁等级血量倍率：每级 ×1.32 指数成长，保证后期仍持续施压 */
    public threatHpMul(): number {
        return Math.pow(1.32, this.threatLevel());
    }

    /** 威胁等级移速倍率（封顶 1.8） */
    public threatSpeedMul(): number {
        return Math.min(1.8, 1 + 0.06 * this.threatLevel());
    }

    /** 敌机每次碰撞 / 光球 / 自爆的伤害（威胁等级越高越痛） */
    public enemyHitDamage(): number {
        return 1 + Math.floor(this.threatLevel() / 3);
    }

    private spawnLogic(dt: number) {
        if (this.mode === 'waves') {
            this.waveSpawnLogic(dt);
            return;
        }

        // ---- 无尽 / 每日 ----
        // 场上上限随时间上涨（每 12 秒 +1，封顶 70），后期成批刷新
        const threat = this.threatLevel();
        const cap = Math.min(70, 22 + Math.floor(this.elapsed / 12));
        if (this.enemys.length < cap) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                const batch = Math.min(6, 1 + Math.floor(this.elapsed / 75));   // 75 秒后 2 只/批，封顶 6 只
                for (let i = 0; i < batch; i++) {
                    const kind = this.rollEndlessKind();
                    const affix = this.rollAffix(this.elapsed > 40 ? Math.min(0.3, 0.12 + 0.02 * threat) : 0);
                    this.spawnEnemy(1, kind, affix);
                }
                // 开局 1.8 秒一批，随时间逐渐压缩到 0.26 秒
                this.spawnTimer = Math.max(0.26, 1.8 - this.elapsed * 0.012);
            }
        } else {
            this.spawnTimer = 0.5;
        }

        // 精英词条猎手：30 秒后周期来袭，威胁等级越高越频繁
        this.eliteTimer -= dt;
        if (this.elapsed > 30 && this.eliteTimer <= 0) {
            this.spawnEnemy(1.3, 'chaser', this.rollAffix(1));
            this.eliteTimer = Math.max(7, 18 - threat);
        }

        // 哨戒炮：55 秒后周期登场，威胁等级提高数量上限与登场频率
        this.turretTimer -= dt;
        if (this.elapsed > 55 && this.turretTimer <= 0) {
            if (this.countKind('turret') < Math.min(6, 3 + Math.floor(threat / 3))) {
                this.spawnEnemy(1.15, 'turret');
            }
            this.turretTimer = Math.max(12, 22 - threat);
        }

        // Boss：45 秒首次登场，此后每 75 秒一只
        this.bossTimer -= dt;
        if (this.elapsed > 45 && this.bossTimer <= 0 && !this.boss) {
            this.spawnEnemy(2.4, 'boss');
            SoundFX.I.bossAlarm();
            this.bossTimer = 75;
        }
    }

    /** 无尽模式敌机种类掷点（新敌机随时间加入） */
    private rollEndlessKind(): EnemyKind {
        const roll = this.rand();
        const t = this.elapsed;
        if (t > 20 && roll < 0.16) { return 'speeder'; }
        if (t > 15 && roll < 0.34) { return 'splitter'; }
        if (t > 10 && roll < 0.52) { return 'shooter'; }
        if (t > 25 && roll < 0.66) { return 'bomber'; }
        if (t > 35 && roll < 0.74) { return 'healer'; }
        return 'chaser';
    }

    /** 词条掷点：p 为概率 */
    private rollAffix(p: number): EnemyAffix {
        if (this.rand() >= p) { return ''; }
        const pool: EnemyAffix[] = ['swift', 'split', 'barrage', 'rich'];
        return pool[Math.floor(this.rand() * pool.length)];
    }

    /** 波次模式刷怪：按波数解锁种类、上限与批次同步加码 */
    private waveSpawnLogic(dt: number) {
        const threat = this.threatLevel();
        const cap = Math.min(72, 26 + this.wave * 2);
        if (this.enemys.length < cap) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                const w = this.wave;
                const batch = Math.min(6, 1 + Math.floor(w / 5));   // 每 5 波多刷一只
                for (let i = 0; i < batch; i++) {
                    const roll = this.rand();
                    let kind: EnemyKind = 'chaser';
                    if (w >= 6 && roll < 0.08) { kind = 'turret'; }
                    else if (w >= 5 && roll < 0.18) { kind = 'healer'; }
                    else if (w >= 4 && roll < 0.32) { kind = 'speeder'; }
                    else if (w >= 3 && roll < 0.5) { kind = 'bomber'; }
                    else if (w >= 3 && roll < 0.62) { kind = 'splitter'; }
                    else if (w >= 2 && roll < 0.8) { kind = 'shooter'; }
                    const affix = this.rollAffix(w >= 4 ? Math.min(0.3, 0.12 + 0.02 * threat) : 0);
                    this.spawnEnemy(1, kind, affix);
                }
                this.spawnTimer = Math.max(0.26, 1.4 - w * 0.1);
            }
        }
        // 每 5 波一只 Boss（波首登场）
        if (this.wave % 5 === 0 && this.waveBossDone < this.wave && !this.boss) {
            this.spawnEnemy(2.4, 'boss');
            SoundFX.I.bossAlarm();
            this.waveBossDone = this.wave;
        }
    }

    private countKind(kind: EnemyKind): number {
        let n = 0;
        for (const e of this.enemys) { if (!e.dead && e.kind === kind) n++; }
        return n;
    }

    private spawnEnemy(scale: number, kind: EnemyKind = 'chaser', affix: EnemyAffix = '') {
        let e = this.enemyPool.pop();
        if (!e) {
            const n = new Node('Enemy');
            n.addComponent(UITransform).setContentSize(60, 60);
            n.addComponent(UIOpacity);
            n.addComponent(Enemy);
            this.worldLayer.addChild(n);
            e = n.getComponent(Enemy)!;
        }
        e.init(scale, this.difficultySec(), kind, affix);
        this.enemys.push(e);
        if (kind === 'boss') {
            this.boss = e;
        }
    }

    /** 分裂体死亡：裂成两只小猎手 */
    public spawnMinis(pos: Vec3) {
        for (const dx of [-26, 26]) {
            this.spawnEnemy(0.5, 'mini');
            const m = this.enemys[this.enemys.length - 1];
            m.node.setPosition(pos.x + dx, pos.y - 8, 0);
        }
    }

    /** 敌方光球（威胁等级提升弹速；总量熔断防极端弹幕堆积） */
    public spawnEnemyBullet(x: number, y: number, angle: number, speed: number) {
        if (this.hostileBullets >= 280) { return; }
        this.hostileBullets += 1;
        const b = this.getBullet();
        b.node.setPosition(x, y, 0);
        const mul = 1 + 0.04 * Math.min(this.threatLevel(), 15);
        b.init(angle, speed * mul, 1, true);
    }

    /** 弹幕词条：死亡放出 8 向环形弹幕 */
    public enemyDeathBarrage(pos: Vec3) {
        for (let i = 0; i < 8; i++) {
            this.spawnEnemyBullet(pos.x, pos.y, i / 8 * Math.PI * 2, 190);
        }
        SoundFX.I.enemyShoot();
    }

    /** 治疗者脉冲：治疗周围敌机并放出绿色光环 */
    public healPulse(pos: Vec3) {
        this.spawnRingFx(pos.x, pos.y, 230, new Color(52, 211, 153, 200), 4, 0.5);
        const heal = Math.min(1 + Math.floor(this.difficultySec() / 120), 3);
        for (const e of this.enemys) {
            if (e.dead || e.kind === 'healer') continue;
            const ep = e.node.getPosition();
            const dx = ep.x - pos.x, dy = ep.y - pos.y;
            if (dx * dx + dy * dy < 230 * 230) {
                e.heal(heal);
                this.spawnFloatText(ep.x, ep.y + 26, '+' + heal, new Color(134, 239, 172), 16);
            }
        }
    }

    /** 自爆蜂爆炸：范围伤害玩家 + 橙色冲击波 */
    public bomberExplode(pos: Vec3) {
        this.spawnRingFx(pos.x, pos.y, 120, new Color(251, 146, 60, 230), 6, 0.4);
        this.spawnFlashFx(pos.x, pos.y, 55, new Color(254, 240, 138, 180));
        SoundFX.I.boom(false);
        const pp = this.playerNode.getPosition();
        const dx = pp.x - pos.x, dy = pp.y - pos.y;
        if (dx * dx + dy * dy < 120 * 120) {
            this.playerNode.getComponent(Player)!.takeDamage(this.enemyHitDamage());
        }
    }

    public recycleEnemy(e: Enemy) {
        if (this.enemyPool.indexOf(e) >= 0) return; // 防止死亡动画回调重复回收
        const i = this.enemys.indexOf(e);
        if (i >= 0) { this.enemys.splice(i, 1); }
        e.node.active = false;
        this.enemyPool.push(e);
    }

    public onEnemyKilled(e: Enemy) {
        this.kills += 1;
        MetaSave.addTotalKills(1);
        this.tryUnlock('firstBlood');
        if (this.kills >= 100) { this.tryUnlock('slayer'); }
        if (e.isBoss) {
            this.tryUnlock('bossKiller');
        }
        if (e.isElite) {
            this.runEliteKills += 1;
            if (this.runEliteKills >= 5) { this.tryUnlock('eliteHunter'); }
        }

        const value = e.gemValue();
        const p = e.node.getPosition();
        if (this.mode === 'waves') {
            // 波次模式：击杀掉金币
            if (e.isBoss) {
                this.addGold(10, false);
                this.spawnFloatText(p.x, p.y + 30, '+10 金', new Color(251, 191, 36), 26);
            } else if (value > 0) {
                const chance = e.affix === 'rich' ? 1.0 : (e.isElite ? 0.9 : 0.45);
                if (this.rand() < chance) {
                    const gem = this.getGem();
                    const coinVal = e.isElite ? 3 : 1;
                    gem.init(p.x, p.y, coinVal, true);
                    this.gems.push(gem);
                }
            }
        } else if (value > 0) {
            // 25% 概率能量直接入包（带飘字反馈），否则掉落宝石
            if (this.rand() < 0.25) {
                this.addXp(value);
                this.spawnFloatText(p.x, p.y, '+' + value, new Color(165, 243, 252));
            } else {
                const gem = this.getGem();
                gem.init(p.x, p.y, value, false);
                this.gems.push(gem);
            }
        }
        // 掉落随机道具（Boss 必掉，贪婪词条较高概率）
        if (e.isBoss) {
            this.dropPowerUp(e.node.getPosition());
        } else if (e.affix === 'rich') {
            if (this.rand() < 0.35) { this.dropPowerUp(e.node.getPosition()); }
        } else {
            this.tryDropPowerUp(e.node.getPosition());
        }
        SoundFX.I.boom(e.isBoss);
        if (e.isBoss) {
            this.boss = null;
        }
    }

    /**
     * 对敌人结算一次伤害：掷暴击、应用伤害、弹出伤害数字
     * 所有伤害来源（子弹/电球/导弹/镭射/黑洞/闪电链）统一走这里
     */
    public dealDamage(e: Enemy, baseDamage: number) {
        if (e.dead) return;
        const isCrit = Math.random() < this.stats.critRate;
        const dmg = isCrit ? Math.round(baseDamage * this.stats.critMult) : baseDamage;
        const ep = e.node.getPosition();
        if (isCrit) {
            this.spawnFloatText(ep.x + (Math.random() * 30 - 15), ep.y + 20, `${dmg}`, new Color(255, 200, 60), 30);
        } else {
            this.spawnFloatText(ep.x + (Math.random() * 30 - 15), ep.y + 20, `${dmg}`, new Color(224, 242, 254), 18);
        }
        e.hurt(dmg);
        // 闪电链：暴击时概率向附近敌人跳跃
        if (isCrit && this.stats.chain > 0 && this.rand() < 0.5) {
            this.chainLightning(e, baseDamage);
        }
    }

    /** 闪电链：从暴击目标起跳，最多 3 跳，伤害逐跳衰减 */
    private chainLightning(from: Enemy, baseDamage: number) {
        const jumps = 2 + this.stats.chain;   // 等级越高跳得越多（3~5 个目标）
        let src = from.node.getPosition();
        const hit = new Set<Enemy>([from]);
        for (let i = 1; i <= jumps; i++) {
            let best: Enemy | null = null;
            let bestD = 260 * 260;
            for (const e of this.enemys) {
                if (e.dead || hit.has(e)) continue;
                const ep = e.node.getPosition();
                const dx = ep.x - src.x, dy = ep.y - src.y;
                const d = dx * dx + dy * dy;
                if (d < bestD) { bestD = d; best = e; }
            }
            if (!best) break;
            const bp = best.node.getPosition();
            this.spawnLightningArc(src, bp);
            const dmg = Math.max(1, Math.round(baseDamage * Math.pow(0.7, i)));
            best.hurt(dmg);
            this.spawnFloatText(bp.x, bp.y + 16, `${dmg}`, new Color(196, 181, 253), 18);
            hit.add(best);
            src = bp;
        }
        SoundFX.I.chain();
    }

    /** 闪电弧视觉：抖动折线，快速淡出（受特效并发预算约束） */
    private spawnLightningArc(a: Vec3, b: Vec3) {
        if (this.fxLive >= 40) { return; }
        this.fxLive += 1;
        const n = new Node('lightning');
        n.addComponent(UITransform).setContentSize(10, 10);
        const g = n.addComponent(Graphics);
        g.strokeColor = new Color(216, 200, 255, 235);
        g.lineWidth = 3.5;
        const segs = 5;
        g.moveTo(a.x, a.y);
        for (let i = 1; i < segs; i++) {
            const t = i / segs;
            const jx = (this.rand() * 2 - 1) * 26;
            const jy = (this.rand() * 2 - 1) * 26;
            g.lineTo(a.x + (b.x - a.x) * t + jx, a.y + (b.y - a.y) * t + jy);
        }
        g.lineTo(b.x, b.y);
        g.stroke();
        g.strokeColor = new Color(255, 255, 255, 160);
        g.lineWidth = 1.5;
        g.stroke();
        this.worldLayer.addChild(n);
        const op = n.addComponent(UIOpacity);
        tween(op).to(0.22, { opacity: 0 }).call(() => { n.destroy(); this.fxLive = Math.max(0, this.fxLive - 1); }).start();
    }

    /** 镭射：以战机为中心向上齐射，等级数 = 光束道数，贯穿全部敌机 */
    public fireLaser() {
        const lvl = this.stats.laser;
        const p = this.playerNode.getPosition();
        const top = this.halfSize.y + 30;
        const halfW = 24;
        const spacing = 105;

        // 光束横坐标：以战机为中心对称分布（1 道=中央，2 道=两侧，3 道=中+两侧）
        const beamX: number[] = [];
        for (let i = 0; i < lvl; i++) {
            beamX.push((i - (lvl - 1) / 2) * spacing);
        }
        for (const dx of beamX) {
            this.spawnLaserBeam(p.x + dx, p.y, halfW, top);
        }

        // 伤害：命中任意一道光束
        const dmg = Math.max(1, Math.round(this.stats.damage * (1 + 0.35 * (lvl - 1))));
        for (const e of this.enemys.slice()) {
            if (e.dead) continue;
            const ep = e.node.getPosition();
            if (ep.y <= p.y) continue;
            const r = halfW + 26 * e.node.scale.x;
            if (beamX.some(dx => Math.abs(ep.x - (p.x + dx)) < r)) {
                this.dealDamage(e, dmg);
            }
        }
        SoundFX.I.laser();
    }

    /** 单道镭射视觉：三层光带 + 收拢淡出（受特效并发预算约束） */
    private spawnLaserBeam(x: number, y0: number, halfW: number, top: number) {
        if (this.fxLive >= 40) { return; }
        this.fxLive += 1;
        const n = new Node('laser');
        n.addComponent(UITransform).setContentSize(10, 10);
        n.setPosition(x, 0, 0);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(244, 114, 182, 60);
        g.rect(-halfW, y0 + 20, halfW * 2, top - y0);
        g.fill();
        g.fillColor = new Color(247, 168, 208, 150);
        g.rect(-halfW * 0.45, y0 + 20, halfW * 0.9, top - y0);
        g.fill();
        g.fillColor = new Color(255, 228, 240);
        g.rect(-5, y0 + 20, 10, top - y0);
        g.fill();
        this.worldLayer.addChild(n);
        const op = n.addComponent(UIOpacity);
        tween(n).to(0.24, { scale: new Vec3(0.05, 1, 1) }).start();
        tween(op).to(0.24, { opacity: 0 }).call(() => { n.destroy(); this.fxLive = Math.max(0, this.fxLive - 1); }).start();
    }

    /** 黑洞弹：在敌群密集处生成黑洞 */
    public spawnBlackhole() {
        const lvl = this.stats.blackhole;
        // 优先挂在存活敌机最密集的位置附近
        let cx = this.playerNode.position.x + (this.rand() * 2 - 1) * 160;
        let cy = this.playerNode.position.y + 220 + this.rand() * 180;
        let bestScore = -1;
        for (const e of this.enemys) {
            if (e.dead) continue;
            const ep = e.node.getPosition();
            if (ep.y < -this.halfSize.y * 0.4) continue;
            let score = 0;
            for (const o of this.enemys) {
                if (o.dead) continue;
                const op = o.node.getPosition();
                const dx = op.x - ep.x, dy = op.y - ep.y;
                if (dx * dx + dy * dy < 220 * 220) { score += 1; }
            }
            if (score > bestScore) { bestScore = score; cx = ep.x; cy = ep.y; }
        }
        cy = Math.min(cy, this.halfSize.y - 120);
        cx = Math.max(-this.halfSize.x + 100, Math.min(this.halfSize.x - 100, cx));

        const n = new Node('blackhole');
        n.addComponent(UITransform).setContentSize(10, 10);
        const core = new Node('core');
        n.addChild(core);
        const cg = core.addComponent(Graphics);
        cg.fillColor = new Color(15, 10, 30, 235);
        cg.circle(0, 0, 34);
        cg.fill();
        cg.strokeColor = new Color(129, 140, 248, 220);
        cg.lineWidth = 5;
        cg.circle(0, 0, 36);
        cg.stroke();
        const ring = new Node('ring');
        n.addChild(ring);
        const rg = ring.addComponent(Graphics);
        for (let i = 0; i < 3; i++) {
            rg.strokeColor = new Color(165, 180, 252, 190 - i * 40);
            rg.lineWidth = 4;
            rg.arc(0, 0, 48 + i * 22, i * 2.1, i * 2.1 + 4.4);
            rg.stroke();
        }
        n.setPosition(cx, cy, 0);
        this.worldLayer.addChild(n);

        const bh: Blackhole = { node: n, ring, life: 3, dmgTick: 0, level: lvl };
        this.blackholes.push(bh);
        tween(n).from({ scale: new Vec3(0.1, 0.1, 1) }).to(0.25, { scale: new Vec3(1, 1, 1) }).start();
    }

    private updateBlackholes(dt: number) {
        for (let i = this.blackholes.length - 1; i >= 0; i--) {
            const bh = this.blackholes[i];
            bh.life -= dt;
            bh.ring.angle += 200 * dt;
            bh.dmgTick -= dt;
            const c = bh.node.getPosition();
            const pullR = 240 + bh.level * 20;

            // 吸聚：Boss 与哨戒炮不受位移影响
            for (const e of this.enemys) {
                if (e.dead || e.isBoss || e.kind === 'turret') continue;
                const ep = e.node.getPosition();
                const dx = c.x - ep.x, dy = c.y - ep.y;
                const d2 = dx * dx + dy * dy;
                if (d2 < pullR * pullR && d2 > 1) {
                    const d = Math.sqrt(d2);
                    const pull = 340 * (1 - d / pullR) + 80;
                    e.node.setPosition(ep.x + dx / d * pull * dt, ep.y + dy / d * pull * dt, 0);
                }
            }
            // 碾压伤害：近身周期结算
            if (bh.dmgTick <= 0) {
                bh.dmgTick = 0.4;
                const dmg = Math.max(1, Math.round(this.stats.damage * (0.6 + 0.3 * bh.level)));
                for (const e of this.enemys.slice()) {
                    if (e.dead) continue;
                    const ep = e.node.getPosition();
                    const dx = ep.x - c.x, dy = ep.y - c.y;
                    if (dx * dx + dy * dy < 95 * 95) {
                        this.dealDamage(e, dmg);
                    }
                }
            }
            if (bh.life <= 0) {
                this.spawnRingFx(c.x, c.y, 150, new Color(129, 140, 248, 220), 5, 0.35);
                bh.node.destroy();
                this.blackholes.splice(i, 1);
            }
        }
    }

    /** 扩散圆环特效（受特效并发预算约束） */
    public spawnRingFx(x: number, y: number, radius: number, color: Color, lineWidth: number, dur: number) {
        if (this.fxLive >= 40) { return; }
        this.fxLive += 1;
        const n = new Node('ring-fx');
        n.addComponent(UITransform).setContentSize(10, 10);
        const g = n.addComponent(Graphics);
        g.strokeColor = color;
        g.lineWidth = lineWidth;
        g.circle(0, 0, radius);
        g.stroke();
        n.setPosition(x, y, 0);
        n.setScale(0.15, 0.15, 1);
        this.worldLayer.addChild(n);
        tween(n).to(dur, { scale: new Vec3(1, 1, 1) }).start();
        const op = n.addComponent(UIOpacity);
        tween(op).to(dur, { opacity: 0 }).call(() => { n.destroy(); this.fxLive = Math.max(0, this.fxLive - 1); }).start();
    }

    /** 闪光圆特效（自爆等，受特效并发预算约束） */
    private spawnFlashFx(x: number, y: number, radius: number, color: Color) {
        if (this.fxLive >= 40) { return; }
        this.fxLive += 1;
        const n = new Node('flash-fx');
        n.addComponent(UITransform).setContentSize(10, 10);
        const g = n.addComponent(Graphics);
        g.fillColor = color;
        g.circle(0, 0, radius);
        g.fill();
        n.setPosition(x, y, 0);
        this.worldLayer.addChild(n);
        const op = n.addComponent(UIOpacity);
        tween(n).to(0.3, { scale: new Vec3(1.5, 1.5, 1) }).start();
        tween(op).to(0.3, { opacity: 0 }).call(() => { n.destroy(); this.fxLive = Math.max(0, this.fxLive - 1); }).start();
    }

    /** 击杀/伤害反馈飘字（对象池复用，上飘 + 淡出），size 可调以区分暴击 */
    public spawnFloatText(x: number, y: number, str: string, color: Color, size = 24) {
        // 满员：小号数字（普通伤害/治疗）直接丢弃；大号文字（暴击/道具播报）顶掉最旧的小字
        if (this.floatActive.length >= GameRoot.FLOAT_CAP) {
            const idx = this.floatActive.findIndex(f => f.label.fontSize < 24);
            if (size < 24 || idx < 0) { return; }
            this.recycleFloat(this.floatActive[idx], true);
        }
        let it = this.floatPool.pop();
        if (!it) {
            const n = new Node('float-text');
            n.addComponent(UITransform).setContentSize(80, 40);
            const l = n.addComponent(Label);
            it = { node: n, label: l, op: n.addComponent(UIOpacity) };
            this.worldLayer.addChild(n);
        }
        it.node.active = true;
        it.label.string = str;
        it.label.fontSize = size;
        it.label.lineHeight = size + 4;
        it.label.color = color;
        it.node.setPosition(x, y, 0);
        it.op.opacity = 255;
        this.floatActive.push(it);
        tween(it.node).by(0.7, { position: new Vec3(0, 48, 0) }).start();
        tween(it.op).delay(0.3).to(0.4, { opacity: 0 }).call(() => this.recycleFloat(it, false)).start();
    }

    private recycleFloat(it: FloatItem, forced: boolean) {
        const i = this.floatActive.indexOf(it);
        if (i < 0) return;
        this.floatActive.splice(i, 1);
        if (forced) {
            // 被顶掉时动画未必走完，先停掉残留 tween 再回池
            Tween.stopAllByTarget(it.node);
            Tween.stopAllByTarget(it.op);
        }
        it.node.active = false;
        this.floatPool.push(it);
    }

    // ---------------- 子弹与宝石 ----------------

    public getBullet(): Bullet {
        let b = this.bulletPool.pop();
        if (!b) {
            const n = new Node('Bullet');
            n.addComponent(UITransform).setContentSize(18, 30);
            n.addComponent(Graphics);
            n.addComponent(Bullet);
            this.worldLayer.addChild(n);
            b = n.getComponent(Bullet)!;
        }
        this.bullets.push(b);
        return b;
    }

    public recycleBullet(b: Bullet) {
        if (this.bulletPool.indexOf(b) >= 0) return;
        const i = this.bullets.indexOf(b);
        if (i >= 0) { this.bullets.splice(i, 1); }
        if (b.hostile) { this.hostileBullets = Math.max(0, this.hostileBullets - 1); }
        b.node.active = false;
        this.bulletPool.push(b);
    }

    // ---------------- 跟踪导弹 ----------------

    public getMissile(): Missile {
        let m = this.missilePool.pop();
        if (!m) {
            const n = new Node('Missile');
            n.addComponent(UITransform).setContentSize(14, 20);
            n.addComponent(Graphics);
            n.addComponent(Missile);
            this.worldLayer.addChild(n);
            m = n.getComponent(Missile)!;
        }
        this.missiles.push(m);
        return m;
    }

    public recycleMissile(m: Missile) {
        if (this.missilePool.indexOf(m) >= 0) return;
        const i = this.missiles.indexOf(m);
        if (i >= 0) { this.missiles.splice(i, 1); }
        m.node.active = false;
        this.missilePool.push(m);
    }

    /** 最近的存活敌机 */
    public findNearestEnemy(from: Vec3): Enemy | null {
        let best: Enemy | null = null;
        let bestDist = Infinity;
        for (const e of this.enemys) {
            if (e.dead) continue;
            const ep = e.node.getPosition();
            const dx = ep.x - from.x;
            const dy = ep.y - from.y;
            const d = dx * dx + dy * dy;
            if (d < bestDist) {
                bestDist = d;
                best = e;
            }
        }
        return best;
    }

    // ---------------- 随机道具 ----------------

    /** 基础掉落池；暴击率满值后不再掉「暴」，冰冻力场需成就「精英猎人」解锁 */
    private powerKinds(): PowerUpKind[] {
        const kinds: PowerUpKind[] = ['magnet', 'vacuum', 'rage', 'heal1', 'heal3', 'invinc', 'shield', 'xp2'];
        if (this.stats.critRate < 0.6) { kinds.push('crit'); }
        if (MetaSave.hasAchievement('eliteHunter')) { kinds.push('freezeField'); }
        return kinds;
    }

    public getPowerUp(): PowerUp {
        let u = this.powerPool.pop();
        if (!u) {
            const n = new Node('PowerUp');
            n.addComponent(UITransform).setContentSize(40, 40);
            n.addComponent(Graphics);
            n.addComponent(PowerUp);
            this.worldLayer.addChild(n);
            u = n.getComponent(PowerUp)!;
        }
        return u;
    }

    public recyclePowerUp(u: PowerUp) {
        if (this.powerPool.indexOf(u) >= 0) return;
        u.node.active = false;
        this.powerPool.push(u);
    }

    /** 击毁敌机时按概率掉落道具（幸运合约提升掉率） */
    public tryDropPowerUp(pos: Vec3) {
        const dropRate = 0.04 * (1 + 0.25 * MetaSave.metaLevel('luck'));
        if (this.rand() > dropRate) return;
        const kinds = this.powerKinds();
        const kind = kinds[Math.floor(this.rand() * kinds.length)];
        const u = this.getPowerUp();
        u.init(kind, pos.x, pos.y);
    }

    /** 强制掉落（Boss / 贪婪词条）：绕过概率 */
    public dropPowerUp(pos: Vec3) {
        const kinds = this.powerKinds();
        const kind = kinds[Math.floor(this.rand() * kinds.length)];
        const u = this.getPowerUp();
        u.init(kind, pos.x, pos.y);
    }

    /** 道具生效 */
    public applyPowerUp(kind: PowerUpKind) {
        const s = this.stats;
        const D = GameRoot.EFFECT_DURATION;
        const p = this.playerNode.getPosition();
        // 拾取反馈飘字（战机头顶）
        const say = (text: string, color: Color, size = 22) => {
            this.spawnFloatText(p.x, p.y + 64, text, color, size);
        };
        switch (kind) {
            case 'magnet':
                this.effectMagnet = D.magnet;
                say('磁力全开', new Color(103, 232, 249));
                break;
            case 'invinc':
                this.effectInvinc = D.invinc;
                say(`无敌 ${D.invinc} 秒！`, new Color(255, 223, 128), 26);
                break;
            case 'vacuum':
                this.vacuumGems(); // 立即吸附全场所有能量
                say('能量全收！', new Color(167, 139, 250));
                break;
            case 'rage':
                this.effectRage = D.rage;
                say('狂暴！射速翻倍', new Color(244, 63, 94));
                break;
            case 'xp2':
                this.effectXp2 = D.xp2;
                say(`双倍经验 ${D.xp2} 秒`, new Color(251, 191, 36));
                break;
            case 'freezeField':
                // 冰冻力场：全场敌机深度冰缓
                for (const e of this.enemys) {
                    if (!e.dead) { e.applySlow(0.12, D.freezeField); }
                }
                this.spawnRingFx(p.x, p.y, 640, new Color(125, 211, 252, 200), 6, 0.6);
                say('冰冻力场！', new Color(125, 211, 252), 26);
                SoundFX.I.freeze();
                break;
            case 'heal1': {
                if (s.hp >= s.maxHp) {
                    say('生命已满', new Color(148, 163, 184), 20);
                } else {
                    s.hp = Math.min(s.maxHp, s.hp + 1);
                    say(`生命 +1`, new Color(134, 239, 172));
                }
                break;
            }
            case 'heal3': {
                if (s.hp >= s.maxHp) {
                    say('生命已满', new Color(148, 163, 184), 20);
                } else {
                    s.hp = Math.min(s.maxHp, s.hp + 3);
                    say(`生命 +3`, new Color(16, 185, 129));
                }
                break;
            }
            case 'crit': {
                if (s.critRate >= 0.6) {
                    say('暴击率已满', new Color(148, 163, 184), 20);
                } else {
                    s.critRate = Math.min(0.6, s.critRate + 0.1);
                    say(`暴击率 ${Math.round(s.critRate * 100)}%`, new Color(255, 138, 61));
                }
                break;
            }
            case 'shield':
                if (s.shieldMax > 0) {
                    s.shield = 1;
                    s.shieldTimer = 0;
                    say('护盾充能完毕', new Color(148, 163, 184));
                } else {
                    s.hp = Math.min(s.maxHp, s.hp + 1); // 没有护盾模块时改为应急修复
                    say('应急修复 +1', new Color(134, 239, 172));
                }
                break;
        }
        SoundFX.I.power();
    }

    /** 场上所有宝石标记为强制吸向玩家（不论距离） */
    public vacuumGems() {
        for (const g of this.gems) {
            g.attract = true;
        }
    }

    private getGem(): Gem {
        let g = this.gemPool.pop();
        if (!g) {
            const n = new Node('Gem');
            n.addComponent(UITransform).setContentSize(16, 16);
            n.addComponent(Gem);
            this.worldLayer.addChild(n);
            g = n.getComponent(Gem)!;
        }
        return g;
    }

    public recycleGem(g: Gem) {
        if (this.gemPool.indexOf(g) >= 0) return;
        const i = this.gems.indexOf(g);
        if (i >= 0) { this.gems.splice(i, 1); }
        g.node.active = false;
        this.gemPool.push(g);
    }

    // ---------------- 碰撞 ----------------

    private checkCollisions() {
        // 玩家子弹打敌人（倒序遍历，回收时会 splice）
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (b.hostile) { continue; }
            const bp = b.node.getPosition();
            for (const e of this.enemys) {
                if (e.dead) continue;
                const ep = e.node.getPosition();
                const r = 30 * e.node.scale.x + 8;
                const dx = bp.x - ep.x;
                const dy = bp.y - ep.y;
                if (dx * dx + dy * dy < r * r) {
                    const dmg = b.damage;
                    this.recycleBullet(b);
                    this.dealDamage(e, dmg);
                    // 冰冻弹：命中附带减速
                    if (!e.dead && this.stats.freeze > 0) {
                        e.applySlow(0.7 - 0.12 * (this.stats.freeze - 1), 1.4);
                    }
                    break;
                }
            }
        }

        // 环绕电球撞击
        const player = this.playerNode.getComponent(Player)!;
        for (let i = 0; i < player.orbNodes.length; i++) {
            if (player.orbCds[i] > 0) { continue; }
            const op = player.orbNodes[i].worldPosition;
            for (const e of this.enemys) {
                if (e.dead) continue;
                const ep = e.node.worldPosition;
                const r = 13 + 30 * e.node.scale.x;
                const dx = op.x - ep.x;
                const dy = op.y - ep.y;
                if (dx * dx + dy * dy < r * r) {
                    player.orbCds[i] = 0.35;
                    this.dealDamage(e, this.stats.damage);
                    break;
                }
            }
        }

        // 敌方光球打玩家
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (!b.hostile) { continue; }
            const bp = b.node.getPosition();
            const pp = this.playerNode.getPosition();
            const dx = bp.x - pp.x;
            const dy = bp.y - pp.y;
            if (dx * dx + dy * dy < 40 * 40) {
                this.recycleBullet(b);
                this.playerNode.getComponent(Player)!.takeDamage(this.enemyHitDamage());
            }
        }

        // 敌人撞玩家
        const pp = this.playerNode.getPosition();
        for (const e of this.enemys) {
            if (e.dead) continue;
            const ep = e.node.getPosition();
            const r = 30 * e.node.scale.x + 26;
            const dx = pp.x - ep.x;
            const dy = pp.y - ep.y;
            if (dx * dx + dy * dy < r * r) {
                this.playerNode.getComponent(Player)!.takeDamage(this.enemyHitDamage());
                break;
            }
        }
    }

    // ---------------- 经验 / 金币 / 升级 / 商店 ----------------

    public addXp(amount: number) {
        if (this.mode === 'waves' || amount <= 0) return; // 波次模式成长全靠金币
        const boost = this.effectXp2 > 0 ? 2 : 1;
        this.xp += amount * this.stats.xpGain * boost;
        SoundFX.I.pick();
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level += 1;
            // 后期经验曲线变陡（平方项），拖住升级速度避免数值无限膨胀
            this.xpToNext = 5 + this.level * 3 + Math.floor(this.level * this.level * 0.15);
            this.pendingLevelUps += 1;
            if (this.level >= 10) { this.tryUnlock('veteran'); }
        }
    }

    /** 金币入账（picked=true 计入拾取成就） */
    public addGold(n: number, picked = true) {
        if (n <= 0) return;
        this.gold += n;
        if (picked) {
            this.runGoldPicked += n;
            SoundFX.I.gold();
            if (this.runGoldPicked >= 100) { this.tryUnlock('tycoon'); }
        }
    }

    public chooseUpgrade(up: Upgrade) {
        if (this.state !== 'levelup') return;
        up.apply(this.stats);
        this.pendingLevelUps -= 1;
        if (this.pendingLevelUps > 0) {
            this.overlays.showLevelUp(rollUpgrades(this.stats));
        } else {
            this.overlays.hideAll();
            this.state = 'playing';
        }
    }

    /** 波次结束：发波次奖励金币并进商店 */
    private endWave() {
        const bonus = 18 + this.wave * 4;
        this.addGold(bonus, false);
        this.spawnFloatText(this.playerNode.position.x, this.playerNode.position.y + 80, `波次奖励 +${bonus} 金`, new Color(251, 191, 36), 24);
        this.state = 'shop';
        this.shopRerolls = 0;
        this.refreshShop();
        SoundFX.I.levelup();
    }

    private refreshShop() {
        this.shopOffers = rollUpgrades(this.stats, 4);
        this.overlays.showShop(this.shopOffers, this.gold, this.wave, this.rerollCost());
    }

    private rerollCost(): number { return 8 + this.shopRerolls * 4; }

    /** 商店购买 */
    public buyShopOffer(index: number): boolean {
        if (this.state !== 'shop') return false;
        const up = this.shopOffers[index];
        if (!up) return false;
        const price = up.price ?? 25;
        if (this.gold < price) { SoundFX.I.hurt(); return false; }
        this.gold -= price;
        up.apply(this.stats);
        this.shopOffers[index] = null as any;
        this.overlays.updateShop(this.shopOffers, this.gold);
        SoundFX.I.buy();
        return true;
    }

    /** 商店刷新货架 */
    public rerollShop() {
        if (this.state !== 'shop') return;
        const cost = this.rerollCost();
        if (this.gold < cost) { SoundFX.I.hurt(); return; }
        this.gold -= cost;
        this.shopRerolls += 1;
        this.refreshShop();
        SoundFX.I.pick();
    }

    /** 开始下一波 */
    public nextWave() {
        if (this.state !== 'shop') return;
        this.wave += 1;
        this.waveTime = Math.min(24 + this.wave * 2, 40);
        this.overlays.hideAll();
        this.state = 'playing';
        SoundFX.I.pick();
    }

    /** 冲刺计数（Player 调用） */
    public onDash() {
        this.runDashes += 1;
        if (this.runDashes >= 30) { this.tryUnlock('dasher'); }
    }

    /** 成就解锁：新解锁时弹 toast */
    public tryUnlock(id: string) {
        if (MetaSave.unlock(id)) {
            const def = MetaSave.ACHIEVEMENTS.find(a => a.id === id);
            if (def) {
                this.overlays.toast(`成就解锁：${def.name}`);
                SoundFX.I.achieve();
            }
        }
    }

    // ---------------- 死亡与重开 ----------------

    public onPlayerDead() {
        this.state = 'gameover';
        SoundFX.I.boom(true);

        // 结算数据核心
        const cores = Math.floor(this.kills / 10) + this.level + Math.floor(this.elapsed / 60)
            + (this.mode === 'waves' ? this.wave * 2 : 0);
        this.lastCoresEarned = cores;
        MetaSave.addCores(cores);

        // 每日挑战：记录当日最佳
        this.lastDailyRecord = false;
        if (this.mode === 'daily') {
            this.lastDailyRecord = MetaSave.setDailyBest(MetaSave.todayKey(), Math.floor(this.elapsed));
        }

        this.scheduleOnce(() => {
            this.overlays.showGameOver(this.elapsed, this.level, this.kills);
        }, 0.7);
    }

    /** 清空场上所有实体与效果（重开 / 回菜单共用） */
    private clearWorld() {
        for (const b of this.bullets.slice()) { this.recycleBullet(b); }
        for (const m of this.missiles.slice()) { this.recycleMissile(m); }
        for (const e of this.enemys.slice()) { this.recycleEnemy(e); }
        for (const g of this.gems.slice()) { this.recycleGem(g); }
        for (const bh of this.blackholes) { bh.node.destroy(); }
        this.blackholes.length = 0;
        for (const b of this.bulletPool) { b.node.active = false; }
        for (const m of this.missilePool) { m.node.active = false; }
        for (const u of this.powerPool) { u.node.active = false; }
        for (const e of this.enemyPool) { e.node.active = false; }
        for (const g of this.gemPool) { g.node.active = false; }
        for (const f of this.floatActive.slice()) { this.recycleFloat(f, true); }
        this.enemys.length = 0;
        this.bullets.length = 0;
        this.missiles.length = 0;
        this.gems.length = 0;
        this.hostileBullets = 0;
        this.effectMagnet = 0;
        this.effectRage = 0;
        this.effectXp2 = 0;
        this.effectInvinc = 0;
    }

    public restart() {
        this.clearWorld();

        this.stats = createBaseStats();
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 5;
        this.kills = 0;
        this.elapsed = 0;
        this.pendingLevelUps = 0;
        this.spawnTimer = 0.5;
        this.eliteTimer = 15;
        this.bossTimer = 45;
        this.turretTimer = 55;
        this.boss = null;
        this.lastThreat = -1;
        this.gold = 0;
        this.runDashes = 0;
        this.runGoldPicked = 0;
        this.runEliteKills = 0;

        if (this.mode === 'waves') {
            this.wave = 1;
            this.waveTime = Math.min(24 + this.wave * 2, 40);
            this.waveBossDone = 0;
            this.gold = 30 * MetaSave.metaLevel('startGold');   // 战备资金
        } else {
            this.wave = 0;
            this.waveTime = 0;
        }

        this.playerNode.getComponent(Player)!.resetState();
        this.overlays.hideAll();
        this.state = 'playing';
    }
}
