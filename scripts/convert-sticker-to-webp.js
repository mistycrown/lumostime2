/**
 * @file convert-sticker-to-webp.js
 * @description 将 public/sticker 目录下的 PNG 图片批量转换为 WebP 格式
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// 需要转换的目录
const STICKER_DIR = 'public/sticker';

// WebP 质量设置 (0-100, 推荐 80-90)
const WEBP_QUALITY = 85;

// 强制覆盖已存在的 WebP 文件
const FORCE_OVERWRITE = true;

// 备份目录
const BACKUP_DIR = path.join(rootDir, 'static', 'png_backup');

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

async function convertPngToWebp(pngPath) {
    try {
        const webpPath = pngPath.replace(/\.png$/i, '.webp');
        
        // 检查 WebP 文件是否已存在
        if (!FORCE_OVERWRITE) {
            try {
                await fs.access(webpPath);
                console.log(`⏭️  跳过 (已存在): ${path.relative(rootDir, webpPath)}`);
                return { skipped: true };
            } catch {
                // 文件不存在，继续转换
            }
        } else {
            // 强制覆盖模式：删除已存在的 WebP
            try {
                await fs.access(webpPath);
                await fs.unlink(webpPath);
                console.log(`🔄 覆盖已存在的 WebP: ${path.relative(rootDir, webpPath)}`);
            } catch {
                // 文件不存在，继续
            }
        }

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
            .webp({ quality: WEBP_QUALITY })
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
    console.log('🚀 开始转换 sticker 图片...\n');
    
    // 确保备份目录存在
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`📦 备份目录: ${path.relative(rootDir, BACKUP_DIR)}\n`);

    let totalOriginalSize = 0;
    let totalNewSize = 0;
    let convertedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    const fullDir = path.join(rootDir, STICKER_DIR);
    console.log(`📁 处理目录: ${STICKER_DIR}`);
    
    const pngFiles = await findPngFiles(fullDir);
    console.log(`   找到 ${pngFiles.length} 个 PNG 文件\n`);

    for (const pngFile of pngFiles) {
        const result = await convertPngToWebp(pngFile);
        
        if (result.skipped) {
            skippedCount++;
        } else if (result.error) {
            errorCount++;
        } else {
            totalOriginalSize += result.originalSize || 0;
            totalNewSize += result.newSize || 0;
            convertedCount++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 转换统计:');
    console.log(`   ✅ 成功转换: ${convertedCount} 个文件`);
    console.log(`   ⏭️  跳过: ${skippedCount} 个文件`);
    console.log(`   ❌ 失败: ${errorCount} 个文件`);
    
    if (convertedCount > 0) {
        const totalReduction = ((totalOriginalSize - totalNewSize) / totalOriginalSize * 100).toFixed(1);
        console.log(`   💾 总体积: ${(totalOriginalSize / 1024 / 1024).toFixed(2)} MB → ${(totalNewSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   📉 减少: ${totalReduction}% (节省 ${((totalOriginalSize - totalNewSize) / 1024 / 1024).toFixed(2)} MB)`);
    }
    console.log('='.repeat(60));

    console.log('\n💡 提示: 原文件已备份到 ' + path.relative(rootDir, BACKUP_DIR));
    console.log('✨ 完成！');
}

main().catch(console.error);
