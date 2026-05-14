# AI API 多预设设计

日期：2026-05-14

## 目标

把 AI API 设置从“只能保存一份当前配置”升级为“可保存多个命名预设并快速切换”。

## 交互

1. 第一项为“配置预设”下拉框。
2. 系统内置一个不可删除的“默认预设”。
3. 支持新建、重命名、删除自定义预设。
4. 第二项为“供应商”下拉框，负责填充供应商模板。
5. 第三部分为 API Key、API 地址、模型名称等具体字段。
6. 切换预设时立即切换当前生效配置。
7. 保存时继续执行“保存并测试连接”。

## 数据结构

- `lumostime_ai_presets`: `AIPreset[]`
- `lumostime_ai_current_preset`: 当前预设 id
- 保留 `lumostime_ai_config` 作为当前生效配置镜像，兼容现有调用层

`AIPreset` 结构：

```ts
interface AIPreset {
  id: string;
  name: string;
  config: AIConfig;
}
```

## 迁移

首次读取新结构时：

1. 如果已有 `lumostime_ai_presets`，直接使用。
2. 否则从旧的 `lumostime_ai_config` 生成“默认预设”。
3. 如果旧的 `lumostime_ai_profiles` 里有额外 provider 草稿，则一并迁移成附加预设。

## 范围

本次只做本地预设管理，不包含：

- 云同步
- 导入导出
- 预设排序
- 更复杂的供应商参数面板
