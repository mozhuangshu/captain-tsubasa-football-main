# 架构与素材开发

## 从入口找到代码

1. `index.html` 和 `src/entry.js` 处理加载提示、设备选择和桌面启动。
2. `src/main.js` 管理桌面会话；`src/mobile-entry.js`、`src/mobile-main.js` 启动掌机布局。开发时手机加载源码，构建时改用生成的 bundle。
3. `engine/src/app-runtime.js` 的 `RecoveredApp` 驱动状态机、输入采样、原生帧推进、绘制和声音。游戏状态使用 `Uint8Array`；各模块提供具名语义函数，不在浏览器执行 ROM 或 CPU 指令。
4. `src/controls.js` 管理桌面键位和手柄；`engine/src/platform/touch-controls.js` 处理触控输入。
5. `engine/src/tsubasa-runtime.js` 接入人物与画面呈现；`src/head-warmup.js` 将头部缓存预热交给 Worker。

## 进度与玩法

- `src/session.js`：新会话的单人/双人模式初始化。
- `src/league-save.js`：本地存档校验、检查点、覆盖保护和恢复。不应在这里保存逐帧比赛状态。
- `engine/src/league.js` / `league-flow.js`：联赛计分、交锋次数、密码、对手选择与杯赛。
- `engine/src/tsubasa-league-story.js`：当前联赛中的剧情展示；不要将剧情顺序重新变成选队限制。
- `engine/data/tsubasa-team-data.js`：球队和人物定义；`engine/src/tsubasa-teams.js` 提供运行时身份与队服映射。

存档格式升级需要兼容或迁移策略，不能为了素材更新改键名、清空存档。开发服务器端口变化会改变浏览器来源，因此看不到另一个端口的存档属于正常隔离。

## 美术数据

当前运行数据即本仓库的素材编辑入口，不依赖私人生成目录或外部图像服务。

- `engine/art/canonical-heads.js` / `head-blocks.js`：头像像素与调色板。
- `engine/art/hd-runtime.js`：比赛人物的像素行和帧引用。构建阶段使用 `scripts/compact-hd-runtime.mjs` 做无损编码，并逐字段比较结果。
- `engine/art/celebration-data.js`：一套共享的六帧身体、49 组头部及角色别名；`celebration.js` 按身份与球衣组合，合成缓存有上限。
- `engine/art/screen-art.js`：标题、观众等屏幕像素。
- `engine/assets/story/portraits/`：剧情肖像。

只修改庆祝时，不要顺手重绘赛场动作或底栏头像。编辑庆祝像素后，运行相关像素测试和桌面/手机浏览器测试；确认画面后再有意更新 `tests/shared-celebration.test.mjs` 中的基准哈希。不要自动更新基准来掩盖失败。

原始生成图、提示词、历史素材、实验页面和旧发布包不属于这个仓库的构建输入。若新增编辑工具，必须把必要输入纳入仓库或文档化，不能依赖个人磁盘路径。

## 测试与性能

`npm test` 运行 Node 测试，Canvas 测试使用 npm 安装的 @napi-rs/canvas 和仓库字体。`npm run test:browser` 会先将测试场景源码临时编译到 `test-results/fixtures/`，再运行 Playwright；测试夹具不会进入发布目录。

回归关注：双方球队与身份、进球计分、庆祝后返回比赛、胜负平结算、存档不重复计分、手机多指输入、暂停清键，以及脚本/Worker/存储被拒绝时的降级。

不要在比赛渲染循环中写 localStorage、读回整个 Canvas、创建大量临时图片或无界缓存。浏览器测试不能替代实体手机长时间运行；修改动画、天气或缓存后应补充真机验收。

## 构建边界

构建只读取本仓库的 `index.html`、`src/`、`engine/`、`mobile/`，输出到 `dist/`。`dist/` 中的内容指纹脚本和手机 bundle 可随时重建，不要提交。构建不会改写源码目录中的手机 `game.js`，也不访问外部项目。
