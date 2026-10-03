import { _decorator, Component, Node, Vec3, Color, Graphics, Label, input, Input, EventTouch, EventKeyboard, KeyCode, UIOpacity, UITransform, tween } from 'cc';
import { GameRoot } from './GameRoot';
import { SoundFX } from './SoundFX';
const { ccclass } = _decorator;

const BASE_SPEED = 460;   // moveSpeed 为 1 时的速度（像素/秒）
const BULLET_SPEED = 640;
const ORBIT_RADIUS = 78;
const ORBIT_SPEED = 2.6;  // 电球旋转角速度（弧度/秒）

const DASH_SPEED = 1500;      // 冲刺瞬移速度
const DASH_DURATION = 0.13;   // 冲刺位移时长
public static readonly DASH_CD = 2.6;  // 冲刺冷却（Hud 读取）
const DASH_INVINC = 0.35;     // 冲刺后无敌帧

/** 玩家：霓虹箭形战机，跟随手指移动，自动射击；空格/Shift 冲刺 */
@ccclass('Player')
export class Player extends Component {
    private target: Vec3 | null = null;
    private fireTimer = 0;
    private missileTimer = 0;
    private laserTimer = 0;
    private blackholeTimer = 0;
    private invincible = 0;
    private dying = false;
    private animT = 0;
    private keys = new Set<number>();   // 当前按住的键盘按键

    // 冲刺状态
    public dashCdT = 0;                 // 冷却剩余（Hud 读取显示）
    private dashT = 0;                  // 位移剩余时长
    private dashDir = new Vec3(0, 1, 0);
    private lastDir = new Vec3(0, 1, 0);// 冲刺默认方向 = 最近移动方向

    private bodyNode: Node = null!;
    private classicNode: Node = null!;
    private skinIndex = 0; // 0=霓虹箭形 1=经典战机
    private flameNode: Node = null!;
    private invincRing: Node = null!;
    private shieldRing: Node = null!;
    private dashBtn: Node = null!;
    private dashBtnRing: Graphics = null!;
    public orbNodes: Node[] = [];
    public orbCds: number[] = [];
    private orbAngle = 0;

    onLoad() {
        input.on(Input.EventType.TOUCH_START, this.onTouch, this);
        input.on(Input.EventType.TOUCH_MOVE, this.onTouch, this);
        input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        // 键盘：WASD / 方向键（网页预览下有效）
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        this.buildVisual();
        this.buildDashButton();
    }

    onDestroy() {
        input.off(Input.EventType.TOUCH_START, this.onTouch, this);
        input.off(Input.EventType.TOUCH_MOVE, this.onTouch, this);
        input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
    }

    private onKeyDown(e: EventKeyboard) {
        this.keys.add(e.keyCode);
        this.target = null; // 切换到键盘操控时断开触点跟随
        // V：切换战机皮肤（霓虹箭形 / 经典战机）
        if (e.keyCode === KeyCode.KEY_V) {
            this.skinIndex = 1 - this.skinIndex;
            this.bodyNode.active = this.skinIndex === 0;
            this.classicNode.active = this.skinIndex === 1;
            SoundFX.I.pick();
        }
        // 冲刺：Shift（触屏用屏幕按钮）；空格保留给暂停/选卡确认
        if (e.keyCode === KeyCode.SHIFT_LEFT || e.keyCode === KeyCode.SHIFT_RIGHT) {
            this.tryDash();
        }
    }

    private onKeyUp(e: EventKeyboard) {
        this.keys.delete(e.keyCode);
    }

    /** 读取键盘方向：返回归一化前的 dx/dy */
    private keyAxis(): { dx: number; dy: number } {
        let dx = 0, dy = 0;
        if (this.keys.has(KeyCode.KEY_W) || this.keys.has(KeyCode.ARROW_UP)) { dy += 1; }
        if (this.keys.has(KeyCode.KEY_S) || this.keys.has(KeyCode.ARROW_DOWN)) { dy -= 1; }
        if (this.keys.has(KeyCode.KEY_A) || this.keys.has(KeyCode.ARROW_LEFT)) { dx -= 1; }
        if (this.keys.has(KeyCode.KEY_D) || this.keys.has(KeyCode.ARROW_RIGHT)) { dx += 1; }
        return { dx, dy };
    }

    /** 霓虹造型：发光箭形 + 白色核心；经典造型：橙白涂装螺旋桨战机（致敬老版） */
    private buildVisual() {
        this.bodyNode = new Node('body');
        this.node.addChild(this.bodyNode);
        const g = this.bodyNode.addComponent(Graphics);
        g.fillColor = new Color(34, 211, 238, 55);
        g.circle(0, -2, 27);
        g.fill();
        g.fillColor = new Color(34, 211, 238);
        g.moveTo(0, -26); g.lineTo(19, 17); g.lineTo(0, 9); g.lineTo(-19, 17); g.close(); g.fill();
        g.fillColor = Color.WHITE;
        g.moveTo(0, -14); g.lineTo(8, 8); g.lineTo(-8, 8); g.close(); g.fill();

        // 经典战机皮肤（按 V 切换）
        this.classicNode = new Node('classic');
        this.node.addChild(this.classicNode);
        const cg = this.classicNode.addComponent(Graphics);
        cg.fillColor = new Color(255, 167, 38, 45);
        cg.circle(0, -2, 28);
        cg.fill();
        // 主翼
        cg.fillColor = new Color(255, 167, 38);
        cg.moveTo(0, -4);
        cg.lineTo(-28, 12); cg.lineTo(-28, 20); cg.lineTo(-6, 12);
        cg.lineTo(6, 12); cg.lineTo(28, 20); cg.lineTo(28, 12);
        cg.close(); cg.fill();
        // 机身
        cg.fillColor = new Color(255, 183, 77);
        cg.roundRect(-7, -24, 14, 46, 7);
        cg.fill();
        // 尾翼
        cg.fillColor = new Color(255, 140, 20);
        cg.moveTo(0, -14); cg.lineTo(-12, -26); cg.lineTo(12, -26); cg.close(); cg.fill();
        // 座舱
        cg.fillColor = new Color(224, 242, 254);
        cg.circle(0, -6, 5);
        cg.fill();
        // 螺旋桨旋转残影
        cg.fillColor = new Color(255, 255, 255, 110);
        cg.roundRect(-14, 22, 28, 3, 1.5);
        cg.fill();
        this.classicNode.active = false;

        this.flameNode = new Node('flame');
        this.flameNode.setPosition(0, -30, 0);
        this.node.addChild(this.flameNode);
        const fg = this.flameNode.addComponent(Graphics);
        fg.fillColor = new Color(125, 211, 252, 200);
        fg.moveTo(0, -14); fg.lineTo(6, 0); fg.lineTo(-6, 0); fg.close(); fg.fill();

        this.shieldRing = new Node('shieldRing');
        this.node.addChild(this.shieldRing);
        const sg = this.shieldRing.addComponent(Graphics);
        sg.strokeColor = new Color(103, 232, 249, 190);
        sg.lineWidth = 3;
        sg.circle(0, 0, 37);
        sg.stroke();
        sg.strokeColor = new Color(103, 232, 249, 70);
        sg.lineWidth = 7;
        sg.circle(0, 0, 41);
        sg.stroke();
        this.shieldRing.active = false;

        // 无敌道具光环（金色双环，激活时旋转）
        this.invincRing = new Node('invincRing');
        this.node.addChild(this.invincRing);
        const ig = this.invincRing.addComponent(Graphics);
        ig.strokeColor = new Color(255, 213, 79, 220);
        ig.lineWidth = 4;
        ig.circle(0, 0, 45);
        ig.stroke();
        ig.strokeColor = new Color(255, 236, 160, 90);
        ig.lineWidth = 8;
        ig.circle(0, 0, 52);
        ig.stroke();
        this.invincRing.active = false;
    }

    /** 触屏冲刺按钮（右下角圆形，冷却时暗淡并显示冷却进度） */
    private buildDashButton() {
        const root = GameRoot.I.node;
        const half = GameRoot.I.halfSize;
        this.dashBtn = new Node('DashBtn');
        this.dashBtn.addComponent(UITransform).setContentSize(100, 100);
        this.dashBtn.setPosition(half.x - 78, -half.y + 120, 0);
        root.addChild(this.dashBtn);

        const ring = new Node('ring');
        this.dashBtn.addChild(ring);
        this.dashBtnRing = ring.addComponent(Graphics);
        this.drawDashRing(1);

        const ch = new Node('ch');
        const ct = ch.addComponent(UITransform);
        ct.setContentSize(60, 60);
        const cl = ch.addComponent(Label);
        cl.string = '冲';
        cl.fontSize = 30;
        cl.lineHeight = 34;
        cl.color = new Color(224, 255, 255);
        this.dashBtn.addChild(ch);

        this.dashBtn.on(Node.EventType.TOUCH_END, () => { this.tryDash(); });
        this.dashBtn.active = false;
    }

    /** 重绘冲刺按钮圆环：frac=1 就绪（亮），冷却时灰色扇形 */
    private drawDashRing(frac: number) {
        const g = this.dashBtnRing;
        g.clear();
        const ready = frac >= 1;
        const col = ready ? new Color(103, 232, 249, 230) : new Color(100, 116, 139, 180);
        g.fillColor = new Color(12, 15, 28, ready ? 190 : 150);
        g.circle(0, 0, 44);
        g.fill();
        g.strokeColor = col;
        g.lineWidth = 4;
        g.circle(0, 0, 44);
        g.stroke();
        // 冷却进度弧
        if (!ready && frac > 0) {
            g.strokeColor = new Color(103, 232, 249, 220);
            g.lineWidth = 6;
            const start = Math.PI / 2;
            g.arc(0, 0, 36, start, start - frac * Math.PI * 2, true);
            g.stroke();
        }
    }

    public resetState() {
        this.target = null;
        this.fireTimer = 0;
        this.laserTimer = 0;
        this.blackholeTimer = 0;
        this.invincible = 0;
        this.dying = false;
        this.dashCdT = 0;
        this.dashT = 0;
        this.node.setPosition(0, -GameRoot.I.halfSize.y + 120, 0);
        this.node.setScale(1, 1, 1);
        const op = this.node.getComponent(UIOpacity);
        if (op) { op.opacity = 255; }
        this.syncOrbs();
    }

    private onTouch(e: EventTouch) {
        if (GameRoot.I.state !== 'playing') return;
        const ui = e.getUILocation();
        const half = GameRoot.I.halfSize;
        const x = ui.x - half.x;
        const y = ui.y - half.y;
        // 冲刺按钮区域的触摸不作为移动目标
        if (this.dashBtn && this.dashBtn.active) {
            const bp = this.dashBtn.position;
            const dx = x - bp.x, dy = y - bp.y;
            if (dx * dx + dy * dy < 58 * 58) return;
        }
        this.target = new Vec3(x, y, 0);
    }

    private onTouchEnd() {
        this.target = null;
    }

    /** 冲刺：向最近移动方向瞬移一段，带无敌帧与残影 */
    public tryDash(): boolean {
        const root = GameRoot.I;
        if (root.state !== 'playing' || this.dying) return false;
        if (this.dashCdT > 0 || this.dashT > 0) return false;
        this.dashDir.set(this.lastDir.x, this.lastDir.y, 0);
        this.dashT = DASH_DURATION;
        this.dashCdT = root.stats.dashCd;
        this.invincible = Math.max(this.invincible, DASH_INVINC);
        root.onDash();
        SoundFX.I.dash();
        // 残影：沿冲刺路径撒 4 个渐隐剪影
        for (let i = 1; i <= 4; i++) {
            this.scheduleOnce(() => { this.spawnGhost(); }, i * 0.03);
        }
        return true;
    }

    private spawnGhost() {
        const n = new Node('dash-ghost');
        n.addComponent(UITransform).setContentSize(56, 56);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(34, 211, 238, 90);
        g.moveTo(0, -26); g.lineTo(19, 17); g.lineTo(0, 9); g.lineTo(-19, 17); g.close(); g.fill();
        const p = this.node.getPosition();
        n.setPosition(p.x, p.y, 0);
        this.node.parent.addChild(n);
        const op = n.addComponent(UIOpacity);
        op.opacity = 150;
        tween(n).to(0.3, { scale: new Vec3(0.6, 0.6, 1) }).start();
        tween(op).to(0.3, { opacity: 0 }).call(() => { n.destroy(); }).start();
    }

    /** 按当前属性同步环绕电球数量 */
    private syncOrbs() {
        const want = GameRoot.I.stats.orbs;
        while (this.orbNodes.length < want) {
            const orb = new Node('orb' + this.orbNodes.length);
            orb.addComponent(UITransform).setContentSize(20, 20);
            const g = orb.addComponent(Graphics);
            g.fillColor = new Color(103, 232, 249, 80);
            g.circle(0, 0, 12);
            g.fill();
            g.fillColor = new Color(224, 255, 255);
            g.circle(0, 0, 7);
            g.fill();
            this.node.addChild(orb);
            this.orbNodes.push(orb);
            this.orbCds.push(0);
        }
        while (this.orbNodes.length > want) {
            const orb = this.orbNodes.pop()!;
            this.orbCds.pop();
            orb.destroy();
        }
    }

    update(dt: number) {
        const root = GameRoot.I;
        const stats = root.stats;

        // 冲刺按钮显隐与冷却刷新（暂停/选卡时隐藏）
        if (this.dashBtn) {
            const show = root.state === 'playing' && !this.dying;
            if (this.dashBtn.active !== show) { this.dashBtn.active = show; }
            if (show) {
                const frac = 1 - Math.max(this.dashCdT, 0) / root.stats.dashCd;
                this.drawDashRing(frac);
            }
        }

        if (root.state !== 'playing' || this.dying) return;
        this.animT += dt;

        // 冲刺冷却/位移
        if (this.dashCdT > 0) { this.dashCdT -= dt; }
        if (this.dashT > 0) {
            this.dashT -= dt;
            const p = this.node.getPosition();
            this.node.setPosition(p.x + this.dashDir.x * DASH_SPEED * dt, p.y + this.dashDir.y * DASH_SPEED * dt, 0);
            // 冲刺拖尾
            if (Math.random() < 0.8) { this.spawnGhost(); }
        } else {
            // 键盘优先，其次触点跟随
            const axis = this.keyAxis();
            if (axis.dx !== 0 || axis.dy !== 0) {
                const len = Math.sqrt(axis.dx * axis.dx + axis.dy * axis.dy);
                this.lastDir.set(axis.dx / len, axis.dy / len, 0);
                const p = this.node.getPosition();
                const step = BASE_SPEED * stats.moveSpeed * dt;
                this.node.setPosition(
                    p.x + axis.dx / len * step,
                    p.y + axis.dy / len * step,
                    0
                );
            } else if (this.target) {
                const p = this.node.getPosition();
                const dx = this.target.x - p.x;
                const dy = this.target.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 4) {
                    this.lastDir.set(dx / dist, dy / dist, 0);
                    const step = Math.min(dist, BASE_SPEED * stats.moveSpeed * dt);
                    this.node.setPosition(p.x + dx / dist * step, p.y + dy / dist * step, 0);
                }
            }
        }

        // 钳制在画幅内，防止走出可视区域（ outside 后战机会被裁剪掉）
        // 余量 12：机身几乎可以贴到墙上，仅半透明光晕边缘略被裁剪
        const half = root.halfSize;
        const m = 12;
        const px = this.node.position.x;
        const py = this.node.position.y;
        const cx = Math.max(-half.x + m, Math.min(half.x - m, px));
        const cy = Math.max(-half.y + m, Math.min(half.y - m, py));
        if (cx !== px || cy !== py) {
            this.node.setPosition(cx, cy, 0);
        }

        // 引擎尾焰闪烁
        const f = 0.55 + 0.45 * Math.abs(Math.sin(this.animT * 22));
        this.flameNode.setScale(1, f, 1);

        // 无敌帧闪烁
        if (this.invincible > 0) {
            this.invincible -= dt;
            const op = this.node.getComponent(UIOpacity)!;
            op.opacity = Math.floor(this.invincible * 10) % 2 === 0 ? 120 : 255;
        }

        // 护盾充能
        if (stats.shieldMax > 0 && stats.shield < 1) {
            stats.shieldTimer -= dt;
            if (stats.shieldTimer <= 0) { stats.shield = 1; }
        }
        this.shieldRing.active = stats.shield >= 1;
        this.shieldRing.angle += 40 * dt;

        // 无敌道具光环
        this.invincRing.active = root.effectInvinc > 0;
        if (this.invincRing.active) {
            this.invincRing.angle += 120 * dt;
            const pulse = 1 + 0.05 * Math.sin(this.animT * 8);
            this.invincRing.setScale(pulse, pulse, 1);
        }

        // 环绕电球
        this.syncOrbs();
        this.orbAngle += ORBIT_SPEED * dt;
        for (let i = 0; i < this.orbNodes.length; i++) {
            const a = this.orbAngle + (i / this.orbNodes.length) * Math.PI * 2;
            this.orbNodes[i].setPosition(Math.sin(a) * ORBIT_RADIUS, Math.cos(a) * ORBIT_RADIUS, 0);
            if (this.orbCds[i] > 0) { this.orbCds[i] -= dt; }
        }

        // 自动射击（狂暴道具：射速翻倍）
        this.fireTimer -= dt;
        if (this.fireTimer <= 0) {
            this.fireTimer = stats.fireInterval * (root.effectRage > 0 ? 0.5 : 1);
            this.shoot();
        }

        // 镭射：周期贯穿光束，等级越高越快越宽
        if (stats.laser > 0) {
            this.laserTimer -= dt;
            if (this.laserTimer <= 0) {
                this.laserTimer = 3.4 - 0.5 * stats.laser;
                root.fireLaser();
            }
        }

        // 黑洞弹：周期在敌群密集处生成黑洞
        if (stats.blackhole > 0) {
            this.blackholeTimer -= dt;
            if (this.blackholeTimer <= 0) {
                this.blackholeTimer = 8.5 - 1.2 * stats.blackhole;
                root.spawnBlackhole();
            }
        }

        // 跟踪导弹：每 2.4 秒自动发射一轮
        if (stats.missiles > 0) {
            this.missileTimer -= dt;
            if (this.missileTimer <= 0) {
                this.missileTimer = 2.4;
                const count = stats.missiles;
                for (let i = 0; i < count; i++) {
                    const m = root.getMissile();
                    const p = this.node.getPosition();
                    m.node.setPosition(p.x + (i - (count - 1) / 2) * 26, p.y, 0);
                    m.init(root.findNearestEnemy(this.node.getPosition()), Math.max(root.stats.damage, 2), (i - (count - 1) / 2) * 0.45);
                }
                SoundFX.I.missile();
            }
        }
    }

    private shoot() {
        const root = GameRoot.I;
        const count = root.stats.bulletCount;
        const p = this.node.getPosition();
        for (let i = 0; i < count; i++) {
            const angle = (i - (count - 1) / 2) * 0.18;
            const bullet = root.getBullet();
            bullet.node.setPosition(p.x, p.y + 40, 0);
            bullet.init(angle, BULLET_SPEED, root.stats.damage);
        }
        SoundFX.I.shoot();
    }

    /** 受到伤害，返回是否死亡（无敌道具优先，其次护盾） */
    public takeDamage(dmg: number): boolean {
        if (this.invincible > 0 || this.dying) return false;
        // 无敌道具生效期间完全免疫
        if (GameRoot.I.effectInvinc > 0) return false;

        const root = GameRoot.I;
        const stats = root.stats;

        if (stats.shieldMax > 0 && stats.shield >= 1) {
            stats.shield = 0;
            stats.shieldTimer = GameRoot.EFFECT_DURATION.shieldRecharge;
            this.invincible = 0.6;
            SoundFX.I.shieldBreak();
            return false;
        }

        stats.hp -= dmg;
        this.invincible = 1.0;
        SoundFX.I.hurt();

        if (stats.hp <= 0) {
            stats.hp = 0;
            this.dying = true;
            const op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
            tween(this.node)
                .to(0.3, { scale: new Vec3(1.6, 1.6, 1) })
                .to(0.2, { scale: new Vec3(0, 0, 1) })
                .start();
            tween(op).to(0.5, { opacity: 0 }).start();
            root.onPlayerDead();
            return true;
        }
        return false;
    }
}
