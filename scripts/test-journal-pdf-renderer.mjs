/**
 * @file test-journal-pdf-renderer.mjs
 * @input Real journal export panel/service, production CSS and synthetic Chinese records
 * @output Native Chromium assertions, A4/A5 PDFs and mobile/desktop screenshots in a temp directory
 * @pos Test runner
 * @updated 2026-10-23: Verifies eight-digit dates and period shortcuts with varied month-long dual-font examples.
 * @updated 2026-10-23: Serves original sticker assets and checks recoverable missing-sticker failures.
 */
import { createRequire } from 'node:module';
import { mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const workspace = process.cwd();
const require = createRequire(path.join(workspace, 'package.json'));
const { build } = require('esbuild');
const directory = await mkdtemp(path.join(tmpdir(), 'lumostime-journal-'));
await build({
  stdin: { resolveDir: workspace, loader: 'tsx', contents: `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JournalPdfExportPanel } from './src/views/settings/JournalPdfExportPanel';
import { createJournalPdf } from './src/services/journalPdfService';
import { JOURNAL_SECTIONS } from './src/utils/journalExport';
import { getJournalQuickRange } from './src/utils/journalExport';
import { journalDemoData } from './scripts/fixtures/journal-demo';
const root = createRoot(document.getElementById('root'));
const passed = [];
const wait = (ms = 40) => new Promise(resolve => setTimeout(resolve, ms));
const check = (value, message) => { if (!value) throw new Error(message); };
const until = async (condition, message) => { for(let i=0;i<3000;i++) { if(condition()) return; await wait(); } throw new Error(message); };
const button = label => [...document.querySelectorAll('button')].find(item => item.textContent === label);
const label = title => [...document.querySelectorAll('label')].find(item => item.textContent === title)?.querySelector('input');
const setInput = async (selector, value) => {
 const input = document.querySelector(selector);
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
 input.dispatchEvent(new Event('input', { bubbles: true }));
 input.dispatchEvent(new Event('change', { bubbles: true })); await wait();
};
const capture = async name => { window.__capture = name; await until(() => !window.__capture, 'Screenshot timed out'); };
let toast;
window.__exports = [];
HTMLAnchorElement.prototype.click = async function() {
 const blob = await (await fetch(this.href)).blob();
 const base64 = await new Promise(resolve => { const r = new FileReader(); r.onload = () => resolve(r.result.split(',')[1]); r.readAsDataURL(blob); });
 window.__exports.push({ name: this.download, base64 });
};
const data = journalDemoData;
async function run() {
 root.render(<main className="max-w-xl mx-auto p-3"><JournalPdfExportPanel data={data} onToast={(type,message)=>{toast={type,message};}} /></main>);
 await until(()=>button('导出手账 PDF'),'Panel did not mount');
 await document.fonts.load('16px VerifiedChinese','手账导出章节日期');
 check(document.fonts.check('16px VerifiedChinese','手账导出章节日期'),'Chinese UI font did not load');
 check(!document.querySelector('input[type=date]'),'Native date picker remains');
 for(const [preset,title] of [['week','本周'],['lastWeek','上周'],['month','本月'],['lastMonth','上月'],['year','本年'],['lastYear','去年']]){
  button(title).click(); await wait(); const expected=getJournalQuickRange(data,preset);
  check(document.querySelector('[aria-label="PDF 起始日期"]').value===expected.startDate.replace(/-/g,'') && document.querySelector('[aria-label="PDF 结束日期"]').value===expected.endDate.replace(/-/g,''),'Incorrect period shortcut: '+title);
 }
 await setInput('[aria-label="PDF 起始日期"]','20260230');
 check(button('导出手账 PDF').disabled,'Impossible date reuses previous valid range');
 await setInput('[aria-label="PDF 起始日期"]','20260810');
 await setInput('[aria-label="PDF 结束日期"]','20260803');
 check(button('导出手账 PDF').disabled && document.querySelector('[role=alert]'),'Reversed dates allowed');
 await setInput('[aria-label="PDF 起始日期"]','20260801');
 await setInput('[aria-label="PDF 结束日期"]','20260831');
 label('一日一页').click(); await wait();
 button('全选').click(); await wait();
 check([...document.querySelectorAll('input[type=checkbox]')].slice(0,JOURNAL_SECTIONS.length).every(input=>input.checked),'Select all omitted chapters');
 await capture('journal-mobile');
 check(document.documentElement.scrollWidth <= innerWidth,'Mobile form overflows horizontally');
 // Simulate a font resource failure before any successful export.
 const originalFetch=window.fetch.bind(window);
 window.fetch=(url,...args)=>String(url).includes('LXGWWenKai')?Promise.reject(new Error('模拟字体读取失败')):originalFetch(url,...args);
 toast=null; button('导出手账 PDF').click();
 await until(()=>toast?.type==='error' && button('导出手账 PDF') && !button('导出手账 PDF').disabled,'Export failure did not recover controls');
 check(window.__exports.length===0,'Failed export downloaded a partial file');
 window.fetch=originalFetch;
 passed.push('Strict date validation, all eight sections, mobile bounds and font-failure recovery');
 toast=null; button('导出手账 PDF').click();
 await until(()=>button('取消'),'Cancel control did not appear'); button('取消').click();
 await until(()=>toast?.type==='info' && button('导出手账 PDF'),'Cancellation did not restore controls');
 check(window.__exports.length===0,'Cancelled export downloaded a partial file');
 passed.push('Cancellation leaves no partial download and restores controls');
 toast=null; button('导出手账 PDF').click();
 await until(()=>{if(toast?.type==='error')throw new Error(toast.message);return window.__exports.length===1&&toast?.type==='success';},'A4 export failed');
 check(window.__exports[0].name.endsWith('_20260801_20260831.pdf'),'Download filename does not match selected dates');
 window.__exports[0].name='journal-a4.pdf';
 passed.push('All eight chapters export a real A4 PDF with Chinese, emoji, time grids, separate logs and checks');
 const size=document.getElementById('journal-paper-size'); size.value='a5'; size.dispatchEvent(new Event('change',{bubbles:true})); await wait();
 toast=null; button('导出手账 PDF').click();
 await until(()=>{if(toast?.type==='error')throw new Error(toast.message);return window.__exports.length===2&&toast?.type==='success';},'A5 export failed');
 window.__exports[1].name='journal-a5.pdf';
 passed.push('A5 export through actual paper selection');
 let stickerFailure='';
 try {
  await createJournalPdf({...data,dailyReviews:[{id:'missing',date:'2026-08-03',createdAt:0,updatedAt:0,answers:[],moodEmoji:'image:/sticker/missing-for-test.webp'}]}, {startDate:'2026-08-03',endDate:'2026-08-03',sections:['daily'],paperSize:'a5',includeCover:false,includeEmptyDays:false});
 } catch(error) { stickerFailure=String(error.message); }
 check(stickerFailure.includes('贴纸图片读取失败'),'Missing sticker was silently omitted');
 check(window.__exports.length===2,'Failed sticker export created a partial download');
 passed.push('Original sticker images render and missing assets surface a recoverable export error');
 const moodDays=Array.from({length:365},(_,index)=>{
  const date=new Date(2026,0,index+1);
  const key=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
  return data.dailyReviews.find(review=>review.date===key)||{id:'year-mood-'+index,date:key,createdAt:0,updatedAt:0,answers:[],moodEmoji:'image:/sticker/water3/'+String(index%16+1).padStart(2,'0')+'.webp'};
 });
 const moodYear=await createJournalPdf({...data,dailyReviews:moodDays},{startDate:'2026-01-01',endDate:'2026-12-31',sections:['yearly'],paperSize:'a5',includeCover:false,includeEmptyDays:false});
 const moodBase64=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob([moodYear.bytes],{type:'application/pdf'}));});
 window.__exports.push({name:'journal-mood-year-a5.pdf',base64:moodBase64});
 passed.push('A full 365-day compact annual mood-sticker example exports on A5');
 button('清空').click(); await wait(); check(button('导出手账 PDF').disabled,'Empty section selection allowed');
 label('日志').click(); await wait();
 // Direct byte export isolates selected-section behavior and empty date handling.
 const one=await createJournalPdf({...data,logs:[],todos:[],dailyReviews:[],goals:[],weeklyReviews:[]},{startDate:'2026-08-03',endDate:'2026-08-03',sections:['logs'],paperSize:'a5',includeCover:false,includeEmptyDays:true});
 check(one.pageCount===2,'Empty timeline should contain contents and a printable date');
 passed.push('Empty book, omitted chapters and section validation');
 await capture('journal-desktop');
 document.documentElement.classList.add('dark'); await capture('journal-dark');
 window.__result={passed};
}
run().catch(error=>window.__result={error:String(error.stack||error),passed});
` },
  bundle: true, outfile: path.join(directory, 'test.js'), platform: 'browser', format: 'iife',
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env.BASE_URL': '"/"' }
});
const css = (await readdir(path.join(workspace, 'dist/assets'))).filter(file => file.endsWith('.css'));
if (!css.length) throw new Error('Run npm run build first');
await writeFile(path.join(directory, 'test.css'), (await Promise.all(css.map(file => readFile(path.join(workspace, 'dist/assets', file), 'utf8')))).join('\n'), 'utf8');
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:url(/fonts/LXGWWenKaiLite-Regular.woff2)}body{background:#f5f5f4;font-family:VerifiedChinese}.dark body{background:#0c0a09}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
const server = createServer(async (request, response) => {
  try {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    const base = /^(fonts|sticker)\//.test(relative) ? path.join(workspace, 'public') : directory;
    const filename = path.resolve(base, relative || 'index.html');
    if (!filename.startsWith(base + path.sep)) { response.writeHead(403).end(); return; }
    response.setHeader('Content-Type', ({ '.html':'text/html', '.css':'text/css', '.js':'application/javascript', '.woff2':'font/woff2' })[path.extname(filename)] || 'application/octet-stream');
    response.end(await readFile(filename));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
await writeFile(path.join(directory, 'main.cjs'), `
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs/promises'); const path=require('node:path');
app.setPath('userData',path.join(__dirname,'profile'));
setTimeout(()=>app.exit(1),240000);
app.whenReady().then(async()=>{
 const window=new BrowserWindow({show:false,width:390,height:1000,webPreferences:{contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await window.loadURL(${JSON.stringify(url)});
 let result;
 for(let i=0;i<4000;i++){
  const capture=await window.webContents.executeJavaScript('window.__capture');
  if(capture){
   if(capture==='journal-desktop')window.setSize(1000,1100);
   await new Promise(resolve=>setTimeout(resolve,150));
   await fs.writeFile(path.join(__dirname,capture+'.png'),(await window.webContents.capturePage()).toPNG());
   await window.webContents.executeJavaScript('window.__capture=null');
  }
  result=await window.webContents.executeJavaScript('window.__result'); if(result)break;
  await new Promise(resolve=>setTimeout(resolve,40));
 }
 const files=await window.webContents.executeJavaScript('window.__exports||[]');
 for(const file of files)await fs.writeFile(path.join(__dirname,file.name),Buffer.from(file.base64,'base64'));
 console.log(JSON.stringify({...result,directory:__dirname},null,2));
 app.exit(result&&!result.error?0:1);
}).catch(error=>{console.error(error);app.exit(1);});
`, 'utf8');
const env = { ...process.env }; delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require('electron'), [path.join(directory, 'main.cjs')], { env, stdio: 'inherit', windowsHide: true });
child.on('exit', code => { server.close(); process.exitCode = code ?? 1; });
child.on('error', error => { console.error(error); server.close(); process.exitCode = 1; });
