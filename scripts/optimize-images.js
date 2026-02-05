/**
 * @file optimize-images.js
 * @description 自动优化图片：备份 PNG → 转换为 WebP → 删除原 PNG
 * 使用方法: npm run optimize-images
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 需要处理的目录
const DIRS_TO_PROCESS = [
    'public/background',
    'public/dchh',
    'public/time_pal_origin',
    'public/icon_style'
];

// WebP 质量设置 (0-100, 推荐 80-90)
const WEBP_QUALITY = 85;

// 备份目录
const BACKUP_DIR = path.join(rootDir, 'static', 'png_backup');

/**
 * 查找目录下所有 PNG 文件
 */
async function findPngFiles(dir) {
    const files = [];
    
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                const subFiles = await findPngFiles(fullPath);
                files.push(...subFiles);
            } else if (entry.isFile() && /\.png$/i.test(entry.name)) {
                files.push(fullPath);
            }
        }
    } catch (error) {
        console.error(`❌ 读取目录失败: ${dir}`, error.message);
    }
    
    return files;
}

/**
 * 备份 PNG 文件
 */
async function backupPngFile(pngPath) {
    try {
        const relativePath = path.relative(rootDir, pngPath);
        const backupPath = path.join(BACKUP_DIR, relativePath);
        
        // 确保备份目录存在
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        
        // 复制文件到备份目录
        await fs.copyFile(pngPath, backupPath);
        
        return true;
    } catch (error) {
        console.error(`❌ 备份失败: ${pngPath}`, error.message);
        return false;
    }
}

/**
 * 处理单个 PNG 文件：备份 → 转换 → 删除
 */
async function processPngFile(pngPath) {
    try {
        const webpPath = pngPath.replace(/\.png$/i, '.webp');
        const relativePath = path.relative(rootDir, pngPath);
        
        // 检查 WebP 文件是否已存在
        try {
            await fs.access(webpPath);
            console.log(`⏭️  跳过 (WebP已存在): ${relativePath}`);
            return { skipped: true };
        } catch {
            // WebP 不存在，继续处理
        }

        // 获取原文件大小
        const stats = await fs.stat(pngPath);
        const originalSize = stats.size;

        // 步骤 1: 备份 PNG 文件
        console.log(`📦 备份: ${relativePath}`);
        const backupSuccess = await backupPngFile(pngPath);
        if (!backupSuccess) {
            console.log(`⚠️  备份失败，跳过转换`);
            return { error: true };
        }

        // 步骤 2: 转换为 WebP
        console.log(`🔄 转换: ${relativePath}`);
        await sharp(pngPath)
            .webp({ quality: WEBP_QUALITY })
            .toFile(webpPath);

        const newStats = await fs.stat(webpPath);
        const newSize = newStats.size;
        const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);

        // 步骤 3: 删除原 PNG 文件
        await fs.unlink(pngPath);

        console.log(`✅ 完成: ${relativePath}`);
        console.log(`   ${(originalSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (减少 ${reduction}%)\n`);

        return { 
            originalSize, 
            newSize, 
            reduction: parseFloat(reduction),
            success: true 
        };
    } catch (error) {
        console.error(`❌ 处理失败: ${pngPath}`, error.message);
        return { error: true };
    }
}

/**
 * 主函数
 */
async function main() {
    console.log('🚀 开始优化图片...\n');
    console.log('流程: 备份 PNG → 转换为 WebP → 删除原 PNG\n');
    
    // 确保备份目录存在
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`📦 备份目录: ${path.relative(rootDir, BACKUP_DIR)}\n`);
    console.log('='.repeat(60) + '\n');

    let totalOriginalSize = 0;
    let totalNewSize = 0;
    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // 处理每个目录
    for (const dir of DIRS_TO_PROCESS) {
        const fullDir = path.join(rootDir, dir);
        console.log(`📁 处理目录: ${dir}`);
        
        const pngFiles = await findPngFiles(fullDir);
        
        if (pngFiles.length === 0) {
            console.log(`   ✨ 没有找到 PNG 文件\n`);
            continue;
        }
        
        console.log(`   找到 ${pngFiles.length} 个 PNG 文件\n`);

        for (const pngFile of pngFiles) {
            const result = await processPngFile(pngFile);
            
            if (result.skipped) {
                skippedCount++;
            } else if (result.error) {
                errorCount++;
            } else if (result.success) {
                totalOriginalSize += result.originalSize;
                totalNewSize += result.newSize;
                processedCount++;
            }
        }
    }

    // 输出统计信息
    console.log('='.repeat(60));
    console.log('📊 优化统计:\n');
    console.log(`   ✅ 成功处理: ${processedCount} 个文件`);
    console.log(`   ⏭️  跳过: ${skippedCount} 个文件`);
    console.log(`   ❌ 失败: ${errorCount} 个文件`);
    
    if (processedCount > 0) {
        const totalReduction = ((totalOriginalSize - totalNewSize) / totalOriginalSize * 100).toFixed(1);
        const savedSpace = (totalOriginalSize - totalNewSize) / 1024 / 1024;
        
        console.log(`\n   💾 原始大小: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   💾 优化后: ${(totalNewSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   📉 压缩率: ${totalReduction}%`);
        console.log(`   🎉 节省空间: ${savedSpace.toFixed(2)} MB`);
    }
    
    console.log('\n   📦 备份位置: ' + path.relative(rootDir, BACKUP_DIR));
    console.log('='.repeat(60));

    if (processedCount > 0) {
        console.log('\n✨ 优化完成！');
        console.log('💡 提示: 原 PNG 文件已备份到 static/png_backup 目录');
        console.log('💡 提示: 如需恢复，可从备份目录复制回来');
    } else if (skippedCount > 0) {
        console.log('\n✨ 所有图片已经是最新的！');
    } else {
        console.log('\n✨ 没有找到需要处理的 PNG 文件');
    }
}

main().catch(console.error);
