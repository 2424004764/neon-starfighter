import { _decorator, Component, Node, Vec3, Color, Graphics, Label, UITransform, UIOpacity, view, ResolutionPolicy, input, Input, EventKeyboard, KeyCode, tween, Mask } from 'cc';
import { Stats, createBaseStats, rollUpgrades, Upgrade } from './Upgrades';
import { Player } from './Player';
import { Enemy, EnemyKind } from './Enemy';
import { Bullet } from './Bullet';
import { Missile } from './Missile';
import { Gem } from './Gem';
import { PowerUp, PowerUpKind } from './PowerUp';
import { Hud } from './Hud';
import { Overlays } from './Overlays';
import { SoundFX } from './SoundFX';
const { ccclass, executionOrder } = _decorator;

/**
 * 《霓虹深空》主控：状态机 / 刷怪 / 碰撞 / 经验升级 / 对象池
 * 视觉全部由代码绘制，不依赖图片资源
 */
@ccclass('GameRoot')
@executionOrder(-1000)
export class GameRoot extends Component {
    public static I: GameRoot = null!;

    /** 道具效果持续时长（秒），Hud 状态栏与效果计时共用 */
    public static readonly EFFECT_DURATION = { magnet: 6, rage: 8, xp2: 10, shieldRecharge: 12, invinc: 5 };

    public state: 'menu' | 'playing' | 'paused' | 'levelup' | 'gameover' = 'menu';
    public stats: Stats = createBaseStats();
    public level = 1;
    public xp = 0;
    public xpToNext = 5;
    public kills = 0;
    public elapsed = 0;
    public halfSize: Vec3 = new Vec3(360, 640, 0);

    public playerNode: Node = null!;
    public bullets: Bullet[] = [];
    public missiles: Missile[] = [];
    public enemys: Enemy[] = [];
    public gems: Gem[] = [];
    public boss: Enemy | null = null;

    // 道具效果（剩余秒数，0 表示无）
    public effectMagnet = 0;
    public effectRage = 0;
    public effectXp2 = 0;
    public effectInvinc = 0;

    private ready = false;
    private pendingLevelUps = 0;
    private spawnTimer = 0;
    private eliteTimer = 15;
    private bossTimer = 45;
    private bulletPool: Bullet[] = [];
    private missilePool: Missile[] = [];
    private powerPool: PowerUp[] = [];
    private enemyPool: Enemy[] = [];
    private gemPool: Gem[] = [];
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

        // 键盘：Esc / 空格 暂停与继续
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
        // 进入开始界面：点「开始新游戏」或按空格才正式开局
        this.hud.setHidden(true);
        this.state = 'menu';
        this.overlays.showMenu();
    }

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

    /** 给节点挂图形组件 */
    private getGraphics(n: Node): Graphics {
        return n.getComponent(Graphics) || n.addComponent(Graphics);
    }

    /** 键盘：升级选卡用 W/S/空格；开始界面空格开局；其余时候 Esc/空格 切换暂停 */
    private onKeyDown(e: EventKeyboard) {
        if (this.state === 'menu') {
            if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER) {
                this.startGame();
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
        if (e.keyCode === KeyCode.ESCAPE || e.keyCode === KeyCode.SPACE) {
            this.togglePause();
        }
    }

    /** 从开始界面正式开局 */
    public startGame() {
        if (this.state !== 'menu') return;
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

    update(dt: number) {
        if (!this.ready) return;

        const uiT = this.node.getComponent(UITransform);
        if (uiT) {
            this.halfSize.set(uiT.width / 2, uiT.height / 2, 0);
        }

        // 暂停时整个世界冻结
        if (this.state === 'paused') return;

        // 背景视觉时钟（升级选卡时宇宙仍在流动）
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
        this.spawnLogic(dt);
        this.checkCollisions();

        // 道具效果倒计时
        if (this.effectMagnet > 0) { this.effectMagnet -= dt; }
        if (this.effectRage > 0) { this.effectRage -= dt; }
        if (this.effectXp2 > 0) { this.effectXp2 -= dt; }
        if (this.effectInvinc > 0) { this.effectInvinc -= dt; }

        if (this.pendingLevelUps > 0) {
            this.state = 'levelup';
            SoundFX.I.levelup();
            this.overlays.showLevelUp(rollUpgrades(this.stats));
        }
    }

    // ---------------- 刷怪 ----------------

    private spawnLogic(dt: number) {
        // 场上普通怪太多时先停止刷新（Boss 不受限制）
        if (this.enemys.length < 22) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                // 敌机种类：10 秒后出现巡卫，20 秒后出现突袭者，15 秒后出现分裂体
                let kind: EnemyKind = 'chaser';
                const roll = Math.random();
                if (this.elapsed > 20 && roll < 0.2) { kind = 'speeder'; }
                else if (this.elapsed > 15 && roll < 0.42) { kind = 'splitter'; }
                else if (this.elapsed > 10 && roll < 0.62) { kind = 'shooter'; }
                this.spawnEnemy(1, kind);
                // 开局 1.8 秒一只，随时间逐渐压缩到 0.45 秒
                this.spawnTimer = Math.max(0.45, 1.8 - this.elapsed * 0.01);
            }
        } else {
            this.spawnTimer = 0.5;
        }

        this.eliteTimer -= dt;
        if (this.elapsed > 30 && this.eliteTimer <= 0) {
            this.spawnEnemy(1.5, 'chaser'); // 精英猎手：更大更硬
            this.eliteTimer = 20;
        }

        // Boss：45 秒首次登场，此后每 75 秒一只
        this.bossTimer -= dt;
        if (this.elapsed > 45 && this.bossTimer <= 0 && !this.boss) {
            this.spawnEnemy(2.4, 'boss');
            SoundFX.I.bossAlarm();
            this.bossTimer = 75;
        }
    }

    private spawnEnemy(scale: number, kind: EnemyKind = 'chaser') {
        let e = this.enemyPool.pop();
        if (!e) {
            const n = new Node('Enemy');
            n.addComponent(UITransform).setContentSize(60, 60);
            n.addComponent(UIOpacity);
            n.addComponent(Enemy);
            this.worldLayer.addChild(n);
            e = n.getComponent(Enemy)!;
        }
        e.init(scale, this.elapsed, kind);
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

    /** 敌方光球 */
    public spawnEnemyBullet(x: number, y: number, angle: number, speed: number) {
        const b = this.getBullet();
        b.node.setPosition(x, y, 0);
        b.init(angle, speed, 1, true);
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
        const value = e.gemValue();
        if (value > 0) {
            const p = e.node.getPosition();
            // 25% 概率能量直接入包（带飘字反馈），否则掉落宝石
            if (Math.random() < 0.25) {
                this.addXp(value);
                this.spawnFloatText(p.x, p.y, '+' + value, new Color(165, 243, 252));
            } else {
                const gem = this.getGem();
                gem.node.setPosition(p.x, p.y, 0);
                gem.init(p.x, p.y, value);
                this.gems.push(gem);
            }
        }
        // 掉落随机道具（Boss 必掉）
        if (e.isBoss || Math.random() < 0.08) {
            this.tryDropPowerUp(e.node.getPosition());
        }
        SoundFX.I.boom(e.isBoss);
        if (e.isBoss) {
            this.boss = null;
        }
    }

    /**
     * 对敌人结算一次伤害：掷暴击、应用伤害、弹出伤害数字
     * 所有伤害来源（子弹/电球/导弹）统一走这里
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
    }

    /** 击杀反馈飘字（上飘 + 淡出后销毁），size 可调以区分暴击 */
    public spawnFloatText(x: number, y: number, str: string, color: Color, size = 24) {
        const n = new Node('float-text');
        n.addComponent(UITransform).setContentSize(80, 40);
        const l = n.addComponent(Label);
        l.string = str;
        l.fontSize = size;
        l.lineHeight = size + 4;
        l.color = color;
        n.setPosition(x, y, 0);
        this.worldLayer.addChild(n);
        tween(n).by(0.7, { position: new Vec3(0, 48, 0) }).start();
        const op = n.addComponent(UIOpacity);
        tween(op).delay(0.3).to(0.4, { opacity: 0 }).call(() => { n.destroy(); }).start();
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

    private static POWER_KINDS: PowerUpKind[] = ['magnet', 'vacuum', 'rage', 'heal1', 'heal3', 'crit', 'invinc', 'shield', 'xp2'];

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

    /** 击毁敌机时按概率掉落道具 */
    public tryDropPowerUp(pos: Vec3) {
        if (Math.random() > 0.08) return;
        const kinds = GameRoot.POWER_KINDS;
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        const u = this.getPowerUp();
        u.init(kind, pos.x, pos.y);
    }

    /** 道具生效 */
    public applyPowerUp(kind: PowerUpKind) {
        const s = this.stats;
        const D = GameRoot.EFFECT_DURATION;
        switch (kind) {
            case 'magnet':
                this.effectMagnet = D.magnet;
                break;
            case 'invinc':
                this.effectInvinc = D.invinc;
                break;
            case 'vacuum':
                this.vacuumGems(); // 立即吸附全场所有能量
                break;
            case 'rage':
                this.effectRage = D.rage;
                break;
            case 'xp2':
                this.effectXp2 = D.xp2;
                break;
            case 'heal1':
                s.hp = Math.min(s.maxHp, s.hp + 1);
                break;
            case 'heal3':
                s.hp = Math.min(s.maxHp, s.hp + 3);
                break;
            case 'crit':
                s.critRate = Math.min(0.6, s.critRate + 0.1); // 永久提升暴击率，上限 60%
                break;
            case 'shield':
                if (s.shieldMax > 0) {
                    s.shield = 1;
                    s.shieldTimer = 0;
                } else {
                    s.hp = Math.min(s.maxHp, s.hp + 1); // 没有护盾模块时改为应急修复
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
            const gr = n.addComponent(Graphics);
            gr.fillColor = new Color(103, 232, 249, 70);
            gr.circle(0, 0, 10);
            gr.fill();
            gr.fillColor = new Color(165, 243, 252);
            gr.moveTo(0, -8); gr.lineTo(5, 0); gr.lineTo(0, 8); gr.lineTo(-5, 0); gr.close(); gr.fill();
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
                this.playerNode.getComponent(Player)!.takeDamage(1);
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
                this.playerNode.getComponent(Player)!.takeDamage(1);
                break;
            }
        }
    }

    // ---------------- 经验与升级 ----------------

    public addXp(amount: number) {
        if (amount <= 0) return;
        const boost = this.effectXp2 > 0 ? 2 : 1;
        this.xp += amount * this.stats.xpGain * boost;
        SoundFX.I.pick();
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level += 1;
            this.xpToNext = 5 + this.level * 3;
            this.pendingLevelUps += 1;
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

    // ---------------- 死亡与重开 ----------------

    public onPlayerDead() {
        this.state = 'gameover';
        SoundFX.I.boom(true);
        this.scheduleOnce(() => {
            this.overlays.showGameOver(this.elapsed, this.level, this.kills);
        }, 0.7);
    }

    public restart() {
        for (const b of this.bullets.slice()) { this.recycleBullet(b); }
        for (const m of this.missiles.slice()) { this.recycleMissile(m); }
        for (const e of this.enemys.slice()) { this.recycleEnemy(e); }
        for (const g of this.gems.slice()) { this.recycleGem(g); }
        for (const b of this.bulletPool) { b.node.active = false; }
        for (const m of this.missilePool) { m.node.active = false; }
        for (const u of this.powerPool) { u.node.active = false; }
        for (const e of this.enemyPool) { e.node.active = false; }
        for (const g of this.gemPool) { g.node.active = false; }
        this.enemys.length = 0;
        this.bullets.length = 0;
        this.missiles.length = 0;
        this.gems.length = 0;
        this.effectMagnet = 0;
        this.effectRage = 0;
        this.effectXp2 = 0;
        this.effectInvinc = 0;

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
        this.boss = null;

        this.playerNode.getComponent(Player)!.resetState();
        this.overlays.hideAll();
        this.state = 'playing';
    }
}
