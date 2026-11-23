# 简体中文（zh-CHS）翻译术语表与规范

适用于 `app_zh-CHS.po`：设备原生 UI（C3 大屏 / C4 小屏）、驾驶警报与 Galaxy 共用同一份目录。
新增或修改译文时先查本表；表中没有的术语，按“简洁、大陆汽车行业常用说法”的原则翻译，并补充到本表。

## 一、格式硬性要求

1. **占位符原样保留**：`{}`、`{0}`、`{name}`、`{:.1f}`、`%n`、`%1` 等必须一个不少、一个不多；
   无名的 `{}` 按位置填值，**不得调换它们的先后顺序**（中文语序需要时改写句子而不是挪动 `{}`）。
2. **首尾空白、换行符（`\n`）数量、` · ` 分隔符**必须与英文一致。运行时会按换行和 ` · ` 切段逐段翻译。
3. HTML 标签、URL、文件名、参数键名（如 `LanguageSetting`）、代码标识符不翻译。
4. 全大写英文（`DOWNLOAD`、`TAKE CONTROL IMMEDIATELY`）按正常中文翻译，不需要表达“大写”。
5. 中文与英文/数字之间加半角空格（`启用 ADB`、`1 年`、`70 mph 以上`）；中文句子用全角标点（，。：？！（）“”）；
   省略号保留 `…`。

## 二、长度与语气

- C4 屏幕仅 536×240 像素，一个汉字约占两个拉丁字母宽。**按钮/标题/选项尽量 2–6 个字**，不超过英文的显示宽度。
- 描述性句子去掉冗余主语（“您”“该功能”），用短句；不要加英文原文没有的信息。
- 必须出现人称时统一用“您”，不用“你”（与上游已有译文一致）。
- 警报文案简短有力（`请立即接管控制`）。
- 诊断/开发者文案照实翻译，保留 EGL、mask 等技术词。

## 三、保留英文（不翻译）

StarPilot、openpilot、comma、comma 3 / 3X / four、Galaxy、StarPort、JetLink、Chestnut、Arabesque、Firestar、
Firestar Link、Polaris 等模型名、Discord、Mapbox、Google Maps、Spotify、Android Auto、panda、SDSU、ZSS；
车企与车型名 Toyota、Subaru、Tesla、Ford、GM、Hyundai、Kia、Volt、Bolt 等（与车型选择列表一致）；
技术缩写 ACC、AEB、LKAS、BSM、ADB、SSH、GPS、LTE、Wi‑Fi、CAN、HUD、UI、EGL；
功能缩写 AOL、SLC、CEM、FLM、V-ASM、PiP；单位 mph、km/h、m/s²、°、%。
（Bluetooth 译为“蓝牙”。）

## 四、术语对照

| 英文 | 中文 | 备注 |
| --- | --- | --- |
| Always On Lateral (AOL) | 全时横向控制（AOL） | 短标签可只写 AOL |
| Speed Limit Controller (SLC) | 限速控制器（SLC） | |
| Speed limit / offset | 限速 / 限速偏移 | |
| Curve Speed Controller | 弯道速度控制器 | Curve(s) → 弯道 |
| Conditional Experimental Mode (CEM) | 条件实验模式（CEM） | Conditional Driving Modes → 条件驾驶模式 |
| Experimental Mode | 实验模式 | 沿用上游 |
| Chill Mode / Conditional Chill | 安稳模式 / 条件安稳模式 | 沿用上游 |
| Driving Personality | 驾驶风格 | 沿用上游 |
| Relaxed / Standard / Aggressive | 从容 / 标准 / 激进 | 驾驶风格选项，沿用上游 |
| Comfort / Normal / Sport / Sport+ / Eco | 舒适 / 普通 / 运动 / 运动+ / 经济 | 加速曲线、驾驶模式 |
| Driving Profiles / Custom Driving Profiles | 驾驶配置 / 自定义驾驶配置 | |
| Selected Profile / Use global preset | 所选配置 / 使用全局预设 | Preset → 预设 |
| Traffic Mode | 拥堵模式 | |
| Lane Centering | 车道居中 | |
| Enhanced Stops | 增强停车 | |
| Quick Select | 快捷选择 | |
| Driving Model / Model Manager / Model Laboratory | 驾驶模型 / 模型管理器 / 模型实验室 | |
| Sentry Mode | 哨兵模式 | |
| Picture-in-picture (PiP) | 画中画（PiP） | 短标签写 PiP |
| Replay | 回放 | |
| Bookmark / Favorites | 书签 / 收藏 | |
| Drive / Drive History | 行程 / 行驶记录 | |
| Lead / lead vehicle | 前车 | |
| Following time / distance | 跟车时距 / 跟车距离 | |
| Jerk | 急动度 | |
| Set speed / Max speed | 设定速度 / 最高速度 | |
| Cruise / Adaptive Cruise / cruise main | 巡航 / 自适应巡航 / 巡航主开关 | |
| Stock (factory) | 原厂 | Stock ACC → 原厂 ACC |
| Engage / Engaged / Disengage | 启用 / 已启用 / 脱离 | 指 openpilot 控制状态，沿用上游 |
| Lateral / Longitudinal | 横向 / 纵向 | Alpha Longitudinal → Alpha 纵向控制 |
| Steering / Torque | 转向 / 扭矩 | Torque bar → 扭矩条 |
| Steering wheel / Wheel Controls | 方向盘 / 方向盘按键 | |
| Paddle | 拨片 | |
| Distance button / Star button | 距离键 / 星标键 | 方向盘按键 |
| Accelerator / gas / brake | 加速踏板 / 油门 / 刹车 | 句中自然选用 |
| Regen | 动能回收 | |
| Stop/Start | 自动启停 | |
| Park / Neutral（挡位） | P 挡 / 空挡 | Parked → 驻车时；Parking Brake → 驻车制动 |
| Ignition | 点火 | Turn off the ignition → 关闭点火开关 |
| Onroad / Offroad | 行驶状态 / 停车状态 | while offroad → 停车时；Force Offroad → 强制停车状态 |
| Calibration | 校准 | |
| Driver monitoring | 驾驶员监控 | |
| Blind spot | 盲区 | spot monitoring → 盲区监测 |
| Lane change / nudge / turn signal | 变道 / 轻推方向盘 / 转向灯 | |
| Stop sign / traffic light | 停车标志 / 红绿灯 | |
| Alert / chime | 警报 / 提示音 | |
| Widget / Layout | 组件 / 布局 | |
| Toggles（设置分类） | 功能开关 | |
| Home / Settings / Device / Software / Network | 主页 / 设置 / 设备 / 软件 / 网络 | |
| Appearance / Display / Sounds & Alerts | 外观 / 显示 / 声音与警报 | |
| Vehicle / Driving Controls / Navigation / Maps | 车辆 / 驾驶控制 / 导航 / 地图 | |
| Update / Branch / Reboot / Power Off | 更新 / 分支 / 重启 / 关机 | 沿用上游 |
| Tune / tuning | 调校 | |
| Weather | 天气 | |
| Save / Saved / Unsaved changes | 保存 / 已保存 / 未保存的更改 | |
| Unavailable / Unsupported | 不可用 / 不支持 | |

## 五、补充术语（原生 UI 翻译时确定）

| 英文 | 中文 | 备注 |
| --- | --- | --- |
| Longitudinal / Lateral Maneuver Mode | 纵向操作模式 / 横向操作模式 | 沿用上游“纵向操作模式” |
| Excessive Actuation | 过度作动 | 沿用上游 |
| Camera / Cabin Camera / Road camera | 摄像头 / 车内摄像头 / 道路摄像头 | 不用“相机” |
| Segment | 片段 | |
| Forget（蓝牙/配对设备） | 忽略 | Wi‑Fi 沿用上游“忘记” |
| Unpair | 取消配对 | |
| Safe Mode | 安全模式 | |
| Stock Controller / Controller | 原厂控制器 / 控制器 | |
| StarPilot Default / Vehicle Default | StarPilot 默认 / 车辆默认值 | |
| Far / Medium / Close（跟车距离档） | 远 / 中 / 近 | Legacy → 旧版 |
| Short / long / very long press | 短按 / 长按 / 超长按 | |
| Stop-and-Go Assistance | 跟停辅助 | |
| Automatic Brake Hold (AVH) | 自动刹车保持（AVH） | |
| Grade Compensation | 坡度补偿 | |
| Pedal Speed Control | 踏板速度控制 | |
| Software Cruise Control | 软件巡航控制 | |
| Turn Assist / Turn Signal Guidance | 转弯辅助 / 转向灯引导 | |
| Close lane-change gap | 缩小变道间距 | |
| Turn-by-turn | 逐向导航 | |
| Offset policy / Band | 偏移策略 / 区段 | |
| Adopt（限速） | 采用 | |
| Sound Pack | 音效包 | |
| Lateral acceleration / Friction / Steering ratio | 横向加速度 / 摩擦 / 转向比 | |
| Torque profile | 扭矩配置 | |
| Parked Power / Maximum Parked Time | 驻车电源 / 最长驻车时间 | |
| Low-Voltage Cutoff | 低电压切断 | |
| Dashcam mode | 行车记录仪模式 | |
| Joystick Mode | 摇杆模式 | |
| Model catalog / Model randomizer | 模型目录 / 模型随机器 | |
| Pulse and Glide / Force Coasting | 脉冲滑行 / 强制滑行 | |
| Arming / Armed | 布防中 / 已布防 | 哨兵模式 |
| Vitals | 状态 | |
| Long Planner | 纵向规划器 | |
| Switchback Mode | Switchback 模式 | 专有模式名 |

## 六、补充术语（Galaxy 翻译时确定）

Galaxy 网页按 DOM 文本节点逐段翻译，被标签切开的句子碎片会按英文顺序拼接显示：翻译碎片时要先在源码里看清前后文，
保证拼起来中文通顺。键盘按键名（Enter、Tab、End）、语言名 English 与 App 保留英文。

| 英文 | 中文 | 备注 |
| --- | --- | --- |
| Episode（FLM 学习） | 过程 | Comparable episodes → 可比过程 |
| Footage | 录像 | Dashcam footage → 行车录像 |
| Routes / Reroute / Alternative routes | 路线 / 重新规划 / 备选路线 | |
| Avoid tolls | 避开收费路段 | |
| Directions / Route guidance | 路线指引 / 路线引导 | |
| Tiles / allowance | 图块 / 额度 | 地图下载 |
| Geocoding | 地址解析 | |
| Metric / Imperial | 公制 / 英制 | |
| Standby | 待机 | |
| Action Buttons / Learn Button | 操作按键 / 学习按键 | |
| Model pair / Compose a pair | 模型对 / 组合模型对 | 模型实验室 |
| Include in Randomizer | 纳入随机器 | |
| Telemetry / Actuator | 遥测 / 执行器 | |
| Access token / certificate | 访问令牌 / 证书 | |
| Reverse proxy / Push relay / Browser push | 反向代理 / 推送中继 / 浏览器推送 | |
| Stable / Development（分支） | 稳定版 / 开发版 | |
| Sentry event / Sentry notifications | 哨兵事件 / 哨兵通知 | |
| Projection / Wireless adapter / Wired AA | 投屏 / 无线适配器 / 有线 AA | StarPort |
| Force Stop | 强制停止 | 区别于“强制停车状态” |
| Uptime / Process / Zombie | 运行时间 / 进程 / 僵尸进程 | System Monitor |
| admit / admitted（panda 安全） | 放行 / 已放行 | |
| Headunit、Soloist、APKMirror、APKPure | 保留英文 | 产品名 |
