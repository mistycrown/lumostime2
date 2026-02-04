/**
 * 验证图标功能实现的完整性
 */

import fs from 'fs';
import path from 'path';

function checkFile(filePath, description) {
    if (fs.existsSync(filePath)) {
        console.log(`✅ ${description}: ${filePath}`);
        return true;
    } else {
        console.log(`❌ ${description}: ${filePath} - 文件缺失`);
        return false;
    }
}

function checkFileContent(filePath, searchText, description) {
    if (!fs.existsSync(filePath)) {
        console.log(`❌ ${description}: ${filePath} - 文件不存在`);
        return false;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes(searchText)) {
        console.log(`✅ ${description}: 找到 "${searchText}"`);
        return true;
    } else {
        console.log(`❌ ${description}: 未找到 "${searchText}"`);
        return false;
    }
}

function main() {
    console.log('🔍 验证图标功能实现...\n');
    
    let allChecks = [];
    
    // 1. 核心服务文件
    console.log('📁 核心服务文件:');
    allChecks.push(checkFile('src/services/iconService.ts', '图标服务'));
    allChecks.push(checkFile('src/plugins/IconPlugin.ts', 'Capacitor插件接口'));
    allChecks.push(checkFile('android/app/src/main/java/com/mistycrown/lumostime/IconPlugin.java', 'Android原生插件'));
    
    // 2. UI组件文件
    console.log('\n🎨 UI组件文件:');
    allChecks.push(checkFile('src/components/IconPreview.tsx', '图标预览组件'));
    allChecks.push(checkFile('src/components/IconDebugModal.tsx', '调试模态框'));
    allChecks.push(checkFile('src/components/IconChangeModal.tsx', '切换进度模态框'));
    
    // 3. 图标资源文件
    console.log('\n🖼️ 图标资源文件:');
    const iconStyles = ['neon', 'paper', 'pixel', 'sketch'];
    iconStyles.forEach(style => {
        allChecks.push(checkFile(`public/icon_style/icon_${style}.png`, `${style}风格图标`));
    });
    
    // 4. Android配置检查
    console.log('\n📱 Android配置:');
    allChecks.push(checkFileContent(
        'android/app/src/main/java/com/mistycrown/lumostime/MainActivity.java',
        'registerPlugin(IconPlugin.class)',
        'MainActivity插件注册'
    ));
    
    allChecks.push(checkFileContent(
        'android/app/src/main/AndroidManifest.xml',
        'MainActivityNeon',
        'AndroidManifest Activity别名'
    ));
    
    allChecks.push(checkFileContent(
        'android/app/src/main/AndroidManifest.xml',
        'INSTALL_SHORTCUT',
        'AndroidManifest 权限配置'
    ));
    
    // 5. 功能特性检查
    console.log('\n⚙️ 功能特性:');
    allChecks.push(checkFileContent(
        'src/services/iconService.ts',
        'refreshLauncher',
        '启动器刷新功能'
    ));
    
    allChecks.push(checkFileContent(
        'android/app/src/main/java/com/mistycrown/lumostime/IconPlugin.java',
        'refreshLauncher',
        'Android刷新实现'
    ));
    
    allChecks.push(checkFileContent(
        'src/views/SettingsView.tsx',
        'IconChangeModal',
        '设置页面集成'
    ));
    
    allChecks.push(checkFileContent(
        'src/components/IconChangeModal.tsx',
        'onRefreshLauncher',
        '进度模态框刷新功能'
    ));
    
    // 6. Android资源检查
    console.log('\n📦 Android资源:');
    const densities = ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'];
    let resourceCount = 0;
    let totalResources = 0;
    
    iconStyles.forEach(style => {
        densities.forEach(density => {
            totalResources += 2; // 普通和圆形图标
            const iconFile = `android/app/src/main/res/mipmap-${density}/ic_launcher_${style}.png`;
            const roundIconFile = `android/app/src/main/res/mipmap-${density}/ic_launcher_${style}_round.png`;
            
            if (fs.existsSync(iconFile)) resourceCount++;
            if (fs.existsSync(roundIconFile)) resourceCount++;
        });
    });
    
    console.log(`📊 Android资源: ${resourceCount}/${totalResources} 个文件存在`);
    allChecks.push(resourceCount === totalResources);
    
    // 7. 生成报告
    console.log('\n' + '='.repeat(60));
    console.log('📋 验证结果汇总');
    console.log('='.repeat(60));
    
    const passedChecks = allChecks.filter(check => check).length;
    const totalChecks = allChecks.length;
    
    console.log(`✅ 通过: ${passedChecks}/${totalChecks} 项检查`);
    
    if (passedChecks === totalChecks) {
        console.log('\n🎉 所有检查通过！图标功能已完整实现。');
        console.log('\n📱 下一步操作:');
        console.log('1. 运行 npx cap sync android 同步到Android');
        console.log('2. 构建并安装到Android设备测试');
        console.log('3. 在设置 > 新赞赏页面中测试图标切换');
        console.log('4. 验证启动器刷新功能是否正常工作');
    } else {
        console.log('\n⚠️ 部分检查失败，请修复上述问题。');
        console.log('\n🔧 可能的解决方案:');
        console.log('1. 运行 node scripts/generate-android-icons.js 生成资源');
        console.log('2. 检查文件路径和权限');
        console.log('3. 确认所有组件正确导入和注册');
    }
    
    console.log('='.repeat(60));
    
    return passedChecks === totalChecks;
}

main();