#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Icon & Time Pal Image Converter - UI图标和时间伙伴图片格式转换工具
将 PNG 格式的图片转换为 WebP 格式，并备份原图到 static 文件夹
"""

import os
import shutil
from pathlib import Path
from PIL import Image

# 配置
TARGET_FOLDERS = [
    Path("public/uiicon"),
    Path("public/time_pal_origin")
]
BACKUP_BASE_PATH = Path("static")

def ensure_backup_dir(relative_path):
    """确保备份目录存在"""
    backup_path = BACKUP_BASE_PATH / relative_path
    if not backup_path.exists():
        backup_path.mkdir(parents=True)
        print(f"✅ 创建备份目录: {backup_path}")
    return backup_path

def backup_png(png_path, backup_path):
    """备份 PNG 原图到 static 文件夹"""
    backup_file = backup_path / png_path.name
    shutil.copy2(png_path, backup_file)
    return backup_file

def convert_png_to_webp(png_path, quality=90):
    """将 PNG 转换为 WebP 格式"""
    webp_path = png_path.with_suffix('.webp')
    
    try:
        # 打开 PNG 图片
        with Image.open(png_path) as img:
            # 转换为 RGBA 模式（保留透明度）
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # 保存为 WebP 格式
            img.save(webp_path, 'WEBP', quality=quality, method=6)
        
        return webp_path
    except Exception as e:
        print(f"❌ 转换失败 {png_path.name}: {e}")
        return None

def process_directory(directory):
    """递归处理目录下的所有 PNG 文件"""
    if not directory.exists():
        print(f"⚠️  目录不存在: {directory}")
        return 0, 0
    
    print(f"\n📦 处理目录: {directory}")
    
    # 递归查找所有 PNG 文件
    png_files = list(directory.rglob("*.png"))
    
    if not png_files:
        print(f"⚠️  未找到 PNG 文件")
        return 0, 0
    
    print(f"🔍 找到 {len(png_files)} 个 PNG 文件")
    
    converted_count = 0
    backed_up_count = 0
    
    for png_file in sorted(png_files):
        # 计算相对路径
        relative_path = png_file.relative_to(directory.parent)
        backup_dir = ensure_backup_dir(relative_path.parent)
        
        print(f"\n  处理: {relative_path}")
        
        # 1. 备份 PNG 原图
        try:
            backup_file = backup_png(png_file, backup_dir)
            print(f"    ✅ 已备份到: {backup_file.relative_to(BACKUP_BASE_PATH)}")
            backed_up_count += 1
        except Exception as e:
            print(f"    ❌ 备份失败: {e}")
            continue
        
        # 2. 转换为 WebP
        webp_file = convert_png_to_webp(png_file, quality=90)
        if webp_file:
            print(f"    ✅ 已转换为: {webp_file.name}")
            converted_count += 1
            
            # 3. 删除原 PNG 文件
            try:
                png_file.unlink()
                print(f"    ✅ 已删除原文件: {png_file.name}")
            except Exception as e:
                print(f"    ⚠️  删除原文件失败: {e}")
        else:
            print(f"    ❌ 转换失败")
    
    print(f"\n✨ {directory.name} 处理完成:")
    print(f"   - 备份: {backed_up_count}/{len(png_files)}")
    print(f"   - 转换: {converted_count}/{len(png_files)}")
    
    return backed_up_count, converted_count

def main():
    """主函数"""
    print("=" * 60)
    print("🎨 Icon & Time Pal Image Converter")
    print("   将 PNG 格式的图片转换为 WebP 格式")
    print("=" * 60)
    
    # 确保备份根目录存在
    if not BACKUP_BASE_PATH.exists():
        BACKUP_BASE_PATH.mkdir(parents=True)
        print(f"✅ 创建备份根目录: {BACKUP_BASE_PATH}")
    
    total_backed_up = 0
    total_converted = 0
    
    # 处理每个目标文件夹
    for i, folder in enumerate(TARGET_FOLDERS, 1):
        print(f"\n[{i}/{len(TARGET_FOLDERS)}] ", end="")
        backed_up, converted = process_directory(folder)
        total_backed_up += backed_up
        total_converted += converted
    
    print("\n" + "=" * 60)
    print("✅ 所有目录处理完成！")
    print(f"📊 总计:")
    print(f"   - 备份文件: {total_backed_up}")
    print(f"   - 转换文件: {total_converted}")
    print(f"📁 原图备份位置: {BACKUP_BASE_PATH.absolute()}")
    print("=" * 60)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  用户中断操作")
    except Exception as e:
        print(f"\n\n❌ 发生错误: {e}")
        import traceback
        traceback.print_exc()
