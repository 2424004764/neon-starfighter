# Neon Starfighter · 霓虹星际战机

![Cocos Creator](https://img.shields.io/badge/Cocos%20Creator-3.8.8-blue)
![License](https://img.shields.io/badge/license-MIT-green)

一款纯代码绘制的**霓虹几何风肉鸽弹幕生存游戏**。零图片、零音频文件——所有视觉由 Graphics 实时绘制，所有音效由 WebAudio 实时合成。

基于 **Cocos Creator 3.8.8**（TypeScript）开发，可发布为 Web / 微信小游戏 / 原生应用。

## 🎮 立即游玩

**在线版（GitHub Pages）**：<https://2424004764.github.io/neon-starfighter/build/web-mobile/>

**本地版**：双击 `启动游戏.bat`（或 `node serve-game.js 7457` 后访问 `http://localhost:7457`）

| 按键 | 功能 |
| --- | --- |
| 空格 / 回车（开始界面） | 开始新游戏 |
| WASD / 方向键 / 按住拖动 | 移动 |
| 空格 / Esc | 暂停（含全属性面板）/ 继续 |
| W / S | 升级三选一上下切换 |
| 空格 / 回车 | 确认升级 |
| V | 切换战机皮肤（霓虹箭形 ⇄ 经典螺旋桨战机） |

## ✨ 玩法特性

- **开局界面**：标题页点击「开始新游戏」才正式开局，背景宇宙持续流动
- **6 种敌机 AI**：猎手（追踪）· 巡卫（悬停狙击）· 突袭者（直线冲锋）· 分裂体（死亡裂成两只小猎手）· 精英猎手 · **典狱官 Boss**（45 秒登场，螺旋双臂弹幕，血量随时间超线性成长）
- **升级三选一（12 种强化）**：攻击力 / 移速（+15% 百分比成长）/ 生命 / 射速 / 多重射击 / 恢复 / 经验加持 / 环绕电球 / **跟踪导弹** / **磁场强化** / **暴击率**
- **9 种随机掉落道具**：吸附（全屏收能量）· 磁力 · 疾走 · 愈/疗（回血）· **暴（永久暴击率+10%）** · **无（5 秒完全无敌）** · 盾 · 双倍经验
- **暴击系统**：初始 5% 暴击率，暴击 2 倍伤害，命中弹出伤害数字
- **动态宇宙背景**：三层视差星空（各自闪烁）+ 六团星云（漂移/呼吸/明暗）+ 随机流星（速度随机）
- **完整成长反馈**：血条/经验条/攻击力/道具状态栏（剩余时间条）/ Boss 血条 / 暂停属性总结页

## 🛠 技术要点

- **零资源依赖**：所有实体、HUD、弹窗均运行时代码生成；音效由振荡器 + 噪声实时合成
- **对象池**：子弹 / 导弹 / 敌机 / 宝石 / 道具全池化，长时间游玩无 GC 卡顿
- **状态机驱动**：`menu / playing / paused / levelup / gameover` 五态，升级与暂停时世界冻结、背景依旧流动
- **SHOW_ALL 固定画幅**：任意窗口尺寸下游戏区域严格居中，世界层矩形遮罩裁剪

## 📦 目录结构

```
├── assets/
│   ├── scripts/          # 全部游戏逻辑（TypeScript）
│   │   ├── GameRoot.ts   #   主控：状态机/刷怪/碰撞/对象池
│   │   ├── Player.ts     #   玩家：移动/射击/电球/护盾/双皮肤
│   │   ├── Enemy.ts      #   敌机：6 种行为 + Boss 弹幕
│   │   ├── Missile.ts    #   跟踪导弹（自动索敌+转向）
│   │   ├── Bullet.ts     #   子弹（敌我双形态）
│   │   ├── Gem.ts        #   经验宝石（下坠/磁吸）
│   │   ├── PowerUp.ts    #   随机道具（8 种）
│   │   ├── SoundFX.ts    #   WebAudio 程序合成音效
│   │   ├── Hud.ts        #   HUD 与道具状态栏
│   │   ├── Overlays.ts   #   升级三选一/暂停属性页/结算
│   │   └── Upgrades.ts   #   升级选项配置与加权随机
│   └── main.scene
├── build/web-mobile/     # 可直接部署的网页版成品
├── serve-game.js         # 零依赖静态服务器
└── 启动游戏.bat           # Windows 一键启动
```

## 🚀 本地开发

1. 安装 [Cocos Dashboard](https://www.cocos.com/creator-download) 并通过其安装 Cocos Creator **3.8.8**
2. 用 Dashboard 打开本项目文件夹
3. 编辑器顶部 ▶ 预览；或直接双击 `启动游戏.bat` 运行已构建的网页版

修改 `assets/scripts/` 下任意代码后，在编辑器中重新构建（项目 → 构建发布 → web-mobile）即可。

## 🌐 GitHub Pages 部署

本仓库已开启 GitHub Pages，**每次推送到 `main` 分支后约 1 分钟自动发布**，无需手动操作。

### 当前配置

- **Settings → Pages → Build and deployment**
  - Source：`Deploy from a branch`
  - Branch：`main`，目录：`/build/web-mobile`
- 在线地址：<https://2424004764.github.io/neon-starfighter/build/web-mobile/>

### 日常发布流程（改了代码想更新线上版）

1. 本地重新构建：编辑器中 **项目 → 构建发布 → web-mobile**（或命令行
   `CocosCreator.exe --project <项目路径> --build "platform=web-mobile;debug=true;buildPath=build"`）
2. 提交并推送：

   ```bash
   git add -A
   git commit -m "update: 说明你的改动"
   git push
   ```

3. 等待约 1 分钟，Pages 自动重新发布，刷新页面即可玩到新版

### 注意事项

- 仓库根目录与 `build/web-mobile/` 内的 **`.nojekyll`** 空文件**必须保留**：
  GitHub Pages 默认用 Jekyll 处理站点，会跳过所有 `_` 下划线开头的文件，
  导致引擎的 `_virtual_cc-*.js` 报 404、页面黑屏。`.nojekyll` 用于禁用该处理。
- `build-templates/web-mobile/.nojekyll` 是 Cocos 构建模板，保证每次构建自动补回该文件。
- 手机浏览器如果打开黑屏：多为缓存了旧版本，用无痕模式打开或清除缓存重试；
  首次加载约 1.1 MB，请等待进度条完成。

## 📄 License

MIT

