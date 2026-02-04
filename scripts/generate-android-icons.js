/**
 * 生成Android图标资源的脚本
 * 将public/icon_style中的图标复制到Android的mipmap目录
 */

import fs from 'fs';
import path from 'path';

const iconStyles = [
    'neon', 'paper', 'pixel', 'sketch', 'art-deco', 'blueprint', 'chalkboard', 
    'christmas', 'embroidery', 'graffiti', 'lego', 'origami', 'pointillism', 
    'pop-art', 'stained-glass', 'ukiyo-e', 'simple', 'cat', 'fox', 'frog', 
    'panda', 'heart', 'moon', 'mushroom', 'plant', 'sea', 'knot'
];
const densities = ['ldpi', 'mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
const sizes = {
    'ldpi': 36,
    'mdpi': 48,
    'hdpi': 72,
    'xhdpi': 96,
    'xxhdpi': 144,
    'xxxhdpi': 192
};

// 创建Android图标目录
function createAndroidIconDirs() {
    densities.forEach(density => {
        const dir = `android/app/src/main/res/mipmap-${density}`;
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });
}

// 复制图标文件
function copyIcons() {
    iconStyles.forEach(style => {
        // 处理文件名中的特殊字符和空格
        let sourceFileName = `icon_${style}.png`;
        
        // 特殊文件名映射
        const fileNameMap = {
            'art-deco': 'icon_Art Deco.png',
            'pop-art': 'icon_Pop Art.png',
            'stained-glass': 'icon_Stained Glass.png',
            'ukiyo-e': 'icon_Ukiyo-e.png'
        };
        
        if (fileNameMap[style]) {
            sourceFileName = fileNameMap[style];
        }
        
        const sourceFile = `public/icon_style/${sourceFileName}`;
        
        if (fs.existsSync(sourceFile)) {
            console.log(`处理 ${style} 风格图标...`);
            
            densities.forEach(density => {
                const targetDir = `android/app/src/main/res/mipmap-${density}`;
                const targetFile = path.join(targetDir, `ic_launcher_${style.replace('-', '_')}.png`);
                const targetRoundFile = path.join(targetDir, `ic_launcher_${style.replace('-', '_')}_round.png`);
                
                // 复制普通图标
                fs.copyFileSync(sourceFile, targetFile);
                // 复制圆形图标（暂时使用同一个文件）
                fs.copyFileSync(sourceFile, targetRoundFile);
                
                console.log(`  -> ${targetFile}`);
                console.log(`  -> ${targetRoundFile}`);
            });
        } else {
            console.warn(`警告: 源文件不存在 ${sourceFile}`);
        }
    });
}

// 主函数
function main() {
    console.log('开始生成Android图标资源...');
    
    createAndroidIconDirs();
    copyIcons();
    
    console.log('Android图标资源生成完成！');
    console.log('\n注意事项:');
    console.log('1. 图标文件已复制到各个密度目录');
    console.log('2. 如需优化不同密度的图标尺寸，请使用图像处理工具');
    console.log('3. 圆形图标目前使用相同文件，建议制作专门的圆形版本');
}

main();