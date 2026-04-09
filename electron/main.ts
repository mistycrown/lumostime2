/**
 * @file main.ts
 * @input App Lifecycle
 * @output Window Management
 * @pos Electron Main
 * @description Entry point for the Electron application. Handles window creation, lifecycle events, and inter-process communication (IPC).
 * @updated 2026-04-09: Added Obsidian image attachment export IPC handler for desktop builds.
 * 
 * ⚠️ Once I am updated, be sure to update my header comment and the folder's md.
 */
import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs   > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.APP_ROOT = path.join(__dirname, '..')

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
    ? path.join(process.env.APP_ROOT, 'public')
    : RENDERER_DIST

// Disable GPU Acceleration for Windows 7
if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
    app.quit()
    process.exit(0)
}

let win: BrowserWindow | null = null
// Preload script is in the same directory as main.js after build
const preload = path.join(__dirname, 'preload.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

async function createWindow() {
    const iconPath = path.join(process.env.VITE_PUBLIC, 'icon.ico');
    console.log('Icon Path:', iconPath);

    win = new BrowserWindow({
        title: 'LumosTime',
        icon: iconPath,
        width: 600,
        height: 900,
        resizable: true, // 允许用户调整大小
        webPreferences: {
            preload,
            // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
            //nodeIntegration: true,

            // Consider using contextBridge.exposeInMainWorld
            // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
            // contextIsolation: false,

            // CRITICAL FOR WEBDAV: Disable Web Security to bypass CORS
            webSecurity: false,
        },
    })

    // 隐藏菜单栏 (可选)
    win.setMenuBarVisibility(false)

    if (VITE_DEV_SERVER_URL) {
        console.log('Loading URL:', VITE_DEV_SERVER_URL)
        win.loadURL(VITE_DEV_SERVER_URL)
        win.webContents.openDevTools()
    } else {
        console.log('Loading File:', indexHtml)
        win.loadFile(indexHtml)
    }

    // Make all links open with the browser, not with the application
    win.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('https:')) shell.openExternal(url)
        return { action: 'deny' }
    })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
    win = null
    if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
    if (win) {
        // Focus on the main window if the user tried to open another
        if (win.isMinimized()) win.restore()
        win.focus()
    }
})

app.on('activate', () => {
    const allWindows = BrowserWindow.getAllWindows()
    if (allWindows.length) {
        allWindows[0].focus()
    } else {
        createWindow()
    }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
    const childWindow = new BrowserWindow({
        webPreferences: {
            preload,
            nodeIntegration: true,
            contextIsolation: false,
        },
    })

    if (VITE_DEV_SERVER_URL) {
        childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
    } else {
        childWindow.loadFile(indexHtml, { hash: arg })
    }
})

// Obsidian Export: 写入 Markdown 文件
import fs from 'fs/promises'

ipcMain.handle('write-obsidian-file', async (_, { filePath, content }) => {
    try {
        // 确保目录存在
        const dir = path.dirname(filePath)
        await fs.mkdir(dir, { recursive: true })

        let finalContent = content

        // 检测文件是否已存在
        try {
            const existingContent = await fs.readFile(filePath, 'utf-8')
            // 如果文件存在,追加新内容(在末尾添加分隔符和新内容)
            finalContent = existingContent + '\n\n---\n\n' + content
            console.log(`📝 文件已存在,追加内容: ${filePath}`)
        } catch (error: any) {
            // 文件不存在,使用新内容
            if (error.code === 'ENOENT') {
                console.log(`📄 创建新文件: ${filePath}`)
            } else {
                throw error
            }
        }

        // 写入文件 (UTF-8 编码)
        await fs.writeFile(filePath, finalContent, 'utf-8')

        console.log(`✅ Obsidian 文件写入成功: ${filePath}`)
        return { success: true }
    } catch (error: any) {
        console.error('❌ 写入 Obsidian 文件失败:', error)
        throw new Error(`文件写入失败: ${error.message}`)
    }
})

ipcMain.handle('write-obsidian-images', async (_, { rootPath, imageFolderName, files }) => {
    try {
        if (!rootPath || !imageFolderName || !Array.isArray(files)) {
            throw new Error('Invalid parameters for image export');
        }

        const safeRoot = path.resolve(rootPath);
        const targetDir = path.resolve(safeRoot, imageFolderName);
        const relativeDir = path.relative(safeRoot, targetDir);
        if (relativeDir.startsWith('..') || path.isAbsolute(relativeDir)) {
            throw new Error('Image folder must stay within the configured root path');
        }

        await fs.mkdir(targetDir, { recursive: true });

        let saved = 0;
        for (const file of files) {
            if (!file?.filename || !file?.base64Data) continue;
            const buffer = Buffer.from(file.base64Data, 'base64');
            const destPath = path.join(targetDir, file.filename);
            await fs.writeFile(destPath, buffer);
            saved += 1;
        }

        return { success: true, saved };
    } catch (error: any) {
        console.error('Failed to write Obsidian images:', error);
        throw new Error(`Image file write failed: ${error.message}`);
    }
})

// 图标更新: 更新应用图标
ipcMain.on('update-app-icon', (_, iconPath) => {
    try {
        if (win) {
            console.log('[Electron] 收到图标更新请求:', iconPath);
            
            // 移除开头的 / 以避免路径拼接问题
            const cleanPath = iconPath.startsWith('/') ? iconPath.slice(1) : iconPath;
            console.log('[Electron] 清理后的路径:', cleanPath);
            
            // 拼接完整路径
            const fullIconPath = path.join(process.env.VITE_PUBLIC || '', cleanPath);
            console.log('[Electron] 完整路径:', fullIconPath);
            console.log('[Electron] 文件是否存在:', require('fs').existsSync(fullIconPath));
            
            if (!require('fs').existsSync(fullIconPath)) {
                console.log('[Electron] ❌ 文件不存在，使用默认图标');
                const defaultIcon = path.join(process.env.VITE_PUBLIC || '', 'icon.ico');
                win.setIcon(defaultIcon);
                return;
            }
            
            console.log('[Electron] 最终使用的图标路径:', fullIconPath);
            
            // 更新窗口图标
            win.setIcon(fullIconPath);
            console.log('[Electron] ✓ 窗口图标已更新');
            
            // 更新任务栏图标 (Windows)
            if (process.platform === 'win32') {
                win.setOverlayIcon(fullIconPath, 'LumosTime');
                console.log('[Electron] ✓ 任务栏覆盖图标已更新');
            }
            
            console.log('[Electron] ✅ 应用图标更新成功');
        } else {
            console.log('[Electron] ❌ 窗口对象不存在');
        }
    } catch (error: any) {
        console.error('[Electron] ❌ 更新应用图标失败:', error);
        console.error('[Electron] 错误堆栈:', error.stack);
    }
});
