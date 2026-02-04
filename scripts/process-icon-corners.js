/**
 * 图标圆角处理脚本
 * 对所有图标文件进行统一的圆角裁切处理
 */

import fs from 'fs';
import path from 'path';

// 圆角半径（相对于图标尺寸的比例）
const CORNER_RADIUS_RATIO = 0.22; // 22%的圆角，与CSS保持一致

/**
 * 使用Sharp库处理图像（如果可用）
 */
async function processWithSharp(inputPath, outputPath) {
    try {
        const sharp = await import('sharp');
        const image = sharp.default(inputPath);
        const { width, height } = await image.metadata();
        
        if (!width || !height) {
            throw new Error('无法获取图像尺寸');
        }
        
        const radius = Math.min(width, height) * CORNER_RADIUS_RATIO;
        
        // 创建圆角遮罩SVG
        const roundedCornerSvg = `
            <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <clipPath id="rounded">
                        <rect width="${width}" height="${height}" rx="${radius}" ry="${radius}"/>
                    </clipPath>
                </defs>
                <rect width="${width}" height="${height}" fill="white" clip-path="url(#rounded)"/>
            </svg>
        `;
        
        await image
            .composite([{
                input: Buffer.from(roundedCornerSvg),
                blend: 'dest-in'
            }])
            .png()
            .toFile(outputPath);
            
        return true;
    } catch (error) {
        console.error(`Sharp处理失败: ${error.message}`);
        return false;
    }
}

/**
 * 使用Canvas处理图像（备用方案）
 */
async function processWithCanvas(inputPath, outputPath) {
    try {
        const { createCanvas, loadImage } = await import('canvas');
        
        const image = await loadImage(inputPath);
        const { width, height } = image;
        
        // 计算圆角半径
        const radius = Math.min(width, height) * CORNER_RADIUS_RATIO;
        
        // 创建输出画布
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        
        // 创建圆角路径
        ctx.beginPath();
        ctx.moveTo(radius, 0);
        ctx.lineTo(width - radius, 0);
        ctx.quadraticCurveTo(width, 0, width, radius);
        ctx.lineTo(width, height - radius);
        ctx.quadraticCurveTo(width, height, width - radius, height);
        ctx.lineTo(radius, height);
        ctx.quadraticCurveTo(0, height, 0, height - radius);
        ctx.lineTo(0, radius);
        ctx.quadraticCurveTo(0, 0, radius, 0);
        ctx.closePath();
        ctx.clip();
        
        // 绘制图像
        ctx.drawImage(image, 0, 0, width, height);
        
        // 保存处理后的图像
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(outputPath, buffer);
        
        return true;
    } catch (error) {
        console.error(`Canvas处理失败: ${error.message}`);
        return false;
    }
}

/**
 * 对单个图标应用圆角
 */
async function applyRoundedCorners(inputPath, outputPath) {
    try {
        console.log(`🔄 处理: ${path.basename(inputPath)}`);
        
        // 优先尝试Sharp，然后是Canvas
        let success = await processWithSharp(inputPath, outputPath);
        
        if (!success) {
            success = await processWithCanvas(inputPath, outputPath);
        }
        
        if (success) {
            console.log(`✅ 完成: ${path.basename(inputPath)}`);
            return true;
        } else {
            console.log(`❌ 失败: ${path.basename(inputPath)}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ 处理失败: ${path.basename(inputPath)} - ${error.message}`);
        return false;
    }
}

/**
 * 批量处理所有图标
 */
async function processAllIcons() {
    const sourceDir = 'public/icon_style';
    const backupDir = 'public/icon_style_backup';
    
    // 创建备份目录
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
        console.log('📁 创建备份目录');
    }
    
    // 获取所有PNG文件
    const files = fs.readdirSync(sourceDir).filter(file => file.endsWith('.png'));
    
    console.log(`🔄 开始处理 ${files.length} 个图标文件...`);
    console.log(`📦 圆角半径: ${(CORNER_RADIUS_RATIO * 100).toFixed(0)}%\n`);
    
    let successCount = 0;
    let failCount = 0;
    
    for (const file of files) {
        const inputPath = path.join(sourceDir, file);
        const backupPath = path.join(backupDir, file);
        const tempPath = path.join(sourceDir, `temp_${file}`);
        
        try {
            // 备份原文件
            if (!fs.existsSync(backupPath)) {
                fs.copyFileSync(inputPath, backupPath);
            }
            
            // 处理图像到临时文件
            const success = await applyRoundedCorners(inputPath, tempPath);
            
            if (success) {
                // 替换原文件
                fs.renameSync(tempPath, inputPath);
                successCount++;
            } else {
                // 清理临时文件
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                failCount++;
            }
        } catch (error) {
            console.error(`处理 ${file} 时出错:`, error.message);
            failCount++;
            
            // 清理临时文件
            if (fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }
    }
    
    console.log('\n📊 处理结果:');
    console.log(`✅ 成功: ${successCount} 个文件`);
    console.log(`❌ 失败: ${failCount} 个文件`);
    
    if (successCount > 0) {
        console.log('\n💡 处理完成！');
        console.log(`📁 原始文件已备份到: ${backupDir}`);
        console.log('🔄 如需恢复原始文件，请运行: npm run restore-icons');
    }
}

/**
 * 恢复原始图标
 */
function restoreOriginalIcons() {
    const sourceDir = 'public/icon_style';
    const backupDir = 'public/icon_style_backup';
    
    if (!fs.existsSync(backupDir)) {
        console.log('❌ 未找到备份文件');
        return;
    }
    
    const files = fs.readdirSync(backupDir).filter(file => file.endsWith('.png'));
    
    console.log(`🔄 恢复 ${files.length} 个原始图标...`);
    
    for (const file of files) {
        const backupPath = path.join(backupDir, file);
        const targetPath = path.join(sourceDir, file);
        
        try {
            fs.copyFileSync(backupPath, targetPath);
            console.log(`✅ 恢复: ${file}`);
        } catch (error) {
            console.log(`❌ 恢复失败: ${file} - ${error.message}`);
        }
    }
    
    console.log('✅ 恢复完成！');
}

/**
 * 检查依赖
 */
async function checkDependencies() {
    const deps = [];
    
    try {
        await import('sharp');
        deps.push('sharp');
    } catch (e) {
        // Sharp不可用
    }
    
    try {
        await import('canvas');
        deps.push('canvas');
    } catch (e) {
        // Canvas不可用
    }
    
    return deps;
}

// 主函数
async function main() {
    console.log('🖼️  图标圆角处理工具\n');
    
    const args = process.argv.slice(2);
    
    if (args.includes('--restore')) {
        restoreOriginalIcons();
        return;
    }
    
    const availableDeps = await checkDependencies();
    
    if (availableDeps.length === 0) {
        console.log('❌ 未找到图像处理依赖');
        console.log('请安装以下依赖之一:');
        console.log('  npm install sharp  (推荐，性能更好)');
        console.log('  npm install canvas  (备用方案)');
        return;
    }
    
    console.log(`📦 可用的图像处理库: ${availableDeps.join(', ')}`);
    
    try {
        await processAllIcons();
    } catch (error) {
        console.error('❌ 处理过程中出现错误:', error.message);
    }
}

main();