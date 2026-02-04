#!/usr/bin/env node

/**
 * 安装图像处理依赖
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🔧 检查图像处理依赖...\n');

// 检查是否已安装
function checkDependency(name) {
    try {
        require.resolve(name);
        return true;
    } catch (e) {
        return false;
    }
}

const deps = [
    { name: 'sharp', description: '高性能图像处理库 (推荐)' },
    { name: 'canvas', description: '备用图像处理库' }
];

let hasAnyDep = false;

for (const dep of deps) {
    const installed = checkDependency(dep.name);
    console.log(`${installed ? '✅' : '❌'} ${dep.name} - ${dep.description}`);
    if (installed) hasAnyDep = true;
}

if (hasAnyDep) {
    console.log('\n✅ 已有可用的图像处理依赖，可以直接运行图标处理');
    console.log('运行命令: npm run process-icons');
} else {
    console.log('\n📦 正在安装 sharp (推荐的图像处理库)...');
    
    try {
        execSync('npm install sharp --save-dev', { stdio: 'inherit' });
        console.log('\n✅ sharp 安装成功！');
        console.log('现在可以运行: npm run process-icons');
    } catch (error) {
        console.log('\n❌ sharp 安装失败，尝试安装 canvas...');
        
        try {
            execSync('npm install canvas --save-dev', { stdio: 'inherit' });
            console.log('\n✅ canvas 安装成功！');
            console.log('现在可以运行: npm run process-icons');
        } catch (error2) {
            console.log('\n❌ 图像处理依赖安装失败');
            console.log('请手动安装以下依赖之一:');
            console.log('  npm install sharp --save-dev  (推荐)');
            console.log('  npm install canvas --save-dev  (备用)');
            console.log('\n注意: canvas 依赖可能需要系统级依赖，详见: https://github.com/Automattic/node-canvas');
        }
    }
}