/**
 * @file convert-icons-timepal-to-webp.js
 * @description 将 public/uiicon 和 public/time_pal_origin 文件夹下的所有 PNG 图片转换为 WebP 格式
 * 原 PNG 文件会备份到 static 文件夹
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 需要转换的目录
const DIRS_TO_CONVERT = [
    'public/uiicon',
    'public/time_pal_origin'
];

// 备份目录
const BACKUP_DIR = path.join(rootDir, 'static');

// WebP 质量设置 (0-100, 推荐 80-90)
const WEBP_QUALITY = 90;

/**
 * 备份 PNG 文件到 static 目录
 */
async function backupPngFile(pngPath) {
    try {
        // 计算相对于 rootDir 的路径
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
 * 将 PNG 转换为 WebP 并删除原文件
 */
async function convertPngToWebp(pngPath) {
    try {
        const webpPath = pngPath.replace(/\.png$/i, '.webp');
        
        const stats = await fs.stat(pngPath);
        const originalSize = stats.size;

        // 先备份 PNG 文件
        const backupSuccess = await backupPngFile(pngPath);
        if (!backupSuccess) {
            console.log(`⚠️  备份失败，跳过转换: ${path.relative(rootDir, pngPath)}`);
            return { error: true };
        }

        // 转换为 WebP
        await sharp(pngPath)
            .webp({ quality: WEBP_QUALITY, lossless: false })
            .toFile(webpPath);

        const newStats = await fs.stat(webpPath);
        const newSize = newStats.size;
        const reduction = ((originalSize - newSize) / originalSize * 100).toFixed(1);

        console.log(`✅ ${path.relative(rootDir, pngPath)}`);
        console.log(`   ${(originalSize / 1024).toFixed(1)} KB → ${(newSize / 1024).toFixed(1)} KB (减少 ${reduction}%)`);

        // 删除原始 PNG 文件
        await fs.unlink(pngPath);
        console.log(`   🗑️  已删除原始 PNG 文件`);

        return { originalSize, newSize, reduction };
    } catch (error) {
        console.error(`❌ 转换失败: ${pngPath}`, error.message);
        return { error: true };
    }
}

/**
 * 递归查找所有 PNG 文件
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

async function main() {
    console.log('🚀 开始转换 UI Icon 和 Time Pal 图片为 WebP 格式...\n');
    
    // 确保备份目录存在
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`📦 备份目录: ${path.relative(rootDir, BACKUP_DIR)}\n`);

    let totalOriginalSize = 0;
    let totalNewSize = 0;
    let convertedCount = 0;
    let errorCount = 0;

    for (const dir of DIRS_TO_CONVERT) {
        const fullDir = path.join(rootDir, dir);
        console.log(`📁 处理目录: ${dir}`);
        
        // 检查目录是否存在
        try {
            await fs.access(fullDir);
        } catch {
            console.error(`❌ 目录不存在: ${dir}\n`);
            continue;
        }
        
        const pngFiles = await findPngFiles(fullDir);
        console.log(`   找到 ${pngFiles.length} 个 PNG 文件\n`);

        if (pngFiles.length === 0) {
            console.log('   (无需处理)\n');
            continue;
        }

        for (const pngFile of pngFiles) {
            const result = await convertPngToWebp(pngFile);
            
            if (result.error) {
                errorCount++;
            } else {
                totalOriginalSize += result.originalSize || 0;
                totalNewSize += result.newSize || 0;
                convertedCount++;
            }
        }
        
        console.log('');
    }

    console.log('='.repeat(60));
    console.log('📊 转换统计:');
    console.log(`   ✅ 成功转换: ${convertedCount} 个文件`);
    console.log(`   ❌ 失败: ${errorCount} 个文件`);
    
    if (convertedCount > 0) {
        const totalReduction = ((totalOriginalSize - totalNewSize) / totalOriginalSize * 100).toFixed(1);
        console.log(`   💾 总体积: ${(totalOriginalSize / 1024).toFixed(2)} KB → ${(totalNewSize / 1024).toFixed(2)} KB`);
        console.log(`   📉 减少: ${totalReduction}% (节省 ${((totalOriginalSize - totalNewSize) / 1024).toFixed(2)} KB)`);
    }
    console.log('='.repeat(60));

    console.log('\n✨ 转换完成！');
    console.log(`📝 说明: 所有 PNG 文件已转换为 WebP 格式`);
    console.log(`💡 提示: 原文件已备份到 ${path.relative(rootDir, BACKUP_DIR)}`);
}

main().catch(console.error);
