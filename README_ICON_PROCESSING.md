# 图标圆角处理说明

## 完整处理流程

### 1. 安装依赖
```bash
pip install Pillow
```

### 2. 处理图标圆角
```bash
python process_icon_corners.py
```

### 3. 生成Android图标资源
```bash
python generate_android_icons.py
```

### 4. 恢复原始图标（如需要）
```bash
python process_icon_corners.py --restore
```

## 处理效果

### 圆角处理
- **圆角半径**: 22%（统一的圆角效果）
- **透明背景**: 保持PNG透明度
- **自动备份**: 原始文件备份到 `public/icon_style_backup/`
- **批量处理**: 一次处理所有PNG文件

### Android图标生成
- **多密度支持**: ldpi, mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi
- **自动调整尺寸**: 36px 到 192px
- **双图标格式**: 普通图标 + 圆形图标
- **高质量重采样**: 使用LANCZOS算法保证质量

## 文件结构

```
public/
├── icon_style/                    # 图标文件（处理后会被替换）
├── icon_style_backup/             # 原始文件备份（自动创建）
└── icon.ico                       # 默认图标

android/app/src/main/res/
├── mipmap-ldpi/                   # 36px 图标
├── mipmap-mdpi/                   # 48px 图标  
├── mipmap-hdpi/                   # 72px 图标
├── mipmap-xhdpi/                  # 96px 图标
├── mipmap-xxhdpi/                 # 144px 图标
└── mipmap-xxxhdpi/                # 192px 图标
    ├── ic_launcher_neon.png       # 普通图标
    ├── ic_launcher_neon_round.png # 圆形图标
    └── ...                        # 其他样式
```

## 支持的图标样式

总计 **34种** 图标样式：
- 基础样式：neon, paper, pixel, sketch, simple
- 艺术风格：art-deco, blueprint, chalkboard, christmas, embroidery, graffiti, lego, origami, pointillism, pop-art, stained-glass, ukiyo-e
- 动物主题：cat, fox, frog, panda
- 自然主题：heart, moon, mushroom, plant, sea, knot
- 特殊主题：bijiaso, cdqm, ciww, uvcd, wjugjp

## 注意事项

1. **处理顺序**: 必须先运行圆角处理，再生成Android图标
2. **备份安全**: 脚本会自动备份原始文件
3. **确认提示**: 处理前会询问确认
4. **可恢复**: 随时可以恢复到原始状态
5. **重新构建**: 生成Android图标后需要重新构建应用

## 完整工作流程

```bash
# 1. 处理圆角
python process_icon_corners.py

# 2. 生成Android资源
python generate_android_icons.py

# 3. 重新构建Android应用
cd android
./gradlew clean
./gradlew assembleDebug
```

这样就能给所有图标统一添加圆角效果，并生成完整的Android图标资源了！