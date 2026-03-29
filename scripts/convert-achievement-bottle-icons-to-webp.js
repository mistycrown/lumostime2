/**
 * @file convert-achievement-bottle-icons-to-webp.js
 * @description 将 public/stars 下的成就瓶图标包素材统一转换为 WebP，并按数字序号重命名。
 *
 * @input public/stars 下的全部图标包素材
 * @output public/stars/<pack>/01.webp、02.webp... 形式的规范化图标素材
 * @updated 2026-03-28: Normalize achievement bottle icon packs to sequentially numbered WebP files with backup support for source PNGs.
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const STARS_DIR = path.join(rootDir, 'public', 'stars');
const BACKUP_DIR = path.join(rootDir, 'static', 'png_backup');
const WEBP_QUALITY = 92;
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const fileNameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

async function findPackDirectories(dir) {
  const directories = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      directories.push(fullPath);
    }
  }

  return directories.sort((first, second) => fileNameCollator.compare(path.basename(first), path.basename(second)));
}

async function findPackImageFiles(packDir) {
  const entries = await fs.readdir(packDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
    .map((entry) => path.join(packDir, entry.name))
    .sort((first, second) => fileNameCollator.compare(path.basename(first), path.basename(second)));
}

async function backupSourceFile(filePath) {
  const relativePath = path.relative(rootDir, filePath);
  const backupPath = path.join(BACKUP_DIR, relativePath);

  await fs.mkdir(path.dirname(backupPath), { recursive: true });
  await fs.copyFile(filePath, backupPath);
}

async function normalizePackFiles(packDir) {
  const sourceFiles = await findPackImageFiles(packDir);

  if (sourceFiles.length === 0) {
    return {
      packName: path.basename(packDir),
      normalizedCount: 0,
      convertedCount: 0,
      renamedCount: 0,
      originalSize: 0,
      newSize: 0
    };
  }

  let convertedCount = 0;
  let renamedCount = 0;
  let originalSize = 0;
  let newSize = 0;

  const temporaryFiles = [];

  for (let index = 0; index < sourceFiles.length; index += 1) {
    const sourcePath = sourceFiles[index];
    const extension = path.extname(sourcePath).toLowerCase();
    const temporaryPath = path.join(packDir, `__tmp__${String(index + 1).padStart(2, '0')}.webp`);
    const sourceStats = await fs.stat(sourcePath);

    originalSize += sourceStats.size;

    if (extension === '.webp') {
      await fs.rename(sourcePath, temporaryPath);
      renamedCount += 1;
    } else {
      await backupSourceFile(sourcePath);
      await sharp(sourcePath)
        .webp({ quality: WEBP_QUALITY, lossless: false })
        .toFile(temporaryPath);
      await fs.unlink(sourcePath);
      convertedCount += 1;
    }

    const temporaryStats = await fs.stat(temporaryPath);
    newSize += temporaryStats.size;
    temporaryFiles.push(temporaryPath);
  }

  for (let index = 0; index < temporaryFiles.length; index += 1) {
    const finalPath = path.join(packDir, `${String(index + 1).padStart(2, '0')}.webp`);
    await fs.rename(temporaryFiles[index], finalPath);
  }

  return {
    packName: path.basename(packDir),
    normalizedCount: sourceFiles.length,
    convertedCount,
    renamedCount,
    originalSize,
    newSize
  };
}

async function main() {
  console.log('🚀 开始整理成就瓶图标包资源...\n');

  await fs.access(STARS_DIR);
  const packDirectories = await findPackDirectories(STARS_DIR);

  if (packDirectories.length === 0) {
    console.log('✨ public/stars 下没有找到图标包目录。');
    return;
  }

  let normalizedCount = 0;
  let convertedCount = 0;
  let renamedCount = 0;
  let totalOriginalSize = 0;
  let totalNewSize = 0;

  for (const packDir of packDirectories) {
    const result = await normalizePackFiles(packDir);
    normalizedCount += result.normalizedCount;
    convertedCount += result.convertedCount;
    renamedCount += result.renamedCount;
    totalOriginalSize += result.originalSize;
    totalNewSize += result.newSize;

    if (result.normalizedCount > 0) {
      console.log(`✅ ${result.packName}: ${result.normalizedCount} 个文件已整理为 01.webp...`);
    }
  }

  const saved = totalOriginalSize - totalNewSize;
  const reduction = totalOriginalSize > 0
    ? ((saved / totalOriginalSize) * 100).toFixed(1)
    : '0.0';

  console.log('\n' + '='.repeat(60));
  console.log(`✅ 规范化文件: ${normalizedCount} 个`);
  console.log(`🖼️  PNG/JPG 转 WebP: ${convertedCount} 个`);
  console.log(`🔁 原有 WebP 重命名: ${renamedCount} 个`);
  console.log(`💾 体积变化: ${(totalOriginalSize / 1024).toFixed(2)} KB -> ${(totalNewSize / 1024).toFixed(2)} KB`);
  console.log(`📉 节省体积: ${(saved / 1024).toFixed(2)} KB (${reduction}%)`);
  console.log(`🗂️  原始 PNG 备份目录: ${path.relative(rootDir, BACKUP_DIR)}`);
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('❌ 转换失败:', error);
  process.exit(1);
});
