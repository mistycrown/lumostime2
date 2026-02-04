#!/usr/bin/env node

/**
 * 测试图标路径是否正确
 */

import fs from 'fs';
import path from 'path';
import { ICON_OPTIONS } from '../src/services/iconService.ts';

console.log('🔍 检查图标路径...\n');

const iconStyleDir = 'public/icon_style';
const existingFiles = fs.readdirSync(iconStyleDir).filter(f => f.endsWith('.png'));

console.log(`📁 找到 ${existingFiles.length} 个图标文件:`);
existingFiles.forEach(file => console.log(`  - ${file}`));

console.log(`\n📋 配置中有 ${ICON_OPTIONS.length} 个图标选项:`);

let missingCount = 0;
let foundCount = 0;

ICON_OPTIONS.forEach(option => {
    if (option.id === 'default') {
        // 检查默认图标
        const defaultIconPath = 'public/icon.ico';
        if (fs.existsSync(defaultIconPath)) {
            console.log(`✅ ${option.id} - ${option.name} (默认图标)`);
            foundCount++;
        } else {
            console.log(`❌ ${option.id} - ${option.name} (默认图标不存在)`);
            missingCount++;
        }
        return;
    }

    // 从desktopIcon路径提取文件名
    const iconPath = option.desktopIcon?.replace('/icon_style/', '');
    if (!iconPath) {
        console.log(`❌ ${option.id} - ${option.name} (未配置desktopIcon)`);
        missingCount++;
        return;
    }

    // URL解码文件名
    const decodedPath = decodeURIComponent(iconPath);
    const fullPath = path.join(iconStyleDir, decodedPath);
    
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${option.id} - ${option.name}`);
        foundCount++;
    } else {
        console.log(`❌ ${option.id} - ${option.name} (文件不存在: ${decodedPath})`);
        missingCount++;
    }
});

console.log(`\n📊 检查结果:`);
console.log(`✅ 找到: ${foundCount} 个`);
console.log(`❌ 缺失: ${missingCount} 个`);

if (missingCount > 0) {
    console.log('\n💡 建议:');
    console.log('1. 检查文件名是否正确');
    console.log('2. 确认文件存在于 public/icon_style/ 目录');
    console.log('3. 检查URL编码是否正确');
}

// 检查是否有未配置的文件
console.log('\n🔍 检查未配置的文件:');
const configuredFiles = ICON_OPTIONS
    .filter(opt => opt.desktopIcon && opt.id !== 'default')
    .map(opt => decodeURIComponent(opt.desktopIcon.replace('/icon_style/', '')));

const unconfiguredFiles = existingFiles.filter(file => !configuredFiles.includes(file));

if (unconfiguredFiles.length > 0) {
    console.log('📋 以下文件未在配置中:');
    unconfiguredFiles.forEach(file => console.log(`  - ${file}`));
} else {
    console.log('✅ 所有文件都已配置');
}