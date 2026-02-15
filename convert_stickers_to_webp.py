#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sticker Image Converter - 贴纸图片格式转换工具
将 PNG 格式的 sticker 图片转换为 WebP 格式，并备份原图到 static 文件夹
"""

import os
import shutil
from pathlib import Path
from PIL import Image

# 配置
STICKER_BASE_PATH = Path("public/sticker")
BACKUP_PATH = Path("static/sticker_backup")
STICKER_SETS = ['water', 'water2', 'water3']  # 贴纸集列表

def ensure_backup_dir():
    """确保备份目录存在"""
    if not BACKUP_PATH.exists():
        BACKUP_PATH.mkdir(parents=True)
        print(f"✅ 创建备份目录: {BACKUP_PATH}")

def backup_png(png_path, sticker_set):
    """备份 PNG 原图到 static 文件夹"""
    backup_set_path = BACKUP_PATH / sticker_set
    if not backup_set_path.exists():
        backup_set_path.mkdir(parents=True)
    
    backup_file = backup_set_path / png_path.name
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

def process_sticker_set(sticker_set):
    """处理单个贴纸集"""
    sticker_path = STICKER_BASE_PATH / sticker_set
    
    if not sticker_path.exists():
        print(f"⚠️  贴纸集不存在: {sticker_set}")
        return
    
    print(f"\n📦 处理贴纸集: {sticker_set}")
    print(f"📂 路径: {sticker_path}")
    
    # 查找所有 PNG 文件
    png_files = list(sticker_path.glob("*.png"))
    
    if not png_files:
        print(f"⚠️  未找到 PNG 文件")
        return
    
    print(f"🔍 找到 {len(png_files)} 个 PNG 文件")
    
    converted_count = 0
    backed_up_count = 0
    
    for png_file in sorted(png_files):
        print(f"\n  处理: {png_file.name}")
        
        # 1. 备份 PNG 原图
        try:
            backup_file = backup_png(png_file, sticker_set)
            print(f"    ✅ 已备份到: {backup_file}")
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
    
    print(f"\n✨ {sticker_set} 处理完成:")
    print(f"   - 备份: {backed_up_count}/{len(png_files)}")
    print(f"   - 转换: {converted_count}/{len(png_files)}")

def main():
    """主函数"""
    print("=" * 60)
    print("🎨 Sticker Image Converter")
    print("   将 PNG 格式的 sticker 转换为 WebP 格式")
    print("=" * 60)
    
    # 确保备份目录存在
    ensure_backup_dir()
    
    # 处理每个贴纸集
    total_sets = len(STICKER_SETS)
    for i, sticker_set in enumerate(STICKER_SETS, 1):
        print(f"\n[{i}/{total_sets}] ", end="")
        process_sticker_set(sticker_set)
    
    print("\n" + "=" * 60)
    print("✅ 所有贴纸集处理完成！")
    print(f"📁 原图备份位置: {BACKUP_PATH.absolute()}")
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
