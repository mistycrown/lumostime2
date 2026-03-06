# 自定义时间小友设计文档（本地存储版）

日期：2026-03-05  
状态：已确认方向（待实施）

## 1. 背景与目标

当前“时间小友”仅支持预设角色，图片来源固定为 `public/time_pal_origin/{type}/{stage}`。  
本次新增“自定义时间小友”能力，允许用户上传 5 张 1:1 PNG 作为 5 个阶段形象，并在“时间小友”选项中选择使用。

用户已明确约束：

1. 自定义时间小友仅本地可用。
2. 自定义时间小友图片不参加云同步。
3. 在界面中加入明确提示：`自定义的时间小友不参加云同步`。

## 2. 范围定义

## 包含

1. 新增“添加自定义时间小友”模态框。
2. 支持输入名称 + 上传 5 张 1:1 PNG。
3. 本地持久化存储（元数据 + 5 张图片）。
4. 自定义项出现在“时间小友”可选列表中，可被选中并渲染到卡片。
5. 提示文案：`自定义的时间小友不参加云同步`。

## 不包含

1. 云同步上传/下载自定义时间小友。
2. 将自定义时间小友写入现有云端图片列表。
3. 多端共享与冲突处理。

## 3. 方案选型与结论

## 候选方案

1. `localStorage + dataURL`  
实现快，但 5 张 PNG 体积不可控，易逼近浏览器 localStorage 上限。

2. `imageService + 本地元数据`（采用）  
图片二进制交给 `imageService` 存储，元数据写 localStorage。容量与稳定性更好，并可显式绕过同步链路。

## 结论

采用方案 2：  
`图片文件本地化持久化 + 元数据本地化持久化 + 不进入同步引用列表`。

## 4. 数据结构设计

## 4.1 新增存储键

在 `TIMEPAL_KEYS` 下新增：

1. `CUSTOM_ITEMS`: 自定义时间小友元数据列表（JSON）。

示例键名建议：

1. `lumostime_timepal_custom_items`

## 4.2 自定义项结构

```ts
interface CustomTimePalItem {
  id: string;                    // 如 custom_tp_1741171200000_x8k3v2
  name: string;                  // 用户输入名称
  stageFilenames: [string, string, string, string, string]; // 5 个阶段文件名
  createdAt: number;
  updatedAt: number;
}
```

## 4.3 当前选中值兼容

`TIMEPAL_KEYS.TYPE` 继续沿用 string：

1. 预设：`cat` / `rabbit` / ...
2. 不使用：`none`
3. 自定义：`custom:<id>`

这样无需大幅修改 `ThemePreset.timePal` 的类型定义（已是 `string`）。

## 5. 存储与不参与同步策略

## 5.1 图片保存

新增 `timePalCustomService`（建议）负责：

1. 校验图片（格式、比例、数量）。
2. 为每个阶段生成稳定文件名（`timepal_custom_${id}_${stage}.png`）。
3. 调用 `imageService.writeImage(filename, file)` 保存图片。

## 5.2 禁止进入云同步

关键约束：不调用 `imageService.saveImage`，因为该方法会加入引用列表并触发同步链路。  
只调用 `writeImage`，且不写入 `REFERENCED_IMAGES_KEY`，即可天然避免上传。

## 5.3 删除策略

删除自定义项时执行本地清理：

1. 删除元数据记录。
2. 本地删除 5 张图片文件（仅本地删除，不记录云端删除 tombstone）。

必要时在 `imageService` 增补“仅本地删除”方法，避免误触同步删除记录。

## 6. 交互与UI设计

## 6.1 新增入口

在 `TimePalSettings` 的网格中新增“+ 自定义”卡片按钮，点击打开模态框。

## 6.2 模态框字段

1. 时间小友名称（必填，长度建议 1-20）。
2. 阶段 1~5 图片上传位（每个必填）。
3. 每个上传位显示预览图与“重新选择”。

## 6.3 校验规则

1. 文件类型必须是 `image/png`。
2. 图片尺寸必须 `1:1`（允许微小误差阈值，例如 1%）。
3. 必须正好 5 张。
4. 建议单图大小限制 2MB（可调）。

## 6.4 文案提示（按用户要求）

在模态框底部和设置区域展示信息提示：

`自定义的时间小友不参加云同步`

## 6.5 保存成功行为

1. 关闭模态框。
2. Toast 成功提示。
3. 刷新“时间小友”候选列表。
4. 自动选中新创建项。

## 7. 渲染链路改造

## 7.1 选项来源合并

`TimePalSettings` 与 `PresetEditModal` 的时间小友来源改为：

1. `TIMEPAL_OPTIONS`（预设）
2. `customTimePalItems`（自定义）

## 7.2 图片加载逻辑

`useTimePalImage` 扩展为支持两类来源：

1. 预设：沿用 `/time_pal_origin/...`
2. 自定义：按 `custom:<id>` 解析，读取对应阶段 filename，再调用 `imageService.getImageUrl(filename)`。

## 7.3 点击切换行为

`TimePalCard` 当前循环仅预设类型，需改为“预设 + 自定义”全集，保证点击切换可覆盖自定义项。

## 8. 与主题方案兼容

`ThemePreset.timePal` 当前为 `string`，可直接存 `custom:<id>`。  
应用主题时 `ThemePresetService.applyTimePal` 不需要改签名，只需确保下游可解析自定义标识。

## 9. 错误处理

1. 上传文件不合法：阻止提交并提示具体原因（格式/比例/数量）。
2. 本地写入失败：提示“保存失败，请重试”，并中止入库。
3. 部分阶段写入失败：执行回滚清理已写入文件。
4. 读取图片失败：列表显示占位，卡片使用 emoji 降级。

## 10. 测试与验收

## 功能验收

1. 成功创建：名称 + 5 张 1:1 PNG 可创建并可选中。
2. 渲染正确：不同专注等级显示对应阶段图。
3. 重启保留：重启后自定义项和选中态仍可读取。
4. 删除清理：删除后列表消失，图片本地文件清理。
5. 提示可见：界面可见 `自定义的时间小友不参加云同步`。

## 回归检查

1. 预设小友渲染不受影响。
2. ThemePreset 保存/应用不报错。
3. 手动/自动云同步流程不包含自定义小友图片。

## 11. 实施分阶段

## Phase A（本次）

1. `timePalCustomService`（元数据 CRUD + 文件保存/读取）。
2. `TimePalSettings` 新增“自定义”入口与模态框。
3. `useTimePalImage` 与 `TimePalCard` 支持 `custom:<id>`。
4. `PresetEditModal` 支持选择自定义时间小友。
5. 增加本地不参与同步提示文案。

## Phase B（可选未来）

1. 增加自定义时间小友导出/导入（仍不走云同步）。
2. 增加编辑自定义项（替换单阶段图片、改名）。

