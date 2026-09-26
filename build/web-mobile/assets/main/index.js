System.register("chunks:///_virtual/Bullet.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameRoot.ts'], function (exports) {
  var _inheritsLoose, cclegacy, _decorator, Graphics, Color, Component, GameRoot;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Graphics = module.Graphics;
      Color = module.Color;
      Component = module.Component;
    }, function (module) {
      GameRoot = module.GameRoot;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "15f572PdiVJ/pikGrQ6mIeQ", "Bullet", undefined);
      var ccclass = _decorator.ccclass;

      /**
       * 子弹：直线飞行，飞出屏幕回收
       * hostile=false 玩家电矢（青色光矢）| hostile=true 敌方光球（品红光球）
       */
      var Bullet = exports('Bullet', (_dec = ccclass('Bullet'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(Bullet, _Component);
        function Bullet() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.vx = 0;
          _this.vy = 600;
          _this.damage = 1;
          _this.hostile = false;
          return _this;
        }
        var _proto = Bullet.prototype;
        /**
         * @param angle 发射角度（弧度），0 表示正上方
         */
        _proto.init = function init(angle, speed, damage, hostile) {
          if (hostile === void 0) {
            hostile = false;
          }
          this.vx = Math.sin(angle) * speed;
          this.vy = Math.cos(angle) * speed;
          this.damage = damage;
          this.hostile = hostile;
          this.node.active = true;
          this.setStyle(hostile ? 'enemy' : 'player');
        }

        /** 按阵营绘制外观（对象池复用时会重绘） */;
        _proto.setStyle = function setStyle(style) {
          var g = this.node.getComponent(Graphics);
          if (!g) return;
          g.clear();
          if (style === 'player') {
            // 青色光矢：外发光 + 亮芯
            g.fillColor = new Color(34, 211, 238, 70);
            g.circle(0, 0, 9);
            g.fill();
            g.fillColor = new Color(165, 243, 252);
            g.roundRect(-3, -13, 6, 26, 3);
            g.fill();
          } else {
            // 品红光球：光晕 + 球体
            g.fillColor = new Color(244, 114, 182, 70);
            g.circle(0, 0, 12);
            g.fill();
            g.fillColor = new Color(251, 113, 133);
            g.circle(0, 0, 6);
            g.fill();
          }
        };
        _proto.update = function update(dt) {
          if (GameRoot.I.state !== 'playing') return;
          var p = this.node.getPosition();
          this.node.setPosition(p.x + this.vx * dt, p.y + this.vy * dt, 0);
          var half = GameRoot.I.halfSize;
          var m = 60;
          if (p.x < -half.x - m || p.x > half.x + m || p.y < -half.y - m || p.y > half.y + m) {
            GameRoot.I.recycleBullet(this);
          }
        };
        return Bullet;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Enemy.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameRoot.ts', './SoundFX.ts'], function (exports) {
  var _inheritsLoose, cclegacy, _decorator, UIOpacity, Node, UITransform, Graphics, Color, tween, Vec3, Component, GameRoot, SoundFX;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      UIOpacity = module.UIOpacity;
      Node = module.Node;
      UITransform = module.UITransform;
      Graphics = module.Graphics;
      Color = module.Color;
      tween = module.tween;
      Vec3 = module.Vec3;
      Component = module.Component;
    }, function (module) {
      GameRoot = module.GameRoot;
    }, function (module) {
      SoundFX = module.SoundFX;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "f29d9vti55N2Id1JS4XgUeD", "Enemy", undefined);
      var ccclass = _decorator.ccclass;
      /**
       * 《霓虹深空》敌机图鉴：
       * - chaser  猎手   红三角：紧追玩家，接触伤害
       * - shooter 巡卫   紫五边形：保持中距离悬停，发射瞄准光球
       * - speeder 突袭者 粉菱形：锁定一条直线高速冲过屏幕
       * - splitter 分裂体 绿方块：死亡时裂成两只小猎手
       * - mini    小猎手 红小三角：分裂体的碎片，快而脆
       * - boss    典狱官 金六边形：巨型 Boss，螺旋双臂弹幕
       */
      var Enemy = exports('Enemy', (_dec = ccclass('Enemy'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(Enemy, _Component);
        function Enemy() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.maxHp = 2;
          _this.hp = 2;
          _this.speed = 100;
          _this.kind = 'chaser';
          _this.isElite = false;
          _this.isBoss = false;
          _this.dead = false;
          _this.flashT = 0;
          _this.baseScale = 1;
          _this.shootTimer = 0;
          _this.spiralAngle = 0;
          _this.spinSpeed = 0;
          _this.vx = 0;
          _this.vy = 0;
          _this.shapeNode = null;
          _this.hpBarNode = null;
          _this.hpFill = null;
          return _this;
        }
        var _proto = Enemy.prototype;
        _proto.init = function init(scale, elapsedSec, kind) {
          if (kind === void 0) {
            kind = 'chaser';
          }
          this.kind = kind;
          this.isBoss = kind === 'boss';
          this.isElite = scale > 1;
          this.baseScale = scale;
          this.dead = false;
          this.flashT = 0;
          this.spiralAngle = Math.random() * Math.PI * 2;

          // 血量成长：线性 + 二次项，越到后期怪越硬
          var ts = 1 + elapsedSec / 40 + Math.pow(elapsedSec / 90, 2);
          switch (kind) {
            case 'shooter':
              this.maxHp = Math.max(1, Math.round(2.5 * ts));
              this.speed = 85;
              this.spinSpeed = 60;
              this.shootTimer = 1.2 + Math.random() * 1.2;
              break;
            case 'speeder':
              this.maxHp = Math.max(1, Math.round(1.2 * ts));
              this.speed = 250 + Math.random() * 80;
              this.spinSpeed = 0;
              break;
            case 'splitter':
              this.maxHp = Math.max(1, Math.round(3 * ts));
              this.speed = 55;
              this.spinSpeed = 45;
              break;
            case 'mini':
              this.maxHp = Math.max(1, Math.round(ts * 0.6));
              this.speed = 150 + Math.random() * 40;
              this.spinSpeed = 0;
              break;
            case 'boss':
              this.maxHp = Math.round((45 + elapsedSec * 0.8) * (1 + elapsedSec / 240));
              this.speed = 42;
              this.spinSpeed = 36;
              this.shootTimer = 1.2;
              break;
            default:
              this.maxHp = Math.max(1, Math.round(2 * ts * (this.isElite ? 5 : 1)));
              this.speed = (70 + Math.random() * 40 + Math.min(elapsedSec, 70)) * (this.isElite ? 0.75 : 1);
              this.spinSpeed = 0;
          }
          this.hp = this.maxHp;
          this.node.setScale(scale, scale, 1);
          this.node.active = true;
          var op = this.node.getComponent(UIOpacity);
          if (op) {
            op.opacity = 255;
          }
          this.buildVisual();
          this.spawnAtEdge();
          if (kind === 'speeder') {
            var p = GameRoot.I.playerNode.getPosition();
            var e = this.node.getPosition();
            var dx = p.x - e.x;
            var dy = p.y - e.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.vx = dx / dist * this.speed;
            this.vy = dy / dist * this.speed;
          }
        }

        /** 几何造型（对象池复用时重绘） */;
        _proto.buildVisual = function buildVisual() {
          if (!this.shapeNode) {
            this.shapeNode = new Node('shape');
            this.node.addChild(this.shapeNode);
            this.shapeNode.addComponent(UITransform).setContentSize(60, 60);
          }
          var g = this.shapeNode.getComponent(Graphics) || this.shapeNode.addComponent(Graphics);
          g.clear();
          var kind = this.kind;
          if (kind === 'chaser' || kind === 'mini' || kind === 'speeder') {
            var c = kind === 'speeder' ? new Color(244, 114, 182) : new Color(244, 63, 94);
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
            } else {
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
          } else if (kind === 'shooter') {
            g.fillColor = new Color(167, 139, 250, 70);
            g.circle(0, 0, 26);
            g.fill();
            g.fillColor = new Color(167, 139, 250);
            this.polygon(g, 5, 22);
            g.fill();
            g.fillColor = new Color(237, 233, 254);
            g.circle(0, 0, 6);
            g.fill();
          } else if (kind === 'splitter') {
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
          } else if (this.isBoss) {
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
              var bgG = this.hpBarNode.addComponent(Graphics);
              bgG.fillColor = new Color(10, 10, 20, 160);
              bgG.roundRect(-23, -36, 46, 5, 2.5);
              bgG.fill();
              this.hpFill = new Node('hpfill');
              this.hpBarNode.addChild(this.hpFill);
              var fG = this.hpFill.addComponent(Graphics);
              fG.fillColor = new Color(244, 63, 94);
              fG.roundRect(-21, -35, 42, 3, 1.5);
              fG.fill();
            }
            this.hpBarNode.setScale(1, 1, 1);
            this.hpFill.setScale(1, 1, 1);
            this.hpBarNode.active = false;
          }
        };
        _proto.polygon = function polygon(g, sides, r) {
          g.moveTo(0, -r);
          for (var i = 1; i < sides; i++) {
            var a = i / sides * Math.PI * 2;
            g.lineTo(Math.sin(a) * r, -Math.cos(a) * r);
          }
          g.close();
        }

        /** 刷出位置：不从下方出现——上边 60%，左右两侧上半段各 20%；Boss 固定顶部中央 */;
        _proto.spawnAtEdge = function spawnAtEdge() {
          var half = GameRoot.I.halfSize;
          var margin = 60;
          if (this.isBoss) {
            this.node.setPosition(0, half.y + margin, 0);
            return;
          }
          var roll = Math.random();
          var x = 0,
            y = 0;
          if (roll < 0.6) {
            x = (Math.random() * 2 - 1) * half.x;
            y = half.y + margin;
          } else if (roll < 0.8) {
            x = -half.x - margin;
            y = Math.random() * half.y;
          } else {
            x = half.x + margin;
            y = Math.random() * half.y;
          }
          this.node.setPosition(x, y, 0);
        };
        _proto.update = function update(dt) {
          if (GameRoot.I.state !== 'playing' || this.dead) return;
          var p = GameRoot.I.playerNode.getPosition();
          var e = this.node.getPosition();
          var dx = p.x - e.x;
          var dy = p.y - e.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;

          // 造型旋转 / 朝向
          if (this.kind === 'chaser' || this.kind === 'mini') {
            this.shapeNode.angle = Math.atan2(-dx, dy) * 180 / Math.PI;
          } else if (this.kind === 'speeder') {
            this.shapeNode.angle = Math.atan2(-this.vx, this.vy) * 180 / Math.PI;
          } else if (this.spinSpeed) {
            this.shapeNode.angle += this.spinSpeed * dt;
          }
          switch (this.kind) {
            case 'speeder':
              this.node.setPosition(e.x + this.vx * dt, e.y + this.vy * dt, 0);
              this.checkFlee();
              break;
            case 'shooter':
              {
                if (dist > 420) {
                  this.node.setPosition(e.x + dx / dist * this.speed * dt, e.y + dy / dist * this.speed * dt, 0);
                } else if (dist < 300) {
                  this.node.setPosition(e.x - dx / dist * this.speed * 0.5 * dt, e.y - dy / dist * this.speed * 0.5 * dt, 0);
                }
                this.shootTimer -= dt;
                if (this.shootTimer <= 0 && dist < 800) {
                  this.shootTimer = 2.2 + Math.random() * 1.2;
                  GameRoot.I.spawnEnemyBullet(e.x, e.y, Math.atan2(dx, dy), 330);
                  SoundFX.I.enemyShoot();
                }
                break;
              }
            case 'boss':
              {
                // 缓慢逼近，贴近后悬停
                if (dist > 260) {
                  this.node.setPosition(e.x + dx / dist * this.speed * dt, e.y + dy / dist * this.speed * dt, 0);
                }
                // 螺旋双臂弹幕
                this.shootTimer -= dt;
                if (this.shootTimer <= 0) {
                  this.shootTimer = 0.26;
                  this.spiralAngle += 0.44;
                  GameRoot.I.spawnEnemyBullet(e.x, e.y, this.spiralAngle, 240);
                  GameRoot.I.spawnEnemyBullet(e.x, e.y, this.spiralAngle + Math.PI, 240);
                }
                break;
              }
            default:
              {
                // chaser / mini / splitter 追击
                this.node.setPosition(e.x + dx / dist * this.speed * dt, e.y + dy / dist * this.speed * dt, 0);
              }
          }

          // 受击闪烁
          if (this.flashT > 0) {
            this.flashT -= dt;
            var op = this.node.getComponent(UIOpacity);
            if (op) {
              op.opacity = this.flashT > 0 ? 120 : 255;
            }
          }

          // 血条
          if (this.hpBarNode) {
            var show = this.hp < this.maxHp;
            this.hpBarNode.active = show;
            if (show) {
              this.hpFill.setScale(Math.max(this.hp / this.maxHp, 0.001), 1, 1);
            }
          }
        }

        /** 冲锋机冲出屏幕后静默回收 */;
        _proto.checkFlee = function checkFlee() {
          var half = GameRoot.I.halfSize;
          var e = this.node.getPosition();
          var m = 200;
          if (e.x < -half.x - m || e.x > half.x + m || e.y < -half.y - m || e.y > half.y + m) {
            this.dead = true;
            GameRoot.I.recycleEnemy(this);
          }
        }

        /** 击杀掉落的经验值 */;
        _proto.gemValue = function gemValue() {
          if (this.isBoss) {
            return 30;
          }
          if (this.kind === 'mini') {
            return 0;
          }
          if (this.isElite) {
            return 5;
          }
          if (this.kind === 'shooter') {
            return 2;
          }
          if (this.kind === 'splitter') {
            return 3;
          }
          return 1;
        }

        /** 被子弹击中，返回是否死亡 */;
        _proto.hurt = function hurt(damage) {
          if (this.dead) {
            return false;
          }
          this.hp -= damage;
          this.flashT = 0.08;
          var op = this.node.getComponent(UIOpacity);
          if (op) {
            op.opacity = 120;
          }

          // 击退（Boss 不可击退）
          if (!this.isBoss) {
            var p = GameRoot.I.playerNode.getPosition();
            var e = this.node.getPosition();
            var dx = e.x - p.x;
            var dy = e.y - p.y;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            this.node.setPosition(e.x + dx / dist * 8, e.y + dy / dist * 8, 0);
          }
          if (this.hp <= 0) {
            this.die();
            return true;
          }
          return false;
        };
        _proto.die = function die() {
          var _this2 = this;
          this.dead = true;
          GameRoot.I.onEnemyKilled(this);

          // 分裂体死亡：裂成两只小猎手
          if (this.kind === 'splitter') {
            GameRoot.I.spawnMinis(this.node.getPosition());
          }
          var op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
          tween(this.node).to(0.15, {
            scale: new Vec3(this.baseScale * 0.3, this.baseScale * 0.3, 1)
          }).call(function () {
            GameRoot.I.recycleEnemy(_this2);
          }).start();
          tween(op).to(0.15, {
            opacity: 0
          }).start();
        };
        return Enemy;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/GameRoot.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './Upgrades.ts', './Player.ts', './Enemy.ts', './Bullet.ts', './Missile.ts', './Gem.ts', './PowerUp.ts', './Hud.ts', './Overlays.ts', './SoundFX.ts'], function (exports) {
  var _inheritsLoose, _createForOfIteratorHelperLoose, cclegacy, _decorator, Vec3, view, ResolutionPolicy, input, Input, Node, UITransform, Mask, UIOpacity, Color, Graphics, KeyCode, Label, tween, Component, createBaseStats, rollUpgrades, Player, Enemy, Bullet, Missile, Gem, PowerUp, Hud, Overlays, SoundFX;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Vec3 = module.Vec3;
      view = module.view;
      ResolutionPolicy = module.ResolutionPolicy;
      input = module.input;
      Input = module.Input;
      Node = module.Node;
      UITransform = module.UITransform;
      Mask = module.Mask;
      UIOpacity = module.UIOpacity;
      Color = module.Color;
      Graphics = module.Graphics;
      KeyCode = module.KeyCode;
      Label = module.Label;
      tween = module.tween;
      Component = module.Component;
    }, function (module) {
      createBaseStats = module.createBaseStats;
      rollUpgrades = module.rollUpgrades;
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
      var _dec, _dec2, _class, _class2;
      cclegacy._RF.push({}, "09c3csN9jlNv79EqL0ZZjzz", "GameRoot", undefined);
      var ccclass = _decorator.ccclass,
        executionOrder = _decorator.executionOrder;

      /**
       * 《霓虹深空》主控：状态机 / 刷怪 / 碰撞 / 经验升级 / 对象池
       * 视觉全部由代码绘制，不依赖图片资源
       */
      var GameRoot = exports('GameRoot', (_dec = ccclass('GameRoot'), _dec2 = executionOrder(-1000), _dec(_class = _dec2(_class = (_class2 = /*#__PURE__*/function (_Component) {
        _inheritsLoose(GameRoot, _Component);
        function GameRoot() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.state = 'menu';
          _this.stats = createBaseStats();
          _this.level = 1;
          _this.xp = 0;
          _this.xpToNext = 5;
          _this.kills = 0;
          _this.elapsed = 0;
          _this.halfSize = new Vec3(360, 640, 0);
          _this.playerNode = null;
          _this.bullets = [];
          _this.missiles = [];
          _this.enemys = [];
          _this.gems = [];
          _this.boss = null;
          // 道具效果（剩余秒数，0 表示无）
          _this.effectMagnet = 0;
          _this.effectRage = 0;
          _this.effectXp2 = 0;
          _this.effectInvinc = 0;
          _this.ready = false;
          _this.pendingLevelUps = 0;
          _this.spawnTimer = 0;
          _this.eliteTimer = 15;
          _this.bossTimer = 45;
          _this.bulletPool = [];
          _this.missilePool = [];
          _this.powerPool = [];
          _this.enemyPool = [];
          _this.gemPool = [];
          _this.worldLayer = null;
          _this.stars = [];
          _this.nebulae = [];
          _this.meteors = [];
          _this.visualT = 0;
          _this.meteorTimer = 4;
          _this.hud = null;
          _this.overlays = null;
          return _this;
        }
        var _proto = GameRoot.prototype;
        _proto.onLoad = function onLoad() {
          GameRoot.I = this;

          // 竖屏 720x1280 固定画幅：宽窗口时两侧留黑边，游戏区域永远居中
          view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);

          // 窗口/面板尺寸变化时重新适配画幅（嵌入式浏览器拖拽分栏后画布不会自动重投影）
          window.addEventListener('resize', function () {
            view.setDesignResolutionSize(720, 1280, ResolutionPolicy.SHOW_ALL);
          });

          // 音效上下文（首次触摸后激活）
          SoundFX.I.init();
          input.on(Input.EventType.TOUCH_START, function () {
            SoundFX.I.init();
          });

          // 键盘：Esc / 空格 暂停与继续
          input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);

          // 世界层（星空 + 实体），并用矩形遮罩把内容严格裁剪在画幅内
          this.worldLayer = new Node('World');
          this.node.addChild(this.worldLayer);
          var worldT = this.worldLayer.addComponent(UITransform);
          worldT.setContentSize(720, 1280);
          this.worldLayer.addComponent(Mask);
          this.buildStarfield();

          // 玩家
          var p = new Node('Player');
          p.addComponent(UITransform).setContentSize(56, 56);
          p.addComponent(UIOpacity);
          this.worldLayer.addChild(p);
          p.addComponent(Player);
          this.playerNode = p;
          this.hud = this.node.addComponent(Hud);
          this.overlays = this.node.addComponent(Overlays);
          this.ready = true;
          this.restart();
          // 进入开始界面：点「开始新游戏」或按空格才正式开局
          this.hud.setHidden(true);
          this.state = 'menu';
          this.overlays.showMenu();
        }

        /** 星云色块 + 三层视差星空（范围限定在画幅内） */;
        _proto.buildStarfield = function buildStarfield() {
          var vs = view.getVisibleSize();
          var halfX = vs.width / 2;
          var halfY = vs.height / 2;

          // 星云：大而柔和的彩色光斑，缓慢下漂
          var nebulaColors = [new Color(120, 60, 220), new Color(30, 120, 220), new Color(220, 60, 160), new Color(40, 180, 190), new Color(150, 90, 240), new Color(60, 90, 220)];
          for (var i = 0; i < 6; i++) {
            var n = new Node('nebula' + i);
            n.addComponent(UITransform).setContentSize(560, 560);
            var g = n.addComponent(Graphics);
            var c = nebulaColors[i];
            g.fillColor = new Color(c.r, c.g, c.b, 9);
            g.circle(0, 0, 270);
            g.fill();
            g.fillColor = new Color(c.r, c.g, c.b, 14);
            g.circle(0, 0, 190);
            g.fill();
            g.fillColor = new Color(c.r, c.g, c.b, 18);
            g.circle(0, 0, 115);
            g.fill();
            var op = n.addComponent(UIOpacity);
            op.opacity = 200;
            var baseX = (Math.random() * 2 - 1) * (halfX - 120);
            n.setPosition(baseX, (Math.random() * 2 - 1) * (halfY + 200), 0);
            this.worldLayer.addChild(n);
            this.nebulae.push({
              node: n,
              speed: 9 + i % 3 * 5,
              op: op,
              baseX: baseX,
              swayAmp: 30 + Math.random() * 40,
              // 横向摆动幅度
              swayFreq: 0.25 + Math.random() * 0.4,
              // 摆动频率
              pulseFreq: 0.4 + Math.random() * 0.5,
              // 呼吸明暗频率
              phase: Math.random() * Math.PI * 2
            });
          }
          for (var _i = 0; _i < 72; _i++) {
            var _n = new Node('star');
            _n.addComponent(UITransform).setContentSize(4, 4);
            var _g = _n.addComponent(Graphics);
            var roll = Math.random();
            var r = roll < 0.6 ? 1 : roll < 0.9 ? 1.6 : 2.4;
            var _c = roll < 0.6 ? new Color(148, 163, 184, 110) : roll < 0.9 ? new Color(103, 232, 249, 150) : new Color(224, 255, 255, 210);
            _g.fillColor = _c;
            _g.circle(0, 0, r);
            _g.fill();
            _n.setPosition((Math.random() * 2 - 1) * (halfX + 10), (Math.random() * 2 - 1) * (halfY + 10), 0);
            var _op = _n.addComponent(UIOpacity);
            this.worldLayer.addChild(_n);
            this.stars.push({
              node: _n,
              speed: 22 + r * 22,
              op: _op,
              maxOp: r < 0.6 ? 150 : r < 0.9 ? 210 : 255,
              twFreq: 1.2 + Math.random() * 2.2,
              // 闪烁频率
              twPhase: Math.random() * Math.PI * 2
            });
          }
        }

        /** 流星：斜向划过，尾部渐隐 */;
        _proto.spawnMeteor = function spawnMeteor() {
          var n = new Node('meteor');
          n.addComponent(UITransform).setContentSize(20, 110);
          var g = n.addComponent(Graphics);
          // 尾迹（沿 -y 方向拖出，越远越淡）
          var seg = [{
            len: 34,
            a: 170
          }, {
            len: 34,
            a: 95
          }, {
            len: 42,
            a: 40
          }];
          var y = 0;
          for (var _i2 = 0, _seg = seg; _i2 < _seg.length; _i2++) {
            var s = _seg[_i2];
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
          var op = n.addComponent(UIOpacity);
          var half = this.halfSize;
          var dir = Math.random() < 0.5 ? 1 : -1;
          // 速度大范围随机：有的慢悠悠飘过，有的呼啸而过
          var speed = 160 + Math.random() * 380;
          var vx = dir * speed * (0.45 + Math.random() * 0.25);
          var vy = -speed;
          n.setPosition(dir * (100 + Math.random() * 200) * -1, half.y + 80, 0);
          // 让局部 +y（头部方向）对齐速度方向：θ = atan2(-vx, vy)
          n.angle = Math.atan2(-vx, vy) * 180 / Math.PI;
          // 寿命随速度自适应，保证慢流星也能划完屏幕
          var life = Math.min(4.5, Math.max(1.6, this.halfSize.y * 2.4 / speed));
          this.worldLayer.addChild(n);
          this.meteors.push({
            node: n,
            vx: vx,
            vy: vy,
            life: life,
            op: op
          });
        }

        /** 给节点挂图形组件 */;
        _proto.getGraphics = function getGraphics(n) {
          return n.getComponent(Graphics) || n.addComponent(Graphics);
        }

        /** 键盘：升级选卡用 W/S/空格；开始界面空格开局；其余时候 Esc/空格 切换暂停 */;
        _proto.onKeyDown = function onKeyDown(e) {
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

        /** 从开始界面正式开局 */;
        _proto.startGame = function startGame() {
          if (this.state !== 'menu') return;
          this.hud.setHidden(false);
          this.overlays.hideAll();
          this.restart();
          SoundFX.I.pick();
        }

        /** 暂停 / 继续游戏（升级选择与结算界面时无效） */;
        _proto.togglePause = function togglePause() {
          if (this.state === 'playing') {
            this.state = 'paused';
            this.overlays.showPaused();
            SoundFX.I.pick();
          } else if (this.state === 'paused') {
            this.state = 'playing';
            this.overlays.hideAll();
            SoundFX.I.pick();
          }
        };
        _proto.update = function update(dt) {
          if (!this.ready) return;
          var uiT = this.node.getComponent(UITransform);
          if (uiT) {
            this.halfSize.set(uiT.width / 2, uiT.height / 2, 0);
          }

          // 暂停时整个世界冻结
          if (this.state === 'paused') return;

          // 背景视觉时钟（升级选卡时宇宙仍在流动）
          this.visualT += dt;
          var vt = this.visualT;

          // 星空下落（视差）+ 闪烁
          for (var _iterator = _createForOfIteratorHelperLoose(this.stars), _step; !(_step = _iterator()).done;) {
            var s = _step.value;
            var _p = s.node.position;
            var y = _p.y - s.speed * dt;
            if (y < -this.halfSize.y - 12) {
              y = this.halfSize.y + 12;
              s.node.setPosition((Math.random() * 2 - 1) * (this.halfSize.x + 12), y, 0);
              continue;
            }
            s.node.setPosition(_p.x, y, 0);
            s.op.opacity = Math.round(s.maxOp * (0.55 + 0.45 * Math.sin(vt * s.twFreq + s.twPhase)));
          }

          // 星云：下漂 + 横向摆动 + 呼吸缩放与明暗
          for (var _iterator2 = _createForOfIteratorHelperLoose(this.nebulae), _step2; !(_step2 = _iterator2()).done;) {
            var nb = _step2.value;
            var _p2 = nb.node.position;
            var _y = _p2.y - nb.speed * dt;
            if (_y < -this.halfSize.y - 320) {
              _y = this.halfSize.y + 340;
              nb.baseX = (Math.random() * 2 - 1) * (this.halfSize.x - 120);
            }
            var x = nb.baseX + Math.sin(vt * nb.swayFreq + nb.phase) * nb.swayAmp;
            nb.node.setPosition(x, _y, 0);
            var breathe = 1 + 0.06 * Math.sin(vt * nb.pulseFreq + nb.phase);
            nb.node.setScale(breathe, breathe, 1);
            nb.op.opacity = Math.round(200 + 55 * Math.sin(vt * nb.pulseFreq * 0.8 + nb.phase));
          }

          // 流星生成与飞行
          this.meteorTimer -= dt;
          if (this.meteorTimer <= 0) {
            this.meteorTimer = 5 + Math.random() * 7;
            this.spawnMeteor();
          }
          for (var i = this.meteors.length - 1; i >= 0; i--) {
            var m = this.meteors[i];
            m.life -= dt;
            var p = m.node.position;
            m.node.setPosition(p.x + m.vx * dt, p.y + m.vy * dt, 0);
            m.op.opacity = Math.round(255 * Math.min(1, m.life / 0.35));
            var half = this.halfSize;
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
          if (this.pendingLevelUps > 0) {
            this.state = 'levelup';
            SoundFX.I.levelup();
            this.overlays.showLevelUp(rollUpgrades(this.stats));
          }
        }

        // ---------------- 刷怪 ----------------
        ;

        _proto.spawnLogic = function spawnLogic(dt) {
          // 场上普通怪太多时先停止刷新（Boss 不受限制）
          if (this.enemys.length < 22) {
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
              // 敌机种类：10 秒后出现巡卫，20 秒后出现突袭者，15 秒后出现分裂体
              var kind = 'chaser';
              var roll = Math.random();
              if (this.elapsed > 20 && roll < 0.2) {
                kind = 'speeder';
              } else if (this.elapsed > 15 && roll < 0.42) {
                kind = 'splitter';
              } else if (this.elapsed > 10 && roll < 0.62) {
                kind = 'shooter';
              }
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
        };
        _proto.spawnEnemy = function spawnEnemy(scale, kind) {
          if (kind === void 0) {
            kind = 'chaser';
          }
          var e = this.enemyPool.pop();
          if (!e) {
            var n = new Node('Enemy');
            n.addComponent(UITransform).setContentSize(60, 60);
            n.addComponent(UIOpacity);
            n.addComponent(Enemy);
            this.worldLayer.addChild(n);
            e = n.getComponent(Enemy);
          }
          e.init(scale, this.elapsed, kind);
          this.enemys.push(e);
          if (kind === 'boss') {
            this.boss = e;
          }
        }

        /** 分裂体死亡：裂成两只小猎手 */;
        _proto.spawnMinis = function spawnMinis(pos) {
          for (var _i3 = 0, _arr = [-26, 26]; _i3 < _arr.length; _i3++) {
            var dx = _arr[_i3];
            this.spawnEnemy(0.5, 'mini');
            var m = this.enemys[this.enemys.length - 1];
            m.node.setPosition(pos.x + dx, pos.y - 8, 0);
          }
        }

        /** 敌方光球 */;
        _proto.spawnEnemyBullet = function spawnEnemyBullet(x, y, angle, speed) {
          var b = this.getBullet();
          b.node.setPosition(x, y, 0);
          b.init(angle, speed, 1, true);
        };
        _proto.recycleEnemy = function recycleEnemy(e) {
          if (this.enemyPool.indexOf(e) >= 0) return; // 防止死亡动画回调重复回收
          var i = this.enemys.indexOf(e);
          if (i >= 0) {
            this.enemys.splice(i, 1);
          }
          e.node.active = false;
          this.enemyPool.push(e);
        };
        _proto.onEnemyKilled = function onEnemyKilled(e) {
          this.kills += 1;
          var value = e.gemValue();
          if (value > 0) {
            var p = e.node.getPosition();
            // 25% 概率能量直接入包（带飘字反馈），否则掉落宝石
            if (Math.random() < 0.25) {
              this.addXp(value);
              this.spawnFloatText(p.x, p.y, '+' + value, new Color(165, 243, 252));
            } else {
              var gem = this.getGem();
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
         */;
        _proto.dealDamage = function dealDamage(e, baseDamage) {
          if (e.dead) return;
          var isCrit = Math.random() < this.stats.critRate;
          var dmg = isCrit ? Math.round(baseDamage * this.stats.critMult) : baseDamage;
          var ep = e.node.getPosition();
          if (isCrit) {
            this.spawnFloatText(ep.x + (Math.random() * 30 - 15), ep.y + 20, "" + dmg, new Color(255, 200, 60), 30);
          } else {
            this.spawnFloatText(ep.x + (Math.random() * 30 - 15), ep.y + 20, "" + dmg, new Color(224, 242, 254), 18);
          }
          e.hurt(dmg);
        }

        /** 击杀反馈飘字（上飘 + 淡出后销毁），size 可调以区分暴击 */;
        _proto.spawnFloatText = function spawnFloatText(x, y, str, color, size) {
          if (size === void 0) {
            size = 24;
          }
          var n = new Node('float-text');
          n.addComponent(UITransform).setContentSize(80, 40);
          var l = n.addComponent(Label);
          l.string = str;
          l.fontSize = size;
          l.lineHeight = size + 4;
          l.color = color;
          n.setPosition(x, y, 0);
          this.worldLayer.addChild(n);
          tween(n).by(0.7, {
            position: new Vec3(0, 48, 0)
          }).start();
          var op = n.addComponent(UIOpacity);
          tween(op).delay(0.3).to(0.4, {
            opacity: 0
          }).call(function () {
            n.destroy();
          }).start();
        }

        // ---------------- 子弹与宝石 ----------------
        ;

        _proto.getBullet = function getBullet() {
          var b = this.bulletPool.pop();
          if (!b) {
            var n = new Node('Bullet');
            n.addComponent(UITransform).setContentSize(18, 30);
            n.addComponent(Graphics);
            n.addComponent(Bullet);
            this.worldLayer.addChild(n);
            b = n.getComponent(Bullet);
          }
          this.bullets.push(b);
          return b;
        };
        _proto.recycleBullet = function recycleBullet(b) {
          if (this.bulletPool.indexOf(b) >= 0) return;
          var i = this.bullets.indexOf(b);
          if (i >= 0) {
            this.bullets.splice(i, 1);
          }
          b.node.active = false;
          this.bulletPool.push(b);
        }

        // ---------------- 跟踪导弹 ----------------
        ;

        _proto.getMissile = function getMissile() {
          var m = this.missilePool.pop();
          if (!m) {
            var n = new Node('Missile');
            n.addComponent(UITransform).setContentSize(14, 20);
            n.addComponent(Graphics);
            n.addComponent(Missile);
            this.worldLayer.addChild(n);
            m = n.getComponent(Missile);
          }
          this.missiles.push(m);
          return m;
        };
        _proto.recycleMissile = function recycleMissile(m) {
          if (this.missilePool.indexOf(m) >= 0) return;
          var i = this.missiles.indexOf(m);
          if (i >= 0) {
            this.missiles.splice(i, 1);
          }
          m.node.active = false;
          this.missilePool.push(m);
        }

        /** 最近的存活敌机 */;
        _proto.findNearestEnemy = function findNearestEnemy(from) {
          var best = null;
          var bestDist = Infinity;
          for (var _iterator3 = _createForOfIteratorHelperLoose(this.enemys), _step3; !(_step3 = _iterator3()).done;) {
            var e = _step3.value;
            if (e.dead) continue;
            var ep = e.node.getPosition();
            var dx = ep.x - from.x;
            var dy = ep.y - from.y;
            var d = dx * dx + dy * dy;
            if (d < bestDist) {
              bestDist = d;
              best = e;
            }
          }
          return best;
        }

        // ---------------- 随机道具 ----------------
        ;

        _proto.getPowerUp = function getPowerUp() {
          var u = this.powerPool.pop();
          if (!u) {
            var n = new Node('PowerUp');
            n.addComponent(UITransform).setContentSize(40, 40);
            n.addComponent(Graphics);
            n.addComponent(PowerUp);
            this.worldLayer.addChild(n);
            u = n.getComponent(PowerUp);
          }
          return u;
        };
        _proto.recyclePowerUp = function recyclePowerUp(u) {
          if (this.powerPool.indexOf(u) >= 0) return;
          u.node.active = false;
          this.powerPool.push(u);
        }

        /** 击毁敌机时按概率掉落道具 */;
        _proto.tryDropPowerUp = function tryDropPowerUp(pos) {
          if (Math.random() > 0.08) return;
          var kinds = GameRoot.POWER_KINDS;
          var kind = kinds[Math.floor(Math.random() * kinds.length)];
          var u = this.getPowerUp();
          u.init(kind, pos.x, pos.y);
        }

        /** 道具生效 */;
        _proto.applyPowerUp = function applyPowerUp(kind) {
          var s = this.stats;
          var D = GameRoot.EFFECT_DURATION;
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

        /** 场上所有宝石标记为强制吸向玩家（不论距离） */;
        _proto.vacuumGems = function vacuumGems() {
          for (var _iterator4 = _createForOfIteratorHelperLoose(this.gems), _step4; !(_step4 = _iterator4()).done;) {
            var g = _step4.value;
            g.attract = true;
          }
        };
        _proto.getGem = function getGem() {
          var g = this.gemPool.pop();
          if (!g) {
            var n = new Node('Gem');
            n.addComponent(UITransform).setContentSize(16, 16);
            var gr = n.addComponent(Graphics);
            gr.fillColor = new Color(103, 232, 249, 70);
            gr.circle(0, 0, 10);
            gr.fill();
            gr.fillColor = new Color(165, 243, 252);
            gr.moveTo(0, -8);
            gr.lineTo(5, 0);
            gr.lineTo(0, 8);
            gr.lineTo(-5, 0);
            gr.close();
            gr.fill();
            n.addComponent(Gem);
            this.worldLayer.addChild(n);
            g = n.getComponent(Gem);
          }
          return g;
        };
        _proto.recycleGem = function recycleGem(g) {
          if (this.gemPool.indexOf(g) >= 0) return;
          var i = this.gems.indexOf(g);
          if (i >= 0) {
            this.gems.splice(i, 1);
          }
          g.node.active = false;
          this.gemPool.push(g);
        }

        // ---------------- 碰撞 ----------------
        ;

        _proto.checkCollisions = function checkCollisions() {
          // 玩家子弹打敌人（倒序遍历，回收时会 splice）
          for (var i = this.bullets.length - 1; i >= 0; i--) {
            var b = this.bullets[i];
            if (b.hostile) {
              continue;
            }
            var bp = b.node.getPosition();
            for (var _iterator5 = _createForOfIteratorHelperLoose(this.enemys), _step5; !(_step5 = _iterator5()).done;) {
              var e = _step5.value;
              if (e.dead) continue;
              var ep = e.node.getPosition();
              var r = 30 * e.node.scale.x + 8;
              var dx = bp.x - ep.x;
              var dy = bp.y - ep.y;
              if (dx * dx + dy * dy < r * r) {
                var dmg = b.damage;
                this.recycleBullet(b);
                this.dealDamage(e, dmg);
                break;
              }
            }
          }

          // 环绕电球撞击
          var player = this.playerNode.getComponent(Player);
          for (var _i4 = 0; _i4 < player.orbNodes.length; _i4++) {
            if (player.orbCds[_i4] > 0) {
              continue;
            }
            var op = player.orbNodes[_i4].worldPosition;
            for (var _iterator6 = _createForOfIteratorHelperLoose(this.enemys), _step6; !(_step6 = _iterator6()).done;) {
              var _e = _step6.value;
              if (_e.dead) continue;
              var _ep = _e.node.worldPosition;
              var _r = 13 + 30 * _e.node.scale.x;
              var _dx = op.x - _ep.x;
              var _dy = op.y - _ep.y;
              if (_dx * _dx + _dy * _dy < _r * _r) {
                player.orbCds[_i4] = 0.35;
                this.dealDamage(_e, this.stats.damage);
                break;
              }
            }
          }

          // 敌方光球打玩家
          for (var _i5 = this.bullets.length - 1; _i5 >= 0; _i5--) {
            var _b = this.bullets[_i5];
            if (!_b.hostile) {
              continue;
            }
            var _bp = _b.node.getPosition();
            var _pp = this.playerNode.getPosition();
            var _dx2 = _bp.x - _pp.x;
            var _dy2 = _bp.y - _pp.y;
            if (_dx2 * _dx2 + _dy2 * _dy2 < 40 * 40) {
              this.recycleBullet(_b);
              this.playerNode.getComponent(Player).takeDamage(1);
            }
          }

          // 敌人撞玩家
          var pp = this.playerNode.getPosition();
          for (var _iterator7 = _createForOfIteratorHelperLoose(this.enemys), _step7; !(_step7 = _iterator7()).done;) {
            var _e2 = _step7.value;
            if (_e2.dead) continue;
            var _ep2 = _e2.node.getPosition();
            var _r2 = 30 * _e2.node.scale.x + 26;
            var _dx3 = pp.x - _ep2.x;
            var _dy3 = pp.y - _ep2.y;
            if (_dx3 * _dx3 + _dy3 * _dy3 < _r2 * _r2) {
              this.playerNode.getComponent(Player).takeDamage(1);
              break;
            }
          }
        }

        // ---------------- 经验与升级 ----------------
        ;

        _proto.addXp = function addXp(amount) {
          if (amount <= 0) return;
          var boost = this.effectXp2 > 0 ? 2 : 1;
          this.xp += amount * this.stats.xpGain * boost;
          SoundFX.I.pick();
          while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.level += 1;
            this.xpToNext = 5 + this.level * 3;
            this.pendingLevelUps += 1;
          }
        };
        _proto.chooseUpgrade = function chooseUpgrade(up) {
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
        ;

        _proto.onPlayerDead = function onPlayerDead() {
          var _this2 = this;
          this.state = 'gameover';
          SoundFX.I.boom(true);
          this.scheduleOnce(function () {
            _this2.overlays.showGameOver(_this2.elapsed, _this2.level, _this2.kills);
          }, 0.7);
        };
        _proto.restart = function restart() {
          for (var _iterator8 = _createForOfIteratorHelperLoose(this.bullets.slice()), _step8; !(_step8 = _iterator8()).done;) {
            var b = _step8.value;
            this.recycleBullet(b);
          }
          for (var _iterator9 = _createForOfIteratorHelperLoose(this.missiles.slice()), _step9; !(_step9 = _iterator9()).done;) {
            var m = _step9.value;
            this.recycleMissile(m);
          }
          for (var _iterator10 = _createForOfIteratorHelperLoose(this.enemys.slice()), _step10; !(_step10 = _iterator10()).done;) {
            var e = _step10.value;
            this.recycleEnemy(e);
          }
          for (var _iterator11 = _createForOfIteratorHelperLoose(this.gems.slice()), _step11; !(_step11 = _iterator11()).done;) {
            var g = _step11.value;
            this.recycleGem(g);
          }
          for (var _iterator12 = _createForOfIteratorHelperLoose(this.bulletPool), _step12; !(_step12 = _iterator12()).done;) {
            var _b2 = _step12.value;
            _b2.node.active = false;
          }
          for (var _iterator13 = _createForOfIteratorHelperLoose(this.missilePool), _step13; !(_step13 = _iterator13()).done;) {
            var _m = _step13.value;
            _m.node.active = false;
          }
          for (var _iterator14 = _createForOfIteratorHelperLoose(this.powerPool), _step14; !(_step14 = _iterator14()).done;) {
            var u = _step14.value;
            u.node.active = false;
          }
          for (var _iterator15 = _createForOfIteratorHelperLoose(this.enemyPool), _step15; !(_step15 = _iterator15()).done;) {
            var _e3 = _step15.value;
            _e3.node.active = false;
          }
          for (var _iterator16 = _createForOfIteratorHelperLoose(this.gemPool), _step16; !(_step16 = _iterator16()).done;) {
            var _g2 = _step16.value;
            _g2.node.active = false;
          }
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
          this.playerNode.getComponent(Player).resetState();
          this.overlays.hideAll();
          this.state = 'playing';
        };
        return GameRoot;
      }(Component), _class2.I = null, _class2.EFFECT_DURATION = {
        magnet: 6,
        rage: 8,
        xp2: 10,
        shieldRecharge: 12,
        invinc: 5
      }, _class2.POWER_KINDS = ['magnet', 'vacuum', 'rage', 'heal1', 'heal3', 'crit', 'invinc', 'shield', 'xp2'], _class2)) || _class) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Gem.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameRoot.ts'], function (exports) {
  var _inheritsLoose, cclegacy, _decorator, Component, GameRoot;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Component = module.Component;
    }, function (module) {
      GameRoot = module.GameRoot;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "53e70G4IrVFi747JZhWZvfl", "Gem", undefined);
      var ccclass = _decorator.ccclass;
      var PICKUP_RADIUS = 34;
      var MAGNET_SPEED = 460;
      var DRIFT_SPEED = 62; // 与星空同步下坠，宝石不会停在原地

      /** 经验宝石：随星空缓缓下坠，靠近磁吸，碰到即拾取 */
      var Gem = exports('Gem', (_dec = ccclass('Gem'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(Gem, _Component);
        function Gem() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.value = 1;
          _this.attract = false;
          return _this;
        }
        var _proto = Gem.prototype;
        // 被"吸"道具标记：无视距离强制飞向玩家
        _proto.init = function init(x, y, value) {
          this.value = value;
          this.attract = false;
          this.node.active = true;
          // 钳制在玩家可达范围内，避免边缘宝石够不到
          var reachX = GameRoot.I.halfSize.x - 40;
          if (x > reachX) {
            x = reachX;
          }
          if (x < -reachX) {
            x = -reachX;
          }
          this.node.setPosition(x, y, 0);
          this.node.setScale(value >= 5 ? 1.5 : 1, value >= 5 ? 1.5 : 1, 1);
        };
        _proto.update = function update(dt) {
          var root = GameRoot.I;
          if (root.state !== 'playing') return;
          var p = root.playerNode.getPosition();
          var g = this.node.getPosition();

          // 拾取
          var dx = p.x - g.x;
          var dy = p.y - g.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < PICKUP_RADIUS) {
            root.addXp(this.value);
            root.recycleGem(this);
            return;
          }

          // 被"吸"标记，或磁力道具生效时全屏吸附，否则按吸附范围磁吸
          var magnetRange = root.stats.magnetRange !== undefined ? root.stats.magnetRange : 150;
          var magnetAll = this.attract || root.effectMagnet > 0;
          if (dist < (magnetAll ? 99999 : magnetRange)) {
            var speed = magnetAll ? MAGNET_SPEED + 160 : MAGNET_SPEED;
            var step = Math.min(dist, speed * dt);
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
        };
        return Gem;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Hud.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameRoot.ts'], function (exports) {
  var _inheritsLoose, _createForOfIteratorHelperLoose, cclegacy, _decorator, Color, Node, UITransform, Label, Graphics, Component, GameRoot;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
      _createForOfIteratorHelperLoose = module.createForOfIteratorHelperLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Color = module.Color;
      Node = module.Node;
      UITransform = module.UITransform;
      Label = module.Label;
      Graphics = module.Graphics;
      Component = module.Component;
    }, function (module) {
      GameRoot = module.GameRoot;
    }],
    execute: function () {
      var _dec, _class, _class2;
      cclegacy._RF.push({}, "8cf3cuZJ39CsYLq/6f81Tpt", "Hud", undefined);
      var ccclass = _decorator.ccclass;
      /** HUD：血条 / 经验条 / 等级 / 时间 / 击杀数 / 道具状态栏 */
      var Hud = exports('Hud', (_dec = ccclass('Hud'), _dec(_class = (_class2 = /*#__PURE__*/function (_Component) {
        _inheritsLoose(Hud, _Component);
        function Hud() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.hpFill = null;
          _this.hpLabel = null;
          _this.xpFill = null;
          _this.lvLabel = null;
          _this.timeLabel = null;
          _this.killLabel = null;
          _this.atkLabel = null;
          _this.bossRoot = null;
          _this.bossFill = null;
          _this.buffChips = new Map();
          _this.buffRow = null;
          _this.hudRoot = null;
          _this.hpBarW = 300;
          _this.xpBarW = 720;
          return _this;
        }
        var _proto = Hud.prototype;
        _proto.makeLabel = function makeLabel(parent, size, color, x, y, anchorX) {
          if (anchorX === void 0) {
            anchorX = 0.5;
          }
          var n = new Node('label');
          var uiT = n.addComponent(UITransform);
          uiT.setAnchorPoint(anchorX, 0.5);
          var l = n.addComponent(Label);
          l.string = '';
          l.fontSize = size;
          l.lineHeight = size + 4;
          l.color = color;
          n.setPosition(x, y, 0);
          parent.addChild(n);
          return l;
        };
        _proto.makeBar = function makeBar(parent, w, h, bgColor, fillColor, x, y) {
          var bg = new Node('bar-bg');
          var bgT = bg.addComponent(UITransform);
          bgT.setAnchorPoint(0, 0.5);
          var bgG = bg.addComponent(Graphics);
          bgG.fillColor = bgColor;
          bgG.roundRect(0, -h / 2, w, h, h / 2);
          bgG.fill();
          bg.setPosition(x, y, 0);
          parent.addChild(bg);
          var fill = new Node('bar-fill');
          var fillT = fill.addComponent(UITransform);
          fillT.setAnchorPoint(0, 0.5);
          var fillG = fill.addComponent(Graphics);
          fillG.fillColor = fillColor;
          fillG.roundRect(2, -h / 2 + 2, w - 4, h - 4, (h - 4) / 2);
          fillG.fill();
          bg.addChild(fill);
          return {
            bg: bg,
            fill: fill
          };
        };
        _proto.start = function start() {
          var half = GameRoot.I.halfSize;
          var left = -half.x + 16;
          var top = half.y;
          // HUD 独立容器：开始界面时只隐藏这一层，不影响 Canvas 上其他组件
          this.hudRoot = new Node('HudRoot');
          this.node.addChild(this.hudRoot);
          var root = this.hudRoot;

          // 血条
          this.hpBarW = 300;
          this.makeBar(root, this.hpBarW, 22, new Color(0, 0, 0, 120), new Color(102, 187, 106), left, top - 34);
          this.hpFill = root.children[root.children.length - 1].getChildByName('bar-fill').getComponent(Graphics);
          this.hpLabel = this.makeLabel(root, 14, Color.WHITE, left + this.hpBarW / 2, top - 34);

          // 等级
          this.lvLabel = this.makeLabel(root, 22, new Color(255, 224, 130), left + 2, top - 78, 0);

          // 经验条（全宽）
          this.xpBarW = half.x * 2;
          var xpBar = this.makeBar(root, this.xpBarW, 8, new Color(0, 0, 0, 100), new Color(79, 195, 247), -half.x, top - 100);
          this.xpFill = xpBar.fill;

          // 右上角时间与击杀
          var right = half.x - 16;
          this.timeLabel = this.makeLabel(root, 26, Color.WHITE, right, top - 34, 1);
          this.killLabel = this.makeLabel(root, 18, new Color(255, 170, 170), right, top - 68, 1);
          // 攻击力
          this.atkLabel = this.makeLabel(root, 18, new Color(255, 152, 118), right, top - 96, 1);

          // Boss 血条（顶部中央，默认隐藏）
          this.bossRoot = new Node('BossBar');
          this.bossRoot.setPosition(0, top - 150, 0);
          root.addChild(this.bossRoot);
          this.makeLabel(this.bossRoot, 18, new Color(255, 120, 120), 0, 22, 'BOSS');
          var bossBar = this.makeBar(this.bossRoot, 480, 16, new Color(0, 0, 0, 120), new Color(224, 85, 110), -240, 0);
          this.bossFill = bossBar.fill;
          this.bossRoot.active = false;

          // 道具状态栏（经验条下方，图标块 + 剩余时间条）
          this.buffRow = new Node('BuffRow');
          this.buffRow.setPosition(left + 20, top - 128, 0);
          root.addChild(this.buffRow);

          // 按 GameRoot 当前状态决定初始显隐
          this.hudRoot.active = GameRoot.I.state !== 'menu';
        }

        /** 显示/隐藏整个 HUD（开始界面时隐藏） */;
        _proto.setHidden = function setHidden(hidden) {
          if (this.hudRoot) {
            this.hudRoot.active = !hidden;
          }
        }

        /** 创建一个道具状态图标块 */;
        _proto.makeBuffChip = function makeBuffChip(key) {
          var style = Hud.BUFF_STYLE[key];
          var chip = new Node('buff-' + key);
          chip.addComponent(UITransform).setContentSize(40, 40);
          var box = chip.addComponent(Graphics);
          box.fillColor = new Color(12, 15, 28, 220);
          box.roundRect(-19, -19, 38, 38, 8);
          box.fill();
          box.strokeColor = style.color;
          box.lineWidth = 2.5;
          box.roundRect(-19, -19, 38, 38, 8);
          box.stroke();
          this.makeLabel(chip, 20, style.color, 0, 4, style["char"]);

          // 底部剩余时间条
          var barBg = new Node('bar');
          var barG = barBg.addComponent(Graphics);
          barG.fillColor = new Color(255, 255, 255, 60);
          barG.roundRect(-15, -15, 30, 4, 2);
          barG.fill();
          chip.addChild(barBg);
          var bar = new Node('bar-fill');
          var barG2 = bar.addComponent(Graphics);
          barG2.fillColor = style.color;
          barG2.roundRect(-15, -15, 30, 4, 2);
          barG2.fill();
          barBg.addChild(bar);
          this.buffRow.addChild(chip);
          return {
            root: chip,
            bar: bar,
            box: box
          };
        }

        /** 刷新道具状态栏：按当前生效效果增删图标块 */;
        _proto.updateBuffChips = function updateBuffChips(root) {
          var _this2 = this;
          // 收集当前应显示的效果（按固定顺序）
          var wanted = [];
          if (root.effectMagnet > 0) {
            wanted.push({
              key: 'magnet',
              frac: root.effectMagnet / GameRoot.EFFECT_DURATION.magnet
            });
          }
          if (root.effectRage > 0) {
            wanted.push({
              key: 'rage',
              frac: root.effectRage / GameRoot.EFFECT_DURATION.rage
            });
          }
          if (root.effectXp2 > 0) {
            wanted.push({
              key: 'xp2',
              frac: root.effectXp2 / GameRoot.EFFECT_DURATION.xp2
            });
          }
          if (root.effectInvinc > 0) {
            wanted.push({
              key: 'invinc',
              frac: root.effectInvinc / GameRoot.EFFECT_DURATION.invinc
            });
          }
          if (root.stats.shieldMax > 0) {
            // 护盾：就绪时常亮满条；破碎后显示充能进度
            var ready = root.stats.shield >= 1;
            var frac = ready ? 1 : Math.min(Math.max(1 - root.stats.shieldTimer / GameRoot.EFFECT_DURATION.shieldRecharge, 0), 1);
            wanted.push({
              key: 'shield',
              frac: frac
            });
          }

          // 删除不再生效的
          var _loop = function _loop() {
            var _step$value = _step.value,
              key = _step$value[0],
              chip = _step$value[1];
            if (!wanted.some(function (w) {
              return w.key === key;
            })) {
              chip.root.destroy();
              _this2.buffChips["delete"](key);
            }
          };
          for (var _iterator = _createForOfIteratorHelperLoose(this.buffChips), _step; !(_step = _iterator()).done;) {
            _loop();
          }

          // 按顺序排布并更新时间条
          wanted.forEach(function (w, i) {
            var chip = _this2.buffChips.get(w.key);
            if (!chip) {
              chip = _this2.makeBuffChip(w.key);
              _this2.buffChips.set(w.key, chip);
            }
            chip.root.setPosition(i * 46, 0, 0);
            chip.bar.setScale(Math.max(w.frac, 0.001), 1, 1);
            chip.bar.setPosition(-(1 - w.frac) * 15, 0, 0);
          });
        };
        _proto.update = function update() {
          var root = GameRoot.I;
          if (!root || !this.hpLabel) return;
          var s = root.stats;
          this.hpFill.node.setScale(Math.max(s.hp / s.maxHp, 0.001), 1, 1);
          this.hpLabel.string = "HP " + s.hp + "/" + s.maxHp;
          this.lvLabel.string = "Lv." + root.level;
          this.xpFill.setScale(Math.min(root.xp / root.xpToNext, 1), 1, 1);
          var sec = Math.floor(root.elapsed);
          var mm = String(Math.floor(sec / 60)).padStart(2, '0');
          var ss = String(sec % 60).padStart(2, '0');
          this.timeLabel.string = mm + ":" + ss;
          this.killLabel.string = "\u51FB\u6740 " + root.kills;
          // 攻击力
          this.atkLabel.string = "\u653B " + s.damage;

          // Boss 血条
          var boss = root.boss;
          var showBoss = !!(boss && !boss.dead && boss.node.activeInHierarchy);
          this.bossRoot.active = showBoss;
          if (showBoss) {
            this.bossFill.setScale(Math.max(boss.hp / boss.maxHp, 0.001), 1, 1);
          }

          // 道具状态栏
          this.updateBuffChips(root);
        };
        return Hud;
      }(Component), _class2.BUFF_STYLE = {
        magnet: {
          "char": '磁',
          color: new Color(103, 232, 249)
        },
        rage: {
          "char": '狂',
          color: new Color(244, 63, 94)
        },
        xp2: {
          "char": '倍',
          color: new Color(251, 191, 36)
        },
        invinc: {
          "char": '无',
          color: new Color(255, 223, 128)
        },
        shield: {
          "char": '盾',
          color: new Color(148, 163, 184)
        }
      }, _class2)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/main", ['./Bullet.ts', './Enemy.ts', './GameRoot.ts', './Gem.ts', './Hud.ts', './Missile.ts', './Overlays.ts', './Player.ts', './PowerUp.ts', './SoundFX.ts', './Upgrades.ts'], function () {
  return {
    setters: [null, null, null, null, null, null, null, null, null, null, null],
    execute: function () {}
  };
});

System.register("chunks:///_virtual/Missile.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameRoot.ts', './SoundFX.ts'], function (exports) {
  var _inheritsLoose, cclegacy, _decorator, Graphics, Color, Component, GameRoot, SoundFX;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Graphics = module.Graphics;
      Color = module.Color;
      Component = module.Component;
    }, function (module) {
      GameRoot = module.GameRoot;
    }, function (module) {
      SoundFX = module.SoundFX;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "ac9d3yXIfJBR6UVKhnzJ4Ii", "Missile", undefined);
      var ccclass = _decorator.ccclass;
      var TURN_RATE = 5.2; // 转向速率（弧度/秒）
      var BASE_SPEED = 300;
      var ACCEL = 460;
      var MAX_SPEED = 800;
      var LIFETIME = 6;

      /**
       * 跟踪导弹：发射后自动锁定最近的敌机
       * 带转向速率限制的追踪弹，命中造成伤害
       */
      var Missile = exports('Missile', (_dec = ccclass('Missile'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(Missile, _Component);
        function Missile() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.damage = 2;
          _this.angle = 0;
          // 航向角（0=正上方，与子弹一致）
          _this.speed = BASE_SPEED;
          _this.life = LIFETIME;
          _this.target = null;
          return _this;
        }
        var _proto = Missile.prototype;
        _proto.init = function init(target, damage, initialAngle) {
          this.target = target;
          this.damage = damage;
          this.angle = initialAngle;
          this.speed = BASE_SPEED;
          this.life = LIFETIME;
          this.node.active = true;
          this.node.angle = initialAngle * 180 / Math.PI;
          this.draw();
        };
        _proto.draw = function draw() {
          var g = this.node.getComponent(Graphics) || this.node.addComponent(Graphics);
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

        /** 目标死亡或失联时重新锁定最近的敌机 */;
        _proto.acquireTarget = function acquireTarget() {
          if (this.target && !this.target.dead && this.target.node.activeInHierarchy) {
            return this.target;
          }
          this.target = GameRoot.I.findNearestEnemy(this.node.getPosition());
          return this.target;
        };
        _proto.update = function update(dt) {
          var root = GameRoot.I;
          if (root.state !== 'playing') return;
          this.life -= dt;
          if (this.life <= 0) {
            root.recycleMissile(this);
            return;
          }
          var t = this.acquireTarget();
          if (t) {
            var tp = t.node.getPosition();
            var _mp = this.node.getPosition();
            var desired = Math.atan2(tp.x - _mp.x, tp.y - _mp.y);
            // 带角度环绕的最短转向
            var diff = desired - this.angle;
            while (diff > Math.PI) {
              diff -= Math.PI * 2;
            }
            while (diff < -Math.PI) {
              diff += Math.PI * 2;
            }
            var maxTurn = TURN_RATE * dt;
            this.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
            this.node.angle = this.angle * 180 / Math.PI;

            // 命中判定
            var r = 30 * t.node.scale.x + 10;
            var dx = tp.x - _mp.x;
            var dy = tp.y - _mp.y;
            if (dx * dx + dy * dy < r * r) {
              GameRoot.I.dealDamage(t, this.damage);
              SoundFX.I.hit();
              root.recycleMissile(this);
              return;
            }
          }
          this.speed = Math.min(MAX_SPEED, this.speed + ACCEL * dt);
          var mp = this.node.getPosition();
          var nx = mp.x + Math.sin(this.angle) * this.speed * dt;
          var ny = mp.y + Math.cos(this.angle) * this.speed * dt;
          this.node.setPosition(nx, ny, 0);
          var half = root.halfSize;
          if (nx < -half.x - 80 || nx > half.x + 80 || ny < -half.y - 80 || ny > half.y + 80) {
            root.recycleMissile(this);
          }
        };
        return Missile;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Overlays.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameRoot.ts', './SoundFX.ts'], function (exports) {
  var _inheritsLoose, cclegacy, _decorator, Node, UITransform, Label, Graphics, Color, Component, GameRoot, SoundFX;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Node = module.Node;
      UITransform = module.UITransform;
      Label = module.Label;
      Graphics = module.Graphics;
      Color = module.Color;
      Component = module.Component;
    }, function (module) {
      GameRoot = module.GameRoot;
    }, function (module) {
      SoundFX = module.SoundFX;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "c6f55Kz0/9Cga+qr0Z+k5ez", "Overlays", undefined);
      var ccclass = _decorator.ccclass;
      var CARD_W = 560;
      var CARD_H = 110;

      /** 暂停面板展示的属性清单 */
      var PAUSE_STATS = [{
        label: '攻击力',
        get: function get(s) {
          return "" + s.damage;
        }
      }, {
        label: '生命',
        get: function get(s) {
          return s.hp + " / " + s.maxHp;
        }
      }, {
        label: '暴击率',
        get: function get(s) {
          return Math.round(s.critRate * 100) + "%\uFF08\xD7" + s.critMult + "\uFF09";
        }
      }, {
        label: '攻击间隔',
        get: function get(s) {
          return s.fireInterval.toFixed(2) + " \u79D2";
        }
      }, {
        label: '弹道数量',
        get: function get(s) {
          return s.bulletCount + " \u53D1";
        }
      }, {
        label: '移动速度',
        get: function get(s) {
          return "+ " + Math.round((s.moveSpeed - 1) * 100) + "%";
        }
      }, {
        label: '经验加成',
        get: function get(s) {
          return "+ " + Math.round((s.xpGain - 1) * 100) + "%";
        }
      }, {
        label: '磁场范围',
        get: function get(s) {
          return "" + Math.round(s.magnetRange);
        }
      }, {
        label: '环绕电球',
        get: function get(s) {
          return s.orbs > 0 ? s.orbs + " \u9897" : '无';
        }
      }, {
        label: '跟踪导弹',
        get: function get(s) {
          return s.missiles > 0 ? s.missiles + " \u679A" : '无';
        }
      }, {
        label: '能量护盾',
        get: function get(s) {
          return s.shieldMax > 0 ? s.shield >= 1 ? '就绪' : '充能中' : '未装备';
        }
      }];

      /** 弹窗层：升级三选一 / 游戏结束结算 */
      var Overlays = exports('Overlays', (_dec = ccclass('Overlays'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(Overlays, _Component);
        function Overlays() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.levelUpPanel = null;
          _this.gameOverPanel = null;
          _this.pausePanel = null;
          _this.pauseStatLabels = [];
          _this.menuPanel = null;
          _this.cardRoot = null;
          _this.statLabels = [];
          // ---------------- 升级三选一 ----------------
          _this.selIndex = 0;
          _this.cardNodes = [];
          _this.choices = [];
          return _this;
        }
        var _proto = Overlays.prototype;
        _proto.makeLabel = function makeLabel(parent, size, color, x, y, text, anchorX) {
          if (text === void 0) {
            text = '';
          }
          if (anchorX === void 0) {
            anchorX = 0.5;
          }
          var n = new Node('label');
          var uiT = n.addComponent(UITransform);
          uiT.setAnchorPoint(anchorX, 0.5);
          var l = n.addComponent(Label);
          l.string = text;
          l.fontSize = size;
          l.lineHeight = size + 4;
          l.color = color;
          n.setPosition(x, y, 0);
          parent.addChild(n);
          return l;
        };
        _proto.makeDim = function makeDim(parent) {
          var half = GameRoot.I.halfSize;
          var n = new Node('dim');
          n.addComponent(UITransform).setContentSize(half.x * 2, half.y * 2);
          var g = n.addComponent(Graphics);
          g.fillColor = new Color(0, 0, 0, 190);
          g.rect(-half.x, -half.y, half.x * 2, half.y * 2);
          g.fill();
          parent.addChild(n);
          return n;
        };
        _proto.start = function start() {
          var _this2 = this;
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
          var texts = ['存活时间：', '最终等级：', '击杀怪物：'];
          for (var i = 0; i < 3; i++) {
            this.statLabels.push(this.makeLabel(this.gameOverPanel, 26, Color.WHITE, 0, 220 - i * 52, texts[i]));
          }

          // 重开按钮
          var btn = new Node('RestartBtn');
          btn.addComponent(UITransform).setContentSize(280, 84);
          var g = btn.addComponent(Graphics);
          g.fillColor = new Color(79, 195, 247);
          g.roundRect(-140, -42, 280, 84, 16);
          g.fill();
          btn.setPosition(0, -60, 0);
          this.makeLabel(btn, 30, new Color(16, 49, 46), 0, 0, '再来一局');
          btn.on(Node.EventType.TOUCH_END, function () {
            GameRoot.I.restart();
          });
          this.gameOverPanel.addChild(btn);

          // ---- 暂停面板（含属性总结） ----
          this.pausePanel = new Node('PausePanel');
          this.node.addChild(this.pausePanel);
          this.makeDim(this.pausePanel);
          this.makeLabel(this.pausePanel, 48, new Color(103, 232, 249), 0, 430, '已暂停');
          this.makeLabel(this.pausePanel, 22, new Color(160, 174, 192), 0, 372, '按 空格 / Esc 继续');

          // 属性两列排布（左列 6 项、右列 5 项）
          PAUSE_STATS.forEach(function (def, i) {
            var col = i < 6 ? 0 : 1;
            var row = i % 6;
            var x = col === 0 ? -330 : 40;
            var y = 250 - row * 76;
            var chip = new Node('stat');
            chip.addComponent(UITransform).setContentSize(290, 56);
            var g = chip.addComponent(Graphics);
            g.fillColor = new Color(30, 38, 60, 160);
            g.roundRect(0, -28, 290, 56, 10);
            g.fill();
            chip.setPosition(x, y, 0);
            _this2.pausePanel.addChild(chip);
            var label = _this2.makeLabel(chip, 19, new Color(148, 163, 184), 16, 0, def.label, 0);
            var value = _this2.makeLabel(chip, 22, Color.WHITE, 274, 0, '', 1);
            _this2.pauseStatLabels.push({
              label: label,
              value: value
            });
          });

          // ---- 开始界面 ----
          this.menuPanel = new Node('MenuPanel');
          this.node.addChild(this.menuPanel);
          this.makeLabel(this.menuPanel, 64, new Color(103, 232, 249), 0, 300, 'NEON');
          this.makeLabel(this.menuPanel, 64, Color.WHITE, 0, 226, 'STARFIGHTER');
          this.makeLabel(this.menuPanel, 30, new Color(148, 163, 184), 0, 150, '霓 虹 星 际 战 机');
          this.makeLabel(this.menuPanel, 18, new Color(103, 232, 249, 160), 0, 96, '- - - ✦ - - -');
          var startBtn = new Node('StartBtn');
          startBtn.addComponent(UITransform).setContentSize(320, 92);
          var sg = startBtn.addComponent(Graphics);
          sg.fillColor = new Color(103, 232, 249);
          sg.roundRect(-160, -46, 320, 92, 18);
          sg.fill();
          sg.strokeColor = new Color(224, 255, 255);
          sg.lineWidth = 4;
          sg.roundRect(-160, -46, 320, 92, 18);
          sg.stroke();
          startBtn.setPosition(0, -10, 0);
          this.makeLabel(startBtn, 32, new Color(8, 20, 30), 0, 0, '开始新游戏');
          startBtn.on(Node.EventType.TOUCH_END, function () {
            GameRoot.I.startGame();
          });
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
        };
        _proto.showLevelUp = function showLevelUp(choices) {
          var _this3 = this;
          this.cardRoot.destroyAllChildren();
          this.cardNodes = [];
          this.choices = choices;
          choices.forEach(function (up, i) {
            var card = new Node("card-" + i);
            card.addComponent(UITransform).setContentSize(CARD_W, CARD_H);
            card.setPosition(0, 300 - i * (CARD_H + 24), 0);
            var g = card.addComponent(Graphics);
            g.fillColor = new Color(43, 53, 80);
            g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
            g.fill();
            g.strokeColor = up.color;
            g.lineWidth = 4;
            g.roundRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 14);
            g.stroke();

            // 键盘选中高亮框（白色外框，默认隐藏）
            var hl = new Node('hl');
            var hg = hl.addComponent(Graphics);
            hg.strokeColor = Color.WHITE;
            hg.lineWidth = 5;
            hg.roundRect(-CARD_W / 2 - 7, -CARD_H / 2 - 7, CARD_W + 14, CARD_H + 14, 19);
            hg.stroke();
            hl.active = false;
            card.addChild(hl);

            // 左侧圆形图标
            var icon = new Node('icon');
            icon.addComponent(UITransform).setContentSize(64, 64);
            var ig = icon.addComponent(Graphics);
            ig.fillColor = up.color;
            ig.circle(0, 0, 32);
            ig.fill();
            icon.setPosition(-CARD_W / 2 + 64, 0, 0);
            card.addChild(icon);
            _this3.makeLabel(card, 34, Color.WHITE, -CARD_W / 2 + 64, 0, up["char"]);
            _this3.makeLabel(card, 28, Color.WHITE, -CARD_W / 2 + 120, 22, up.name, 0);
            _this3.makeLabel(card, 20, new Color(159, 176, 208), -CARD_W / 2 + 120, -20, up.desc, 0);
            card.on(Node.EventType.TOUCH_END, function () {
              _this3.selIndex = i;
              GameRoot.I.chooseUpgrade(up);
            });
            _this3.cardRoot.addChild(card);
            _this3.cardNodes.push(card);
          });
          this.selIndex = 0;
          this.updateHighlight();
          this.levelUpPanel.active = true;
        }

        /** 键盘 W/S 上下切换（循环滚动） */;
        _proto.moveSel = function moveSel(d) {
          if (!this.levelUpPanel.active || this.cardNodes.length === 0) return;
          var n = this.cardNodes.length;
          this.selIndex = (this.selIndex + d + n) % n;
          SoundFX.I.pick();
          this.updateHighlight();
        }

        /** 键盘空格/回车确认当前选中项 */;
        _proto.confirmSel = function confirmSel() {
          if (!this.levelUpPanel.active) return;
          var up = this.choices[this.selIndex];
          if (!up) return;
          GameRoot.I.chooseUpgrade(up);
        };
        _proto.updateHighlight = function updateHighlight() {
          var _this4 = this;
          this.cardNodes.forEach(function (n, i) {
            var sel = i === _this4.selIndex;
            var hl = n.getChildByName('hl');
            if (hl) {
              hl.active = sel;
            }
            n.setScale(sel ? 1.04 : 1, sel ? 1.04 : 1, 1);
          });
        };
        _proto.showGameOver = function showGameOver(elapsed, level, kills) {
          var sec = Math.floor(elapsed);
          var mm = String(Math.floor(sec / 60)).padStart(2, '0');
          var ss = String(sec % 60).padStart(2, '0');
          this.statLabels[0].string = "\u5B58\u6D3B\u65F6\u95F4\uFF1A" + mm + ":" + ss;
          this.statLabels[1].string = "\u6700\u7EC8\u7B49\u7EA7\uFF1ALv." + level;
          this.statLabels[2].string = "\u51FB\u6740\u602A\u7269\uFF1A" + kills;
          this.gameOverPanel.active = true;
        };
        _proto.showPaused = function showPaused() {
          var _this5 = this;
          // 填充当前属性数值
          var s = GameRoot.I.stats;
          PAUSE_STATS.forEach(function (def, i) {
            _this5.pauseStatLabels[i].value.string = def.get(s);
          });
          this.pausePanel.active = true;
        };
        _proto.showMenu = function showMenu() {
          if (this.menuPanel) {
            this.menuPanel.active = true;
          }
        };
        _proto.hideAll = function hideAll() {
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
        };
        return Overlays;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Player.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameRoot.ts', './SoundFX.ts'], function (exports) {
  var _inheritsLoose, cclegacy, _decorator, input, Input, KeyCode, Node, Graphics, Color, UIOpacity, Vec3, UITransform, tween, Component, GameRoot, SoundFX;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      input = module.input;
      Input = module.Input;
      KeyCode = module.KeyCode;
      Node = module.Node;
      Graphics = module.Graphics;
      Color = module.Color;
      UIOpacity = module.UIOpacity;
      Vec3 = module.Vec3;
      UITransform = module.UITransform;
      tween = module.tween;
      Component = module.Component;
    }, function (module) {
      GameRoot = module.GameRoot;
    }, function (module) {
      SoundFX = module.SoundFX;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "04615qeo4ZBa7DJTlhOzZMl", "Player", undefined);
      var ccclass = _decorator.ccclass;
      var BASE_SPEED = 460; // moveSpeed 为 1 时的速度（像素/秒）
      var BULLET_SPEED = 640;
      var ORBIT_RADIUS = 78;
      var ORBIT_SPEED = 2.6; // 电球旋转角速度（弧度/秒）

      /** 玩家：霓虹箭形战机，跟随手指移动，自动射击 */
      var Player = exports('Player', (_dec = ccclass('Player'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(Player, _Component);
        function Player() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.target = null;
          _this.fireTimer = 0;
          _this.missileTimer = 0;
          _this.invincible = 0;
          _this.dying = false;
          _this.animT = 0;
          _this.keys = new Set();
          // 当前按住的键盘按键
          _this.bodyNode = null;
          _this.classicNode = null;
          _this.skinIndex = 0;
          // 0=霓虹箭形 1=经典战机
          _this.flameNode = null;
          _this.invincRing = null;
          _this.shieldRing = null;
          _this.orbNodes = [];
          _this.orbCds = [];
          _this.orbAngle = 0;
          return _this;
        }
        var _proto = Player.prototype;
        _proto.onLoad = function onLoad() {
          input.on(Input.EventType.TOUCH_START, this.onTouch, this);
          input.on(Input.EventType.TOUCH_MOVE, this.onTouch, this);
          input.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
          input.on(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
          // 键盘：WASD / 方向键（网页预览下有效）
          input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
          this.buildVisual();
        };
        _proto.onDestroy = function onDestroy() {
          input.off(Input.EventType.TOUCH_START, this.onTouch, this);
          input.off(Input.EventType.TOUCH_MOVE, this.onTouch, this);
          input.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
          input.off(Input.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
          input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
          input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        };
        _proto.onKeyDown = function onKeyDown(e) {
          this.keys.add(e.keyCode);
          this.target = null; // 切换到键盘操控时断开触点跟随
          // V：切换战机皮肤（霓虹箭形 / 经典战机）
          if (e.keyCode === KeyCode.KEY_V) {
            this.skinIndex = 1 - this.skinIndex;
            this.bodyNode.active = this.skinIndex === 0;
            this.classicNode.active = this.skinIndex === 1;
            SoundFX.I.pick();
          }
        };
        _proto.onKeyUp = function onKeyUp(e) {
          this.keys["delete"](e.keyCode);
        }

        /** 读取键盘方向：返回归一化前的 dx/dy */;
        _proto.keyAxis = function keyAxis() {
          var dx = 0,
            dy = 0;
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
          return {
            dx: dx,
            dy: dy
          };
        }

        /** 霓虹造型：发光箭形 + 白色核心；经典造型：橙白涂装螺旋桨战机（致敬老版） */;
        _proto.buildVisual = function buildVisual() {
          this.bodyNode = new Node('body');
          this.node.addChild(this.bodyNode);
          var g = this.bodyNode.addComponent(Graphics);
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
          var cg = this.classicNode.addComponent(Graphics);
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
          var fg = this.flameNode.addComponent(Graphics);
          fg.fillColor = new Color(125, 211, 252, 200);
          fg.moveTo(0, -14);
          fg.lineTo(6, 0);
          fg.lineTo(-6, 0);
          fg.close();
          fg.fill();
          this.shieldRing = new Node('shieldRing');
          this.node.addChild(this.shieldRing);
          var sg = this.shieldRing.addComponent(Graphics);
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
          var ig = this.invincRing.addComponent(Graphics);
          ig.strokeColor = new Color(255, 213, 79, 220);
          ig.lineWidth = 4;
          ig.circle(0, 0, 45);
          ig.stroke();
          ig.strokeColor = new Color(255, 236, 160, 90);
          ig.lineWidth = 8;
          ig.circle(0, 0, 52);
          ig.stroke();
          this.invincRing.active = false;
        };
        _proto.resetState = function resetState() {
          this.target = null;
          this.fireTimer = 0;
          this.invincible = 0;
          this.dying = false;
          this.node.setPosition(0, -GameRoot.I.halfSize.y + 120, 0);
          this.node.setScale(1, 1, 1);
          var op = this.node.getComponent(UIOpacity);
          if (op) {
            op.opacity = 255;
          }
          this.syncOrbs();
        };
        _proto.onTouch = function onTouch(e) {
          if (GameRoot.I.state !== 'playing') return;
          var ui = e.getUILocation();
          var half = GameRoot.I.halfSize;
          this.target = new Vec3(ui.x - half.x, ui.y - half.y, 0);
        };
        _proto.onTouchEnd = function onTouchEnd() {
          this.target = null;
        }

        /** 按当前属性同步环绕电球数量 */;
        _proto.syncOrbs = function syncOrbs() {
          var want = GameRoot.I.stats.orbs;
          while (this.orbNodes.length < want) {
            var orb = new Node('orb' + this.orbNodes.length);
            orb.addComponent(UITransform).setContentSize(20, 20);
            var g = orb.addComponent(Graphics);
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
            var _orb = this.orbNodes.pop();
            this.orbCds.pop();
            _orb.destroy();
          }
        };
        _proto.update = function update(dt) {
          var root = GameRoot.I;
          var stats = root.stats;
          if (root.state !== 'playing' || this.dying) return;
          this.animT += dt;

          // 键盘优先，其次触点跟随
          var axis = this.keyAxis();
          if (axis.dx !== 0 || axis.dy !== 0) {
            var p = this.node.getPosition();
            var len = Math.sqrt(axis.dx * axis.dx + axis.dy * axis.dy);
            var step = BASE_SPEED * stats.moveSpeed * dt;
            this.node.setPosition(p.x + axis.dx / len * step, p.y + axis.dy / len * step, 0);
          } else if (this.target) {
            var _p = this.node.getPosition();
            var dx = this.target.x - _p.x;
            var dy = this.target.y - _p.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 4) {
              var _step = Math.min(dist, BASE_SPEED * stats.moveSpeed * dt);
              this.node.setPosition(_p.x + dx / dist * _step, _p.y + dy / dist * _step, 0);
            }
          }

          // 钳制在画幅内，防止走出可视区域（ outside 后战机会被裁剪掉）
          // 余量 12：机身几乎可以贴到墙上，仅半透明光晕边缘略被裁剪
          var half = root.halfSize;
          var m = 12;
          var px = this.node.position.x;
          var py = this.node.position.y;
          var cx = Math.max(-half.x + m, Math.min(half.x - m, px));
          var cy = Math.max(-half.y + m, Math.min(half.y - m, py));
          if (cx !== px || cy !== py) {
            this.node.setPosition(cx, cy, 0);
          }

          // 引擎尾焰闪烁
          var f = 0.55 + 0.45 * Math.abs(Math.sin(this.animT * 22));
          this.flameNode.setScale(1, f, 1);

          // 无敌帧闪烁
          if (this.invincible > 0) {
            this.invincible -= dt;
            var op = this.node.getComponent(UIOpacity);
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
            var pulse = 1 + 0.05 * Math.sin(this.animT * 8);
            this.invincRing.setScale(pulse, pulse, 1);
          }

          // 环绕电球
          this.syncOrbs();
          this.orbAngle += ORBIT_SPEED * dt;
          for (var i = 0; i < this.orbNodes.length; i++) {
            var a = this.orbAngle + i / this.orbNodes.length * Math.PI * 2;
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

          // 跟踪导弹：每 2.4 秒自动发射一轮
          if (stats.missiles > 0) {
            this.missileTimer -= dt;
            if (this.missileTimer <= 0) {
              this.missileTimer = 2.4;
              var count = stats.missiles;
              for (var _i = 0; _i < count; _i++) {
                var _m = root.getMissile();
                var _p2 = this.node.getPosition();
                _m.node.setPosition(_p2.x + (_i - (count - 1) / 2) * 26, _p2.y, 0);
                _m.init(root.findNearestEnemy(this.node.getPosition()), Math.max(root.stats.damage, 2), (_i - (count - 1) / 2) * 0.45);
              }
              SoundFX.I.missile();
            }
          }
        };
        _proto.shoot = function shoot() {
          var root = GameRoot.I;
          var count = root.stats.bulletCount;
          var p = this.node.getPosition();
          for (var i = 0; i < count; i++) {
            var angle = (i - (count - 1) / 2) * 0.18;
            var bullet = root.getBullet();
            bullet.node.setPosition(p.x, p.y + 40, 0);
            bullet.init(angle, BULLET_SPEED, root.stats.damage);
          }
          SoundFX.I.shoot();
        }

        /** 受到伤害，返回是否死亡（无敌道具优先，其次护盾） */;
        _proto.takeDamage = function takeDamage(dmg) {
          if (this.invincible > 0 || this.dying) return false;
          // 无敌道具生效期间完全免疫
          if (GameRoot.I.effectInvinc > 0) return false;
          var root = GameRoot.I;
          var stats = root.stats;
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
            var op = this.node.getComponent(UIOpacity) || this.node.addComponent(UIOpacity);
            tween(this.node).to(0.3, {
              scale: new Vec3(1.6, 1.6, 1)
            }).to(0.2, {
              scale: new Vec3(0, 0, 1)
            }).start();
            tween(op).to(0.5, {
              opacity: 0
            }).start();
            root.onPlayerDead();
            return true;
          }
          return false;
        };
        return Player;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/PowerUp.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc', './GameRoot.ts'], function (exports) {
  var _inheritsLoose, cclegacy, _decorator, Color, Node, UITransform, Graphics, Label, Component, GameRoot;
  return {
    setters: [function (module) {
      _inheritsLoose = module.inheritsLoose;
    }, function (module) {
      cclegacy = module.cclegacy;
      _decorator = module._decorator;
      Color = module.Color;
      Node = module.Node;
      UITransform = module.UITransform;
      Graphics = module.Graphics;
      Label = module.Label;
      Component = module.Component;
    }, function (module) {
      GameRoot = module.GameRoot;
    }],
    execute: function () {
      var _dec, _class;
      cclegacy._RF.push({}, "37a50npTAxAQr9EnMJOBjOo", "PowerUp", undefined);
      var ccclass = _decorator.ccclass;
      var KIND_DEFS = {
        magnet: {
          "char": '磁',
          color: new Color(103, 232, 249)
        },
        vacuum: {
          "char": '吸',
          color: new Color(167, 139, 250)
        },
        rage: {
          "char": '狂',
          color: new Color(244, 63, 94)
        },
        heal1: {
          "char": '愈',
          color: new Color(134, 239, 172)
        },
        heal3: {
          "char": '疗',
          color: new Color(16, 185, 129)
        },
        crit: {
          "char": '暴',
          color: new Color(255, 138, 61)
        },
        invinc: {
          "char": '无',
          color: new Color(255, 223, 128)
        },
        shield: {
          "char": '盾',
          color: new Color(148, 163, 184)
        },
        xp2: {
          "char": '倍',
          color: new Color(251, 191, 36)
        }
      };
      var FALL_SPEED = 95;

      /**
       * 随机道具：击毁敌机有概率掉落，随星空缓缓下坠
       * 触碰即生效：磁力 / 狂暴 / 医疗 / 护盾充能 / 双倍经验
       */
      var PowerUp = exports('PowerUp', (_dec = ccclass('PowerUp'), _dec(_class = /*#__PURE__*/function (_Component) {
        _inheritsLoose(PowerUp, _Component);
        function PowerUp() {
          var _this;
          for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }
          _this = _Component.call.apply(_Component, [this].concat(args)) || this;
          _this.kind = 'magnet';
          _this.spin = 0;
          return _this;
        }
        var _proto = PowerUp.prototype;
        _proto.init = function init(kind, x, y) {
          this.kind = kind;
          this.spin = Math.random() * Math.PI * 2;
          this.node.active = true;
          // 钳制在玩家可达范围内，避免掉在边缘外捡不到
          var reachX = GameRoot.I.halfSize.x - 40;
          if (x > reachX) {
            x = reachX;
          }
          if (x < -reachX) {
            x = -reachX;
          }
          this.node.setPosition(x, y, 0);

          // 绘制外观：旋转圆角方块 + 道具字
          if (!this.node.getChildByName('box')) {
            var _box = new Node('box');
            _box.addComponent(UITransform).setContentSize(40, 40);
            var _g = _box.addComponent(Graphics);
            _g.fillColor = new Color(15, 18, 32);
            _g.roundRect(-19, -19, 38, 38, 9);
            _g.fill();
            var label = new Node('char');
            label.addComponent(UITransform).setContentSize(40, 40);
            var l = label.addComponent(Label);
            l.fontSize = 26;
            l.lineHeight = 30;
            l.color = Color.WHITE;
            l.string = '';
            _box.addChild(label);
            this.node.addChild(_box);
          }
          var box = this.node.getChildByName('box');
          var g = box.getComponent(Graphics);
          var def = KIND_DEFS[this.kind];
          g.clear();
          g.strokeColor = def.color;
          g.lineWidth = 3;
          g.roundRect(-19, -19, 38, 38, 9);
          g.stroke();
          g.fillColor = new Color(def.color.r, def.color.g, def.color.b, 40);
          g.roundRect(-19, -19, 38, 38, 9);
          g.fill();
          box.getChildByName('char').getComponent(Label).string = def["char"];
        };
        _proto.update = function update(dt) {
          var root = GameRoot.I;
          if (root.state !== 'playing') return;
          var p = this.node.getPosition();
          var y = p.y - FALL_SPEED * dt;
          this.spin += 1.6 * dt;
          this.node.getChildByName('box').angle = Math.sin(this.spin) * 14;
          this.node.setPosition(p.x, y, 0);
          var half = root.halfSize;
          if (y < -half.y - 40) {
            root.recyclePowerUp(this);
            return;
          }

          // 拾取判定
          var pp = root.playerNode.getPosition();
          var dx = pp.x - p.x;
          var dy = pp.y - y;
          if (dx * dx + dy * dy < 46 * 46) {
            root.applyPowerUp(this.kind);
            root.recyclePowerUp(this);
          }
        };
        return PowerUp;
      }(Component)) || _class));
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/SoundFX.ts", ['./rollupPluginModLoBabelHelpers.js', 'cc'], function (exports) {
  var _createClass, cclegacy;
  return {
    setters: [function (module) {
      _createClass = module.createClass;
    }, function (module) {
      cclegacy = module.cclegacy;
    }],
    execute: function () {
      cclegacy._RF.push({}, "544caLgxqVGM6t5AmC45hAg", "SoundFX", undefined);
      /**
       * 程序合成音效（WebAudio）
       * 不依赖任何音频资源文件，全部实时合成
       * 浏览器自动播放策略：需在用户首次触摸后 resume
       */
      var SoundFX = exports('SoundFX', /*#__PURE__*/function () {
        function SoundFX() {
          this.ctx = null;
          this.master = null;
          this.noiseBuf = null;
          this.enabled = true;
        }
        var _proto = SoundFX.prototype;
        _proto.init = function init() {
          try {
            if (!this.ctx) {
              var AC = window.AudioContext || window.webkitAudioContext;
              if (!AC) {
                this.enabled = false;
                return;
              }
              this.ctx = new AC();
              this.master = this.ctx.createGain();
              this.master.gain.value = 0.45;
              this.master.connect(this.ctx.destination);

              // 预生成白噪声缓冲（爆炸用）
              var len = Math.floor(this.ctx.sampleRate * 0.5);
              this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
              var data = this.noiseBuf.getChannelData(0);
              for (var i = 0; i < len; i++) {
                data[i] = Math.random() * 2 - 1;
              }
            }
            if (this.ctx.state === 'suspended') {
              this.ctx.resume();
            }
          } catch (e) {
            this.enabled = false;
          }
        }

        /** 单音：频率从 start 滑到 end */;
        _proto.tone = function tone(start, end, dur, type, vol, delay) {
          if (delay === void 0) {
            delay = 0;
          }
          if (!this.enabled || !this.ctx || !this.master) return;
          var t = this.ctx.currentTime + delay;
          var osc = this.ctx.createOscillator();
          var g = this.ctx.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(Math.max(start, 1), t);
          osc.frequency.exponentialRampToValueAtTime(Math.max(end, 1), t + dur);
          g.gain.setValueAtTime(vol, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          osc.connect(g);
          g.connect(this.master);
          osc.start(t);
          osc.stop(t + dur + 0.02);
        };
        _proto.noise = function noise(dur, vol, cutoff) {
          if (!this.enabled || !this.ctx || !this.master || !this.noiseBuf) return;
          var t = this.ctx.currentTime;
          var src = this.ctx.createBufferSource();
          src.buffer = this.noiseBuf;
          var g = this.ctx.createGain();
          var f = this.ctx.createBiquadFilter();
          f.type = 'lowpass';
          f.frequency.value = cutoff;
          g.gain.setValueAtTime(vol, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + dur);
          src.connect(f);
          f.connect(g);
          g.connect(this.master);
          src.start(t);
          src.stop(t + dur);
        };
        _proto.shoot = function shoot() {
          this.tone(820, 320, 0.08, 'square', 0.045);
        };
        _proto.enemyShoot = function enemyShoot() {
          this.tone(300, 180, 0.1, 'sawtooth', 0.04);
        };
        _proto.boom = function boom(big) {
          if (big === void 0) {
            big = false;
          }
          this.noise(big ? 0.55 : 0.25, big ? 0.55 : 0.3, big ? 900 : 1500);
          this.tone(big ? 150 : 230, 40, big ? 0.45 : 0.2, 'sawtooth', big ? 0.25 : 0.12);
        };
        _proto.hurt = function hurt() {
          this.tone(190, 60, 0.25, 'square', 0.2);
        };
        _proto.shieldBreak = function shieldBreak() {
          this.tone(420, 90, 0.3, 'triangle', 0.25);
        };
        _proto.levelup = function levelup() {
          this.tone(523, 523, 0.09, 'square', 0.14);
          this.tone(659, 659, 0.09, 'square', 0.14, 0.09);
          this.tone(784, 784, 0.16, 'square', 0.14, 0.18);
        };
        _proto.bossAlarm = function bossAlarm() {
          this.tone(98, 98, 0.28, 'sawtooth', 0.3);
          this.tone(98, 98, 0.28, 'sawtooth', 0.3, 0.38);
        };
        _proto.pick = function pick() {
          this.tone(1150, 1550, 0.05, 'sine', 0.05);
        };
        _proto.missile = function missile() {
          this.tone(900, 240, 0.3, 'sawtooth', 0.07);
          this.noise(0.18, 0.06, 2200);
        };
        _proto.hit = function hit() {
          this.tone(520, 90, 0.12, 'sawtooth', 0.12);
        };
        _proto.power = function power() {
          this.tone(660, 660, 0.07, 'square', 0.12);
          this.tone(880, 880, 0.07, 'square', 0.12, 0.08);
          this.tone(1174, 1174, 0.12, 'square', 0.12, 0.16);
        };
        _createClass(SoundFX, null, [{
          key: "I",
          get: function get() {
            if (!SoundFX.inst) {
              SoundFX.inst = new SoundFX();
            }
            return SoundFX.inst;
          }
        }]);
        return SoundFX;
      }());
      SoundFX.inst = void 0;
      cclegacy._RF.pop();
    }
  };
});

System.register("chunks:///_virtual/Upgrades.ts", ['cc'], function (exports) {
  var cclegacy, Color;
  return {
    setters: [function (module) {
      cclegacy = module.cclegacy;
      Color = module.Color;
    }],
    execute: function () {
      exports({
        createBaseStats: createBaseStats,
        rollUpgrades: rollUpgrades
      });
      cclegacy._RF.push({}, "7ffb4kG0exN6Y0S6GSk7+xv", "Upgrades", undefined);

      /** 玩家属性 */

      function createBaseStats() {
        return {
          hp: 5,
          maxHp: 5,
          damage: 1,
          moveSpeed: 1,
          fireInterval: 0.3,
          bulletCount: 1,
          xpGain: 1,
          orbs: 0,
          missiles: 0,
          magnetRange: 150,
          critRate: 0.05,
          critMult: 2,
          shieldMax: 0,
          shield: 0,
          shieldTimer: 0
        };
      }
      function hex(c) {
        var col = new Color();
        col.fromHEX(c);
        return col;
      }

      /** 一条升级选项 */

      var UPGRADES = exports('UPGRADES', [{
        id: 'attack',
        name: '攻击力 +1',
        desc: '每颗子弹伤害 +1',
        "char": '攻',
        color: hex('#e05555'),
        weight: 10,
        apply: function apply(s) {
          s.damage += 1;
        }
      }, {
        id: 'speed',
        name: '移动速度 +15%',
        desc: '移动更灵活，方便走位躲弹',
        "char": '速',
        color: hex('#4fc3f7'),
        weight: 10,
        canOffer: function canOffer(s) {
          return s.moveSpeed < 2;
        },
        apply: function apply(s) {
          s.moveSpeed += 0.15;
        }
      }, {
        id: 'hp',
        name: '生命上限 +1',
        desc: '上限 +1，并回复 2 点生命',
        "char": '命',
        color: hex('#66bb6a'),
        weight: 10,
        apply: function apply(s) {
          s.maxHp += 1;
          s.hp = Math.min(s.maxHp, s.hp + 2);
        }
      }, {
        id: 'fireRate',
        name: '射速提升',
        desc: '攻击间隔缩短 12%',
        "char": '射',
        color: hex('#ffca28'),
        weight: 8,
        apply: function apply(s) {
          s.fireInterval = Math.max(0.1, s.fireInterval * 0.88);
        }
      }, {
        id: 'multi',
        name: '多重射击',
        desc: '同时多发出一颗子弹',
        "char": '弹',
        color: hex('#ab47bc'),
        weight: 5,
        canOffer: function canOffer(s) {
          return s.bulletCount < 5;
        },
        apply: function apply(s) {
          s.bulletCount += 1;
        }
      }, {
        id: 'heal',
        name: '恢复药剂',
        desc: '立即回复 3 点生命',
        "char": '回',
        color: hex('#26a69a'),
        weight: 8,
        canOffer: function canOffer(s) {
          return s.hp < s.maxHp;
        },
        apply: function apply(s) {
          s.hp = Math.min(s.maxHp, s.hp + 3);
        }
      }, {
        id: 'xpGain',
        name: '经验加持',
        desc: '获得经验 +25%',
        "char": '验',
        color: hex('#7e57c2'),
        weight: 6,
        canOffer: function canOffer(s) {
          return s.xpGain < 2.5;
        },
        apply: function apply(s) {
          s.xpGain += 0.25;
        }
      }, {
        id: 'orbit',
        name: '环绕电球 +1',
        desc: '电球绕身旋转，撞击敌人',
        "char": '球',
        color: hex('#67e8f9'),
        weight: 7,
        canOffer: function canOffer(s) {
          return s.orbs < 4;
        },
        apply: function apply(s) {
          s.orbs += 1;
        }
      }, {
        id: 'missile',
        name: '跟踪导弹 +1',
        desc: '每 2.4 秒自动锁定敌机发射',
        "char": '导',
        color: hex('#fb923c'),
        weight: 8,
        canOffer: function canOffer(s) {
          return s.missiles < 4;
        },
        apply: function apply(s) {
          s.missiles += 1;
        }
      }, {
        id: 'magnetRange',
        name: '磁场强化',
        desc: '能量吸附范围 +80',
        "char": '场',
        color: hex('#22d3ee'),
        weight: 8,
        canOffer: function canOffer(s) {
          return s.magnetRange < 550;
        },
        apply: function apply(s) {
          s.magnetRange += 80;
        }
      }, {
        id: 'crit',
        name: '暴击率 +8%',
        desc: '暴击造成 2 倍伤害',
        "char": '暴',
        color: hex('#ff7043'),
        weight: 8,
        canOffer: function canOffer(s) {
          return s.critRate < 0.5;
        },
        apply: function apply(s) {
          s.critRate = Math.min(0.5, s.critRate + 0.08);
        }
      }, {
        id: 'shield',
        name: '能量护盾',
        desc: '抵挡一次伤害，12 秒充能',
        "char": '盾',
        color: hex('#94a3b8'),
        weight: 7,
        canOffer: function canOffer(s) {
          return s.shieldMax < 1;
        },
        apply: function apply(s) {
          s.shieldMax = 1;
          s.shield = 1;
        }
      }]);

      /** 加权随机抽出三个不重复的升级选项 */
      function rollUpgrades(stats) {
        var available = UPGRADES.filter(function (u) {
          return !u.canOffer || u.canOffer(stats);
        });
        var picked = [];
        var bag = available.slice();
        while (picked.length < 3 && bag.length > 0) {
          var total = bag.reduce(function (sum, u) {
            return sum + u.weight;
          }, 0);
          var roll = Math.random() * total;
          for (var i = 0; i < bag.length; i++) {
            roll -= bag[i].weight;
            if (roll <= 0) {
              picked.push(bag.splice(i, 1)[0]);
              break;
            }
          }
        }
        return picked;
      }
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