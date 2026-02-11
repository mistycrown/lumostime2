// ==UserScript==
// @name         即梦图片快速查看器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在即梦网页版添加悬浮按钮，快速在新标签页打开图片
// @author       You
// @match        *://jimeng.jianying.com/*
// @match        *://*.jianying.com/*
// @grant        GM_openInTab
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // 添加样式
    GM_addStyle(`
        .jimeng-quick-view-btn {
            position: fixed;
            bottom: 80px;
            right: 30px;
            width: 56px;
            height: 56px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            cursor: pointer;
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            border: none;
        }
        
        .jimeng-quick-view-btn:hover {
            transform: scale(1.1);
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
        }
        
        .jimeng-quick-view-btn svg {
            width: 28px;
            height: 28px;
            fill: white;
        }
        
        .jimeng-toast {
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 24px;
            border-radius: 8px;
            z-index: 10000;
            font-size: 14px;
            animation: fadeInOut 2s ease-in-out;
        }
        
        @keyframes fadeInOut {
            0%, 100% { opacity: 0; }
            10%, 90% { opacity: 1; }
        }
    `);

    // 创建悬浮按钮
    const button = document.createElement('button');
    button.className = 'jimeng-quick-view-btn';
    button.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
        </svg>
    `;
    document.body.appendChild(button);

    // 显示提示消息
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'jimeng-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }

    // 提取图片链接
    function extractImageUrl() {
        // 查找所有可能的图片元素
        const selectors = [
            '.context-menu-trigger-GWJhnJ img',
            '.preview-k4e1UX',
            'img[src*="dreamina"]',
            'img[src*="byteimg"]',
            'img[alt="Zoomable image"]'
        ];

        for (const selector of selectors) {
            const img = document.querySelector(selector);
            if (img && img.src) {
                return img.src;
            }
        }

        // 如果没找到，尝试查找所有图片
        const allImages = document.querySelectorAll('img');
        for (const img of allImages) {
            if (img.src && (img.src.includes('dreamina') || img.src.includes('byteimg'))) {
                return img.src;
            }
        }

        return null;
    }

    // 按钮点击事件
    button.addEventListener('click', () => {
        const imageUrl = extractImageUrl();
        
        if (imageUrl) {
            // 在新标签页打开图片
            GM_openInTab(imageUrl, { active: true, insert: true });
            showToast('✓ 图片已在新标签页打开');
        } else {
            showToast('✗ 未找到图片链接');
        }
    });

    // 添加键盘快捷键 (Ctrl+Shift+V)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'V') {
            button.click();
        }
    });

    console.log('即梦图片快速查看器已加载');
})();
