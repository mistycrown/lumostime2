#!/usr/bin/env python3
"""
图标圆角处理脚本
对所有图标文件进行统一的圆角裁切处理

使用方法:
    python process_icon_corners.py          # 处理所有图标
    python process_icon_corners.py --restore # 恢复原始图标
    
依赖:
    pip install Pillow
"""

import os
import sys
from PIL import Image, ImageDraw
import shutil

# 圆角半径（相对于图标尺寸的比例）
CORNER_RADIUS_RATIO = 0.22  # 22%的圆角，与CSS保持一致

def create_rounded_mask(size, radius):
    """创建圆角遮罩"""
    mask = Image.new('L', size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), size], radius=radius, fill=255)
    return mask

def apply_rounded_corners(input_path, output_path):
    """对单个图标应用圆角"""
    try:
        print(f"🔄 处理: {os.path.basename(input_path)}")
        
        # 打开图像
        with Image.open(input_path) as img:
            # 确保是RGBA模式以支持透明度
            if img.mode != 'RGBA':
                img = img.convert('RGBA')
            
            # 获取图像尺寸
            width, height = img.size
            
            # 计算圆角半径
            radius = int(min(width, height) * CORNER_RADIUS_RATIO)
            
            # 创建圆角遮罩
            mask = create_rounded_mask((width, height), radius)
            
            # 创建输出图像（透明背景）
            output = Image.new('RGBA', (width, height), (0, 0, 0, 0))
            
            # 将原图像粘贴到输出图像
            output.paste(img, (0, 0))
            
            # 应用圆角遮罩
            output.putalpha(mask)
            
            # 保存处理后的图像
            output.save(output_path, 'PNG', optimize=True)
            
        print(f"✅ 完成: {os.path.basename(input_path)}")
        return True
        
    except Exception as e:
        print(f"❌ 失败: {os.path.basename(input_path)} - {str(e)}")
        return False

def process_all_icons():
    """批量处理所有图标"""
    source_dir = 'public/icon_style'
    backup_dir = 'public/icon_style_backup'
    
    if not os.path.exists(source_dir):
        print(f"❌ 源目录不存在: {source_dir}")
        return
    
    # 创建备份目录
    if not os.path.exists(backup_dir):
        os.makedirs(backup_dir)
        print("📁 创建备份目录")
    
    # 获取所有PNG文件
    files = [f for f in os.listdir(source_dir) if f.endswith('.png')]
    
    if not files:
        print("❌ 未找到PNG文件")
        return
    
    print(f"🔄 开始处理 {len(files)} 个图标文件...")
    print(f"📦 圆角半径: {int(CORNER_RADIUS_RATIO * 100)}%\n")
    
    success_count = 0
    fail_count = 0
    
    for file in files:
        input_path = os.path.join(source_dir, file)
        backup_path = os.path.join(backup_dir, file)
        temp_path = os.path.join(source_dir, f"temp_{file}")
        
        try:
            # 备份原文件
            if not os.path.exists(backup_path):
                shutil.copy2(input_path, backup_path)
            
            # 处理图像到临时文件
            success = apply_rounded_corners(input_path, temp_path)
            
            if success:
                # 替换原文件
                shutil.move(temp_path, input_path)
                success_count += 1
            else:
                # 清理临时文件
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                fail_count += 1
                
        except Exception as e:
            print(f"处理 {file} 时出错: {str(e)}")
            fail_count += 1
            
            # 清理临时文件
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    print(f"\n📊 处理结果:")
    print(f"✅ 成功: {success_count} 个文件")
    print(f"❌ 失败: {fail_count} 个文件")
    
    if success_count > 0:
        print(f"\n💡 处理完成！")
        print(f"📁 原始文件已备份到: {backup_dir}")
        print("🔄 如需恢复原始文件，请运行: python process_icon_corners.py --restore")

def restore_original_icons():
    """恢复原始图标"""
    source_dir = 'public/icon_style'
    backup_dir = 'public/icon_style_backup'
    
    if not os.path.exists(backup_dir):
        print("❌ 未找到备份文件")
        return
    
    files = [f for f in os.listdir(backup_dir) if f.endswith('.png')]
    
    print(f"🔄 恢复 {len(files)} 个原始图标...")
    
    for file in files:
        backup_path = os.path.join(backup_dir, file)
        target_path = os.path.join(source_dir, file)
        
        try:
            shutil.copy2(backup_path, target_path)
            print(f"✅ 恢复: {file}")
        except Exception as e:
            print(f"❌ 恢复失败: {file} - {str(e)}")
    
    print("✅ 恢复完成！")

def check_dependencies():
    """检查依赖"""
    try:
        import PIL
        return True
    except ImportError:
        return False

def main():
    print("🖼️  图标圆角处理工具")
    print("=" * 40)
    
    # 检查依赖
    if not check_dependencies():
        print("❌ 未安装 Pillow 库")
        print("请运行: pip install Pillow")
        print("\n安装完成后重新运行此脚本")
        return
    
    print("✅ 依赖检查通过")
    
    # 检查参数
    if len(sys.argv) > 1 and sys.argv[1] == '--restore':
        restore_original_icons()
        return
    
    # 确认处理
    print(f"\n📦 圆角设置: {int(CORNER_RADIUS_RATIO * 100)}%")
    print("📁 源目录: public/icon_style/")
    print("📁 备份目录: public/icon_style_backup/")
    
    response = input("\n是否开始处理? (y/N): ").strip().lower()
    if response not in ['y', 'yes']:
        print("❌ 已取消处理")
        return
    
    try:
        process_all_icons()
    except KeyboardInterrupt:
        print("\n\n⚠️  处理被用户中断")
    except Exception as e:
        print(f"\n❌ 处理过程中出现错误: {str(e)}")
        print("请检查文件权限和目录结构")

if __name__ == "__main__":
    main()