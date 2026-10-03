System.register("chunks:///_virtual/Bullet.ts", ['cc', './GameRoot.ts'], function (exports) {
  var _decorator, Component, Color, Graphics, GameRoot;
  return {
    setters: [function (module) {
      _decorator = module._decorator;
      Component = module.Component;
      Color = module.Color;
      Graphics = module.Graphics;
      cclegacy = module.cclegacy;
    }, function (module) {
      GameRoot = module.GameRoot;
    }],
    execute: function () {
      cclegacy._RF.push({}, "15f572PdiVJ/pikGrQ6mIeQ", "Bullet", undefined);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};


const { ccclass } = _decorator;
/**
 * 子弹：直线飞行，飞出屏幕回收
 * hostile=false 玩家电矢（青色光矢）| hostile=true 敌方光球（品红光球）
 */
let Bullet = class Bullet extends Component {
    constructor() {
        super(...arguments);
        this.vx = 0;
        this.vy = 600;
        this.damage = 1;
        this.hostile = false;
        this.styled = null; // 当前已绘制样式
        /** 穿透记录：非空表示可穿透，已命中的敌机存入集合防止反复判定 */
        this.hits = null;
    }
    /**
     * @param angle 发射角度（弧度），0 表示正上方
     * @param pierce 可额外穿透的敌机数（0 = 命中即毁）
     */
    init(angle, speed, damage, hostile = false, pierce = 0) {
        this.vx = Math.sin(angle) * speed;
        this.vy = Math.cos(angle) * speed;
        this.damage = damage;
        this.hostile = hostile;
        this.hits = pierce > 0 ? new Set() : null;
        this.node.active = true;
        this.setStyle(hostile ? 'enemy' : 'player');
    }
    /** 按阵营绘制外观（同阵营复用时不重绘） */
    setStyle(style) {
        if (this.styled === style)
            return;
        this.styled = style;
        const g = this.node.getComponent(Graphics);
        if (!g)
            return;
        g.clear();
        if (style === 'player') {
            // 青色光矢：外发光 + 亮芯
            g.fillColor = new Color(34, 211, 238, 70);
            g.circle(0, 0, 9);
            g.fill();
            g.fillColor = new Color(165, 243, 252);
            g.roundRect(-3, -13, 6, 26, 3);
            g.fill();
        }
        else {
            // 品红光球：光晕 + 球体
            g.fillColor = new Color(244, 114, 182, 70);
            g.circle(0, 0, 12);
            g.fill();
            g.fillColor = new Color(251, 113, 133);
            g.circle(0, 0, 6);
            g.fill();
        }
    }
    update(dt) {
        if (GameRoot.I.state !== 'playing')
            return;
        const p = this.node.getPosition();
        this.node.setPosition(p.x + this.vx * dt, p.y + this.vy * dt, 0);
        const half = GameRoot.I.halfSize;
        const m = 60;
        if (p.x < -half.x - m || p.x > half.x + m || p.y < -half.y - m || p.y > half.y + m) {
            GameRoot.I.recycleBullet(this);
        }
    }
};
Bullet = __decorate([
    ccclass('Bullet')
], Bullet);

      exports("Bullet", Bullet);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/Enemy.ts", ['cc', './GameRoot.ts', './SoundFX.ts'], function (exports) {
  var _decorator, Component, Node, Vec3, Color, Graphics, tween, UIOpacity, UITransform, GameRoot, SoundFX;
  return {
    setters: [function (module) {
      _decorator = module._decorator;
      Component = module.Component;
      Node = module.Node;
      Vec3 = module.Vec3;
      Color = module.Color;
      Graphics = module.Graphics;
      tween = module.tween;
      UIOpacity = module.UIOpacity;
      UITransform = module.UITransform;
      cclegacy = module.cclegacy;
    }, function (module) {
      GameRoot = module.GameRoot;
    }, function (module) {
      SoundFX = module.SoundFX;
    }],
    execute: function () {
      cclegacy._RF.push({}, "f29d9vti55N2Id1JS4XgUeD", "Enemy", undefined);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};



const { ccclass } = _decorator;
const AFFIX_INFO = {
    swift: { name: '疾风', color: '#38bdf8', desc: '移动速度大幅提升' },
    split: { name: '分裂', color: '#4ade80', desc: '死亡时裂成两只小猎手' },
    barrage: { name: '弹幕', color: '#fb7185', desc: '死亡时放出环形弹幕' },
    rich: { name: '贪婪', color: '#fbbf24', desc: '双倍掉落，必掉道具概率大增' },
};
/**
 * 《霓虹深空》敌机图鉴：
 * - chaser  猎手   红三角：紧追玩家，接触伤害
 * - shooter 巡卫   紫五边形：保持中距离悬停，发射瞄准光球
 * - speeder 突袭者 粉菱形：锁定一条直线高速冲过屏幕
 * - splitter 分裂体 绿方块：死亡时裂成两只小猎手
 * - mini    小猎手 红小三角：分裂体的碎片，快而脆
 * - boss    典狱官 金六边形：巨型 Boss，螺旋双臂弹幕
 * - bomber  自爆蜂 橙圆蜂：贴近后点燃引信，1 秒后自爆
 * - turret  哨戒炮  灰八边：固定悬浮缓慢转向，发射扇形弹幕
 * - healer  治愈者 白绿十字：悬停远处，周期治疗周围敌机
 */
let Enemy = class Enemy extends Component {
    constructor() {
        super(...arguments);
        this.maxHp = 2;
        this.hp = 2;
        this.speed = 100;
        this.kind = 'chaser';
        this.affix = '';
        this.isElite = false;
        this.isBoss = false;
        this.dead = false;
        /** 冰缓剩余时间与移速倍率（冰冻弹/冰冻力场） */
        this.slowT = 0;
        this.slowFactor = 1;
        this.flashT = 0;
        this.baseScale = 1;
        this.shootTimer = 0;
        this.spiralAngle = 0;
        this.spinSpeed = 0;
        this.vx = 0;
        this.vy = 0;
        this.fuseT = -1; // 自爆蜂引信（-1 未点燃）
        this.lifeT = 0; // 炮台寿命
        this.healT = 0; // 治疗脉冲计时
        this.turretAngle = 0; // 炮台炮管朝向（0=正上方）
        this.enrageT = 25; // Boss 狂暴倒计时
        this.enraged = false; // Boss 是否已狂暴
        this.builtKey = ''; // 已绘制外观的键（种类|词条）
        this.shapeNode = null;
        this.hpBarNode = null;
        this.hpFill = null;
        this.affixNode = null;
        this.iceNode = null;
    }
    init(scale, elapsedSec, kind = 'chaser', affix = '') {
        this.kind = kind;
        this.isBoss = kind === 'boss';
        this.affix = (kind === 'boss' || kind === 'turret' || kind === 'mini') ? '' : affix;
        this.isElite = scale > 1 || this.affix !== '';
        this.baseScale = scale;
        this.dead = false;
        this.flashT = 0;
        this.spiralAngle = GameRoot.I.rand() * Math.PI * 2;
        this.slowT = 0;
        this.slowFactor = 1;
        this.fuseT = -1;
        this.lifeT = 0;
        this.healT = 1.2;
        this.enrageT = 25;
        this.enraged = false;
        // 血量成长：线性 + 二次项，越到后期怪越硬
        const ts = 1 + elapsedSec / 40 + Math.pow(elapsedSec / 90, 2);
        switch (kind) {
            case 'shooter':
                this.maxHp = Math.max(1, Math.round(2.5 * ts));
                this.speed = 85;
                this.spinSpeed = 60;
                this.shootTimer = 1.2 + GameRoot.I.rand() * 1.2;
                break;
            case 'speeder':
                this.maxHp = Math.max(1, Math.round(1.2 * ts));
                this.speed = 250 + GameRoot.I.rand() * 80;
                this.spinSpeed = 0;
                break;
            case 'splitter':
                this.maxHp = Math.max(1, Math.round(3 * ts));
                this.speed = 55;
                this.spinSpeed = 45;
                break;
            case 'mini':
                this.maxHp = Math.max(1, Math.round(ts * 0.6));
                this.speed = 150 + GameRoot.I.rand() * 40;
                this.spinSpeed = 0;
                break;
            case 'boss':
                this.maxHp = Math.round((45 + elapsedSec * 0.8) * (1 + elapsedSec / 240));
                this.speed = 42;
                this.spinSpeed = 36;
                this.shootTimer = 1.2;
                break;
            case 'bomber':
                this.maxHp = Math.max(1, Math.round(1.6 * ts));
                this.speed = 130 + GameRoot.I.rand() * 40 + Math.min(elapsedSec, 60);
                this.spinSpeed = 0;
                break;
            case 'turret':
                this.maxHp = Math.max(6, Math.round(7 * ts));
                this.speed = 0;
                this.spinSpeed = 0;
                this.lifeT = 26;
                this.shootTimer = 1.6;
                this.turretAngle = GameRoot.I.rand() * Math.PI * 2;
                break;
            case 'healer':
                this.maxHp = Math.max(2, Math.round(4 * ts));
                this.speed = 95;
                this.spinSpeed = 30;
                this.healT = 2.2;
                break;
            default:
                this.maxHp = Math.max(1, Math.round(2 * ts * (this.isElite ? 5 : 1)));
                this.speed = (70 + GameRoot.I.rand() * 40 + Math.min(elapsedSec, 70)) * (this.isElite ? 0.75 : 1);
                this.spinSpeed = 0;
        }
        // 词条加成：血量大幅上调 + 各自特效
        if (this.affix) {
            this.maxHp = Math.max(this.maxHp, Math.round(this.maxHp * 2.2));
            if (this.affix === 'swift') {
                this.speed *= 1.55;
            }
            this.baseScale = Math.max(scale, 1.22);
        }
        // 威胁等级增幅：血量指数倍增 + 移速提升（后期持续施压）
        this.maxHp = Math.max(1, Math.round(this.maxHp * GameRoot.I.threatHpMul()));
        this.speed *= GameRoot.I.threatSpeedMul();
        this.hp = this.maxHp;
        this.node.setScale(this.baseScale, this.baseScale, 1);
        this.node.active = true;
        const op = this.node.getComponent(UIOpacity);
        if (op) {
            op.opacity = 255;
        }
        this.buildVisual();
        if (kind === 'turret') {
            this.spawnTurretPos();
        }
        else {
            this.spawnAtEdge();
        }
        if (kind === 'speeder') {
            const p = GameRoot.I.playerNode.getPosition();
            const e = this.node.getPosition();
            const dx = p.x - e.x;
            const dy = p.y - e.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.vx = dx / dist * this.speed;
            this.vy = dy / dist * this.speed;
        }
    }
    /** 几何造型（外观只由 种类|词条 决定，池化复用键未变时跳过 Graphics 重建） */
    buildVisual() {
        const visKey = this.kind + '|' + this.affix;
        if (visKey === this.builtKey) {
            // 复用同款外观：只复位动态状态
            if (this.hpBarNode) {
                this.hpBarNode.setScale(1, 1, 1);
                this.hpFill.setScale(1, 1, 1);
                this.hpBarNode.active = false;
            }
            if (this.iceNode) {
                this.iceNode.active = false;
            }
            if (this.affixNode) {
                this.affixNode.active = this.affix !== '';
            }
            return;
        }
        this.builtKey = visKey;
        if (!this.shapeNode) {
            this.shapeNode = new Node('shape');
            this.node.addChild(this.shapeNode);
            this.shapeNode.addComponent(UITransform).setContentSize(60, 60);
        }
        const g = this.shapeNode.getComponent(Graphics) || this.shapeNode.addComponent(Graphics);
        g.clear();
        const kind = this.kind;
        if (kind === 'chaser' || kind === 'mini' || kind === 'speeder') {
            const c = kind === 'speeder' ? new Color(244, 114, 182) : new Color(244, 63, 94);
            g.fillColor = new Color(c.r, c.g, c.b, 70);
            g.circle(0, 0, kind === 'speeder' ? 26 : 24);
            g.fill();
            g.fillColor = c;
            if (kind === 'speeder') {
                // 菱形
                g.moveTo(0, -26);
                g.lineTo(13, 0);
                g.lineTo(0, 26);
                g.lineTo(-13, 0);
                g.close();
                g.fill();
            }
            else {
                // 三角
                g.moveTo(0, -22);
                g.lineTo(19, 14);
                g.lineTo(-19, 14);
                g.close();
                g.fill();
            }
            g.fillColor = Color.WHITE;
            g.circle(0, 2, 4);
            g.fill();
        }
        else if (kind === 'shooter') {
            g.fillColor = new Color(167, 139, 250, 70);
            g.circle(0, 0, 26);
            g.fill();
            g.fillColor = new Color(167, 139, 250);
            this.polygon(g, 5, 22);
            g.fill();
            g.fillColor = new Color(237, 233, 254);
            g.circle(0, 0, 6);
            g.fill();
        }
        else if (kind === 'splitter') {
            g.fillColor = new Color(52, 211, 153, 70);
            g.circle(0, 0, 27);
            g.fill();
            g.fillColor = new Color(52, 211, 153);
            g.roundRect(-19, -19, 38, 38, 6);
            g.fill();
            g.strokeColor = new Color(6, 78, 59);
            g.lineWidth = 4;
            g.moveTo(-19, 0);
            g.lineTo(19, 0);
            g.moveTo(0, -19);
            g.lineTo(0, 19);
            g.stroke();
        }
        else if (kind === 'bomber') {
            // 自爆蜂：琥珀色圆蜂 + 双条纹 + 小翅
            g.fillColor = new Color(251, 146, 60, 70);
            g.circle(0, 0, 25);
            g.fill();
            g.fillColor = new Color(217, 119, 6);
            g.moveTo(-22, -6);
            g.lineTo(-30, -16);
            g.lineTo(-14, -14);
            g.close();
            g.fill();
            g.moveTo(22, -6);
            g.lineTo(30, -16);
            g.lineTo(14, -14);
            g.close();
            g.fill();
            g.fillColor = new Color(251, 191, 36);
            g.circle(0, 0, 18);
            g.fill();
            g.fillColor = new Color(120, 53, 15);
            g.roundRect(-18, -3, 36, 6, 3);
            g.fill();
            g.roundRect(-14, 7, 28, 5, 2.5);
            g.fill();
            g.fillColor = Color.WHITE;
            g.circle(-6, -8, 3);
            g.circle(6, -8, 3);
            g.fill();
        }
        else if (kind === 'turret') {
            // 哨戒炮：灰蓝八边形基座 + 双炮管
            g.fillColor = new Color(100, 116, 139, 60);
            g.circle(0, 0, 30);
            g.fill();
            g.fillColor = new Color(71, 85, 105);
            this.polygon(g, 8, 26);
            g.fill();
            g.strokeColor = new Color(148, 163, 184);
            g.lineWidth = 3;
            this.polygon(g, 8, 26);
            g.stroke();
            g.fillColor = new Color(203, 213, 225);
            g.roundRect(-9, 0, 6, 30, 3);
            g.fill();
            g.roundRect(3, 0, 6, 30, 3);
            g.fill();
            g.fillColor = new Color(226, 232, 240);
            g.circle(0, 0, 9);
            g.fill();
            g.fillColor = new Color(244, 63, 94);
            g.circle(0, 0, 4);
            g.fill();
        }
        else if (kind === 'healer') {
            // 治愈者：白绿十字 + 光环
            g.fillColor = new Color(52, 211, 153, 55);
            g.circle(0, 0, 28);
            g.fill();
            g.fillColor = new Color(167, 243, 208);
            g.roundRect(-7, -20, 14, 40, 6);
            g.fill();
            g.roundRect(-20, -7, 40, 14, 6);
            g.fill();
            g.strokeColor = new Color(16, 185, 129);
            g.lineWidth = 3;
            g.circle(0, 0, 21);
            g.stroke();
        }
        else if (this.isBoss) {
            g.fillColor = new Color(251, 191, 36, 60);
            g.circle(0, 0, 70);
            g.fill();
            g.fillColor = new Color(251, 191, 36);
            this.polygon(g, 6, 62);
            g.fill();
            g.strokeColor = new Color(120, 53, 15);
            g.lineWidth = 5;
            g.circle(0, 0, 30);
            g.stroke();
            g.fillColor = new Color(254, 243, 199);
            g.circle(0, 0, 14);
            g.fill();
        }
        // 血条（Boss 用顶部大血条，自身不画）
        if (kind !== 'boss') {
            if (!this.hpBarNode) {
                this.hpBarNode = new Node('hpbar');
                this.node.addChild(this.hpBarNode);
                const bgG = this.hpBarNode.addComponent(Graphics);
                bgG.fillColor = new Color(10, 10, 20, 160);
                bgG.roundRect(-23, -36, 46, 5, 2.5);
                bgG.fill();
                this.hpFill = new Node('hpfill');
                this.hpBarNode.addChild(this.hpFill);
                const fG = this.hpFill.addComponent(Graphics);
                fG.fillColor = new Color(244, 63, 94);
                fG.roundRect(-21, -35, 42, 3, 1.5);
                fG.fill();
            }
            this.hpBarNode.setScale(1, 1, 1);
            this.hpFill.setScale(1, 1, 1);
            this.hpBarNode.active = false;
        }
        // 词条光环：旋转发光描边
        if (this.affix) {
            if (!this.affixNode) {
                this.affixNode = new Node('affixRing');
                this.node.addChild(this.affixNode);
            }
            const ag = this.affixNode.getComponent(Graphics) || this.affixNode.addComponent(Graphics);
            ag.clear();
            const col = new Color();
            col.fromHEX(AFFIX_INFO[this.affix].color);
            ag.strokeColor = new Color(col.r, col.g, col.b, 200);
            ag.lineWidth = 4;
            ag.circle(0, 0, 33);
            ag.stroke();
            ag.strokeColor = new Color(col.r, col.g, col.b, 80);
            ag.lineWidth = 9;
            ag.circle(0, 0, 37);
            ag.stroke();
            // 光环缺口造型（四段弧），旋转时有机械感
            for (let i = 0; i < 4; i++) {
                ag.strokeColor = new Color(col.r, col.g, col.b, 230);
                ag.lineWidth = 5;
                ag.moveTo(Math.sin(i * Math.PI / 2) * 44, Math.cos(i * Math.PI / 2) * 44);
                ag.lineTo(Math.sin(i * Math.PI / 2 + 0.35) * 44, Math.cos(i * Math.PI / 2 + 0.35) * 44);
                ag.stroke();
            }
        }
        else if (this.affixNode) {
            this.affixNode.active = false;
        }
        // 冰缓光环（懒创建，被冰缓时显示）
        if (!this.iceNode) {
            this.iceNode = new Node('iceRing');
            this.node.addChild(this.iceNode);
            const ig = this.iceNode.addComponent(Graphics);
            ig.strokeColor = new Color(125, 211, 252, 220);
            ig.lineWidth = 3;
            ig.circle(0, 0, 31);
            ig.stroke();
            ig.strokeColor = new Color(224, 242, 254, 120);
            ig.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const a = i / 6 * Math.PI * 2;
                ig.moveTo(Math.sin(a) * 22, Math.cos(a) * 22);
                ig.lineTo(Math.sin(a) * 30, Math.cos(a) * 30);
                ig.stroke();
            }
        }
        this.iceNode.active = false;
        if (this.affixNode) {
            this.affixNode.active = this.affix !== '';
        }
    }
    polygon(g, sides, r) {
        g.moveTo(0, -r);
        for (let i = 1; i < sides; i++) {
            const a = (i / sides) * Math.PI * 2;
            g.lineTo(Math.sin(a) * r, -Math.cos(a) * r);
        }
        g.close();
    }
    /** 刷出位置：不从下方出现——上边 60%，左右两侧上半段各 20%；Boss 固定顶部中央 */
    spawnAtEdge() {
        const half = GameRoot.I.halfSize;
        const margin = 60;
        if (this.isBoss) {
            this.node.setPosition(0, half.y + margin, 0);
            return;
        }
        const roll = GameRoot.I.rand();
        let x = 0, y = 0;
        if (roll < 0.6) {
            x = (GameRoot.I.rand() * 2 - 1) * half.x;
            y = half.y + margin;
        }
        else if (roll < 0.8) {
            x = -half.x - margin;
            y = GameRoot.I.rand() * half.y;
        }
        else {
            x = half.x + margin;
            y = GameRoot.I.rand() * half.y;
        }
        this.node.setPosition(x, y, 0);
    }
    /** 哨戒炮：直接在屏幕上半区现形（不进不退，作为走位障碍） */
    spawnTurretPos() {
        const half = GameRoot.I.halfSize;
        const x = (GameRoot.I.rand() * 2 - 1) * (half.x - 90);
        const y = half.y * 0.25 + GameRoot.I.rand() * (half.y * 0.75 - 80);
        this.node.setPosition(x, y, 0);
    }
    /** 冰缓：取更慢的倍率，刷新持续时间 */
    applySlow(factor, dur) {
        if (this.dead)
            return;
        this.slowFactor = Math.min(this.slowT > 0 ? this.slowFactor : 1, factor);
        this.slowT = Math.max(this.slowT, dur);
    }
    /** 治疗者脉冲回复 */
    heal(amount) {
        if (this.dead)
            return;
        this.hp = Math.min(this.maxHp, this.hp + amount);
    }
    update(dt) {
        if (GameRoot.I.state !== 'playing' || this.dead)
            return;
        const p = GameRoot.I.playerNode.getPosition();
        const e = this.node.getPosition();
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        // 冰缓计时与视觉
        if (this.slowT > 0) {
            this.slowT -= dt;
            if (this.slowT <= 0) {
                this.slowFactor = 1;
            }
        }
        if (this.iceNode) {
            this.iceNode.active = this.slowT > 0;
            if (this.iceNode.active) {
                this.iceNode.angle += 90 * dt;
            }
        }
        if (this.affixNode && this.affix) {
            this.affixNode.angle -= 70 * dt;
        }
        const sf = this.slowT > 0 ? this.slowFactor : 1;
        // 造型旋转 / 朝向
        if (this.kind === 'chaser' || this.kind === 'mini') {
            this.shapeNode.angle = Math.atan2(-dx, dy) * 180 / Math.PI;
        }
        else if (this.kind === 'speeder') {
            this.shapeNode.angle = Math.atan2(-this.vx, this.vy) * 180 / Math.PI;
        }
        else if (this.kind === 'bomber') {
            this.shapeNode.angle = Math.atan2(-dx, dy) * 180 / Math.PI;
        }
        else if (this.spinSpeed) {
            this.shapeNode.angle += this.spinSpeed * dt * sf;
        }
        switch (this.kind) {
            case 'speeder':
                this.node.setPosition(e.x + this.vx * sf * dt, e.y + this.vy * sf * dt, 0);
                this.checkFlee();
                break;
            case 'bomber': {
                // 追击；贴近点燃引信，引信期间减速逼近，归零自爆
                const chase = this.fuseT >= 0 ? 0.25 : 1;
                this.node.setPosition(e.x + dx / dist * this.speed * chase * sf * dt, e.y + dy / dist * this.speed * chase * sf * dt, 0);
                if (this.fuseT < 0 && dist < 95) {
                    this.fuseT = 1.0;
                    SoundFX.I.fuse();
                }
                if (this.fuseT >= 0) {
                    this.fuseT -= dt;
                    // 引信闪烁：越接近爆炸越快
                    const op = this.node.getComponent(UIOpacity);
                    if (op) {
                        const f = Math.max(this.fuseT, 0);
                        op.opacity = Math.floor(f * 14) % 2 === 0 ? 255 : 90;
                    }
                    if (this.fuseT <= 0) {
                        this.explodeSelf();
                        return;
                    }
                }
                break;
            }
            case 'turret': {
                // 悬浮不动，炮管缓慢转向玩家，周期扇形弹幕，寿命归零自动离场
                const desired = Math.atan2(dx, dy);
                let diff = desired - this.turretAngle;
                while (diff > Math.PI) {
                    diff -= Math.PI * 2;
                }
                while (diff < -Math.PI) {
                    diff += Math.PI * 2;
                }
                this.turretAngle += Math.max(-0.55 * dt, Math.min(0.55 * dt, diff));
                this.shapeNode.angle = -this.turretAngle * 180 / Math.PI;
                this.shootTimer -= dt;
                if (this.shootTimer <= 0) {
                    this.shootTimer = 2.6;
                    for (let i = -2; i <= 2; i++) {
                        GameRoot.I.spawnEnemyBullet(e.x, e.y, this.turretAngle + i * 0.21, 215);
                    }
                    SoundFX.I.enemyShoot();
                }
                this.lifeT -= dt;
                if (this.lifeT <= 0) {
                    this.dead = true;
                    GameRoot.I.recycleEnemy(this);
                    return;
                }
                break;
            }
            case 'healer': {
                // 悬停远处：太远靠近、太近后撤，周期治疗脉冲
                if (dist > 520) {
                    this.node.setPosition(e.x + dx / dist * this.speed * sf * dt, e.y + dy / dist * this.speed * sf * dt, 0);
                }
                else if (dist < 380) {
                    this.node.setPosition(e.x - dx / dist * this.speed * 0.6 * sf * dt, e.y - dy / dist * this.speed * 0.6 * sf * dt, 0);
                }
                this.healT -= dt;
                if (this.healT <= 0) {
                    this.healT = 2.4;
                    GameRoot.I.healPulse(this.node.getPosition());
                }
                break;
            }
            case 'shooter': {
                if (dist > 420) {
                    this.node.setPosition(e.x + dx / dist * this.speed * sf * dt, e.y + dy / dist * this.speed * sf * dt, 0);
                }
                else if (dist < 300) {
                    this.node.setPosition(e.x - dx / dist * this.speed * 0.5 * sf * dt, e.y - dy / dist * this.speed * 0.5 * sf * dt, 0);
                }
                this.shootTimer -= dt;
                if (this.shootTimer <= 0 && dist < 800) {
                    this.shootTimer = 2.2 + GameRoot.I.rand() * 1.2;
                    GameRoot.I.spawnEnemyBullet(e.x, e.y, Math.atan2(dx, dy), 330);
                    SoundFX.I.enemyShoot();
                }
                break;
            }
            case 'boss': {
                // 缓慢逼近，贴近后悬停
                if (dist > 260) {
                    this.node.setPosition(e.x + dx / dist * this.speed * dt, e.y + dy / dist * this.speed * dt, 0);
                }
                // 狂暴：25 秒内未被击杀则火力全开（对后期成型的 DPS 是硬检验）
                if (!this.enraged) {
                    this.enrageT -= dt;
                    if (this.enrageT <= 0) {
                        this.enraged = true;
                        this.speed *= 1.5;
                        SoundFX.I.bossAlarm();
                        GameRoot.I.spawnRingFx(e.x, e.y, 150, new Color(244, 63, 94, 220), 6, 0.5);
                    }
                }
                // 螺旋弹幕（狂暴后四臂 + 更快）
                this.shootTimer -= dt;
                if (this.shootTimer <= 0) {
                    this.shootTimer = this.enraged ? 0.18 : 0.26;
                    this.spiralAngle += 0.44;
                    const arms = this.enraged ? 4 : 2;
                    for (let i = 0; i < arms; i++) {
                        GameRoot.I.spawnEnemyBullet(e.x, e.y, this.spiralAngle + i * Math.PI * 2 / arms, 240);
                    }
                }
                break;
            }
            default: {
                // chaser / mini / splitter 追击
                this.node.setPosition(e.x + dx / dist * this.speed * sf * dt, e.y + dy / dist * this.speed * sf * dt, 0);
            }
        }
        // 受击闪烁
        if (this.flashT > 0) {
            this.flashT -= dt;
            const op = this.node.getComponent(UIOpacity);
            if (op) {
                op.opacity = this.flashT > 0 ? 120 : 255;
            }
        }
        // 血条
        if (this.hpBarNode) {
            const show = this.hp < this.maxHp;
            this.hpBarNode.active = show;
            if (show) {
                this.hpFill.setScale(Math.max(this.hp / this.maxHp, 0.001), 1, 1);
            }
        }
    }
    /** 自爆蜂引爆：对玩家范围伤害，自身无掉落 */
    explodeSelf() {
        this.dead = true;
        const pos = this.node.getPosition();
        GameRoot.I.bomberExplode(pos);
        const op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        tween(this.node)
            .to(0.15, { scale: new Vec3(this.baseScale * 1.4, this.baseScale * 1.4, 1) })
            .call(() => { GameRoot.I.recycleEnemy(this); })
            .start();
        tween(op).to(0.15, { opacity: 0 }).start();
    }
    /** 冲锋机冲出屏幕后静默回收 */
    checkFlee() {
        const half = GameRoot.I.halfSize;
        const e = this.node.getPosition();
        const m = 200;
        if (e.x < -half.x - m || e.x > half.x + m || e.y < -half.y - m || e.y > half.y + m) {
            this.dead = true;
            GameRoot.I.recycleEnemy(this);
        }
    }
    /** 击杀掉落的经验值/金币价值 */
    gemValue() {
        let v = 1;
        if (this.isBoss) {
            v = 30;
        }
        else if (this.kind === 'mini') {
            v = 0;
        }
        else if (this.kind === 'shooter') {
            v = 2;
        }
        else if (this.kind === 'splitter') {
            v = 3;
        }
        else if (this.kind === 'bomber') {
            v = 2;
        }
        else if (this.kind === 'turret') {
            v = 4;
        }
        else if (this.kind === 'healer') {
            v = 3;
        }
        else if (this.isElite) {
            v = 5;
        }
        if (this.affix) {
            v = Math.max(v, 4) + 2;
        }
        if (this.affix === 'rich') {
            v *= 2;
        }
        return v;
    }
    /** 被子弹击中，返回是否死亡 */
    hurt(damage) {
        if (this.dead) {
            return false;
        }
        this.hp -= damage;
        this.flashT = 0.08;
        const op = this.node.getComponent(UIOpacity);
        if (op) {
            op.opacity = 120;
        }
        // 击退（Boss/炮台不可击退）
        if (!this.isBoss && this.kind !== 'turret') {
            const p = GameRoot.I.playerNode.getPosition();
            const e = this.node.getPosition();
            const dx = e.x - p.x;
            const dy = e.y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.node.setPosition(e.x + dx / dist * 8, e.y + dy / dist * 8, 0);
        }
        if (this.hp <= 0) {
            this.die();
            return true;
        }
        return false;
    }
    die() {
        this.dead = true;
        GameRoot.I.onEnemyKilled(this);
        // 分裂体 / 分裂词条死亡：裂成两只小猎手
        if (this.kind === 'splitter' || this.affix === 'split') {
            GameRoot.I.spawnMinis(this.node.getPosition());
        }
        // 弹幕词条：死亡放出环形弹幕
        if (this.affix === 'barrage') {
            GameRoot.I.enemyDeathBarrage(this.node.getPosition());
        }
        const op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
        tween(this.node)
            .to(0.15, { scale: new Vec3(this.baseScale * 0.3, this.baseScale * 0.3, 1) })
            .call(() => { GameRoot.I.recycleEnemy(this); })
            .start();
        tween(op)
            .to(0.15, { opacity: 0 })
            .start();
    }
};
Enemy = __decorate([
    ccclass('Enemy')
], Enemy);

      exports("Enemy", Enemy);
      exports("AFFIX_INFO", AFFIX_INFO);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/GameRoot.ts", ['cc', './Upgrades.ts', './MetaSave.ts', './Player.ts', './Enemy.ts', './Bullet.ts', './Missile.ts', './Gem.ts', './PowerUp.ts', './Hud.ts', './Overlays.ts', './SoundFX.ts'], function (exports) {
  var _decorator, Component, Node, Vec3, Color, Graphics, Label, UITransform, UIOpacity, view, ResolutionPolicy, input, Input, KeyCode, tween, Tween, Mask, createBaseStats, rollUpgrades, MetaSave, Player, Enemy, Bullet, Missile, Gem, PowerUp, Hud, Overlays, SoundFX;
  return {
    setters: [function (module) {
      _decorator = module._decorator;
      Component = module.Component;
      Node = module.Node;
      Vec3 = module.Vec3;
      Color = module.Color;
      Graphics = module.Graphics;
      Label = module.Label;
      UITransform = module.UITransform;
      UIOpacity = module.UIOpacity;
      view = module.view;
      ResolutionPolicy = module.ResolutionPolicy;
      input = module.input;
      Input = module.Input;
      KeyCode = module.KeyCode;
      tween = module.tween;
      Tween = module.Tween;
      Mask = module.Mask;
      cclegacy = module.cclegacy;
    }, function (module) {
      createBaseStats = module.createBaseStats;
      rollUpgrades = module.rollUpgrades;
    }, function (module) {
      MetaSave = module;
    }, function (module) {
      Player = module.Player;
    }, function (module) {
      Enemy = module.Enemy;
    }, function (module) {
      Bullet = module.Bullet;
    }, function (module) {
      Missile = module.Missile;
    }, function (module) {
      Gem = module.Gem;
    }, function (module) {
      PowerUp = module.PowerUp;
    }, function (module) {
      Hud = module.Hud;
    }, function (module) {
      Overlays = module.Overlays;
    }, function (module) {
      SoundFX = module.SoundFX;
    }],
    execute: function () {
      cclegacy._RF.push({}, "09c3csN9jlNv79EqL0ZZjzz", "GameRoot", undefined);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var GameRoot_1;












const { ccclass, executionOrder } = _decorator;
/**
 * 《霓虹深空》主控：状态机 / 刷怪 / 碰撞 / 经验升级 / 对象池 / 模式与结算
 * 视觉全部由代码绘制，不依赖图片资源
 */
let GameRoot = GameRoot_1 = class GameRoot extends Component {
    constructor() {
        super(...arguments);
        this.state = 'menu';
        this.mode = 'endless';
        this.stats = createBaseStats();
        this.level = 1;
        this.xp = 0;
        this.xpToNext = 5;
        this.kills = 0;
        this.elapsed = 0;
        this.halfSize = new Vec3(360, 640, 0);
        /** 波次商店模式：金币 / 当前波 / 本波剩余时间 */
        this.gold = 0;
        this.wave = 0;
        this.waveTime = 0;
        this.shopRerolls = 0;
        this.shopOffers = [];
        /** 商店槽位锁定：锁定槽的道具在刷新与下一波商店中原位保留 */
        this.shopLocks = [false, false, false, false];
        /** 结算数据核心与每日纪录（gameover 面板读取） */
        this.lastCoresEarned = 0;
        this.lastDailyRecord = false;
        this.playerNode = null;
        this.bullets = [];
        this.missiles = [];
        this.enemys = [];
        this.gems = [];
        this.boss = null;
        this.blackholes = [];
        // 单局统计（成就用）
        this.runDashes = 0;
        this.runGoldPicked = 0;
        this.runEliteKills = 0;
        this.vampCounter = 0; // 纳米修复击杀计数
        // 道具效果（剩余秒数，0 表示无）
        this.effectMagnet = 0;
        this.effectRage = 0;
        this.effectXp2 = 0;
        this.effectInvinc = 0;
        /** 游戏随机源：每日挑战换为种子随机，保证全球玩家同序列 */
        this.rng = Math.random;
        this.ready = false;
        this.pendingLevelUps = 0;
        this.spawnTimer = 0;
        this.eliteTimer = 15;
        this.bossTimer = 45;
        this.turretTimer = 55;
        this.waveBossDone = 0; // 波次模式：本波是否已出 Boss
        this.lastThreat = -1; // 已播报过的威胁等级
        this.bulletPool = [];
        this.missilePool = [];
        this.powerPool = [];
        this.enemyPool = [];
        this.gemPool = [];
        this.floatPool = [];
        this.floatActive = [];
        this.hostileBullets = 0; // 场上敌方光球数（性能熔断用）
        this.fxLive = 0; // 存活中的短命特效数（弧/环/束）
        this.worldLayer = null;
        this.stars = [];
        this.nebulae = [];
        this.meteors = [];
        this.visualT = 0;
        this.meteorTimer = 4;
        this.hud = null;
        this.overlays = null;
    }
    onLoad() {
        GameRoot_1.I = this;
        // 竖屏 720x1280 固定画幅：宽窗口时两侧留黑边，游戏区域永远居中
        view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
        // 窗口/面板尺寸变化时重新适配画幅（嵌入式浏览器拖拽分栏后画布不会自动重投影）
        window.addEventListener('resize', () => {
            if (window.innerWidth > 0 && window.innerHeight > 0) {
                view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
            }
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
        this.hud = this.node.addComponent(Hud);
        this.overlays = this.node.addComponent(Overlays);
        this.ready = true;
        this.restart();
        // 进入开始界面：从菜单选择模式后正式开局
        this.hud.setHidden(true);
        this.state = 'menu';
        this.overlays.showMenu();
    }
    /** 统一随机：影响玩法的掷点都走这里（每日挑战可播种） */
    rand() { return this.rng(); }
    /** 星云色块 + 三层视差星空（范围限定在画幅内） */
    buildStarfield() {
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
                swayAmp: 30 + Math.random() * 40, // 横向摆动幅度
                swayFreq: 0.25 + Math.random() * 0.4, // 摆动频率
                pulseFreq: 0.4 + Math.random() * 0.5, // 呼吸明暗频率
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
                twFreq: 1.2 + Math.random() * 2.2, // 闪烁频率
                twPhase: Math.random() * Math.PI * 2,
            });
        }
    }
    /** 流星：斜向划过，尾部渐隐 */
    spawnMeteor() {
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
    onKeyDown(e) {
        if (this.state === 'menu') {
            if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER) {
                this.startGame('endless');
            }
            return;
        }
        if (this.state === 'levelup') {
            if (e.keyCode === KeyCode.KEY_W || e.keyCode === KeyCode.ARROW_UP) {
                this.overlays.moveSel(-1);
            }
            else if (e.keyCode === KeyCode.KEY_S || e.keyCode === KeyCode.ARROW_DOWN) {
                this.overlays.moveSel(1);
            }
            else if (e.keyCode === KeyCode.SPACE || e.keyCode === KeyCode.ENTER) {
                this.overlays.confirmSel();
            }
            return;
        }
        if (this.state === 'shop') {
            if (e.keyCode === KeyCode.KEY_W || e.keyCode === KeyCode.ARROW_UP) {
                this.overlays.moveShopSel(-1);
            }
            else if (e.keyCode === KeyCode.KEY_S || e.keyCode === KeyCode.ARROW_DOWN) {
                this.overlays.moveShopSel(1);
            }
            else if (e.keyCode === KeyCode.SPACE) {
                this.overlays.confirmShopSel();
            }
            else if (e.keyCode === KeyCode.KEY_L) {
                this.overlays.toggleShopSelLock();
            }
            else if (e.keyCode === KeyCode.ENTER || e.keyCode === KeyCode.KEY_N || e.keyCode === KeyCode.KEY_R) {
                this.nextWave();
            }
            return;
        }
        if (e.keyCode === KeyCode.ESCAPE || e.keyCode === KeyCode.SPACE) {
            this.togglePause();
        }
    }
    /** 从开始界面选择模式正式开局 */
    startGame(mode) {
        if (this.state !== 'menu')
            return;
        this.mode = mode;
        if (mode === 'daily') {
            // 当天全球同一套序列：日期做种子
            this.rng = MetaSave.mulberry32(MetaSave.hashSeed('neon-daily-' + MetaSave.todayKey()));
        }
        else {
            this.rng = Math.random;
        }
        this.hud.setHidden(false);
        this.overlays.hideAll();
        this.restart();
        SoundFX.I.pick();
    }
    /** 暂停 / 继续游戏（升级选择与结算界面时无效） */
    togglePause() {
        if (this.state === 'playing') {
            this.state = 'paused';
            this.overlays.showPaused();
            SoundFX.I.pick();
        }
        else if (this.state === 'paused') {
            this.state = 'playing';
            this.overlays.hideAll();
            SoundFX.I.pick();
        }
    }
    /** 回主菜单（清场但保留局外存档状态） */
    backToMenu() {
        this.clearWorld();
        this.state = 'menu';
        this.hud.setHidden(true);
        this.overlays.hideAll();
        this.overlays.showMenu();
        SoundFX.I.pick();
    }
    update(dt) {
        if (!this.ready)
            return;
        const uiT = this.node.getComponent(UITransform);
        if (uiT && uiT.width > 0 && uiT.height > 0) {
            // 嵌入式浏览器面板折叠时画幅会瞬间归零，保持上一帧有效尺寸防坐标崩坏
            this.halfSize.set(uiT.width / 2, uiT.height / 2, 0);
        }
        // 暂停时整个世界冻结
        if (this.state === 'paused')
            return;
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
        if (this.state !== 'playing')
            return;
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
        if (this.effectMagnet > 0) {
            this.effectMagnet -= dt;
        }
        if (this.effectRage > 0) {
            this.effectRage -= dt;
        }
        if (this.effectXp2 > 0) {
            this.effectXp2 -= dt;
        }
        if (this.effectInvinc > 0) {
            this.effectInvinc -= dt;
        }
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
    /** 波次模式的难度基准秒数（复用无尽模式的成长曲线，斜率放缓） */
    difficultySec() {
        return this.mode === 'waves' ? 15 + this.wave * 12 : this.elapsed;
    }
    /** 威胁等级：无尽每 75 秒 +1，波次每 3 波 +1（商店成长靠金币、节奏慢，曲线放缓） */
    threatLevel() {
        return this.mode === 'waves' ? Math.floor((this.wave - 1) / 3) : Math.floor(this.elapsed / 75);
    }
    /** 威胁等级血量倍率：每级 ×1.32 指数成长，保证后期仍持续施压 */
    threatHpMul() {
        return Math.pow(1.32, this.threatLevel());
    }
    /** 威胁等级移速倍率（封顶 1.8） */
    threatSpeedMul() {
        return Math.min(1.8, 1 + 0.06 * this.threatLevel());
    }
    /** 敌机每次碰撞 / 光球 / 自爆的伤害（威胁等级越高越痛） */
    enemyHitDamage() {
        return 1 + Math.floor(this.threatLevel() / 3);
    }
    spawnLogic(dt) {
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
                const batch = Math.min(6, 1 + Math.floor(this.elapsed / 75)); // 75 秒后 2 只/批，封顶 6 只
                for (let i = 0; i < batch; i++) {
                    const kind = this.rollEndlessKind();
                    const affix = this.rollAffix(this.elapsed > 40 ? Math.min(0.3, 0.12 + 0.02 * threat) : 0);
                    this.spawnEnemy(1, kind, affix);
                }
                // 开局 1.8 秒一批，随时间逐渐压缩到 0.26 秒
                this.spawnTimer = Math.max(0.26, 1.8 - this.elapsed * 0.012);
            }
        }
        else {
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
    rollEndlessKind() {
        const roll = this.rand();
        const t = this.elapsed;
        if (t > 20 && roll < 0.16) {
            return 'speeder';
        }
        if (t > 15 && roll < 0.34) {
            return 'splitter';
        }
        if (t > 10 && roll < 0.52) {
            return 'shooter';
        }
        if (t > 25 && roll < 0.66) {
            return 'bomber';
        }
        if (t > 35 && roll < 0.74) {
            return 'healer';
        }
        return 'chaser';
    }
    /** 词条掷点：p 为概率 */
    rollAffix(p) {
        if (this.rand() >= p) {
            return '';
        }
        const pool = ['swift', 'split', 'barrage', 'rich'];
        return pool[Math.floor(this.rand() * pool.length)];
    }
    /** 波次模式刷怪：按波数解锁种类，上限与批次温和加码 */
    waveSpawnLogic(dt) {
        const threat = this.threatLevel();
        const cap = Math.min(58, 24 + Math.floor(this.wave * 1.5));
        if (this.enemys.length < cap) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                const w = this.wave;
                const batch = Math.min(5, 1 + Math.floor(w / 6)); // 每 6 波多刷一只
                for (let i = 0; i < batch; i++) {
                    const roll = this.rand();
                    let kind = 'chaser';
                    if (w >= 6 && roll < 0.08) {
                        kind = 'turret';
                    }
                    else if (w >= 5 && roll < 0.18) {
                        kind = 'healer';
                    }
                    else if (w >= 4 && roll < 0.32) {
                        kind = 'speeder';
                    }
                    else if (w >= 3 && roll < 0.5) {
                        kind = 'bomber';
                    }
                    else if (w >= 3 && roll < 0.62) {
                        kind = 'splitter';
                    }
                    else if (w >= 2 && roll < 0.8) {
                        kind = 'shooter';
                    }
                    const affix = this.rollAffix(w >= 4 ? Math.min(0.25, 0.1 + 0.02 * threat) : 0);
                    this.spawnEnemy(1, kind, affix);
                }
                this.spawnTimer = Math.max(0.34, 1.5 - w * 0.09);
            }
        }
        // 每 5 波一只 Boss（波首登场）
        if (this.wave % 5 === 0 && this.waveBossDone < this.wave && !this.boss) {
            this.spawnEnemy(2.4, 'boss');
            SoundFX.I.bossAlarm();
            this.waveBossDone = this.wave;
        }
    }
    countKind(kind) {
        let n = 0;
        for (const e of this.enemys) {
            if (!e.dead && e.kind === kind)
                n++;
        }
        return n;
    }
    spawnEnemy(scale, kind = 'chaser', affix = '') {
        let e = this.enemyPool.pop();
        if (!e) {
            const n = new Node('Enemy');
            n.addComponent(UITransform).setContentSize(60, 60);
            n.addComponent(UIOpacity);
            n.addComponent(Enemy);
            this.worldLayer.addChild(n);
            e = n.getComponent(Enemy);
        }
        e.init(scale, this.difficultySec(), kind, affix);
        this.enemys.push(e);
        if (kind === 'boss') {
            this.boss = e;
        }
    }
    /** 分裂体死亡：裂成两只小猎手 */
    spawnMinis(pos) {
        for (const dx of [-26, 26]) {
            this.spawnEnemy(0.5, 'mini');
            const m = this.enemys[this.enemys.length - 1];
            m.node.setPosition(pos.x + dx, pos.y - 8, 0);
        }
    }
    /** 敌方光球（威胁等级提升弹速；总量熔断防极端弹幕堆积） */
    spawnEnemyBullet(x, y, angle, speed) {
        if (this.hostileBullets >= 280) {
            return;
        }
        this.hostileBullets += 1;
        const b = this.getBullet();
        b.node.setPosition(x, y, 0);
        const mul = 1 + 0.04 * Math.min(this.threatLevel(), 15);
        b.init(angle, speed * mul, 1, true);
    }
    /** 弹幕词条：死亡放出 8 向环形弹幕 */
    enemyDeathBarrage(pos) {
        for (let i = 0; i < 8; i++) {
            this.spawnEnemyBullet(pos.x, pos.y, i / 8 * Math.PI * 2, 190);
        }
        SoundFX.I.enemyShoot();
    }
    /** 治疗者脉冲：治疗周围敌机并放出绿色光环 */
    healPulse(pos) {
        this.spawnRingFx(pos.x, pos.y, 230, new Color(52, 211, 153, 200), 4, 0.5);
        const heal = Math.min(1 + Math.floor(this.difficultySec() / 120), 3);
        for (const e of this.enemys) {
            if (e.dead || e.kind === 'healer')
                continue;
            const ep = e.node.getPosition();
            const dx = ep.x - pos.x, dy = ep.y - pos.y;
            if (dx * dx + dy * dy < 230 * 230) {
                e.heal(heal);
                this.spawnFloatText(ep.x, ep.y + 26, '+' + heal, new Color(134, 239, 172), 16);
            }
        }
    }
    /** 自爆蜂爆炸：范围伤害玩家 + 橙色冲击波 */
    bomberExplode(pos) {
        this.spawnRingFx(pos.x, pos.y, 120, new Color(251, 146, 60, 230), 6, 0.4);
        this.spawnFlashFx(pos.x, pos.y, 55, new Color(254, 240, 138, 180));
        SoundFX.I.boom(false);
        const pp = this.playerNode.getPosition();
        const dx = pp.x - pos.x, dy = pp.y - pos.y;
        if (dx * dx + dy * dy < 120 * 120) {
            this.playerNode.getComponent(Player).takeDamage(this.enemyHitDamage());
        }
    }
    recycleEnemy(e) {
        if (this.enemyPool.indexOf(e) >= 0)
            return; // 防止死亡动画回调重复回收
        const i = this.enemys.indexOf(e);
        if (i >= 0) {
            this.enemys.splice(i, 1);
        }
        e.node.active = false;
        this.enemyPool.push(e);
    }
    onEnemyKilled(e) {
        this.kills += 1;
        MetaSave.addTotalKills(1);
        // 纳米修复：击杀攒满回复生命（等级越高所需击杀越少）
        if (this.stats.vampKills > 0) {
            this.vampCounter += 1;
            if (this.vampCounter >= 44 - this.stats.vampKills * 8) {
                this.vampCounter = 0;
                if (this.stats.hp < this.stats.maxHp) {
                    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + 1);
                    const pp = this.playerNode.getPosition();
                    this.spawnFloatText(pp.x, pp.y + 40, '+1', new Color(134, 239, 172), 18);
                }
            }
        }
        this.tryUnlock('firstBlood');
        if (this.kills >= 100) {
            this.tryUnlock('slayer');
        }
        if (e.isBoss) {
            this.tryUnlock('bossKiller');
        }
        if (e.isElite) {
            this.runEliteKills += 1;
            if (this.runEliteKills >= 5) {
                this.tryUnlock('eliteHunter');
            }
        }
        const value = e.gemValue();
        const p = e.node.getPosition();
        if (this.mode === 'waves') {
            // 波次模式：击杀掉金币（掉率随版本调优，保证商店成长节奏）
            if (e.isBoss) {
                this.addGold(15, false);
                this.spawnFloatText(p.x, p.y + 30, '+15 金', new Color(251, 191, 36), 26);
            }
            else if (value > 0) {
                const chance = e.affix === 'rich' ? 1.0 : (e.isElite ? 0.9 : 0.55);
                if (this.rand() < chance) {
                    const gem = this.getGem();
                    const coinVal = e.isElite ? 3 : 1;
                    gem.init(p.x, p.y, coinVal, true);
                    this.gems.push(gem);
                }
            }
        }
        else if (value > 0) {
            // 25% 概率能量直接入包（带飘字反馈），否则掉落宝石
            if (this.rand() < 0.25) {
                this.addXp(value);
                this.spawnFloatText(p.x, p.y, '+' + value, new Color(165, 243, 252));
            }
            else {
                const gem = this.getGem();
                gem.init(p.x, p.y, value, false);
                this.gems.push(gem);
            }
        }
        // 掉落随机道具（Boss 必掉，贪婪词条较高概率）
        if (e.isBoss) {
            this.dropPowerUp(e.node.getPosition());
        }
        else if (e.affix === 'rich') {
            if (this.rand() < 0.35) {
                this.dropPowerUp(e.node.getPosition());
            }
        }
        else {
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
    dealDamage(e, baseDamage) {
        if (e.dead)
            return;
        const scaled = baseDamage * this.stats.dmgMul; // 过载核心：全伤害倍率
        const isCrit = Math.random() < this.stats.critRate;
        const dmg = Math.max(1, Math.round(isCrit ? scaled * this.stats.critMult : scaled));
        const ep = e.node.getPosition();
        if (isCrit) {
            this.spawnFloatText(ep.x + (Math.random() * 30 - 15), ep.y + 20, `${dmg}`, new Color(255, 200, 60), 30);
        }
        else {
            this.spawnFloatText(ep.x + (Math.random() * 30 - 15), ep.y + 20, `${dmg}`, new Color(224, 242, 254), 18);
        }
        e.hurt(dmg);
        // 闪电链：暴击时概率向附近敌人跳跃
        if (isCrit && this.stats.chain > 0 && this.rand() < 0.5) {
            this.chainLightning(e, scaled);
        }
    }
    /** 闪电链：从暴击目标起跳，最多 3 跳，伤害逐跳衰减 */
    chainLightning(from, baseDamage) {
        const jumps = 2 + this.stats.chain; // 等级越高跳得越多（3~5 个目标）
        let src = from.node.getPosition();
        const hit = new Set([from]);
        for (let i = 1; i <= jumps; i++) {
            let best = null;
            let bestD = 260 * 260;
            for (const e of this.enemys) {
                if (e.dead || hit.has(e))
                    continue;
                const ep = e.node.getPosition();
                const dx = ep.x - src.x, dy = ep.y - src.y;
                const d = dx * dx + dy * dy;
                if (d < bestD) {
                    bestD = d;
                    best = e;
                }
            }
            if (!best)
                break;
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
    spawnLightningArc(a, b) {
        if (this.fxLive >= 40) {
            return;
        }
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
    fireLaser() {
        const lvl = this.stats.laser;
        const p = this.playerNode.getPosition();
        const top = this.halfSize.y + 30;
        const halfW = 24;
        const spacing = 105;
        // 光束横坐标：以战机为中心对称分布（1 道=中央，2 道=两侧，3 道=中+两侧）
        const beamX = [];
        for (let i = 0; i < lvl; i++) {
            beamX.push((i - (lvl - 1) / 2) * spacing);
        }
        for (const dx of beamX) {
            this.spawnLaserBeam(p.x + dx, p.y, halfW, top);
        }
        // 伤害：命中任意一道光束
        const dmg = Math.max(1, Math.round(this.stats.damage * (1 + 0.35 * (lvl - 1))));
        for (const e of this.enemys.slice()) {
            if (e.dead)
                continue;
            const ep = e.node.getPosition();
            if (ep.y <= p.y)
                continue;
            const r = halfW + 26 * e.node.scale.x;
            if (beamX.some(dx => Math.abs(ep.x - (p.x + dx)) < r)) {
                this.dealDamage(e, dmg);
            }
        }
        SoundFX.I.laser();
    }
    /** 单道镭射视觉：三层光带 + 收拢淡出（受特效并发预算约束） */
    spawnLaserBeam(x, y0, halfW, top) {
        if (this.fxLive >= 40) {
            return;
        }
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
    spawnBlackhole() {
        const lvl = this.stats.blackhole;
        // 优先挂在存活敌机最密集的位置附近
        let cx = this.playerNode.position.x + (this.rand() * 2 - 1) * 160;
        let cy = this.playerNode.position.y + 220 + this.rand() * 180;
        let bestScore = -1;
        for (const e of this.enemys) {
            if (e.dead)
                continue;
            const ep = e.node.getPosition();
            if (ep.y < -this.halfSize.y * 0.4)
                continue;
            let score = 0;
            for (const o of this.enemys) {
                if (o.dead)
                    continue;
                const op = o.node.getPosition();
                const dx = op.x - ep.x, dy = op.y - ep.y;
                if (dx * dx + dy * dy < 220 * 220) {
                    score += 1;
                }
            }
            if (score > bestScore) {
                bestScore = score;
                cx = ep.x;
                cy = ep.y;
            }
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
        const bh = { node: n, ring, life: 3, dmgTick: 0, level: lvl };
        this.blackholes.push(bh);
        tween(n).from({ scale: new Vec3(0.1, 0.1, 1) }).to(0.25, { scale: new Vec3(1, 1, 1) }).start();
    }
    updateBlackholes(dt) {
        for (let i = this.blackholes.length - 1; i >= 0; i--) {
            const bh = this.blackholes[i];
            bh.life -= dt;
            bh.ring.angle += 200 * dt;
            bh.dmgTick -= dt;
            const c = bh.node.getPosition();
            const pullR = 240 + bh.level * 20;
            // 吸聚：Boss 与哨戒炮不受位移影响
            for (const e of this.enemys) {
                if (e.dead || e.isBoss || e.kind === 'turret')
                    continue;
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
                    if (e.dead)
                        continue;
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
    spawnRingFx(x, y, radius, color, lineWidth, dur) {
        if (this.fxLive >= 40) {
            return;
        }
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
    spawnFlashFx(x, y, radius, color) {
        if (this.fxLive >= 40) {
            return;
        }
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
    spawnFloatText(x, y, str, color, size = 24) {
        // 满员：小号数字（普通伤害/治疗）直接丢弃；大号文字（暴击/道具播报）顶掉最旧的小字
        if (this.floatActive.length >= GameRoot_1.FLOAT_CAP) {
            const idx = this.floatActive.findIndex(f => f.label.fontSize < 24);
            if (size < 24 || idx < 0) {
                return;
            }
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
    recycleFloat(it, forced) {
        const i = this.floatActive.indexOf(it);
        if (i < 0)
            return;
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
    getBullet() {
        let b = this.bulletPool.pop();
        if (!b) {
            const n = new Node('Bullet');
            n.addComponent(UITransform).setContentSize(18, 30);
            n.addComponent(Graphics);
            n.addComponent(Bullet);
            this.worldLayer.addChild(n);
            b = n.getComponent(Bullet);
        }
        this.bullets.push(b);
        return b;
    }
    recycleBullet(b) {
        if (this.bulletPool.indexOf(b) >= 0)
            return;
        const i = this.bullets.indexOf(b);
        if (i >= 0) {
            this.bullets.splice(i, 1);
        }
        if (b.hostile) {
            this.hostileBullets = Math.max(0, this.hostileBullets - 1);
        }
        b.node.active = false;
        this.bulletPool.push(b);
    }
    // ---------------- 跟踪导弹 ----------------
    getMissile() {
        let m = this.missilePool.pop();
        if (!m) {
            const n = new Node('Missile');
            n.addComponent(UITransform).setContentSize(14, 20);
            n.addComponent(Graphics);
            n.addComponent(Missile);
            this.worldLayer.addChild(n);
            m = n.getComponent(Missile);
        }
        this.missiles.push(m);
        return m;
    }
    recycleMissile(m) {
        if (this.missilePool.indexOf(m) >= 0)
            return;
        const i = this.missiles.indexOf(m);
        if (i >= 0) {
            this.missiles.splice(i, 1);
        }
        m.node.active = false;
        this.missilePool.push(m);
    }
    /** 最近的存活敌机 */
    findNearestEnemy(from) {
        let best = null;
        let bestDist = Infinity;
        for (const e of this.enemys) {
            if (e.dead)
                continue;
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
    powerKinds() {
        const kinds = ['magnet', 'vacuum', 'rage', 'heal1', 'heal3', 'invinc', 'shield', 'xp2'];
        if (this.stats.critRate < 0.6) {
            kinds.push('crit');
        }
        if (MetaSave.hasAchievement('eliteHunter')) {
            kinds.push('freezeField');
        }
        return kinds;
    }
    getPowerUp() {
        let u = this.powerPool.pop();
        if (!u) {
            const n = new Node('PowerUp');
            n.addComponent(UITransform).setContentSize(40, 40);
            n.addComponent(Graphics);
            n.addComponent(PowerUp);
            this.worldLayer.addChild(n);
            u = n.getComponent(PowerUp);
        }
        return u;
    }
    recyclePowerUp(u) {
        if (this.powerPool.indexOf(u) >= 0)
            return;
        u.node.active = false;
        this.powerPool.push(u);
    }
    /** 击毁敌机时按概率掉落道具（幸运合约提升掉率） */
    tryDropPowerUp(pos) {
        const dropRate = 0.04 * (1 + 0.25 * MetaSave.metaLevel('luck'));
        if (this.rand() > dropRate)
            return;
        const kinds = this.powerKinds();
        const kind = kinds[Math.floor(this.rand() * kinds.length)];
        const u = this.getPowerUp();
        u.init(kind, pos.x, pos.y);
    }
    /** 强制掉落（Boss / 贪婪词条）：绕过概率 */
    dropPowerUp(pos) {
        const kinds = this.powerKinds();
        const kind = kinds[Math.floor(this.rand() * kinds.length)];
        const u = this.getPowerUp();
        u.init(kind, pos.x, pos.y);
    }
    /** 道具生效 */
    applyPowerUp(kind) {
        const s = this.stats;
        const D = GameRoot_1.EFFECT_DURATION;
        const p = this.playerNode.getPosition();
        // 拾取反馈飘字（战机头顶）
        const say = (text, color, size = 22) => {
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
                    if (!e.dead) {
                        e.applySlow(0.12, D.freezeField);
                    }
                }
                this.spawnRingFx(p.x, p.y, 640, new Color(125, 211, 252, 200), 6, 0.6);
                say('冰冻力场！', new Color(125, 211, 252), 26);
                SoundFX.I.freeze();
                break;
            case 'heal1': {
                if (s.hp >= s.maxHp) {
                    say('生命已满', new Color(148, 163, 184), 20);
                }
                else {
                    s.hp = Math.min(s.maxHp, s.hp + 1);
                    say(`生命 +1`, new Color(134, 239, 172));
                }
                break;
            }
            case 'heal3': {
                if (s.hp >= s.maxHp) {
                    say('生命已满', new Color(148, 163, 184), 20);
                }
                else {
                    s.hp = Math.min(s.maxHp, s.hp + 3);
                    say(`生命 +3`, new Color(16, 185, 129));
                }
                break;
            }
            case 'crit': {
                if (s.critRate >= 0.6) {
                    say('暴击率已满', new Color(148, 163, 184), 20);
                }
                else {
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
                }
                else {
                    s.hp = Math.min(s.maxHp, s.hp + 1); // 没有护盾模块时改为应急修复
                    say('应急修复 +1', new Color(134, 239, 172));
                }
                break;
        }
        SoundFX.I.power();
    }
    /** 场上所有宝石标记为强制吸向玩家（不论距离） */
    vacuumGems() {
        for (const g of this.gems) {
            g.attract = true;
        }
    }
    getGem() {
        let g = this.gemPool.pop();
        if (!g) {
            const n = new Node('Gem');
            n.addComponent(UITransform).setContentSize(16, 16);
            n.addComponent(Gem);
            this.worldLayer.addChild(n);
            g = n.getComponent(Gem);
        }
        return g;
    }
    recycleGem(g) {
        if (this.gemPool.indexOf(g) >= 0)
            return;
        const i = this.gems.indexOf(g);
        if (i >= 0) {
            this.gems.splice(i, 1);
        }
        g.node.active = false;
        this.gemPool.push(g);
    }
    // ---------------- 碰撞 ----------------
    checkCollisions() {
        // 玩家子弹打敌人（倒序遍历，回收时会 splice）
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            if (b.hostile) {
                continue;
            }
            const bp = b.node.getPosition();
            let consumed = false;
            for (const e of this.enemys) {
                if (e.dead)
                    continue;
                if (b.hits && b.hits.has(e))
                    continue; // 穿透中已命中过的敌机不再判定
                const ep = e.node.getPosition();
                const r = 30 * e.node.scale.x + 8;
                const dx = bp.x - ep.x;
                const dy = bp.y - ep.y;
                if (dx * dx + dy * dy < r * r) {
                    this.dealDamage(e, b.damage);
                    // 冰冻弹：命中附带减速
                    if (!e.dead && this.stats.freeze > 0) {
                        e.applySlow(0.7 - 0.12 * (this.stats.freeze - 1), 1.4);
                    }
                    if (b.hits) {
                        b.hits.add(e);
                        if (b.hits.size > this.stats.pierce) {
                            this.recycleBullet(b); // 穿透额度用尽
                            consumed = true;
                            break;
                        }
                        // 仍有穿透额度：子弹继续飞行并检查后续敌机
                    }
                    else {
                        this.recycleBullet(b);
                        consumed = true;
                        break;
                    }
                }
            }
            if (consumed) {
                continue;
            }
        }
        // 环绕电球撞击
        const player = this.playerNode.getComponent(Player);
        for (let i = 0; i < player.orbNodes.length; i++) {
            if (player.orbCds[i] > 0) {
                continue;
            }
            const op = player.orbNodes[i].worldPosition;
            for (const e of this.enemys) {
                if (e.dead)
                    continue;
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
            if (!b.hostile) {
                continue;
            }
            const bp = b.node.getPosition();
            const pp = this.playerNode.getPosition();
            const dx = bp.x - pp.x;
            const dy = bp.y - pp.y;
            if (dx * dx + dy * dy < 40 * 40) {
                this.recycleBullet(b);
                this.playerNode.getComponent(Player).takeDamage(this.enemyHitDamage());
            }
        }
        // 敌人撞玩家
        const pp = this.playerNode.getPosition();
        for (const e of this.enemys) {
            if (e.dead)
                continue;
            const ep = e.node.getPosition();
            const r = 30 * e.node.scale.x + 26;
            const dx = pp.x - ep.x;
            const dy = pp.y - ep.y;
            if (dx * dx + dy * dy < r * r) {
                this.playerNode.getComponent(Player).takeDamage(this.enemyHitDamage());
                break;
            }
        }
    }
    // ---------------- 经验 / 金币 / 升级 / 商店 ----------------
    addXp(amount) {
        if (this.mode === 'waves' || amount <= 0)
            return; // 波次模式成长全靠金币
        const boost = this.effectXp2 > 0 ? 2 : 1;
        this.xp += amount * this.stats.xpGain * boost;
        SoundFX.I.pick();
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level += 1;
            // 后期经验曲线变陡（平方项），拖住升级速度避免数值无限膨胀
            this.xpToNext = 5 + this.level * 3 + Math.floor(this.level * this.level * 0.15);
            this.pendingLevelUps += 1;
            if (this.level >= 10) {
                this.tryUnlock('veteran');
            }
        }
    }
    /** 金币入账（picked=true 计入拾取成就） */
    addGold(n, picked = true) {
        if (n <= 0)
            return;
        this.gold += n;
        if (picked) {
            this.runGoldPicked += n;
            SoundFX.I.gold();
            if (this.runGoldPicked >= 100) {
                this.tryUnlock('tycoon');
            }
        }
    }
    chooseUpgrade(up) {
        if (this.state !== 'levelup')
            return;
        up.apply(this.stats);
        this.pendingLevelUps -= 1;
        if (this.pendingLevelUps > 0) {
            this.overlays.showLevelUp(rollUpgrades(this.stats));
        }
        else {
            this.overlays.hideAll();
            this.state = 'playing';
        }
    }
    /** 波次结束：发波次奖励金币并进商店 */
    endWave() {
        const bonus = 24 + this.wave * 6;
        this.addGold(bonus, false);
        this.spawnFloatText(this.playerNode.position.x, this.playerNode.position.y + 80, `波次奖励 +${bonus} 金`, new Color(251, 191, 36), 24);
        this.state = 'shop';
        this.shopRerolls = 0;
        this.refreshShop();
        SoundFX.I.levelup();
    }
    refreshShop() {
        // 锁定槽位保留原道具与位置，其余槽位重摇（且不与锁定道具重复）
        const keep = [0, 1, 2, 3].map(i => {
            const up = this.shopOffers[i];
            return (up && this.shopLocks[i]) ? up : null;
        });
        const exclude = keep.filter((u) => !!u);
        const fresh = rollUpgrades(this.stats, 4, exclude);
        this.shopOffers = keep.map(up => { var _a; return up !== null ? up : ((_a = fresh.shift()) !== null && _a !== void 0 ? _a : null); });
        this.overlays.showShop(this.shopOffers, this.gold, this.wave, this.rerollCost());
    }
    rerollCost() { return 8 + this.shopRerolls * 4; }
    /** 商店购买 */
    buyShopOffer(index) {
        var _a;
        if (this.state !== 'shop')
            return false;
        const up = this.shopOffers[index];
        if (!up)
            return false;
        const price = (_a = up.price) !== null && _a !== void 0 ? _a : 25;
        if (this.gold < price) {
            SoundFX.I.hurt();
            return false;
        }
        this.gold -= price;
        up.apply(this.stats);
        this.shopOffers[index] = null;
        this.shopLocks[index] = false;
        this.overlays.updateShop(this.shopOffers, this.gold);
        SoundFX.I.buy();
        return true;
    }
    /** 商店锁定/解锁槽位：锁定道具在刷新与下一波原位保留，购买后自动解锁 */
    toggleShopLock(index) {
        if (this.state !== 'shop')
            return;
        if (!this.shopOffers[index])
            return;
        this.shopLocks[index] = !this.shopLocks[index];
        this.overlays.updateShop(this.shopOffers, this.gold);
        SoundFX.I.pick();
    }
    /** 商店刷新货架 */
    rerollShop() {
        if (this.state !== 'shop')
            return;
        const cost = this.rerollCost();
        if (this.gold < cost) {
            SoundFX.I.hurt();
            return;
        }
        this.gold -= cost;
        this.shopRerolls += 1;
        this.refreshShop();
        SoundFX.I.pick();
    }
    /** 开始下一波 */
    nextWave() {
        if (this.state !== 'shop')
            return;
        this.wave += 1;
        this.waveTime = Math.min(22 + this.wave * 2, 36);
        this.overlays.hideAll();
        this.state = 'playing';
        SoundFX.I.pick();
    }
    /** 冲刺计数（Player 调用） */
    onDash() {
        this.runDashes += 1;
        if (this.runDashes >= 30) {
            this.tryUnlock('dasher');
        }
    }
    /** 成就解锁：新解锁时弹 toast */
    tryUnlock(id) {
        if (MetaSave.unlock(id)) {
            const def = MetaSave.ACHIEVEMENTS.find(a => a.id === id);
            if (def) {
                this.overlays.toast(`成就解锁：${def.name}`);
                SoundFX.I.achieve();
            }
        }
    }
    // ---------------- 死亡与重开 ----------------
    onPlayerDead() {
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
    clearWorld() {
        for (const b of this.bullets.slice()) {
            this.recycleBullet(b);
        }
        for (const m of this.missiles.slice()) {
            this.recycleMissile(m);
        }
        for (const e of this.enemys.slice()) {
            this.recycleEnemy(e);
        }
        for (const g of this.gems.slice()) {
            this.recycleGem(g);
        }
        for (const bh of this.blackholes) {
            bh.node.destroy();
        }
        this.blackholes.length = 0;
        for (const b of this.bulletPool) {
            b.node.active = false;
        }
        for (const m of this.missilePool) {
            m.node.active = false;
        }
        for (const u of this.powerPool) {
            u.node.active = false;
        }
        for (const e of this.enemyPool) {
            e.node.active = false;
        }
        for (const g of this.gemPool) {
            g.node.active = false;
        }
        for (const f of this.floatActive.slice()) {
            this.recycleFloat(f, true);
        }
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
    restart() {
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
        this.vampCounter = 0;
        this.shopOffers = [];
        this.shopLocks = [false, false, false, false];
        if (this.mode === 'waves') {
            this.wave = 1;
            this.waveTime = Math.min(22 + this.wave * 2, 36);
            this.waveBossDone = 0;
            this.gold = 30 + 30 * MetaSave.metaLevel('startGold'); // 战备资金（基础 30 + 每级 30）
        }
        else {
            this.wave = 0;
            this.waveTime = 0;
        }
        this.playerNode.getComponent(Player).resetState();
        this.overlays.hideAll();
        this.state = 'playing';
    }
};
GameRoot.I = null;
/** 道具效果持续时长（秒），Hud 状态栏与效果计时共用 */
GameRoot.EFFECT_DURATION = { magnet: 6, rage: 8, xp2: 10, shieldRecharge: 12, invinc: 5, freezeField: 2.5 };
GameRoot.FLOAT_CAP = 26; // 同屏飘字上限
GameRoot = GameRoot_1 = __decorate([
    ccclass('GameRoot'),
    executionOrder(-1000)
], GameRoot);

      exports("GameRoot", GameRoot);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/Gem.ts", ['cc', './GameRoot.ts'], function (exports) {
  var _decorator, Component, Color, Graphics, UITransform, GameRoot;
  return {
    setters: [function (module) {
      _decorator = module._decorator;
      Component = module.Component;
      Color = module.Color;
      Graphics = module.Graphics;
      UITransform = module.UITransform;
      cclegacy = module.cclegacy;
    }, function (module) {
      GameRoot = module.GameRoot;
    }],
    execute: function () {
      cclegacy._RF.push({}, "53e70G4IrVFi747JZhWZvfl", "Gem", undefined);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};


const { ccclass } = _decorator;
const PICKUP_RADIUS = 34;
const MAGNET_SPEED = 460;
const DRIFT_SPEED = 62; // 与星空同步下坠，宝石不会停在原地
/** 经验宝石 / 金币（波次商店模式货币）：随星空缓缓下坠，靠近磁吸，碰到即拾取 */
let Gem = class Gem extends Component {
    constructor() {
        super(...arguments);
        this.value = 1;
        this.gold = false; // true=金币（波次模式） false=经验宝石
        this.attract = false; // 被"吸"道具标记：无视距离强制飞向玩家
        this.styled = null; // 当前已绘制类型（true=金币）
    }
    init(x, y, value, gold = false) {
        this.value = value;
        this.gold = gold;
        this.attract = false;
        this.node.active = true;
        // 钳制在玩家可达范围内，避免边缘宝石够不到
        const reachX = GameRoot.I.halfSize.x - 40;
        if (x > reachX) {
            x = reachX;
        }
        if (x < -reachX) {
            x = -reachX;
        }
        this.node.setPosition(x, y, 0);
        const sc = value >= 5 ? 1.5 : 1;
        this.node.setScale(sc, sc, 1);
        this.setStyle();
    }
    /** 按类型重绘（同类型复用时不重绘） */
    setStyle() {
        if (this.styled === this.gold)
            return;
        this.styled = this.gold;
        const g = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
        if (!g)
            return;
        g.clear();
        if (this.gold) {
            // 金币：金色六边形 + 亮芯
            g.fillColor = new Color(251, 191, 36, 70);
            g.circle(0, 0, 11);
            g.fill();
            g.fillColor = new Color(251, 191, 36);
            g.moveTo(0, -9);
            g.lineTo(8, -4.5);
            g.lineTo(8, 4.5);
            g.lineTo(0, 9);
            g.lineTo(-8, 4.5);
            g.lineTo(-8, -4.5);
            g.close();
            g.fill();
            g.fillColor = new Color(254, 243, 199);
            g.circle(0, 0, 3.5);
            g.fill();
        }
        else {
            // 经验宝石：青色菱形
            g.fillColor = new Color(103, 232, 249, 70);
            g.circle(0, 0, 10);
            g.fill();
            g.fillColor = new Color(165, 243, 252);
            g.moveTo(0, -8);
            g.lineTo(5, 0);
            g.lineTo(0, 8);
            g.lineTo(-5, 0);
            g.close();
            g.fill();
        }
        if (!this.node.getComponent(UITransform)) {
            this.node.addComponent(UITransform).setContentSize(16, 16);
        }
    }
    update(dt) {
        const root = GameRoot.I;
        if (root.state !== 'playing')
            return;
        const p = root.playerNode.getPosition();
        let g = this.node.getPosition();
        // 拾取
        let dx = p.x - g.x;
        let dy = p.y - g.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < PICKUP_RADIUS) {
            if (this.gold) {
                root.addGold(this.value);
            }
            else {
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
            if (root.effectMagnet > 0) {
                this.attract = true;
            }
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
};
Gem = __decorate([
    ccclass('Gem')
], Gem);

      exports("Gem", Gem);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/Hud.ts", ['cc', './GameRoot.ts', './Player.ts'], function (exports) {
  var _decorator, Component, Node, Color, Graphics, Label, UITransform, GameRoot, Player;
  return {
    setters: [function (module) {
      _decorator = module._decorator;
      Component = module.Component;
      Node = module.Node;
      Color = module.Color;
      Graphics = module.Graphics;
      Label = module.Label;
      UITransform = module.UITransform;
      cclegacy = module.cclegacy;
    }, function (module) {
      GameRoot = module.GameRoot;
    }, function (module) {
      Player = module.Player;
    }],
    execute: function () {
      cclegacy._RF.push({}, "8cf3cuZJ39CsYLq/6f81Tpt", "Hud", undefined);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Hud_1;



const { ccclass } = _decorator;
/** HUD：血条 / 经验条 / 等级 / 时间 / 击杀数 / 金币·波次 / 道具状态栏（含冲刺冷却） */
let Hud = Hud_1 = class Hud extends Component {
    constructor() {
        super(...arguments);
        this.hpFill = null;
        this.hpLabel = null;
        this.xpFill = null;
        this.xpBarBg = null;
        this.lvLabel = null;
        this.timeLabel = null;
        this.killLabel = null;
        this.atkLabel = null;
        this.modeTag = null;
        this.threatLabel = null;
        this.waveLabel = null;
        this.bossRoot = null;
        this.bossFill = null;
        this.buffChips = new Map();
        this.buffRow = null;
        this.hudRoot = null;
        this.hpBarW = 300;
        this.xpBarW = 720;
    }
    makeLabel(parent, size, color, x, y, anchorX = 0.5) {
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
    makeBar(parent, w, h, bgColor, fillColor, x, y) {
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
        this.hpFill = root.children[root.children.length - 1].getChildByName('bar-fill').getComponent(Graphics);
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
    setHidden(hidden) {
        if (this.hudRoot) {
            this.hudRoot.active = !hidden;
        }
    }
    /** 创建一个道具状态图标块 */
    makeBuffChip(key) {
        const style = Hud_1.BUFF_STYLE[key];
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
    updateBuffChips(root) {
        // 收集当前应显示的效果（按固定顺序）
        const wanted = [];
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
            const frac = ready ? 1 : Math.min(Math.max(1 - root.stats.shieldTimer / root.stats.shieldCd, 0), 1);
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
        if (!root || !this.hpLabel)
            return;
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
        let sec;
        if (waves) {
            sec = Math.max(0, Math.ceil(root.waveTime));
            this.waveLabel.string = `第 ${root.wave} 波`;
            this.modeTag.string = `◆ ${root.gold}`;
        }
        else {
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
            this.threatLabel.color = threat >= 12 ? Hud_1.THREAT_COLOR_L12
                : threat >= 8 ? Hud_1.THREAT_COLOR_L8
                    : threat >= 4 ? Hud_1.THREAT_COLOR_L4
                        : Hud_1.THREAT_COLOR_L1;
        }
        else {
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
};
Hud.BUFF_STYLE = {
    magnet: { char: '磁', color: new Color(103, 232, 249) },
    rage: { char: '狂', color: new Color(244, 63, 94) },
    xp2: { char: '倍', color: new Color(251, 191, 36) },
    invinc: { char: '无', color: new Color(255, 223, 128) },
    shield: { char: '盾', color: new Color(148, 163, 184) },
    dash: { char: '冲', color: new Color(125, 211, 252) },
};
Hud.THREAT_COLOR_L1 = new Color(250, 200, 60);
Hud.THREAT_COLOR_L4 = new Color(251, 146, 60);
Hud.THREAT_COLOR_L8 = new Color(248, 100, 100);
Hud.THREAT_COLOR_L12 = new Color(216, 110, 255);
Hud = Hud_1 = __decorate([
    ccclass('Hud')
], Hud);

      exports("Hud", Hud);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/main", ['./Bullet.ts', './Enemy.ts', './GameRoot.ts', './Gem.ts', './Hud.ts', './MetaSave.ts', './Missile.ts', './Overlays.ts', './Player.ts', './PowerUp.ts', './SoundFX.ts', './Upgrades.ts'], function () {
  return {
    setters: [null, null, null, null, null, null, null, null, null, null, null, null],
    execute: function () {}
  };
});
System.register("chunks:///_virtual/Missile.ts", ['cc', './GameRoot.ts', './SoundFX.ts'], function (exports) {
  var _decorator, Component, Color, Graphics, GameRoot, SoundFX;
  return {
    setters: [function (module) {
      _decorator = module._decorator;
      Component = module.Component;
      Color = module.Color;
      Graphics = module.Graphics;
      cclegacy = module.cclegacy;
    }, function (module) {
      GameRoot = module.GameRoot;
    }, function (module) {
      SoundFX = module.SoundFX;
    }],
    execute: function () {
      cclegacy._RF.push({}, "ac9d3yXIfJBR6UVKhnzJ4Ii", "Missile", undefined);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};



const { ccclass } = _decorator;
const TURN_RATE = 5.2; // 转向速率（弧度/秒）
const BASE_SPEED = 300;
const ACCEL = 460;
const MAX_SPEED = 800;
const LIFETIME = 6;
/**
 * 跟踪导弹：发射后自动锁定最近的敌机
 * 带转向速率限制的追踪弹，命中造成伤害
 */
let Missile = class Missile extends Component {
    constructor() {
        super(...arguments);
        this.damage = 2;
        this.angle = 0; // 航向角（0=正上方，与子弹一致）
        this.speed = BASE_SPEED;
        this.life = LIFETIME;
        this.target = null;
        this.drawn = false; // 外观无变化，池化复用不重绘
    }
    init(target, damage, initialAngle) {
        this.target = target;
        this.damage = damage;
        this.angle = initialAngle;
        this.speed = BASE_SPEED;
        this.life = LIFETIME;
        this.node.active = true;
        this.node.angle = initialAngle * 180 / Math.PI;
        this.draw();
    }
    draw() {
        if (this.drawn)
            return;
        this.drawn = true;
        const g = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
        g.clear();
        g.fillColor = new Color(251, 146, 60, 70);
        g.circle(0, 0, 9);
        g.fill();
        g.fillColor = new Color(253, 224, 71);
        g.moveTo(0, -10);
        g.lineTo(4.5, 8);
        g.lineTo(-4.5, 8);
        g.close();
        g.fill();
        g.fillColor = Color.WHITE;
        g.circle(0, 2, 2.5);
        g.fill();
    }
    /** 目标死亡或失联时重新锁定最近的敌机 */
    acquireTarget() {
        if (this.target && !this.target.dead && this.target.node.activeInHierarchy) {
            return this.target;
        }
        this.target = GameRoot.I.findNearestEnemy(this.node.getPosition());
        return this.target;
    }
    update(dt) {
        const root = GameRoot.I;
        if (root.state !== 'playing')
            return;
        this.life -= dt;
        if (this.life <= 0) {
            root.recycleMissile(this);
            return;
        }
        const t = this.acquireTarget();
        if (t) {
            const tp = t.node.getPosition();
            const mp = this.node.getPosition();
            const desired = Math.atan2(tp.x - mp.x, tp.y - mp.y);
            // 带角度环绕的最短转向
            let diff = desired - this.angle;
            while (diff > Math.PI) {
                diff -= Math.PI * 2;
            }
            while (diff < -Math.PI) {
                diff += Math.PI * 2;
            }
            const maxTurn = TURN_RATE * dt;
            this.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
            this.node.angle = this.angle * 180 / Math.PI;
            // 命中判定
            const r = 30 * t.node.scale.x + 10;
            const dx = tp.x - mp.x;
            const dy = tp.y - mp.y;
            if (dx * dx + dy * dy < r * r) {
                GameRoot.I.dealDamage(t, this.damage);
                SoundFX.I.hit();
                root.recycleMissile(this);
                return;
            }
        }
        this.speed = Math.min(MAX_SPEED, this.speed + ACCEL * dt);
        const mp = this.node.getPosition();
        const nx = mp.x + Math.sin(this.angle) * this.speed * dt;
        const ny = mp.y + Math.cos(this.angle) * this.speed * dt;
        this.node.setPosition(nx, ny, 0);
        const half = root.halfSize;
        if (nx < -half.x - 80 || nx > half.x + 80 || ny < -half.y - 80 || ny > half.y + 80) {
            root.recycleMissile(this);
        }
    }
};
Missile = __decorate([
    ccclass('Missile')
], Missile);

      exports("Missile", Missile);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/Overlays.ts", ['cc', './GameRoot.ts', './MetaSave.ts', './SoundFX.ts'], function (exports) {
  var _decorator, Component, Node, Color, Graphics, Label, UITransform, tween, Vec3, GameRoot, MetaSave, SoundFX;
  return {
    setters: [function (module) {
      _decorator = module._decorator;
      Component = module.Component;
      Node = module.Node;
      Color = module.Color;
      Graphics = module.Graphics;
      Label = module.Label;
      UITransform = module.UITransform;
      tween = module.tween;
      Vec3 = module.Vec3;
      cclegacy = module.cclegacy;
    }, function (module) {
      GameRoot = module.GameRoot;
    }, function (module) {
      MetaSave = module;
    }, function (module) {
      SoundFX = module.SoundFX;
    }],
    execute: function () {
      cclegacy._RF.push({}, "c6f55Kz0/9Cga+qr0Z+k5ez", "Overlays", undefined);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var Overlays_1;




const { ccclass } = _decorator;
const CARD_W = 560;
const CARD_H = 110;
/** 暂停面板展示的属性清单 */
const PAUSE_STATS = [
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
let Overlays = Overlays_1 = class Overlays extends Component {
    constructor() {
        super(...arguments);
        this.levelUpPanel = null;
        this.gameOverPanel = null;
        this.pausePanel = null;
        this.pauseStatLabels = [];
        this.menuPanel = null;
        this.shopPanel = null;
        this.metaPanel = null;
        this.achPanel = null;
        this.galleryPanel = null;
        this.toastNode = null;
        this.toastLabel = null;
        this.toastQueue = [];
        this.toastBusy = false;
        this.menuCoresLabel = null;
        this.menuDailyLabel = null;
        this.cardRoot = null;
        this.statLabels = [];
        this.gameOverExtra = [];
        this.shopGoldLabel = null;
        this.shopCardsRoot = null;
        this.metaCoresLabel = null;
        this.metaCardsRoot = null;
        // ---------------- 升级三选一 ----------------
        this.selIndex = 0;
        this.cardNodes = [];
        this.choices = [];
        this.shopSel = 0;
    }
    makeLabel(parent, size, color, x, y, text = '', anchorX = 0.5) {
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
    makeDim(parent) {
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
    makeBtn(parent, w, h, fillColor, textColor, text, size, x, y, cb, stroke = '') {
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
    buildMenu() {
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
    showMenu() {
        if (!this.menuPanel)
            return;
        // 刷新数据核心与每日最佳
        this.menuCoresLabel.string = `数据核心 ◆ ${MetaSave.cores()}`;
        const best = MetaSave.dailyBest(MetaSave.todayKey());
        this.menuDailyLabel.string = best >= 0
            ? `今日最佳 ${Math.floor(best / 60)}:${String(best % 60).padStart(2, '0')}`
            : '今日最佳 --:--（尚未挑战）';
        this.menuPanel.active = true;
    }
    showLevelUp(choices) {
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
    makeUpgradeCard(up, onTap) {
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
    moveSel(d) {
        if (!this.levelUpPanel.active || this.cardNodes.length === 0)
            return;
        const n = this.cardNodes.length;
        this.selIndex = (this.selIndex + d + n) % n;
        SoundFX.I.pick();
        this.updateHighlight();
    }
    /** 键盘空格/回车确认当前选中项 */
    confirmSel() {
        if (!this.levelUpPanel.active)
            return;
        const up = this.choices[this.selIndex];
        if (!up)
            return;
        GameRoot.I.chooseUpgrade(up);
    }
    updateHighlight() {
        this.cardNodes.forEach((n, i) => {
            const sel = i === this.selIndex;
            const hl = n.getChildByName('hl');
            if (hl) {
                hl.active = sel;
            }
            n.setScale(sel ? 1.04 : 1, sel ? 1.04 : 1, 1);
        });
    }
    // ---------------- 补给站（波次商店） ----------------
    buildShopPanel() {
        this.shopPanel = new Node('ShopPanel');
        this.node.addChild(this.shopPanel);
        this.makeDim(this.shopPanel);
        this.makeLabel(this.shopPanel, 42, new Color(251, 191, 36), 0, 480, '补 给 站');
        this.makeLabel(this.shopPanel, 20, new Color(148, 163, 184), 0, 432, '花金币强化，下一波更凶');
        this.shopGoldLabel = this.makeLabel(this.shopPanel, 28, new Color(251, 191, 36), 0, 388, '金 0');
        this.shopCardsRoot = new Node('ShopCards');
        this.shopPanel.addChild(this.shopCardsRoot);
    }
    showShop(offers, gold, wave, rerollCost) {
        this.rebuildShop(offers, gold, wave, rerollCost);
        this.shopPanel.active = true;
    }
    /** 购买后局部刷新（价格/金币/售罄状态） */
    updateShop(offers, gold) {
        const wave = GameRoot.I.wave;
        this.rebuildShop(offers, gold, wave, 8 + GameRoot.I.shopRerolls * 4);
    }
    rebuildShop(offers, gold, wave, rerollCost) {
        this.shopCardsRoot.destroyAllChildren();
        this.shopGoldLabel.string = `金 ${gold}    ·    第 ${wave} 波结束`;
        const locks = GameRoot.I.shopLocks;
        offers.forEach((up, i) => {
            var _a;
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
            const price = (_a = up.price) !== null && _a !== void 0 ? _a : 25;
            const card = this.makeUpgradeCard(up, () => { GameRoot.I.buyShopOffer(i); });
            card.name = 'offer' + i; // 记录槽位下标，供键盘选中反查
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
    makeLockBtn(card, offerIndex, locked) {
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
        btn.on(Node.EventType.TOUCH_END, (e) => {
            e.propagationStopped = true; // 阻止冒泡触发卡片购买
            GameRoot.I.toggleShopLock(offerIndex);
        });
        card.addChild(btn);
    }
    highlightShop() {
        // 卡片节点（带高亮框子节点的即卡片；按钮/文本无 hl 子节点自动跳过）
        const cardNodes = this.shopCardsRoot.children.filter(n => n.getChildByName('hl'));
        cardNodes.forEach(n => {
            const hl = n.getChildByName('hl');
            if (hl) {
                hl.active = false;
            }
            n.setScale(1, 1, 1);
        });
        if (cardNodes[this.shopSel]) {
            const n = cardNodes[this.shopSel];
            const hl = n.getChildByName('hl');
            if (hl) {
                hl.active = true;
            }
            n.setScale(1.03, 1.03, 1);
        }
    }
    moveShopSel(d) {
        if (!this.shopPanel.active)
            return;
        const n = this.shopCardsRoot.children.filter(c => c.getChildByName('hl')).length;
        if (n === 0)
            return;
        this.shopSel = (this.shopSel + d + n) % n;
        SoundFX.I.pick();
        this.highlightShop();
    }
    /** 键盘当前选中卡片对应的商店槽位下标（卡片 name 为 offer{i}，售罄占位无卡片会被跳过） */
    selectedOfferIndex() {
        const cardNodes = this.shopCardsRoot.children.filter(n => n.getChildByName('hl'));
        const n = cardNodes[this.shopSel];
        const m = n && /^offer(\d+)$/.exec(n.name);
        return m ? parseInt(m[1], 10) : -1;
    }
    confirmShopSel() {
        if (!this.shopPanel.active)
            return;
        const idx = this.selectedOfferIndex();
        if (idx >= 0) {
            GameRoot.I.buyShopOffer(idx);
        }
    }
    /** 键盘 L 键：锁定/解锁当前选中槽位 */
    toggleShopSelLock() {
        if (!this.shopPanel.active)
            return;
        const idx = this.selectedOfferIndex();
        if (idx >= 0) {
            GameRoot.I.toggleShopLock(idx);
        }
    }
    // ---------------- 机库强化 ----------------
    buildMetaPanel() {
        this.metaPanel = new Node('MetaPanel');
        this.node.addChild(this.metaPanel);
        this.makeDim(this.metaPanel);
        this.makeLabel(this.metaPanel, 44, new Color(251, 191, 36), 0, 560, '机 库 强 化');
        this.makeLabel(this.metaPanel, 20, new Color(148, 163, 184), 0, 516, '数据核心兑换的永久出厂加成（所有模式生效）');
        this.metaCoresLabel = this.makeLabel(this.metaPanel, 26, new Color(251, 191, 36), 0, 474, '数据核心 ◆ 0');
        this.metaCardsRoot = new Node('MetaCards');
        this.metaPanel.addChild(this.metaCardsRoot);
    }
    showMeta() {
        this.hideAll();
        this.rebuildMeta();
        this.metaPanel.active = true;
    }
    rebuildMeta() {
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
            for (let k = 0; k < def.costs.length; k++) {
                pips += k < lv ? '●' : '○';
            }
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
                }
                else {
                    SoundFX.I.hurt();
                }
            });
        });
        this.makeBtn(this.metaCardsRoot, 280, 68, '#1e293b', '#cbd5e1', '返 回', 26, 0, -376, () => { this.hideAll(); this.showMenu(); });
    }
    // ---------------- 成就 ----------------
    buildAchPanel() {
        this.achPanel = new Node('AchPanel');
        this.node.addChild(this.achPanel);
        this.makeDim(this.achPanel);
        this.makeLabel(this.achPanel, 44, new Color(103, 232, 249), 0, 500, '成 就');
        this.makeLabel(this.achPanel, 20, new Color(148, 163, 184), 0, 456, `已解锁 ${MetaSave.achievementCount()} / ${MetaSave.ACHIEVEMENTS.length} · 部分成就解锁新内容`);
    }
    showAch() {
        this.hideAll();
        const list = this.achPanel.getChildByName('list');
        if (list) {
            list.destroy();
        }
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
            if (got) {
                ig.fillColor = new Color(251, 191, 36);
                ig.circle(0, 0, 12);
                ig.fill();
            }
            icon.setPosition(-240, 0, 0);
            row.addChild(icon);
            this.makeLabel(row, 24, got ? new Color(253, 224, 71) : new Color(148, 163, 184), -206, 10, a.name, 0);
            this.makeLabel(row, 17, got ? new Color(199, 224, 180) : new Color(100, 116, 139), -206, -16, a.desc, 0);
        });
        this.makeBtn(listNode, 280, 68, '#1e293b', '#cbd5e1', '返 回', 26, 0, -260, () => { this.hideAll(); this.showMenu(); });
        this.achPanel.active = true;
    }
    buildGalleryPanel() {
        this.galleryPanel = new Node('GalleryPanel');
        this.node.addChild(this.galleryPanel);
        this.makeDim(this.galleryPanel);
        this.makeLabel(this.galleryPanel, 44, new Color(253, 164, 175), 0, 560, '敌 机 图 鉴');
        this.makeLabel(this.galleryPanel, 20, new Color(148, 163, 184), 0, 514, '认识它们，然后活得更久');
    }
    /** 画敌机造型（与场上实际造型一致的简化版） */
    drawEnemyIcon(g, kind) {
        g.clear();
        const poly = (sides, r) => {
            g.moveTo(0, -r);
            for (let i = 1; i < sides; i++) {
                const a = (i / sides) * Math.PI * 2;
                g.lineTo(Math.sin(a) * r, -Math.cos(a) * r);
            }
            g.close();
        };
        if (kind === 'chaser') {
            g.fillColor = new Color(244, 63, 94, 70);
            g.circle(0, 0, 24);
            g.fill();
            g.fillColor = new Color(244, 63, 94);
            g.moveTo(0, -22);
            g.lineTo(19, 14);
            g.lineTo(-19, 14);
            g.close();
            g.fill();
            g.fillColor = Color.WHITE;
            g.circle(0, 2, 4);
            g.fill();
        }
        else if (kind === 'shooter') {
            g.fillColor = new Color(167, 139, 250, 70);
            g.circle(0, 0, 25);
            g.fill();
            g.fillColor = new Color(167, 139, 250);
            poly(5, 21);
            g.fill();
            g.fillColor = new Color(237, 233, 254);
            g.circle(0, 0, 6);
            g.fill();
        }
        else if (kind === 'speeder') {
            g.fillColor = new Color(244, 114, 182, 70);
            g.circle(0, 0, 25);
            g.fill();
            g.fillColor = new Color(244, 114, 182);
            g.moveTo(0, -24);
            g.lineTo(12, 0);
            g.lineTo(0, 24);
            g.lineTo(-12, 0);
            g.close();
            g.fill();
            g.fillColor = Color.WHITE;
            g.circle(0, 2, 3.5);
            g.fill();
        }
        else if (kind === 'splitter') {
            g.fillColor = new Color(52, 211, 153, 70);
            g.circle(0, 0, 25);
            g.fill();
            g.fillColor = new Color(52, 211, 153);
            g.roundRect(-17, -17, 34, 34, 5);
            g.fill();
            g.strokeColor = new Color(6, 78, 59);
            g.lineWidth = 3.5;
            g.moveTo(-17, 0);
            g.lineTo(17, 0);
            g.moveTo(0, -17);
            g.lineTo(0, 17);
            g.stroke();
        }
        else if (kind === 'bomber') {
            g.fillColor = new Color(251, 146, 60, 70);
            g.circle(0, 0, 24);
            g.fill();
            g.fillColor = new Color(217, 119, 6);
            g.moveTo(-20, -6);
            g.lineTo(-27, -15);
            g.lineTo(-12, -13);
            g.close();
            g.fill();
            g.moveTo(20, -6);
            g.lineTo(27, -15);
            g.lineTo(12, -13);
            g.close();
            g.fill();
            g.fillColor = new Color(251, 191, 36);
            g.circle(0, 0, 16);
            g.fill();
            g.fillColor = new Color(120, 53, 15);
            g.roundRect(-16, -3, 32, 5, 2.5);
            g.fill();
            g.roundRect(-12, 6, 24, 4.5, 2);
            g.fill();
            g.fillColor = Color.WHITE;
            g.circle(-5, -7, 2.6);
            g.circle(5, -7, 2.6);
            g.fill();
        }
        else if (kind === 'turret') {
            g.fillColor = new Color(100, 116, 139, 60);
            g.circle(0, 0, 26);
            g.fill();
            g.fillColor = new Color(71, 85, 105);
            poly(8, 23);
            g.fill();
            g.strokeColor = new Color(148, 163, 184);
            g.lineWidth = 3;
            poly(8, 23);
            g.stroke();
            g.fillColor = new Color(203, 213, 225);
            g.roundRect(-8, 0, 5.5, 27, 3);
            g.fill();
            g.roundRect(2.5, 0, 5.5, 27, 3);
            g.fill();
            g.fillColor = new Color(226, 232, 240);
            g.circle(0, 0, 8);
            g.fill();
            g.fillColor = new Color(244, 63, 94);
            g.circle(0, 0, 3.5);
            g.fill();
        }
        else if (kind === 'healer') {
            g.fillColor = new Color(52, 211, 153, 55);
            g.circle(0, 0, 26);
            g.fill();
            g.fillColor = new Color(167, 243, 208);
            g.roundRect(-6, -18, 12, 36, 5);
            g.fill();
            g.roundRect(-18, -6, 36, 12, 5);
            g.fill();
            g.strokeColor = new Color(16, 185, 129);
            g.lineWidth = 3;
            g.circle(0, 0, 19);
            g.stroke();
        }
        else if (kind === 'boss') {
            g.fillColor = new Color(251, 191, 36, 60);
            g.circle(0, 0, 34);
            g.fill();
            g.fillColor = new Color(251, 191, 36);
            poly(6, 30);
            g.fill();
            g.strokeColor = new Color(120, 53, 15);
            g.lineWidth = 4;
            g.circle(0, 0, 15);
            g.stroke();
            g.fillColor = new Color(254, 243, 199);
            g.circle(0, 0, 7);
            g.fill();
        }
        else if (kind === 'affix') {
            // 精英词条光环：双色圆环 + 四段外弧
            g.strokeColor = new Color(56, 189, 248, 220);
            g.lineWidth = 4;
            g.circle(0, 0, 22);
            g.stroke();
            g.strokeColor = new Color(56, 189, 248, 80);
            g.lineWidth = 8;
            g.circle(0, 0, 26);
            g.stroke();
            g.strokeColor = new Color(56, 189, 248, 230);
            g.lineWidth = 4.5;
            for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2;
                g.moveTo(Math.sin(a) * 32, Math.cos(a) * 32);
                g.lineTo(Math.sin(a + 0.4) * 32, Math.cos(a + 0.4) * 32);
                g.stroke();
            }
        }
    }
    showGallery() {
        this.hideAll();
        const list = this.galleryPanel.getChildByName('list');
        if (list) {
            list.destroy();
        }
        const listNode = new Node('list');
        this.galleryPanel.addChild(listNode);
        Overlays_1.GALLERY.forEach((d, i) => {
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
    buildToast() {
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
    toast(text) {
        this.toastQueue.push(text);
        this.pumpToast();
    }
    pumpToast() {
        if (this.toastBusy || this.toastQueue.length === 0)
            return;
        this.toastBusy = true;
        const text = this.toastQueue.shift();
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
    showGameOver(elapsed, level, kills) {
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
        }
        else {
            this.gameOverExtra[1].string = '';
        }
        this.gameOverPanel.active = true;
    }
    showPaused() {
        // 填充当前属性数值
        const s = GameRoot.I.stats;
        PAUSE_STATS.forEach((def, i) => {
            this.pauseStatLabels[i].value.string = def.get(s);
        });
        this.pausePanel.active = true;
    }
    hideAll() {
        if (this.levelUpPanel) {
            this.levelUpPanel.active = false;
        }
        if (this.gameOverPanel) {
            this.gameOverPanel.active = false;
        }
        if (this.pausePanel) {
            this.pausePanel.active = false;
        }
        if (this.menuPanel) {
            this.menuPanel.active = false;
        }
        if (this.shopPanel) {
            this.shopPanel.active = false;
        }
        if (this.metaPanel) {
            this.metaPanel.active = false;
        }
        if (this.achPanel) {
            this.achPanel.active = false;
        }
        if (this.galleryPanel) {
            this.galleryPanel.active = false;
        }
    }
};
// ---------------- 敌机图鉴 ----------------
/** 图鉴条目：kind 对应 drawEnemyIcon 的画法 */
Overlays.GALLERY = [
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
Overlays = Overlays_1 = __decorate([
    ccclass('Overlays')
], Overlays);

      exports("Overlays", Overlays);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/Player.ts", ['cc', './GameRoot.ts', './SoundFX.ts'], function (exports) {
  var _decorator, Component, Node, Vec3, Color, Graphics, Label, input, Input, KeyCode, UIOpacity, UITransform, tween, GameRoot, SoundFX;
  return {
    setters: [function (module) {
      _decorator = module._decorator;
      Component = module.Component;
      Node = module.Node;
      Vec3 = module.Vec3;
      Color = module.Color;
      Graphics = module.Graphics;
      Label = module.Label;
      input = module.input;
      Input = module.Input;
      KeyCode = module.KeyCode;
      UIOpacity = module.UIOpacity;
      UITransform = module.UITransform;
      tween = module.tween;
      cclegacy = module.cclegacy;
    }, function (module) {
      GameRoot = module.GameRoot;
    }, function (module) {
      SoundFX = module.SoundFX;
    }],
    execute: function () {
      cclegacy._RF.push({}, "04615qeo4ZBa7DJTlhOzZMl", "Player", undefined);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};



const { ccclass } = _decorator;
const BASE_SPEED = 460; // moveSpeed 为 1 时的速度（像素/秒）
const BULLET_SPEED = 640;
const ORBIT_RADIUS = 78;
const ORBIT_SPEED = 2.6; // 电球旋转角速度（弧度/秒）
const DASH_SPEED = 1500; // 冲刺瞬移速度
const DASH_DURATION = 0.13; // 冲刺位移时长
const DASH_CD = 2.6; // 冲刺冷却（Hud 读取）
const DASH_INVINC = 0.35; // 冲刺后无敌帧
/** 玩家：霓虹箭形战机，跟随手指移动，自动射击；空格/Shift 冲刺 */
let Player = class Player extends Component {
    constructor() {
        super(...arguments);
        this.target = null;
        this.fireTimer = 0;
        this.missileTimer = 0;
        this.laserTimer = 0;
        this.blackholeTimer = 0;
        this.invincible = 0;
        this.dying = false;
        this.animT = 0;
        this.keys = new Set(); // 当前按住的键盘按键
        // 冲刺状态
        this.dashCdT = 0; // 冷却剩余（Hud 读取显示）
        this.dashT = 0; // 位移剩余时长
        this.dashDir = new Vec3(0, 1, 0);
        this.lastDir = new Vec3(0, 1, 0); // 冲刺默认方向 = 最近移动方向
        this.bodyNode = null;
        this.classicNode = null;
        this.skinIndex = 0; // 0=霓虹箭形 1=经典战机
        this.flameNode = null;
        this.invincRing = null;
        this.shieldRing = null;
        this.dashBtn = null;
        this.dashBtnRing = null;
        this.orbNodes = [];
        this.orbCds = [];
        this.orbAngle = 0;
    }
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
    onKeyDown(e) {
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
    onKeyUp(e) {
        this.keys.delete(e.keyCode);
    }
    /** 读取键盘方向：返回归一化前的 dx/dy */
    keyAxis() {
        let dx = 0, dy = 0;
        if (this.keys.has(KeyCode.KEY_W) || this.keys.has(KeyCode.ARROW_UP)) {
            dy += 1;
        }
        if (this.keys.has(KeyCode.KEY_S) || this.keys.has(KeyCode.ARROW_DOWN)) {
            dy -= 1;
        }
        if (this.keys.has(KeyCode.KEY_A) || this.keys.has(KeyCode.ARROW_LEFT)) {
            dx -= 1;
        }
        if (this.keys.has(KeyCode.KEY_D) || this.keys.has(KeyCode.ARROW_RIGHT)) {
            dx += 1;
        }
        return { dx, dy };
    }
    /** 霓虹造型：发光箭形 + 白色核心；经典造型：橙白涂装螺旋桨战机（致敬老版） */
    buildVisual() {
        this.bodyNode = new Node('body');
        this.node.addChild(this.bodyNode);
        const g = this.bodyNode.addComponent(Graphics);
        g.fillColor = new Color(34, 211, 238, 55);
        g.circle(0, -2, 27);
        g.fill();
        g.fillColor = new Color(34, 211, 238);
        g.moveTo(0, -26);
        g.lineTo(19, 17);
        g.lineTo(0, 9);
        g.lineTo(-19, 17);
        g.close();
        g.fill();
        g.fillColor = Color.WHITE;
        g.moveTo(0, -14);
        g.lineTo(8, 8);
        g.lineTo(-8, 8);
        g.close();
        g.fill();
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
        cg.lineTo(-28, 12);
        cg.lineTo(-28, 20);
        cg.lineTo(-6, 12);
        cg.lineTo(6, 12);
        cg.lineTo(28, 20);
        cg.lineTo(28, 12);
        cg.close();
        cg.fill();
        // 机身
        cg.fillColor = new Color(255, 183, 77);
        cg.roundRect(-7, -24, 14, 46, 7);
        cg.fill();
        // 尾翼
        cg.fillColor = new Color(255, 140, 20);
        cg.moveTo(0, -14);
        cg.lineTo(-12, -26);
        cg.lineTo(12, -26);
        cg.close();
        cg.fill();
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
        fg.moveTo(0, -14);
        fg.lineTo(6, 0);
        fg.lineTo(-6, 0);
        fg.close();
        fg.fill();
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
    buildDashButton() {
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
    drawDashRing(frac) {
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
    resetState() {
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
        if (op) {
            op.opacity = 255;
        }
        this.syncOrbs();
    }
    onTouch(e) {
        if (GameRoot.I.state !== 'playing')
            return;
        const ui = e.getUILocation();
        const half = GameRoot.I.halfSize;
        const x = ui.x - half.x;
        const y = ui.y - half.y;
        // 冲刺按钮区域的触摸不作为移动目标
        if (this.dashBtn && this.dashBtn.active) {
            const bp = this.dashBtn.position;
            const dx = x - bp.x, dy = y - bp.y;
            if (dx * dx + dy * dy < 58 * 58)
                return;
        }
        this.target = new Vec3(x, y, 0);
    }
    onTouchEnd() {
        this.target = null;
    }
    /** 冲刺：向最近移动方向瞬移一段，带无敌帧与残影 */
    tryDash() {
        const root = GameRoot.I;
        if (root.state !== 'playing' || this.dying)
            return false;
        if (this.dashCdT > 0 || this.dashT > 0)
            return false;
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
    spawnGhost() {
        const n = new Node('dash-ghost');
        n.addComponent(UITransform).setContentSize(56, 56);
        const g = n.addComponent(Graphics);
        g.fillColor = new Color(34, 211, 238, 90);
        g.moveTo(0, -26);
        g.lineTo(19, 17);
        g.lineTo(0, 9);
        g.lineTo(-19, 17);
        g.close();
        g.fill();
        const p = this.node.getPosition();
        n.setPosition(p.x, p.y, 0);
        this.node.parent.addChild(n);
        const op = n.addComponent(UIOpacity);
        op.opacity = 150;
        tween(n).to(0.3, { scale: new Vec3(0.6, 0.6, 1) }).start();
        tween(op).to(0.3, { opacity: 0 }).call(() => { n.destroy(); }).start();
    }
    /** 按当前属性同步环绕电球数量 */
    syncOrbs() {
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
            const orb = this.orbNodes.pop();
            this.orbCds.pop();
            orb.destroy();
        }
    }
    update(dt) {
        const root = GameRoot.I;
        const stats = root.stats;
        // 冲刺按钮显隐与冷却刷新（暂停/选卡时隐藏）
        if (this.dashBtn) {
            const show = root.state === 'playing' && !this.dying;
            if (this.dashBtn.active !== show) {
                this.dashBtn.active = show;
            }
            if (show) {
                const frac = 1 - Math.max(this.dashCdT, 0) / root.stats.dashCd;
                this.drawDashRing(frac);
            }
        }
        if (root.state !== 'playing' || this.dying)
            return;
        this.animT += dt;
        // 冲刺冷却/位移
        if (this.dashCdT > 0) {
            this.dashCdT -= dt;
        }
        if (this.dashT > 0) {
            this.dashT -= dt;
            const p = this.node.getPosition();
            this.node.setPosition(p.x + this.dashDir.x * DASH_SPEED * dt, p.y + this.dashDir.y * DASH_SPEED * dt, 0);
            // 冲刺拖尾
            if (Math.random() < 0.8) {
                this.spawnGhost();
            }
        }
        else {
            // 键盘优先，其次触点跟随
            const axis = this.keyAxis();
            if (axis.dx !== 0 || axis.dy !== 0) {
                const len = Math.sqrt(axis.dx * axis.dx + axis.dy * axis.dy);
                this.lastDir.set(axis.dx / len, axis.dy / len, 0);
                const p = this.node.getPosition();
                const step = BASE_SPEED * stats.moveSpeed * dt;
                this.node.setPosition(p.x + axis.dx / len * step, p.y + axis.dy / len * step, 0);
            }
            else if (this.target) {
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
            const op = this.node.getComponent(UIOpacity);
            op.opacity = Math.floor(this.invincible * 10) % 2 === 0 ? 120 : 255;
        }
        // 护盾充能
        if (stats.shieldMax > 0 && stats.shield < 1) {
            stats.shieldTimer -= dt;
            if (stats.shieldTimer <= 0) {
                stats.shield = 1;
            }
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
            if (this.orbCds[i] > 0) {
                this.orbCds[i] -= dt;
            }
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
    shoot() {
        const root = GameRoot.I;
        const count = root.stats.bulletCount;
        const p = this.node.getPosition();
        for (let i = 0; i < count; i++) {
            const angle = (i - (count - 1) / 2) * 0.18;
            const bullet = root.getBullet();
            bullet.node.setPosition(p.x, p.y + 40, 0);
            bullet.init(angle, BULLET_SPEED * root.stats.bulletSpeed, root.stats.damage, false, root.stats.pierce);
        }
        SoundFX.I.shoot();
    }
    /** 受到伤害，返回是否死亡（无敌道具优先，其次护盾） */
    takeDamage(dmg) {
        if (this.invincible > 0 || this.dying)
            return false;
        // 无敌道具生效期间完全免疫
        if (GameRoot.I.effectInvinc > 0)
            return false;
        const root = GameRoot.I;
        const stats = root.stats;
        if (stats.shieldMax > 0 && stats.shield >= 1) {
            stats.shield = 0;
            stats.shieldTimer = stats.shieldCd;
            this.invincible = 0.6;
            SoundFX.I.shieldBreak();
            return false;
        }
        stats.hp -= dmg;
        this.invincible = 1.0 + stats.iframeBonus; // 相位装甲延长受击无敌
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
};
Player = __decorate([
    ccclass('Player')
], Player);

      exports("Player", Player);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/PowerUp.ts", ['cc', './GameRoot.ts'], function (exports) {
  var _decorator, Component, Node, Color, Graphics, Label, UITransform, GameRoot;
  return {
    setters: [function (module) {
      _decorator = module._decorator;
      Component = module.Component;
      Node = module.Node;
      Color = module.Color;
      Graphics = module.Graphics;
      Label = module.Label;
      UITransform = module.UITransform;
      cclegacy = module.cclegacy;
    }, function (module) {
      GameRoot = module.GameRoot;
    }],
    execute: function () {
      cclegacy._RF.push({}, "37a50npTAxAQr9EnMJOBjOo", "PowerUp", undefined);
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};


const { ccclass } = _decorator;
const KIND_DEFS = {
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
let PowerUp = class PowerUp extends Component {
    constructor() {
        super(...arguments);
        this.kind = 'magnet';
        this.spin = 0;
    }
    init(kind, x, y) {
        this.kind = kind;
        this.spin = Math.random() * Math.PI * 2;
        this.node.active = true;
        // 钳制在玩家可达范围内，避免掉在边缘外捡不到
        const reachX = GameRoot.I.halfSize.x - 40;
        if (x > reachX) {
            x = reachX;
        }
        if (x < -reachX) {
            x = -reachX;
        }
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
        const box = this.node.getChildByName('box');
        const g = box.getComponent(Graphics);
        const def = KIND_DEFS[this.kind];
        g.clear();
        g.strokeColor = def.color;
        g.lineWidth = 3;
        g.roundRect(-19, -19, 38, 38, 9);
        g.stroke();
        g.fillColor = new Color(def.color.r, def.color.g, def.color.b, 40);
        g.roundRect(-19, -19, 38, 38, 9);
        g.fill();
        box.getChildByName('char').getComponent(Label).string = def.char;
    }
    update(dt) {
        const root = GameRoot.I;
        if (root.state !== 'playing')
            return;
        const p = this.node.getPosition();
        const y = p.y - FALL_SPEED * dt;
        this.spin += 1.6 * dt;
        this.node.getChildByName('box').angle = Math.sin(this.spin) * 14;
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
};
PowerUp = __decorate([
    ccclass('PowerUp')
], PowerUp);

      exports("PowerUp", PowerUp);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/SoundFX.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "544caLgxqVGM6t5AmC45hAg", "SoundFX", undefined);
/**
 * 程序合成音效（WebAudio）
 * 不依赖任何音频资源文件，全部实时合成
 * 浏览器自动播放策略：需在用户首次触摸后 resume
 */
class SoundFX {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.noiseBuf = null;
        this.enabled = true;
    }
    static get I() {
        if (!SoundFX.inst) {
            SoundFX.inst = new SoundFX();
        }
        return SoundFX.inst;
    }
    init() {
        try {
            if (!this.ctx) {
                const AC = window.AudioContext || window.webkitAudioContext;
                if (!AC) {
                    this.enabled = false;
                    return;
                }
                this.ctx = new AC();
                this.master = this.ctx.createGain();
                this.master.gain.value = 0.45;
                this.master.connect(this.ctx.destination);
                // 预生成白噪声缓冲（爆炸用）
                const len = Math.floor(this.ctx.sampleRate * 0.5);
                this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
                const data = this.noiseBuf.getChannelData(0);
                for (let i = 0; i < len; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
        }
        catch (e) {
            this.enabled = false;
        }
    }
    /** 单音：频率从 start 滑到 end */
    tone(start, end, dur, type, vol, delay = 0) {
        if (!this.enabled || !this.ctx || !this.master)
            return;
        const t = this.ctx.currentTime + delay;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(Math.max(start, 1), t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t + dur);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(g);
        g.connect(this.master);
        osc.start(t);
        osc.stop(t + dur + 0.02);
    }
    noise(dur, vol, cutoff) {
        if (!this.enabled || !this.ctx || !this.master || !this.noiseBuf)
            return;
        const t = this.ctx.currentTime;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuf;
        const g = this.ctx.createGain();
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.value = cutoff;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        src.connect(f);
        f.connect(g);
        g.connect(this.master);
        src.start(t);
        src.stop(t + dur);
    }
    shoot() { this.tone(820, 320, 0.08, 'square', 0.045); }
    enemyShoot() { this.tone(300, 180, 0.1, 'sawtooth', 0.04); }
    boom(big = false) {
        this.noise(big ? 0.55 : 0.25, big ? 0.55 : 0.3, big ? 900 : 1500);
        this.tone(big ? 150 : 230, 40, big ? 0.45 : 0.2, 'sawtooth', big ? 0.25 : 0.12);
    }
    hurt() { this.tone(190, 60, 0.25, 'square', 0.2); }
    shieldBreak() { this.tone(420, 90, 0.3, 'triangle', 0.25); }
    levelup() {
        this.tone(523, 523, 0.09, 'square', 0.14);
        this.tone(659, 659, 0.09, 'square', 0.14, 0.09);
        this.tone(784, 784, 0.16, 'square', 0.14, 0.18);
    }
    bossAlarm() {
        this.tone(98, 98, 0.28, 'sawtooth', 0.3);
        this.tone(98, 98, 0.28, 'sawtooth', 0.3, 0.38);
    }
    pick() { this.tone(1150, 1550, 0.05, 'sine', 0.05); }
    missile() { this.tone(900, 240, 0.3, 'sawtooth', 0.07); this.noise(0.18, 0.06, 2200); }
    hit() { this.tone(520, 90, 0.12, 'sawtooth', 0.12); }
    power() {
        this.tone(660, 660, 0.07, 'square', 0.12);
        this.tone(880, 880, 0.07, 'square', 0.12, 0.08);
        this.tone(1174, 1174, 0.12, 'square', 0.12, 0.16);
    }
    // ---- 新玩法音效 ----
    /** 自爆蜂引信点燃 */
    fuse() { this.tone(1500, 900, 0.12, 'square', 0.06); this.tone(1500, 900, 0.12, 'square', 0.06, 0.16); }
    /** 冲刺 */
    dash() { this.noise(0.14, 0.1, 4200); this.tone(1300, 300, 0.16, 'sine', 0.1); }
    /** 镭射 */
    laser() { this.tone(1500, 180, 0.22, 'sawtooth', 0.12); this.noise(0.12, 0.05, 5000); }
    /** 闪电链 */
    chain() { this.noise(0.08, 0.12, 6000); this.tone(2200, 300, 0.08, 'square', 0.08); }
    /** 冰冻/冰缓 */
    freeze() { this.tone(1800, 500, 0.25, 'sine', 0.1); }
    /** 金币拾取 */
    gold() { this.tone(1300, 1300, 0.05, 'sine', 0.07); this.tone(1750, 1750, 0.08, 'sine', 0.07, 0.05); }
    /** 成就解锁 */
    achieve() {
        this.tone(784, 784, 0.09, 'triangle', 0.14);
        this.tone(988, 988, 0.09, 'triangle', 0.14, 0.1);
        this.tone(1319, 1319, 0.2, 'triangle', 0.14, 0.2);
    }
    /** 商店购买 */
    buy() { this.tone(600, 900, 0.08, 'square', 0.1); this.tone(900, 1200, 0.1, 'square', 0.1, 0.09); }
}

      exports("SoundFX", SoundFX);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/Upgrades.ts", ['cc', './MetaSave.ts'], function (exports) {
  var Color, MetaSave;
  return {
    setters: [function (module) {
      Color = module.Color;
      cclegacy = module.cclegacy;
    }, function (module) {
      MetaSave = module;
    }],
    execute: function () {
      cclegacy._RF.push({}, "7ffb4kG0exN6Y0S6GSk7+xv", "Upgrades", undefined);


function createBaseStats() {
    // 机库永久强化：结算数据核心购买的出厂加成
    const meta = {
        armor: MetaSave.metaLevel('armor'),
        calibration: MetaSave.metaLevel('calibration'),
        engine: MetaSave.metaLevel('engine'),
        magnet: MetaSave.metaLevel('magnet'),
        shield: MetaSave.metaLevel('shield'),
        missile: MetaSave.metaLevel('missile'),
        crit: MetaSave.metaLevel('crit'),
        xpData: MetaSave.metaLevel('xpData'),
        orbs: MetaSave.metaLevel('orbs'),
        dash: MetaSave.metaLevel('dash'),
    };
    return {
        hp: 5 + meta.armor,
        maxHp: 5 + meta.armor,
        damage: Math.max(1, Math.round(1 * (1 + 0.08 * meta.calibration) * 10) / 10),
        moveSpeed: 1 + 0.06 * meta.engine,
        fireInterval: 0.3,
        bulletCount: 1,
        xpGain: 1 + 0.08 * meta.xpData,
        orbs: meta.orbs,
        missiles: meta.missile,
        magnetRange: 150 + 60 * meta.magnet,
        critRate: 0.05 + 0.04 * meta.crit,
        critMult: 2,
        shieldMax: meta.shield,
        shield: meta.shield,
        shieldTimer: 0,
        chain: 0,
        laser: 0,
        blackhole: 0,
        freeze: 0,
        dashCd: Math.max(1.5, 2.6 - 0.3 * meta.dash),
        dmgMul: 1,
        pierce: 0,
        vampKills: 0,
        iframeBonus: 0,
        shieldCd: 12,
        bulletSpeed: 1,
    };
}
function hex(c) {
    const col = new Color();
    col.fromHEX(c);
    return col;
}
const UPGRADES = [
    {
        id: 'attack',
        name: '攻击力 +1',
        desc: '每颗子弹伤害 +1',
        char: '攻',
        color: hex('#e05555'),
        weight: 10,
        price: 20,
        apply(s) { s.damage += 1; },
    },
    {
        id: 'speed',
        name: '移动速度 +5%',
        desc: '移动更灵活，方便走位躲弹',
        char: '速',
        color: hex('#4fc3f7'),
        weight: 10,
        price: 20,
        canOffer(s) { return s.moveSpeed < 2; },
        apply(s) { s.moveSpeed += 0.05; },
    },
    {
        id: 'hp',
        name: '生命上限 +1',
        desc: '上限 +1，并回复 2 点生命',
        char: '命',
        color: hex('#66bb6a'),
        weight: 10,
        price: 25,
        apply(s) {
            s.maxHp += 1;
            s.hp = Math.min(s.maxHp, s.hp + 2);
        },
    },
    {
        id: 'fireRate',
        name: '射速提升',
        desc: '攻击间隔缩短 12%',
        char: '射',
        color: hex('#ffca28'),
        weight: 8,
        price: 25,
        apply(s) { s.fireInterval = Math.max(0.1, s.fireInterval * 0.88); },
    },
    {
        id: 'multi',
        name: '多重射击',
        desc: '同时多发出一颗子弹',
        char: '弹',
        color: hex('#ab47bc'),
        weight: 5,
        price: 60,
        canOffer(s) { return s.bulletCount < 7; },
        apply(s) { s.bulletCount += 1; },
    },
    {
        id: 'heal',
        name: '恢复药剂',
        desc: '立即回复 3 点生命',
        char: '回',
        color: hex('#26a69a'),
        weight: 8,
        price: 15,
        canOffer(s) { return s.hp < s.maxHp; },
        apply(s) { s.hp = Math.min(s.maxHp, s.hp + 3); },
    },
    {
        id: 'xpGain',
        name: '经验加持',
        desc: '获得经验 +5%',
        char: '验',
        color: hex('#7e57c2'),
        weight: 6,
        price: 20,
        canOffer(s) { return s.xpGain < 2.5; },
        apply(s) { s.xpGain += 0.05; },
    },
    {
        id: 'orbit',
        name: '环绕电球 +1',
        desc: '电球绕身旋转，撞击敌人',
        char: '球',
        color: hex('#67e8f9'),
        weight: 7,
        price: 35,
        canOffer(s) { return s.orbs < 6; },
        apply(s) { s.orbs += 1; },
    },
    {
        id: 'missile',
        name: '跟踪导弹 +1',
        desc: '每 2.4 秒自动锁定敌机发射',
        char: '导',
        color: hex('#fb923c'),
        weight: 8,
        price: 40,
        canOffer(s) { return s.missiles < 6; },
        apply(s) { s.missiles += 1; },
    },
    {
        id: 'magnetRange',
        name: '磁场强化',
        desc: '能量吸附范围 +80',
        char: '场',
        color: hex('#22d3ee'),
        weight: 8,
        price: 18,
        canOffer(s) { return s.magnetRange < 550; },
        apply(s) { s.magnetRange += 80; },
    },
    {
        id: 'crit',
        name: '暴击率 +8%',
        desc: '暴击造成 2 倍伤害',
        char: '暴',
        color: hex('#ff7043'),
        weight: 8,
        price: 25,
        canOffer(s) { return s.critRate < 0.5; },
        apply(s) { s.critRate = Math.min(0.5, s.critRate + 0.08); },
    },
    {
        id: 'shield',
        name: '能量护盾',
        desc: '抵挡一次伤害，12 秒充能',
        char: '盾',
        color: hex('#94a3b8'),
        weight: 7,
        price: 50,
        canOffer(s) { return s.shieldMax < 1; },
        apply(s) { s.shieldMax = 1; s.shield = 1; },
    },
    {
        id: 'chain',
        name: '闪电链',
        desc: '暴击时 50% 概率雷击跳跃，等级越高跳得越多',
        char: '雷',
        color: hex('#a78bfa'),
        weight: 7,
        price: 40,
        canOffer(s) { return s.chain < 5; },
        apply(s) { s.chain += 1; },
    },
    {
        id: 'laser',
        name: '镭射光束',
        desc: '每升一级多一道贯穿光束，自战机向上齐射',
        char: '光',
        color: hex('#f472b6'),
        weight: 6,
        price: 55,
        req: 'veteran', // 成就「达人」解锁
        canOffer(s) { return s.laser < 5; },
        apply(s) { s.laser += 1; },
    },
    {
        id: 'blackhole',
        name: '黑洞弹',
        desc: '周期生成黑洞，吸聚并碾碎敌机',
        char: '洞',
        color: hex('#818cf8'),
        weight: 6,
        price: 55,
        req: 'bossKiller', // 成就「猎首」解锁
        canOffer(s) { return s.blackhole < 5; },
        apply(s) { s.blackhole += 1; },
    },
    {
        id: 'freeze',
        name: '冰冻弹',
        desc: '子弹附带冰缓，等级越高冻得越深',
        char: '冰',
        color: hex('#7dd3fc'),
        weight: 7,
        price: 30,
        canOffer(s) { return s.freeze < 5; },
        apply(s) { s.freeze += 1; },
    },
    {
        id: 'critDmg',
        name: '致命一击',
        desc: '暴击伤害 +30%',
        char: '致',
        color: hex('#ffd54f'),
        weight: 7,
        price: 30,
        canOffer(s) { return s.critMult < 3.5; },
        apply(s) { s.critMult += 0.3; },
    },
    {
        id: 'dmgMul',
        name: '过载核心',
        desc: '全部伤害来源 +10%',
        char: '核',
        color: hex('#f4511e'),
        weight: 8,
        price: 45,
        canOffer(s) { return s.dmgMul < 1.5; },
        apply(s) { s.dmgMul += 0.1; },
    },
    {
        id: 'pierce',
        name: '贯穿弹头',
        desc: '子弹可额外穿透 1 个敌机',
        char: '穿',
        color: hex('#64ffda'),
        weight: 6,
        price: 45,
        canOffer(s) { return s.pierce < 3; },
        apply(s) { s.pierce += 1; },
    },
    {
        id: 'vamp',
        name: '纳米修复',
        desc: '击杀攒满能量回复 1 生命，等级越高越快',
        char: '生',
        color: hex('#69f0ae'),
        weight: 6,
        price: 35,
        canOffer(s) { return s.vampKills < 3; },
        apply(s) { s.vampKills += 1; },
    },
    {
        id: 'iframe',
        name: '相位装甲',
        desc: '受击后无敌时间 +0.4 秒',
        char: '相',
        color: hex('#eceff1'),
        weight: 6,
        price: 30,
        canOffer(s) { return s.iframeBonus < 1.2; },
        apply(s) { s.iframeBonus += 0.4; },
    },
    {
        id: 'shieldCd',
        name: '护盾电容',
        desc: '护盾充能时间 -2.5 秒',
        char: '容',
        color: hex('#90a4ae'),
        weight: 5,
        price: 30,
        canOffer(s) { return s.shieldMax > 0 && s.shieldCd > 4.6; },
        apply(s) { s.shieldCd = Math.max(4.5, s.shieldCd - 2.5); },
    },
    {
        id: 'dashCd',
        name: '推进器强化',
        desc: '冲刺冷却 -0.4 秒',
        char: '推',
        color: hex('#00e5ff'),
        weight: 6,
        price: 25,
        canOffer(s) { return s.dashCd > 1.21; },
        apply(s) { s.dashCd = Math.max(1.2, s.dashCd - 0.4); },
    },
    {
        id: 'bulletSpeed',
        name: '弹道加速',
        desc: '子弹飞行速度 +20%',
        char: '疾',
        color: hex('#fff176'),
        weight: 7,
        price: 20,
        canOffer(s) { return s.bulletSpeed < 1.6; },
        apply(s) { s.bulletSpeed += 0.2; },
    },
];
/** 每日挑战用可播种随机；默认 Math.random */
let rng = Math.random;
function setRng(fn) { rng = fn; }
function resetRng() { rng = Math.random; }
/** 加权随机抽出 count 个不重复的升级选项（过滤未解锁与已满级，可排除指定项） */
function rollUpgrades(stats, count = 3, exclude = []) {
    const skip = new Set(exclude.map(u => u.id));
    const available = UPGRADES.filter(u => !skip.has(u.id) &&
        (!u.canOffer || u.canOffer(stats)) &&
        (!u.req || MetaSave.hasAchievement(u.req)));
    const picked = [];
    const bag = available.slice();
    while (picked.length < count && bag.length > 0) {
        const total = bag.reduce((sum, u) => sum + u.weight, 0);
        let roll = rng() * total;
        for (let i = 0; i < bag.length; i++) {
            roll -= bag[i].weight;
            if (roll <= 0) {
                picked.push(bag.splice(i, 1)[0]);
                break;
            }
        }
    }
    return picked;
}

      exports("createBaseStats", createBaseStats);
      exports("UPGRADES", UPGRADES);
      exports("setRng", setRng);
      exports("resetRng", resetRng);
      exports("rollUpgrades", rollUpgrades);
      cclegacy._RF.pop();
    }
  };
});
System.register("chunks:///_virtual/MetaSave.ts", ['cc'], function (exports) {
  var cclegacy;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "zz001MetaSaveGeneratedUUIDxx", undefined, undefined);
/**
 * 局外存档（localStorage）：数据核心 / 机库永久强化 / 成就 / 每日挑战最佳成绩
 * 全部同步读写，体量极小，无需异步
 */
const META_DEFS = [
    { id: 'armor', name: '机体装甲', desc: '初始生命上限 +1', char: '甲', color: '#66bb6a', costs: [10, 30, 60, 120, 240] },
    { id: 'calibration', name: '出厂校准', desc: '攻击力 +8%', char: '校', color: '#e05555', costs: [8, 24, 48, 96, 180] },
    { id: 'engine', name: '引擎调校', desc: '移动速度 +6%', char: '擎', color: '#4fc3f7', costs: [6, 18, 40, 80] },
    { id: 'magnet', name: '磁力线圈', desc: '初始吸附范围 +60', char: '磁', color: '#22d3ee', costs: [6, 14, 30, 60] },
    { id: 'shield', name: '应急护盾', desc: '开局自带护盾模块', char: '盾', color: '#94a3b8', costs: [40] },
    { id: 'missile', name: '导弹挂架', desc: '开局自带跟踪导弹', char: '导', color: '#fb923c', costs: [50, 150] },
    { id: 'crit', name: '出锋校靶', desc: '初始暴击率 +4%', char: '靶', color: '#ff8a4d', costs: [12, 36, 72] },
    { id: 'xpData', name: '经验协议', desc: '经验获取 +8%', char: '验', color: '#a78bfa', costs: [10, 30, 60] },
    { id: 'orbs', name: '电球预装', desc: '开局自带环绕电球', char: '球', color: '#67e8f9', costs: [60, 160] },
    { id: 'dash', name: '推进器', desc: '冲刺冷却 -0.3 秒', char: '推', color: '#7dd3fc', costs: [15, 45, 90] },
    { id: 'startGold', name: '战备资金', desc: '波次模式开局金 +30', char: '资', color: '#fbbf24', costs: [8, 20, 40] },
    { id: 'luck', name: '幸运合约', desc: '道具掉率 +25%', char: '运', color: '#f472b6', costs: [20, 60] },
];
const ACHIEVEMENTS = [
    { id: 'firstBlood', name: '首杀', desc: '击杀第一只敌机' },
    { id: 'slayer', name: '百人斩', desc: '单局击杀 100 只敌机' },
    { id: 'bossKiller', name: '猎首', desc: '击败一只 Boss（解锁黑洞弹）' },
    { id: 'eliteHunter', name: '精英猎人', desc: '单局击杀 5 只精英/词条怪（解锁冰冻力场）' },
    { id: 'veteran', name: '达人', desc: '单局达到 10 级（解锁镭射）' },
    { id: 'dasher', name: '冲刺者', desc: '单局使用 30 次冲刺' },
    { id: 'tycoon', name: '大富翁', desc: '单局拾取 100 金币' },
    { id: 'survivor', name: '生存者', desc: '无尽模式存活 5 分钟' },
];
const KEY = 'neon-starfighter-meta-v1';
function defaultData() {
    return {
        cores: 0,
        meta: { armor: 0, calibration: 0, engine: 0, magnet: 0, shield: 0, missile: 0, crit: 0, xpData: 0, orbs: 0, dash: 0, startGold: 0, luck: 0 },
        achievements: [],
        dailyBest: {},
        totalKills: 0,
    };
}
let cache = null;
function load() {
    if (cache)
        return cache;
    try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            cache = Object.assign(defaultData(), parsed);
            cache.meta = Object.assign(defaultData().meta, parsed.meta || {});
            return cache;
        }
    }
    catch (e) { /* 损坏存档当作新档 */ }
    cache = defaultData();
    return cache;
}
function save() {
    try {
        localStorage.setItem(KEY, JSON.stringify(load()));
    }
    catch (e) { /* 隐私模式等写入失败时静默 */ }
}
/** 当前数据核心余额 */
function cores() { return load().cores; }
/** 结算数据核心入账 */
function addCores(n) {
    if (n <= 0)
        return;
    load().cores += n;
    save();
}
/** 机库某项强化等级 */
function metaLevel(id) { return load().meta[id]; }
/** 购买机库强化下一级，返回是否成功 */
function buyMeta(id) {
    const d = load();
    const def = META_DEFS.find(m => m.id === id);
    const lv = d.meta[id];
    if (lv >= def.costs.length)
        return false;
    const cost = def.costs[lv];
    if (d.cores < cost)
        return false;
    d.cores -= cost;
    d.meta[id] = lv + 1;
    save();
    return true;
}
/** 是否已解锁某成就 */
function hasAchievement(id) {
    return load().achievements.indexOf(id) >= 0;
}
/** 解锁成就，返回是否为新解锁（用于 toast） */
function unlock(id) {
    const d = load();
    if (d.achievements.indexOf(id) >= 0)
        return false;
    d.achievements.push(id);
    save();
    return true;
}
function achievementCount() { return load().achievements.length; }
/** 今日日期串（本地时区） */
function todayKey() {
    const t = new Date();
    const mm = String(t.getMonth() + 1).padStart(2, '0');
    const dd = String(t.getDate()).padStart(2, '0');
    return `${t.getFullYear()}-${mm}-${dd}`;
}
/** 每日挑战最佳成绩（秒），无记录返回 -1 */
function dailyBest(day) {
    const v = load().dailyBest[day];
    return typeof v === 'number' ? v : -1;
}
/** 记录每日挑战成绩，返回是否刷新纪录 */
function setDailyBest(day, sec) {
    const d = load();
    if (sec <= (d.dailyBest[day] || -1))
        return false;
    d.dailyBest[day] = sec;
    save();
    return true;
}
function addTotalKills(n) {
    load().totalKills += n;
    save();
}
function totalKills() { return load().totalKills; }
// ---------------- 可播种随机（每日挑战用） ----------------
/** mulberry32：种子固定则序列完全一致 */
function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

      exports("META_DEFS", META_DEFS);
      exports("ACHIEVEMENTS", ACHIEVEMENTS);
      exports("cores", cores);
      exports("addCores", addCores);
      exports("metaLevel", metaLevel);
      exports("buyMeta", buyMeta);
      exports("hasAchievement", hasAchievement);
      exports("unlock", unlock);
      exports("achievementCount", achievementCount);
      exports("todayKey", todayKey);
      exports("dailyBest", dailyBest);
      exports("setDailyBest", setDailyBest);
      exports("addTotalKills", addTotalKills);
      exports("totalKills", totalKills);
      exports("mulberry32", mulberry32);
      exports("hashSeed", hashSeed);
      cclegacy._RF.pop();
    }
  };
});
(function(r) {
  r('virtual:///prerequisite-imports/main', 'chunks:///_virtual/main'); 
})(function(mid, cid) {
    System.register(mid, [cid], function (_export, _context) {
    return {
        setters: [function(_m) {
            var _exportObj = {};

            for (var _key in _m) {
              if (_key !== "default" && _key !== "__esModule") _exportObj[_key] = _m[_key];
            }
      
            _export(_exportObj);
        }],
        execute: function () { }
    };
    });
});