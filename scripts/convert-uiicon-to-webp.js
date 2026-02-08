/**
 * @file convert-uiicon-to-webp.js
 * @description 将 public/uiicon 文件夹下的所有 PNG 图片转换为 WebP 格式
 * 注意：此脚本会直接替换原文件，不进行备份（因为用户已有备份）
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// UI Icon 目录
const UI_ICON_DIR = 'public/uiicon';

// WebP 质量设置 (0-100, 推荐 80-90)
const WEBP_QUALITY = 90; // UI 图标使用更高质量

/**
 * 将 PNG 转换为 WebP 并删除原文件
 */
async function convertPngToWebp(pngPath) {
    try {
        const webpPath = pngPath.replace(/\.png$/i, '.webp');
        
        const stats = await fs.stat(pngPath);
        const originalSize = stats.size;

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
    console.log('🚀 开始转换 UI Icon 图片为 WebP 格式...\n');
    console.log('⚠️  注意：此脚本会直接替换原文件，不进行备份\n');
    
    const uiIconDir = path.join(rootDir, UI_ICON_DIR);
    
    // 检查目录是否存在
    try {
        await fs.access(uiIconDir);
    } catch {
        console.error(`❌ 目录不存在: ${UI_ICON_DIR}`);
        process.exit(1);
    }

    console.log(`📁 处理目录: ${UI_ICON_DIR}\n`);
    
    const pngFiles = await findPngFiles(uiIconDir);
    console.log(`   找到 ${pngFiles.length} 个 PNG 文件\n`);

    if (pngFiles.length === 0) {
        console.log('✨ 没有找到需要转换的 PNG 文件');
        return;
    }

    let totalOriginalSize = 0;
    let totalNewSize = 0;
    let convertedCount = 0;
    let errorCount = 0;

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

    console.log('\n' + '='.repeat(60));
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
    console.log(`📝 说明: 所有 PNG 文件已转换为 WebP 格式并删除原文件`);
}

main().catch(console.error);
