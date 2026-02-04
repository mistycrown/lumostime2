/**
 * 图标功能测试脚本
 * 验证图标文件和配置是否正确
 */

import fs from 'fs';
import path from 'path';

const iconStyles = ['neon', 'paper', 'pixel', 'sketch'];

function testIconFiles() {
    console.log('🔍 检查图标文件...');
    
    let allFilesExist = true;
    
    // 检查源图标文件
    iconStyles.forEach(style => {
        const sourceFile = `public/icon_style/icon_${style}.png`;
        if (fs.existsSync(sourceFile)) {
            const stats = fs.statSync(sourceFile);
            console.log(`✅ ${sourceFile} (${Math.round(stats.size / 1024)}KB)`);
        } else {
            console.log(`❌ ${sourceFile} - 文件不存在`);
            allFilesExist = false;
        }
    });
    
    return allFilesExist;
}

function testAndroidResources() {
    console.log('\n📱 检查Android资源文件...');
    
    const densities = ['ldpi', 'mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
    let resourcesExist = true;
    
    iconStyles.forEach(style => {
        console.log(`\n  ${style} 风格:`);
        densities.forEach(density => {
            const resourceDir = `android/app/src/main/res/mipmap-${density}`;
            const iconFile = path.join(resourceDir, `ic_launcher_${style}.png`);
            const roundIconFile = path.join(resourceDir, `ic_launcher_${style}_round.png`);
            
            if (fs.existsSync(iconFile)) {
                console.log(`    ✅ ${density}: ic_launcher_${style}.png`);
            } else {
                console.log(`    ❌ ${density}: ic_launcher_${style}.png - 缺失`);
                resourcesExist = false;
            }
            
            if (fs.existsSync(roundIconFile)) {
                console.log(`    ✅ ${density}: ic_launcher_${style}_round.png`);
            } else {
                console.log(`    ❌ ${density}: ic_launcher_${style}_round.png - 缺失`);
                resourcesExist = false;
            }
        });
    });
    
    return resourcesExist;
}

function testAndroidManifest() {
    console.log('\n📋 检查AndroidManifest.xml配置...');
    
    const manifestPath = 'android/app/src/main/AndroidManifest.xml';
    if (!fs.existsSync(manifestPath)) {
        console.log('❌ AndroidManifest.xml 不存在');
        return false;
    }
    
    const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
    let allAliasesExist = true;
    
    iconStyles.forEach(style => {
        const aliasName = `MainActivity${style.charAt(0).toUpperCase() + style.slice(1)}`;
        if (manifestContent.includes(aliasName)) {
            console.log(`✅ Activity别名: ${aliasName}`);
        } else {
            console.log(`❌ Activity别名: ${aliasName} - 缺失`);
            allAliasesExist = false;
        }
    });
    
    return allAliasesExist;
}

function testJavaPlugin() {
    console.log('\n☕ 检查Java插件...');
    
    const pluginPath = 'android/app/src/main/java/com/mistycrown/lumostime/IconPlugin.java';
    if (!fs.existsSync(pluginPath)) {
        console.log('❌ IconPlugin.java 不存在');
        return false;
    }
    
    const pluginContent = fs.readFileSync(pluginPath, 'utf-8');
    
    // 检查是否包含所有图标ID
    let allIconsSupported = true;
    ['default', ...iconStyles].forEach(iconId => {
        if (pluginContent.includes(`"${iconId}"`)) {
            console.log(`✅ 支持图标: ${iconId}`);
        } else {
            console.log(`❌ 不支持图标: ${iconId}`);
            allIconsSupported = false;
        }
    });
    
    return allIconsSupported;
}

function testMainActivity() {
    console.log('\n🏠 检查MainActivity注册...');
    
    const mainActivityPath = 'android/app/src/main/java/com/mistycrown/lumostime/MainActivity.java';
    if (!fs.existsSync(mainActivityPath)) {
        console.log('❌ MainActivity.java 不存在');
        return false;
    }
    
    const mainActivityContent = fs.readFileSync(mainActivityPath, 'utf-8');
    
    if (mainActivityContent.includes('registerPlugin(IconPlugin.class)')) {
        console.log('✅ IconPlugin已注册到MainActivity');
        return true;
    } else {
        console.log('❌ IconPlugin未注册到MainActivity');
        return false;
    }
}

function testWebFiles() {
    console.log('\n🌐 检查Web文件...');
    
    const files = [
        'src/services/iconService.ts',
        'src/plugins/IconPlugin.ts',
        'src/components/IconPreview.tsx',
        'src/components/IconDebugModal.tsx'
    ];
    
    let allFilesExist = true;
    
    files.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file}`);
        } else {
            console.log(`❌ ${file} - 文件不存在`);
            allFilesExist = false;
        }
    });
    
    return allFilesExist;
}

function generateReport() {
    console.log('\n📊 生成测试报告...');
    
    const results = {
        iconFiles: testIconFiles(),
        androidResources: testAndroidResources(),
        androidManifest: testAndroidManifest(),
        javaPlugin: testJavaPlugin(),
        mainActivity: testMainActivity(),
        webFiles: testWebFiles()
    };
    
    console.log('\n' + '='.repeat(50));
    console.log('📋 测试结果汇总');
    console.log('='.repeat(50));
    
    Object.entries(results).forEach(([test, passed]) => {
        const status = passed ? '✅ 通过' : '❌ 失败';
        const testName = {
            iconFiles: '源图标文件',
            androidResources: 'Android资源',
            androidManifest: 'AndroidManifest配置',
            javaPlugin: 'Java插件',
            mainActivity: 'MainActivity注册',
            webFiles: 'Web文件'
        }[test];
        
        console.log(`${status} ${testName}`);
    });
    
    const allPassed = Object.values(results).every(result => result);
    
    console.log('\n' + '='.repeat(50));
    if (allPassed) {
        console.log('🎉 所有测试通过！图标功能已准备就绪。');
    } else {
        console.log('⚠️  部分测试失败，请检查上述问题。');
    }
    console.log('='.repeat(50));
    
    return allPassed;
}

// 主函数
function main() {
    console.log('🚀 开始图标功能测试...\n');
    
    const success = generateReport();
    
    if (success) {
        console.log('\n💡 下一步:');
        console.log('1. 运行 npm run build 构建项目');
        console.log('2. 运行 npx cap sync android 同步到Android');
        console.log('3. 在设置 > 新赞赏页面中测试图标切换功能');
    } else {
        console.log('\n🔧 修复建议:');
        console.log('1. 运行 node scripts/generate-android-icons.js 生成Android资源');
        console.log('2. 检查AndroidManifest.xml中的Activity别名配置');
        console.log('3. 确认MainActivity中已注册IconPlugin');
    }
    
    process.exit(success ? 0 : 1);
}

main();