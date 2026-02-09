import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const bannerDir = path.join(__dirname, '../public/banner');

async function convertBannerToWebP() {
    try {
        // 读取 banner 目录下的所有文件
        const files = fs.readdirSync(bannerDir);
        
        console.log('🎨 开始转换 banner 图片为 WebP 格式...\n');
        
        let successCount = 0;
        let skipCount = 0;
        
        for (const file of files) {
            const filePath = path.join(bannerDir, file);
            const ext = path.extname(file).toLowerCase();
            
            // 只处理 PNG 和 JPG 文件
            if (ext === '.png' || ext === '.jpg' || ext === '.jpeg') {
                const fileName = path.basename(file, ext);
                const outputPath = path.join(bannerDir, `${fileName}.webp`);
                
                // 如果 WebP 文件已存在，跳过
                if (fs.existsSync(outputPath)) {
                    console.log(`⏭️  跳过: ${file} (WebP 已存在)`);
                    skipCount++;
                    continue;
                }
                
                try {
                    await sharp(filePath)
                        .webp({ quality: 85 })
                        .toFile(outputPath);
                    
                    const originalSize = fs.statSync(filePath).size;
                    const newSize = fs.statSync(outputPath).size;
                    const reduction = ((1 - newSize / originalSize) * 100).toFixed(1);
                    
                    console.log(`✅ ${file} → ${fileName}.webp (减小 ${reduction}%)`);
                    successCount++;
                } catch (error) {
                    console.error(`❌ 转换失败: ${file}`, error.message);
                }
            }
        }
        
        console.log('\n📊 转换完成！');
        console.log(`   成功: ${successCount} 个文件`);
        console.log(`   跳过: ${skipCount} 个文件`);
        
        if (successCount > 0) {
            console.log('\n💡 提示: 可以删除原始 PNG 文件以节省空间');
        }
        
    } catch (error) {
        console.error('❌ 转换过程出错:', error);
        process.exit(1);
    }
}

convertBannerToWebP();
