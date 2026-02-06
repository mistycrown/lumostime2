/**
 * @file convert-icons-to-ico.js
 * @description 将 icon_style 文件夹中的 WebP 图标转换为优化的 PNG 格式
 * 
 * 目标：生成高度压缩的 PNG，适用于所有平台
 * - Android: ✓
 * - Electron: ✓
 * - Web: ✓
 * 
 * 使用方法：
 * npm install sharp --save-dev
 * node scripts/convert-icons-to-ico.js
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

const ICON_DIR = path.join(__dirname, '../public/icon_style');
const PNG_SIZE = 256; // PNG 输出尺寸

async function convertWebPToPNG(webpPath, pngPath) {
    try {
        const fileName = path.basename(webpPath);
        
        // 获取原始文件大小
        const webpStats = await fs.stat(webpPath);
        const webpSize = (webpStats.size / 1024).toFixed(2);
        
        // 生成优化的 PNG
        await sharp(webpPath)
            .resize(PNG_SIZE, PNG_SIZE, {
                fit: 'contain',
                background: { r: 0, g: 0, b: 0, alpha: 0 }
            })
            .png({
                compressionLevel: 9, // 最高压缩级别 (0-9)
                quality: 90,         // 质量 90（高质量，文件较小）
                palette: true,       // 使用调色板（进一步减小文件）
                effort: 10           // 最大压缩努力 (1-10)
            })
            .toFile(pngPath);
        
        const pngStats = await fs.stat(pngPath);
        const pngSize = (pngStats.size / 1024).toFixed(2);
        const reduction = ((1 - pngStats.size / webpStats.size) * 100).toFixed(1);
        
        console.log(`✓ ${fileName.padEnd(30)} WebP: ${webpSize.padStart(6)} KB -> PNG: ${pngSize.padStart(6)} KB (${reduction > 0 ? '+' : ''}${reduction}%)`);
        
    } catch (error) {
        console.error(`❌ ${path.basename(webpPath)}: ${error.message}`);
    }
}

async function main() {
    console.log('========================================');
    console.log('图标格式转换工具');
    console.log('WebP -> PNG + ICO');
    console.log('========================================\n');
    
    try {
        // 读取目录中的所有文件
        const files = await fs.readdir(ICON_DIR);
        const webpFiles = files.filter(f => f.endsWith('.webp'));
        
        console.log(`找到 ${webpFiles.length} 个 WebP 图标文件\n`);
        
        // 转换每个文件
        for (const file of webpFiles) {
            const webpPath = path.join(ICON_DIR, file);
            const baseName = file.replace('.webp', '');
            const icoPath = path.join(ICON_DIR, `${baseName}.ico`);
            
            await convertWebPToICO(webpPath, icoPath);
        }
        
        console.log('\n========================================');
        console.log('✅ 转换完成！');
        console.log('========================================');
        console.log('\n📝 说明：');
        console.log('- PNG 文件用于 Android 和备用');
        console.log('- ICO 文件用于 Electron (Windows/Mac/Linux)');
        console.log('- WebP 文件用于 Web 浏览器（体积最小）');
        
    } catch (error) {
        console.error('❌ 执行失败:', error);
        process.exit(1);
    }
}

// 检查依赖
async function checkDependencies() {
    const requiredPackages = ['sharp'];
    const optionalPackages = ['png-to-ico'];
    
    console.log('检查依赖...\n');
    
    for (const pkg of requiredPackages) {
        try {
            require.resolve(pkg);
            console.log(`✓ ${pkg}`);
        } catch (error) {
            console.error(`❌ 缺少必需依赖: ${pkg}`);
            console.error(`   请运行: npm install ${pkg} --save-dev`);
            process.exit(1);
        }
    }
    
    for (const pkg of optionalPackages) {
        try {
            require.resolve(pkg);
            console.log(`✓ ${pkg}`);
        } catch (error) {
            console.log(`⚠️  可选依赖未安装: ${pkg}`);
            console.log(`   安装后可生成 ICO: npm install ${pkg} --save-dev`);
        }
    }
    
    console.log('');
}

checkDependencies().then(main);
