#!/usr/bin/env python3
"""
生成Android图标资源的脚本
处理完圆角后，生成各种密度的Android图标

使用方法:
    python generate_android_icons.py

依赖:
    pip install Pillow
"""

import os
import sys
from PIL import Image
import shutil

# Android密度和对应的图标尺寸
ANDROID_DENSITIES = {
    'ldpi': 36,
    'mdpi': 48, 
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
}

# 图标样式列表（需要与iconService保持一致）
ICON_STYLES = [
    'neon', 'paper', 'pixel', 'sketch', 'art-deco', 'blueprint', 'chalkboard',
    'christmas', 'embroidery', 'graffiti', 'lego', 'origami', 'pointillism',
    'pop-art', 'stained-glass', 'ukiyo-e', 'simple', 'cat', 'fox', 'frog',
    'panda', 'heart', 'moon', 'mushroom', 'plant', 'sea', 'knot',
    'bijiaso', 'cdqm', 'ciww', 'uvcd', 'wjugjp'
]

# 特殊文件名映射（处理包含空格和特殊字符的文件名）
FILE_NAME_MAP = {
    'art-deco': 'icon_Art Deco.png',
    'pop-art': 'icon_Pop Art.png',
    'stained-glass': 'icon_Stained Glass.png',
    'ukiyo-e': 'icon_Ukiyo-e.png'
}

def create_android_icon_dirs():
    """创建Android图标目录"""
    print("📁 创建Android图标目录...")
    
    for density in ANDROID_DENSITIES.keys():
        dir_path = f"android/app/src/main/res/mipmap-{density}"
        os.makedirs(dir_path, exist_ok=True)
        
    print("✅ 目录创建完成")

def resize_and_save_icon(source_path, target_path, size):
    """调整图标尺寸并保存"""
    try:
        with Image.open(source_path) as img:
            # 确保是RGBA模式
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # 调整尺寸，使用高质量重采样
            resized = img.resize((size, size), Image.Resampling.LANCZOS)
            
            # 保存
            resized.save(target_path, 'PNG', optimize=True)
            
        return True
    except Exception as e:
        print(f"❌ 调整尺寸失败: {e}")
        return False

def generate_icons_for_style(style):
    """为特定样式生成所有密度的图标"""
    # 获取源文件名
    source_filename = FILE_NAME_MAP.get(style, f'icon_{style}.png')
    source_path = f'public/icon_style/{source_filename}'
    
    if not os.path.exists(source_path):
        print(f"⚠️  源文件不存在: {source_path}")
        return False
    
    print(f"🔄 处理 {style} 风格图标...")
    
    success_count = 0
    
    for density, size in ANDROID_DENSITIES.items():
        target_dir = f"android/app/src/main/res/mipmap-{density}"
        
        # 生成普通图标和圆形图标文件名
        style_name = style.replace('-', '_')
        normal_icon = os.path.join(target_dir, f'ic_launcher_{style_name}.png')
        round_icon = os.path.join(target_dir, f'ic_launcher_{style_name}_round.png')
        
        # 调整尺寸并保存普通图标
        if resize_and_save_icon(source_path, normal_icon, size):
            success_count += 1
            
        # 调整尺寸并保存圆形图标（目前使用相同图像）
        if resize_and_save_icon(source_path, round_icon, size):
            success_count += 1
    
    print(f"✅ {style}: 生成了 {success_count} 个图标文件")
    return success_count > 0

def generate_all_android_icons():
    """生成所有Android图标"""
    print("🚀 开始生成Android图标资源...")
    print(f"📦 将处理 {len(ICON_STYLES)} 种图标样式")
    print(f"📱 每种样式生成 {len(ANDROID_DENSITIES)} 种密度")
    print("=" * 50)
    
    # 创建目录
    create_android_icon_dirs()
    
    # 统计
    success_styles = 0
    total_files = 0
    
    # 处理每种样式
    for style in ICON_STYLES:
        if generate_icons_for_style(style):
            success_styles += 1
            total_files += len(ANDROID_DENSITIES) * 2  # 普通 + 圆形
    
    print("=" * 50)
    print(f"📊 生成结果:")
    print(f"✅ 成功处理: {success_styles}/{len(ICON_STYLES)} 种样式")
    print(f"📁 生成文件: {total_files} 个")
    
    if success_styles > 0:
        print(f"\n💡 生成完成！")
        print("📁 图标文件位置: android/app/src/main/res/mipmap-*/")
        print("🔄 下一步: 重新构建Android应用以应用新图标")
    else:
        print("\n❌ 没有成功生成任何图标，请检查源文件")

def check_dependencies():
    """检查依赖"""
    try:
        import PIL
        return True
    except ImportError:
        return False

def check_source_directory():
    """检查源目录"""
    if not os.path.exists('public/icon_style'):
        print("❌ 源目录不存在: public/icon_style")
        return False
    
    png_files = [f for f in os.listdir('public/icon_style') if f.endswith('.png')]
    if not png_files:
        print("❌ 源目录中没有PNG文件")
        return False
    
    print(f"✅ 找到 {len(png_files)} 个PNG文件")
    return True

def main():
    print("🖼️  Android图标生成工具")
    print("=" * 40)
    
    # 检查依赖
    if not check_dependencies():
        print("❌ 未安装 Pillow 库")
        print("请运行: pip install Pillow")
        return
    
    print("✅ 依赖检查通过")
    
    # 检查源目录
    if not check_source_directory():
        print("\n💡 请确保:")
        print("1. public/icon_style/ 目录存在")
        print("2. 目录中包含图标PNG文件")
        print("3. 已运行圆角处理脚本: python process_icon_corners.py")
        return
    
    # 检查Android目录
    if not os.path.exists('android/app/src/main/res'):
        print("❌ Android资源目录不存在")
        print("请确保在正确的项目根目录运行此脚本")
        return
    
    print("✅ 目录结构检查通过")
    
    # 确认生成
    response = input(f"\n是否开始生成Android图标? (y/N): ").strip().lower()
    if response not in ['y', 'yes']:
        print("❌ 已取消生成")
        return
    
    try:
        generate_all_android_icons()
    except KeyboardInterrupt:
        print("\n\n⚠️  生成被用户中断")
    except Exception as e:
        print(f"\n❌ 生成过程中出现错误: {str(e)}")

if __name__ == "__main__":
    main()