# Twemoji 集成功能

## 功能说明

Twemoji 是 Twitter 开发的开源 emoji 图标库，提供统一美观的 emoji 显示效果。

## 使用方法

### 1. 开启 Twemoji

1. 进入应用的"设置"页面
2. 点击"偏好设置"
3. 找到"使用 Twemoji"开关
4. 开启后，所有 emoji 将自动替换为 Twitter 风格的图标

### 2. 效果对比

- **关闭时**：使用系统原生 emoji（不同设备显示效果可能不同）
- **开启时**：使用 Twemoji 图标（所有设备显示效果统一）

### 3. 适用范围

Twemoji 会自动应用到所有使用 `IconRenderer` 组件的地方：
- 所有分类和活动的 emoji 图标
- Reaction 表情选择器和列表
- 待办事项的 emoji 图标
- 领域（Scope）的 emoji 图标
- 回顾模板的 emoji 图标
- 所有其他使用 emoji 的地方

### 4. 与自定义主题的关系

渲染逻辑优先级：
1. **自定义主题优先**：如果启用了自定义 UI 主题，显示 UI Icon 图片
2. **Twemoji 次之**：如果没有自定义主题但开启了 Twemoji，显示 Twitter emoji
3. **原生 emoji 兜底**：如果都没开启，显示系统原生 emoji

## 技术实现

### 核心组件

所有 emoji 渲染都通过 `IconRenderer` 组件统一处理：

```tsx
<IconRenderer icon="❤️" className="text-lg" />
```

### 渲染逻辑

```typescript
// 1. 判断是否使用自定义主题的 UI Icon
if (isUIIcon && currentTheme !== 'default' && !imageError) {
    // 渲染 UI Icon 图片
    return <img src={iconPath} />;
}

// 2. 渲染 Emoji
if (useTwemoji) {
    // 使用 Twemoji 转换
    twemoji.parse(element);
} else {
    // 显示原生 emoji
}
```

### 配置

在 `SettingsContext` 中：
- 状态：`useTwemoji: boolean`
- 默认值：`false`
- 存储：`localStorage.lumostime_use_twemoji`

### CDN 资源

使用 jsDelivr CDN 加载 Twemoji 资源：
```
https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/
```

## 注意事项

1. **网络依赖**：Twemoji 图标从 CDN 加载，需要网络连接
2. **首次加载**：第一次使用时可能需要加载资源，会有短暂延迟
3. **缓存**：浏览器会缓存图标，后续使用会更快
4. **自动应用**：无需修改任何代码，所有使用 `IconRenderer` 的地方都会自动生效

## 未来计划

- [ ] 支持离线使用（打包 Twemoji 资源）
- [ ] 添加更多 emoji 选择
- [ ] 心情日历集成
- [ ] 自定义 emoji 集合

## 相关文件

- `src/components/IconRenderer.tsx` - 统一的图标渲染组件（已集成 Twemoji）
- `src/contexts/SettingsContext.tsx` - 设置上下文
- `src/views/settings/PreferencesSettingsView.tsx` - 偏好设置界面
