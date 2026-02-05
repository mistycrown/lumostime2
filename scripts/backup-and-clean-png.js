/**
 * @file backup-and-clean-png.js
 * @description 备份 PNG 文件到 static 目录，然后删除 public 目录下的 PNG 文件
 */

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

// 备份目录
const BACKUP_DIR = path.join(rootDir, 'static', 'png_backup');

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

async function backupAndDeletePng(pngPath) {
    try {
        // 计算相对于 rootDir 的路径
        const relativePath = path.relative(rootDir, pngPath);
        const backupPath = path.join(BACKUP_DIR, relativePath);
        
        // 确保备份目录存在
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        
        // 复制文件到备份目录
        await fs.copyFile(pngPath, backupPath);
        
        // 获取文件大小
        const stats = await fs.stat(pngPath);
        const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
        
        // 删除原文件
        await fs.unlink(pngPath);
        
        console.log(`✅ ${relativePath} (${sizeMB} MB)`);
        
        return { size: stats.size, success: true };
    } catch (error) {
        console.error(`❌ 处理失败: ${pngPath}`, error.message);
        return { size: 0, success: false };
    }
}

async function main() {
    console.log('🚀 开始备份并清理 PNG 文件...\n');
    
    // 确保备份目录存在
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`📦 备份目录: ${path.relative(rootDir, BACKUP_DIR)}\n`);

    let totalSize = 0;
    let successCount = 0;
    let failCount = 0;

    for (const dir of DIRS_TO_PROCESS) {
        const fullDir = path.join(rootDir, dir);
        console.log(`📁 处理目录: ${dir}`);
        
        const pngFiles = await findPngFiles(fullDir);
        console.log(`   找到 ${pngFiles.length} 个 PNG 文件\n`);

        if (pngFiles.length === 0) {
            console.log('   (无需处理)\n');
            continue;
        }

        for (const pngFile of pngFiles) {
            const result = await backupAndDeletePng(pngFile);
            
            if (result.success) {
                totalSize += result.size;
                successCount++;
            } else {
                failCount++;
            }
        }
        
        console.log('');
    }

    console.log('='.repeat(60));
    console.log('📊 处理统计:');
    console.log(`   ✅ 成功: ${successCount} 个文件`);
    console.log(`   ❌ 失败: ${failCount} 个文件`);
    console.log(`   💾 释放空间: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📦 备份位置: ${path.relative(rootDir, BACKUP_DIR)}`);
    console.log('='.repeat(60));

    console.log('\n✨ 完成！PNG 文件已备份并从 public 目录删除');
    console.log('💡 提示: 如需恢复，可从 static/png_backup 目录复制回来');
}

main().catch(console.error);
