#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
UI Icon Manager - 图标管理工具
可视化管理和重命名图标文件
"""

import os
import json
import shutil
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import webbrowser
import threading

# 配置
ICON_BASE_PATH = Path("public/uiicon")
PORT = 8888

# 图标数据（从 uiIconService.ts 提取）
ICON_MAPPING = {
    '01': {'type': 'sync', 'label': '同步', 'group': '核心功能'},
    '02': {'type': 'settings', 'label': '设置', 'group': '核心功能'},
    '03': {'type': 'manage', 'label': '管理', 'group': '核心功能'},
    '04': {'type': 'calendar', 'label': '日历', 'group': '核心功能'},
    '05': {'type': 'add-record', 'label': '记录', 'group': '核心功能'},
    '06': {'type': 'timer', 'label': '计时', 'group': '核心功能'},
    '07': {'type': 'ai-assist', 'label': 'AI助手', 'group': '核心功能'},
    '08': {'type': 'tags', 'label': '标签', 'group': '核心功能'},
    '09': {'type': 'scope', 'label': '领域', 'group': '核心功能'},
    '10': {'type': 'chronicle', 'label': '编年史', 'group': '核心功能'},
    '11': {'type': 'memoir', 'label': '回忆录', 'group': '核心功能'},
    '12': {'type': 'reading', 'label': '阅读', 'group': '核心功能'},
    '13': {'type': 'editing', 'label': '编辑', 'group': '核心功能'},
    '14': {'type': 'sort-asc', 'label': '升序', 'group': '核心功能'},
    '15': {'type': 'sort-desc', 'label': '降序', 'group': '核心功能'},
    '16': {'type': 'data-view', 'label': '数据', 'group': '核心功能'},
    '17': {'type': 'home', 'label': '首页', 'group': '日常生活'},
    '18': {'type': 'sleep', 'label': '睡眠', 'group': '日常生活'},
    '19': {'type': 'commute', 'label': '通勤', 'group': '日常生活'},
    '20': {'type': 'meal', 'label': '用餐', 'group': '日常生活'},
    '21': {'type': 'housework', 'label': '家务', 'group': '日常生活'},
    '22': {'type': 'hygiene', 'label': '卫生', 'group': '日常生活'},
    '23': {'type': 'shopping', 'label': '购物', 'group': '日常生活'},
    '24': {'type': 'chores', 'label': '杂务', 'group': '日常生活'},
    '25': {'type': 'medical', 'label': '医疗', 'group': '日常生活'},
    '26': {'type': 'haircut', 'label': '理发', 'group': '日常生活'},
    '27': {'type': 'cooking', 'label': '烹饪', 'group': '日常生活'},
    '28': {'type': 'pet', 'label': '宠物', 'group': '日常生活'},
    '29': {'type': 'walk', 'label': '散步', 'group': '日常生活'},
    '30': {'type': 'nap', 'label': '小憩', 'group': '日常生活'},
    '31': {'type': 'water', 'label': '喝水', 'group': '日常生活'},
    '32': {'type': 'weather', 'label': '天气', 'group': '日常生活'},
    '33': {'type': 'study', 'label': '学习', 'group': '学习工作'},
    '34': {'type': 'meeting', 'label': '会议', 'group': '学习工作'},
    '35': {'type': 'laptop', 'label': '电脑', 'group': '学习工作'},
    '36': {'type': 'book', 'label': '书籍', 'group': '学习工作'},
    '37': {'type': 'code', 'label': '编程', 'group': '学习工作'},
    '38': {'type': 'thesis', 'label': '论文', 'group': '学习工作'},
    '39': {'type': 'language', 'label': '语言', 'group': '学习工作'},
    '40': {'type': 'money', 'label': '金钱', 'group': '学习工作'},
    '41': {'type': 'wallet', 'label': '钱包', 'group': '学习工作'},
    '42': {'type': 'folder', 'label': '文件夹', 'group': '学习工作'},
    '43': {'type': 'tools', 'label': '工具', 'group': '学习工作'},
    '44': {'type': 'input', 'label': '输入', 'group': '学习工作'},
    '45': {'type': 'phd', 'label': '博士', 'group': '学习工作'},
    '46': {'type': 'wisdom', 'label': '智慧', 'group': '学习工作'},
    '47': {'type': 'ai', 'label': 'AI', 'group': '学习工作'},
    '48': {'type': 'briefcase', 'label': '公文包', 'group': '学习工作'},
    '49': {'type': 'explore', 'label': '探索', 'group': '娱乐社交'},
    '50': {'type': 'love', 'label': '喜欢', 'group': '娱乐社交'},
    '51': {'type': 'handshake', 'label': '握手', 'group': '娱乐社交'},
    '52': {'type': 'social', 'label': '社交', 'group': '娱乐社交'},
    '53': {'type': 'chat', 'label': '聊天', 'group': '娱乐社交'},
    '54': {'type': 'surf', 'label': '上网', 'group': '娱乐社交'},
    '55': {'type': 'watch', 'label': '观看', 'group': '娱乐社交'},
    '56': {'type': 'game', 'label': '游戏', 'group': '娱乐社交'},
    '57': {'type': 'mystery', 'label': '神秘', 'group': '娱乐社交'},
    '58': {'type': 'design', 'label': '设计', 'group': '娱乐社交'},
    '59': {'type': 'music', 'label': '音乐', 'group': '娱乐社交'},
    '60': {'type': 'craft', 'label': '手工', 'group': '娱乐社交'},
    '61': {'type': 'brush', 'label': '书法', 'group': '娱乐社交'},
    '62': {'type': 'travel', 'label': '旅行', 'group': '娱乐社交'},
    '63': {'type': 'photo', 'label': '摄影', 'group': '娱乐社交'},
    '64': {'type': 'movie', 'label': '电影', 'group': '娱乐社交'},
    '65': {'type': 'self', 'label': '自我', 'group': '个人成长'},
    '66': {'type': 'think', 'label': '思考', 'group': '个人成长'},
    '67': {'type': 'workout', 'label': '锻炼', 'group': '个人成长'},
    '68': {'type': 'meditation', 'label': '冥想', 'group': '个人成长'},
    '69': {'type': 'piano', 'label': '钢琴', 'group': '个人成长'},
    '70': {'type': 'art', 'label': '艺术', 'group': '个人成长'},
    '71': {'type': 'volunteer', 'label': '志愿', 'group': '个人成长'},
    '72': {'type': 'novel', 'label': '小说', 'group': '娱乐社交'},
    '73': {'type': 'search', 'label': '搜索', 'group': '个人成长'},
    '74': {'type': 'user', 'label': '用户', 'group': '个人成长'},
    '75': {'type': 'location', 'label': '位置', 'group': '个人成长'},
    '76': {'type': 'bell', 'label': '通知', 'group': '个人成长'},
    '77': {'type': 'trash', 'label': '删除', 'group': '个人成长'},
    '78': {'type': 'lock', 'label': '锁定', 'group': '个人成长'},
    '79': {'type': 'star', 'label': '星标', 'group': '个人成长'},
    '80': {'type': 'share', 'label': '分享', 'group': '个人成长'},
    '81': {'type': 'coffee', 'label': '咖啡', 'group': '日常生活'},
    '82': {'type': 'drink', 'label': '饮品', 'group': '日常生活'},
    '83': {'type': 'laundry', 'label': '洗衣', 'group': '日常生活'},
    '84': {'type': 'gardening', 'label': '园艺', 'group': '日常生活'},
    '85': {'type': 'family', 'label': '家庭', 'group': '日常生活'},
    '86': {'type': 'date', 'label': '约会', 'group': '日常生活'},
    '87': {'type': 'gift', 'label': '礼物', 'group': '日常生活'},
    '88': {'type': 'makeup', 'label': '化妆', 'group': '日常生活'},
    '89': {'type': 'yoga', 'label': '瑜伽', 'group': '个人成长'},
    '90': {'type': 'swim', 'label': '游泳', 'group': '个人成长'},
    '91': {'type': 'cycling', 'label': '骑行', 'group': '个人成长'},
    '92': {'type': 'bill', 'label': '账单', 'group': '娱乐社交'},
    '93': {'type': 'car', 'label': '汽车', 'group': '学习工作'},
    '94': {'type': 'call', 'label': '电话', 'group': '学习工作'},
    '95': {'type': 'email', 'label': '邮件', 'group': '学习工作'},
    '96': {'type': 'delivery', 'label': '快递', 'group': '娱乐社交'},
}

class IconManagerHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urlparse(self.path)
        
        if parsed_path.path == '/':
            self.send_html()
        elif parsed_path.path == '/api/themes':
            self.send_themes()
        elif parsed_path.path == '/api/icons':
            params = parse_qs(parsed_path.query)
            theme = params.get('theme', ['cat'])[0]
            self.send_icons(theme)
        elif parsed_path.path.startswith('/public/'):
            self.serve_file(parsed_path.path[1:])
        else:
            self.send_error(404)

    def do_POST(self):
        if self.path == '/api/swap':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            theme = data['theme']
            num1 = data['num1']
            num2 = data['num2']
            
            result = self.swap_icons(theme, num1, num2)
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
        else:
            self.send_error(404)
    
    def swap_icons(self, theme, num1, num2):
        """交换两个图标文件"""
        try:
            theme_path = ICON_BASE_PATH / theme
            if not theme_path.exists():
                return {'success': False, 'error': f'主题 {theme} 不存在'}
            
            file1 = theme_path / f"{num1}.webp"
            file2 = theme_path / f"{num2}.webp"
            temp_file = theme_path / f"temp_{num1}.webp"
            
            if not file1.exists() or not file2.exists():
                return {'success': False, 'error': '文件不存在'}
            
            # 三步交换
            shutil.move(str(file1), str(temp_file))
            shutil.move(str(file2), str(file1))
            shutil.move(str(temp_file), str(file2))
            
            return {
                'success': True,
                'message': f'成功交换 {num1} 和 {num2}'
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def send_themes(self):
        """发送可用主题列表"""
        themes = []
        if ICON_BASE_PATH.exists():
            themes = [d.name for d in ICON_BASE_PATH.iterdir() if d.is_dir()]
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(themes).encode())
    
    def send_icons(self, theme):
        """发送图标数据"""
        icons = []
        for num, info in sorted(ICON_MAPPING.items()):
            icons.append({
                'num': num,
                'type': info['type'],
                'label': info['label'],
                'group': info['group']
            })
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(icons).encode())
    
    def serve_file(self, filepath):
        """提供静态文件服务"""
        try:
            file_path = Path(filepath)
            if file_path.exists() and file_path.is_file():
                self.send_response(200)
                if filepath.endswith('.webp'):
                    self.send_header('Content-type', 'image/webp')
                elif filepath.endswith('.png'):
                    self.send_header('Content-type', 'image/png')
                self.end_headers()
                with open(file_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404)
        except Exception as e:
            self.send_error(500)

    def send_html(self):
        """发送 HTML 界面"""
        html = '''<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UI Icon Manager - 图标管理工具</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1600px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            padding: 30px;
            padding-bottom: 100px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
            font-size: 32px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .controls {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .theme-btn {
            padding: 12px 24px;
            border: 2px solid #667eea;
            background: white;
            color: #667eea;
            border-radius: 25px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .theme-btn:hover { background: #667eea; color: white; }
        .theme-btn.active { background: #667eea; color: white; }
        .swap-mode {
            position: fixed;
            bottom: 30px;
            right: 30px;
            z-index: 999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            align-items: flex-end;
        }
        .swap-mode-btn {
            padding: 15px 35px;
            border: 3px solid #28a745;
            background: white;
            color: #28a745;
            border-radius: 30px;
            cursor: pointer;
            font-size: 18px;
            font-weight: 700;
            transition: all 0.3s ease;
            box-shadow: 0 5px 20px rgba(40, 167, 69, 0.3);
        }
        .swap-mode-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(40, 167, 69, 0.4);
        }
        .swap-mode-btn.active { 
            background: #28a745; 
            color: white;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { box-shadow: 0 5px 20px rgba(40, 167, 69, 0.3); }
            50% { box-shadow: 0 5px 30px rgba(40, 167, 69, 0.6); }
        }
        .swap-info {
            background: white;
            padding: 12px 20px;
            border-radius: 20px;
            color: #28a745;
            font-weight: 600;
            box-shadow: 0 3px 15px rgba(0, 0, 0, 0.2);
            min-width: 250px;
            text-align: center;
            display: none;
        }
        .swap-info.show {
            display: block;
        }
        .scroll-top-btn {
            position: fixed;
            bottom: 30px;
            left: 30px;
            width: 50px;
            height: 50px;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 24px;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 5px 20px rgba(102, 126, 234, 0.3);
            transition: all 0.3s ease;
            z-index: 998;
        }
        .scroll-top-btn:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
        }
        .scroll-top-btn.show {
            display: flex;
        }
        .icon-grid {
            display: grid;
            grid-template-columns: repeat(8, 1fr);
            gap: 15px;
        }
        .icon-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 12px;
            transition: all 0.3s ease;
            border: 3px solid transparent;
            cursor: pointer;
        }
        .icon-item:hover {
            background: #e9ecef;
            transform: translateY(-3px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        .icon-item.selected {
            border-color: #28a745;
            background: #d4edda;
        }
        .icon-image {
            width: 64px;
            height: 64px;
            object-fit: contain;
            margin-bottom: 10px;
        }
        .icon-number {
            font-size: 14px;
            color: #999;
            margin-bottom: 5px;
            font-weight: 600;
        }
        .icon-label {
            font-size: 14px;
            color: #333;
            text-align: center;
            font-weight: 500;
            margin-bottom: 3px;
        }
        .icon-type {
            font-size: 12px;
            color: #666;
            text-align: center;
            font-family: 'Courier New', monospace;
        }
        .group-header {
            grid-column: 1 / -1;
            padding: 15px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 10px;
            font-size: 18px;
            font-weight: 600;
            margin-top: 20px;
        }
        .group-header:first-child { margin-top: 0; }
        .current-theme {
            text-align: center;
            font-size: 20px;
            color: #667eea;
            margin-bottom: 20px;
            font-weight: 600;
        }
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 25px;
            background: #28a745;
            color: white;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 1000;
        }
        .toast.show { opacity: 1; }
        .toast.error { background: #dc3545; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔄 UI Icon Manager</h1>
        <p class="subtitle">可视化管理和交换图标 - 点击两个图标进行交换</p>
        
        <div class="current-theme" id="currentTheme">当前主题: cat</div>
        
        <div class="controls" id="themeButtons"></div>
        
        <div class="icon-grid" id="iconGrid"></div>
    </div>
    
    <div class="swap-mode">
        <div class="swap-info" id="swapInfo"></div>
        <button class="swap-mode-btn" id="swapModeBtn" onclick="toggleSwapMode()">
            开启交换模式
        </button>
    </div>
    
    <button class="scroll-top-btn" id="scrollTopBtn" onclick="scrollToTop()">
        ↑
    </button>
    
    <div class="toast" id="toast"></div>
    <script>
        let currentTheme = 'cat';
        let swapMode = false;
        let selectedIcon = null;
        let icons = [];
        
        async function loadThemes() {
            const response = await fetch('/api/themes');
            const themes = await response.json();
            const container = document.getElementById('themeButtons');
            themes.forEach(theme => {
                const btn = document.createElement('button');
                btn.className = 'theme-btn';
                btn.textContent = theme;
                btn.onclick = () => switchTheme(theme);
                if (theme === currentTheme) btn.classList.add('active');
                container.appendChild(btn);
            });
        }
        
        async function switchTheme(theme) {
            currentTheme = theme;
            document.getElementById('currentTheme').textContent = `当前主题: ${theme}`;
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.classList.toggle('active', btn.textContent === theme);
            });
            await loadIcons();
        }
        
        async function loadIcons() {
            const response = await fetch(`/api/icons?theme=${currentTheme}`);
            icons = await response.json();
            renderIcons();
        }
        
        function renderIcons() {
            const grid = document.getElementById('iconGrid');
            grid.innerHTML = '';
            let currentGroup = '';
            
            // 添加时间戳避免缓存
            const timestamp = new Date().getTime();
            
            icons.forEach(icon => {
                if (icon.group !== currentGroup) {
                    currentGroup = icon.group;
                    const groupHeader = document.createElement('div');
                    groupHeader.className = 'group-header';
                    groupHeader.textContent = currentGroup;
                    grid.appendChild(groupHeader);
                }
                
                const item = document.createElement('div');
                item.className = 'icon-item';
                item.dataset.num = icon.num;
                item.onclick = () => handleIconClick(icon.num);
                
                const img = document.createElement('img');
                img.className = 'icon-image';
                // 添加时间戳参数强制刷新
                img.src = `/public/uiicon/${currentTheme}/${icon.num}.webp?t=${timestamp}`;
                img.alt = icon.label;
                img.onerror = function() {
                    this.style.display = 'none';
                    const errorText = document.createElement('div');
                    errorText.textContent = '❌';
                    errorText.style.fontSize = '32px';
                    this.parentElement.appendChild(errorText);
                };
                
                const number = document.createElement('div');
                number.className = 'icon-number';
                number.textContent = `#${icon.num}`;
                
                const label = document.createElement('div');
                label.className = 'icon-label';
                label.textContent = icon.label;
                
                const type = document.createElement('div');
                type.className = 'icon-type';
                type.textContent = icon.type;
                
                item.appendChild(img);
                item.appendChild(number);
                item.appendChild(label);
                item.appendChild(type);
                grid.appendChild(item);
            });
        }
        
        function toggleSwapMode() {
            swapMode = !swapMode;
            const btn = document.getElementById('swapModeBtn');
            const info = document.getElementById('swapInfo');
            if (swapMode) {
                btn.classList.add('active');
                btn.textContent = '关闭交换模式';
                info.textContent = '请选择第一个要交换的图标';
                info.classList.add('show');
            } else {
                btn.classList.remove('active');
                btn.textContent = '开启交换模式';
                info.textContent = '';
                info.classList.remove('show');
                clearSelection();
            }
        }
        
        function handleIconClick(num) {
            if (!swapMode) return;
            
            const info = document.getElementById('swapInfo');
            
            if (!selectedIcon) {
                selectedIcon = num;
                document.querySelector(`[data-num="${num}"]`).classList.add('selected');
                info.textContent = `已选择 #${num}，请选择第二个要交换的图标`;
            } else if (selectedIcon === num) {
                clearSelection();
                info.textContent = '请选择第一个要交换的图标';
            } else {
                swapIcons(selectedIcon, num);
            }
        }
        
        function clearSelection() {
            if (selectedIcon) {
                const elem = document.querySelector(`[data-num="${selectedIcon}"]`);
                if (elem) elem.classList.remove('selected');
                selectedIcon = null;
            }
        }
        
        async function swapIcons(num1, num2) {
            const info = document.getElementById('swapInfo');
            info.textContent = '正在交换...';
            
            try {
                const response = await fetch('/api/swap', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        theme: currentTheme,
                        num1: num1,
                        num2: num2
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    showToast(`成功交换 #${num1} 和 #${num2}`, 'success');
                    clearSelection();
                    info.textContent = '交换成功！正在刷新...';
                    
                    // 强制刷新图片 - 添加时间戳避免缓存
                    await new Promise(resolve => setTimeout(resolve, 300));
                    await loadIcons();
                    
                    // 刷新完成后更新提示
                    info.textContent = '请选择下一组要交换的图标';
                } else {
                    showToast(`交换失败: ${result.error}`, 'error');
                    info.textContent = '交换失败，请重试';
                }
            } catch (error) {
                showToast(`交换失败: ${error.message}`, 'error');
                info.textContent = '交换失败，请重试';
            }
        }
        
        function showToast(message, type = 'success') {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast show' + (type === 'error' ? ' error' : '');
            setTimeout(() => toast.classList.remove('show'), 3000);
        }
        
        function scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // 监听滚动，显示/隐藏回到顶部按钮
        window.addEventListener('scroll', () => {
            const scrollTopBtn = document.getElementById('scrollTopBtn');
            if (window.scrollY > 300) {
                scrollTopBtn.classList.add('show');
            } else {
                scrollTopBtn.classList.remove('show');
            }
        });
        
        // 初始化
        loadThemes();
        loadIcons();
    </script>
</body>
</html>
'''
        self.send_response(200)
        self.send_header('Content-type', 'text/html; charset=utf-8')
        self.end_headers()
        self.wfile.write(html.encode('utf-8'))
    
    def log_message(self, format, *args):
        """静默日志"""
        pass

def run_server():
    """运行服务器"""
    server = HTTPServer(('localhost', PORT), IconManagerHandler)
    print(f"🚀 图标管理工具已启动")
    print(f"📍 访问地址: http://localhost:{PORT}")
    print(f"💡 在浏览器中打开上述地址即可使用")
    print(f"⚠️  按 Ctrl+C 停止服务器\n")
    
    # 自动打开浏览器
    threading.Timer(1.0, lambda: webbrowser.open(f'http://localhost:{PORT}')).start()
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\n👋 服务器已停止")
        server.shutdown()

if __name__ == '__main__':
    run_server()
