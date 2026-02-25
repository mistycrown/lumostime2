# 应用跳转功能 - 常用应用配置示例

## Android常用应用包名

### 学习类
| 应用名称 | 包名 |
|---------|------|
| 百词斩 | com.jiongji.andriod.card |
| 扇贝单词 | com.shanbay.words |
| 有道词典 | com.youdao.dict |
| 知乎 | com.zhihu.android |
| 得到 | com.luojilab.player |
| 微信读书 | com.tencent.weread |

### 效率工具
| 应用名称 | 包名 |
|---------|------|
| 印象笔记 | com.yinxiang |
| 有道云笔记 | com.youdao.note |
| WPS Office | cn.wps.moffice_eng |
| 番茄TODO | com.plan.kot32 |
| Forest专注森林 | cc.forestapp |

### 健康运动
| 应用名称 | 包名 |
|---------|------|
| Keep | com.gotokeep.keep |
| 小米运动 | com.xiaomi.hm.health |
| 华为运动健康 | com.huawei.health |
| 潮汐 | io.moreless.tide |
| 冥想星球 | com.ihappylife.meditation |

### 娱乐社交
| 应用名称 | 包名 |
|---------|------|
| 微信 | com.tencent.mm |
| QQ | com.tencent.mobileqq |
| 微博 | com.sina.weibo |
| 抖音 | com.ss.android.ugc.aweme |
| 哔哩哔哩 | tv.danmaku.bili |

### 音乐视频
| 应用名称 | 包名 |
|---------|------|
| 网易云音乐 | com.netease.cloudmusic |
| QQ音乐 | com.tencent.qqmusic |
| 酷狗音乐 | com.kugou.android |
| 爱奇艺 | com.qiyi.video |
| 腾讯视频 | com.tencent.qqlive |

## 配置示例

### 示例1：背单词卡片

**卡片配置：**
- 类型：计时卡片
- 标题：背单词
- 关联活动：学习 > 英语
- 启用应用跳转：是
- 应用名称：百词斩
- 应用包名：`com.jiongji.andriod.card`

**使用效果：**
点击卡片后，自动打开百词斩应用并开始计时。

### 示例2：阅读卡片

**卡片配置：**
- 类型：计时卡片
- 标题：阅读
- 关联活动：学习 > 阅读
- 启用应用跳转：是
- 应用名称：微信读书
- 应用包名：`com.tencent.weread`

**使用效果：**
点击卡片后，自动打开微信读书并开始计时。

### 示例3：运动卡片

**卡片配置：**
- 类型：待办卡片
- 标题：跑步
- 关联待办：运动计划 > 晨跑
- 启用应用跳转：是
- 应用名称：Keep
- 应用包名：`com.gotokeep.keep`

**使用效果：**
点击卡片后，自动打开Keep应用并开始待办计时。

### 示例4：冥想卡片

**卡片配置：**
- 类型：计时卡片
- 标题：冥想
- 关联活动：生活 > 冥想
- 启用应用跳转：是
- 应用名称：潮汐
- 应用包名：`io.moreless.tide`

**使用效果：**
点击卡片后，自动打开潮汐应用并开始计时。

## 如何查找应用包名

### 方法1：使用ADB命令（Android）

```bash
# 列出所有已安装应用的包名
adb shell pm list packages

# 查找特定应用（例如微信）
adb shell pm list packages | grep wechat

# 查看当前运行的应用包名
adb shell dumpsys window | grep mCurrentFocus
```

### 方法2：使用应用商店链接（Android）

从Google Play商店复制应用链接，例如：
```
https://play.google.com/store/apps/details?id=com.example.app
```
其中`id=`后面的`com.example.app`就是包名。

### 方法3：使用第三方工具（Android）

安装"应用信息查看器"、"Package Name Viewer"等工具，可以直接查看所有应用的包名。

### 方法4：查阅官方文档

部分应用的包名可以在官方网站或开发者文档中找到。

## 注意事项

1. **包名区分大小写**：请确保输入的包名完全正确
2. **应用必须已安装**：只能启动已安装的应用
3. **部分应用不支持**：某些应用可能禁止外部启动
4. **测试后使用**：建议先测试应用是否能正常启动

## 故障排除

### 问题：应用无法启动

**可能原因：**
1. 包名或URL Scheme输入错误
2. 应用未安装
3. 应用不支持外部启动
4. 系统权限限制

**解决方法：**
1. 检查包名拼写是否正确
2. 确认应用已安装
3. 尝试手动启动应用测试
4. 查看系统日志获取错误信息

### 问题：部分应用可以启动，部分不行

**可能原因：**
某些应用出于安全考虑，禁止了外部启动功能。

**解决方法：**
这是应用本身的限制，无法通过配置解决。建议选择支持外部启动的替代应用。

## 更多资源

- [Android Intent文档](https://developer.android.com/guide/components/intents-filters)
- [Capacitor插件开发文档](https://capacitorjs.com/docs/plugins)
