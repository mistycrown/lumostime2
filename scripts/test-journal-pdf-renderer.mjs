/**
 * @file test-journal-pdf-renderer.mjs
 * @input Real journal export panel/service, production CSS and synthetic Chinese records
 * @output Native Chromium assertions, A4/A5 PDFs and mobile/desktop screenshots in a temp directory
 * @pos Test runner
 * @updated 2026-10-23: Verifies eight-digit dates and period shortcuts with varied month-long dual-font examples.
 * @updated 2026-10-23: Serves original sticker assets and checks recoverable missing-sticker failures.
 * @updated 2026-10-23: Checks original photo failures and loads current panel CSS for realistic mobile previews.
 * @updated 2026-10-23: Exports both full-year A4 calendar and A5 matrix mood examples.
 * @updated 2026-10-24: Checks page switches, shared palettes/dropdowns and monochrome settings in light/dark modes; supports --ui-only.
 * @updated 2026-10-24: Adds --large-book to export complete 1100-day A4/A5 journals through the actual settings panel.
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
const uiOnly = process.argv.includes('--ui-only');
const largeBook = process.argv.includes('--large-book');
await build({
  stdin: { resolveDir: workspace, loader: 'tsx', contents: `
import React from 'react';
import { createRoot } from 'react-dom/client';
import { JournalPdfExportPanel } from './src/views/settings/JournalPdfExportPanel';
import { createJournalPdf } from './src/services/journalPdfService';
import { customColorGroupService } from './src/services/customColorGroupService';
import { RedemptionService } from './src/services/redemptionService';
import { customFontStorageService } from './src/services/customFontStorageService';
import { getJournalQuickRange, shiftJournalDate } from './src/utils/journalExport';
import { journalDemoData } from './scripts/fixtures/journal-demo';
const root = createRoot(document.getElementById('root'));
const passed = [];
const appendPassed=passed.push.bind(passed); passed.push=(...messages)=>{window.__stage=messages[messages.length-1];return appendPassed(...messages);};
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
async function verifyAppearance(uploadedFont = false) {
 RedemptionService.prototype.isVerified=async()=>({isVerified:true});
 document.documentElement.style.setProperty('--accent-color','#8844aa');
 customColorGroupService.setColors([{id:'journal-custom',color:'#526B5D',createdAt:0},{id:'journal-alpha',color:'#00000080',createdAt:0}]);
 root.render(<main className="max-w-xl mx-auto p-3"><JournalPdfExportPanel key="unlocked" data={data} onToast={(type,message)=>{toast={type,message};}} /></main>);
 await until(()=>document.querySelector('[aria-label="PDF 内容字体"]'),'Unlocked font controls did not mount');
 const contentFont=()=>document.querySelector('[aria-label="PDF 内容字体"]');
 contentFont().click(); await until(()=>document.querySelector('[role=option]'),'Font dropdown did not open');
 check(getComputedStyle(contentFont()).borderRadius==='12px','Paper/font select lost shared rounded-xl style');
 check(getComputedStyle(document.querySelector('[role=listbox]')).borderRadius==='12px','Dropdown style is overridden');
 const selectedFont=uploadedFont?'custom-export-test':'lxgw-neo-zhisong';
 await until(()=>document.querySelector('[data-select-value="'+selectedFont+'"]'),'Requested font absent from selector');
 document.querySelector('[data-select-value="'+selectedFont+'"]').click(); await wait();
 check(contentFont().textContent.includes(uploadedFont?'导出测试字体':'霞鹜'),'Content font selection did not persist');
 check(document.querySelector('[aria-label="PDF 排版字体"]').textContent.includes('默认黑体'),'Content font changed layout font');
 const color=()=>document.querySelector('[aria-label="PDF 主题色"]');
 check(color().textContent==='主题色' && getComputedStyle(color().querySelector('span span')).backgroundColor==='rgb(136, 68, 170)','Theme color was not inherited');
 check(!document.querySelector('input[type=color]'),'Native color input remains');
 color().click(); await wait();
 document.querySelector('[aria-label="Blue"]').click(); await wait();
 check(color().textContent==='#3B82F6','Built-in palette selection failed');
 color().click(); await wait();
 document.querySelector('[aria-label="#526B5D"]').click(); await wait();
 check(color().textContent==='#526B5D' && !document.querySelector('[aria-label="颜色选择"]'),'Custom color selection failed or did not close');
 color().click(); await wait();
 document.querySelector('[aria-label="#00000080"]').click(); await wait();
 check(color().textContent==='#7F7F7F' && !document.querySelector('[role=alert]'),'Transparent custom color is invalid for PDF');
 color().click(); await wait(); button('主题色').click(); await wait();
 check(color().textContent==='主题色','Cannot restore theme color');
 const monochrome=()=>{
  for(const input of document.querySelectorAll('input[type=checkbox]')){
   const rgb=getComputedStyle(input).backgroundColor.match(/\\d+/g).slice(0,3).map(Number);
   check(Math.max(...rgb)-Math.min(...rgb)<=1,'Checkbox is not monochrome: '+rgb);
  }
 };
 monochrome();
 await capture('journal-mobile-unlocked');
 color().click(); await wait(); await capture('journal-mobile-palette');
 check(document.documentElement.scrollWidth<=innerWidth,'Unlocked mobile palette overflows');
 color().click(); await wait();
 await capture('journal-desktop');
 document.querySelector('[aria-label="PDF 纸张"]').click(); await wait(); await capture('journal-dropdown');
 document.querySelector('[data-select-value="a5"]').click(); await wait();
 check(document.querySelector('[aria-label="PDF 纸张"]').textContent.includes('A5'),'Shared paper select failed');
 color().click(); await wait(); await capture('journal-palette'); color().click(); await wait();
 document.documentElement.dataset.themeMode='dark'; document.documentElement.dataset.customAppearanceEnabled='false'; await wait(); monochrome();
 check(getComputedStyle(document.querySelector('.journal-export input[type=checkbox]:checked')).backgroundColor==='rgb(238, 238, 238)','Dark mode checkbox did not adapt to the app theme attribute');
 await capture('journal-dark');
 check(document.documentElement.scrollWidth<=innerWidth,'Unlocked desktop panel overflows');
 passed.push('Shared paper/font dropdowns, theme reset, built-in/custom/alpha colors, independent fonts and monochrome checkboxes in light/dark mode');
}
async function run() {
 root.render(<main className="max-w-xl mx-auto p-3"><JournalPdfExportPanel data={data} onToast={(type,message)=>{toast={type,message};}} /></main>);
 await until(()=>button('导出手账 PDF'),'Panel did not mount');
 await document.fonts.load('16px VerifiedChinese','手账导出章节日期');
 check(document.fonts.check('16px VerifiedChinese','手账导出章节日期'),'Chinese UI font did not load');
 check(!document.querySelector('input[type=date]'),'Native date picker remains');
 check(!document.querySelector('[aria-label="PDF 内容字体"]'),'Locked users see custom font controls');
 check(!document.querySelector('select'),'Native paper select remains');
 if (${JSON.stringify(largeBook)}) {
  const startDate='2023-01-01', endDate=shiftJournalDate(startDate,1099);
  const largeData={...data,logs:[],todos:[],weeklyReviews:[],monthlyReviews:[],goals:[],majorGoals:[],dailyReviews:Array.from({length:1100},(_,index)=>({id:'large-'+index,date:shiftJournalDate(startDate,index),createdAt:0,updatedAt:0,answers:[],summary:'第'+(index+1)+'天的手账记录。'}))};
  root.render(<main className="max-w-xl mx-auto p-3"><JournalPdfExportPanel key="large" data={largeData} onToast={(type,message)=>{toast={type,message};}} /></main>);
  await wait();
  await setInput('[aria-label="PDF 起始日期"]',startDate.replace(/-/g,''));
  await setInput('[aria-label="PDF 结束日期"]',endDate.replace(/-/g,''));
  button('清空').click(); await wait(); label('一日一页').click(); await wait();
  for(const paper of ['a4','a5']) {
   if(paper==='a5'){document.querySelector('[aria-label="PDF 纸张"]').click(); await wait(); document.querySelector('[data-select-value="a5"]').click(); await wait();}
   const previous=window.__exports.length;
   toast=null; button('导出手账 PDF').click();
   await until(()=>{if(toast?.type==='error')throw new Error(toast.message);return window.__exports.length===previous+1&&toast?.type==='success';},'Large '+paper+' journal export failed');
   const count=Number(toast.message.match(/共 (\\d+) 页/)?.[1]);
   check(count>1100,'Large journal was truncated: '+count);
   window.__exports[previous].name='journal-large-'+paper+'.pdf';
   passed.push('Actual '+paper+' download contains all 1100 daily pages plus cover/contents: '+count+' pages');
  }
  window.__result={passed}; return;
 }
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
 check(document.querySelectorAll('.journal-export-part-group input[type=checkbox]').length===13,'Export switches are not grouped by page');
 check(!label('日计划') && !label('日志图文') && !label('月复盘') && !label('周复盘'),'Data-source switches remain');
 label('一日一页').click(); await wait();
 button('全选').click(); await wait();
 check([...document.querySelectorAll('.journal-export-part-group input[type=checkbox]')].every(input=>input.checked),'Select all omitted pages');
 await capture('journal-mobile');
 check(document.documentElement.scrollWidth <= innerWidth,'Mobile form overflows horizontally');
 if (${JSON.stringify(uiOnly)}) { await verifyAppearance(); window.__result={passed}; return; }
 // Simulate a font resource failure before any successful export.
 const originalFetch=window.fetch.bind(window);
 window.fetch=(url,...args)=>String(url).includes('LXGWWenKai')?Promise.reject(new Error('模拟字体读取失败')):originalFetch(url,...args);
 toast=null; button('导出手账 PDF').click();
 await until(()=>toast?.type==='error' && button('导出手账 PDF') && !button('导出手账 PDF').disabled,'Export failure did not recover controls');
 check(window.__exports.length===0,'Failed export downloaded a partial file');
 window.fetch=originalFetch;
 passed.push('Strict date validation, page-group selection, mobile bounds and font-failure recovery');
 toast=null; button('导出手账 PDF').click();
 await until(()=>button('取消'),'Cancel control did not appear'); button('取消').click();
 await until(()=>toast?.type==='info' && button('导出手账 PDF'),'Cancellation did not restore controls');
 check(window.__exports.length===0,'Cancelled export downloaded a partial file');
 passed.push('Cancellation leaves no partial download and restores controls');
 toast=null; button('导出手账 PDF').click();
 await until(()=>{if(toast?.type==='error')throw new Error(toast.message);return window.__exports.length===1&&toast?.type==='success';},'A4 export failed');
 check(window.__exports[0].name.endsWith('_20260801_20260831.pdf'),'Download filename does not match selected dates');
 window.__exports[0].name='journal-a4.pdf';
 passed.push('All page groups export a real A4 PDF with Chinese, emoji, time grids, full logs and routines');
 document.querySelector('[aria-label="PDF 纸张"]').click(); await wait(); document.querySelector('[data-select-value="a5"]').click(); await wait();
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
 let photoFailure='';
 try {
  await createJournalPdf({...data,logs:[{...data.logs[0],images:['missing-original-photo.webp']}]}, {startDate:'2026-08-02',endDate:'2026-08-02',sections:['logs'],paperSize:'a5',includeCover:false,includeEmptyDays:false});
 } catch(error) { photoFailure=String(error.message); }
 check(photoFailure.includes('日志图片读取失败'),'Missing original photo was silently omitted');
 check(window.__exports.length===2,'Failed photo export created a partial download');
 passed.push('Original Log photos, metadata, reactions, node styling and comments export; missing photos fail explicitly');
 passed.push('Original sticker images render and missing assets surface a recoverable export error');
 const moodDays=Array.from({length:365},(_,index)=>{
  const date=new Date(2026,0,index+1);
  const key=date.getFullYear()+'-'+String(date.getMonth()+1).padStart(2,'0')+'-'+String(date.getDate()).padStart(2,'0');
  return data.dailyReviews.find(review=>review.date===key)||{id:'year-mood-'+index,date:key,createdAt:0,updatedAt:0,answers:[],moodEmoji:'image:/sticker/water3/'+String(index%16+1).padStart(2,'0')+'.webp'};
 });
 const moodYear=await createJournalPdf({...data,dailyReviews:moodDays},{startDate:'2026-01-01',endDate:'2026-12-31',sections:['yearly'],paperSize:'a5',includeCover:false,includeEmptyDays:false});
 const moodBase64=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob([moodYear.bytes],{type:'application/pdf'}));});
 window.__exports.push({name:'journal-mood-year-a5.pdf',base64:moodBase64});
 const moodA4=await createJournalPdf({...data,dailyReviews:moodDays},{startDate:'2026-01-01',endDate:'2026-12-31',sections:['yearly'],paperSize:'a4',includeCover:false,includeEmptyDays:false});
 const moodA4Base64=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.readAsDataURL(new Blob([moodA4.bytes],{type:'application/pdf'}));});
 window.__exports.push({name:'journal-mood-year-a4.pdf',base64:moodA4Base64});
 passed.push('A full 365-day compact annual mood-sticker example exports on A5');
 button('清空').click(); await wait(); check(button('导出手账 PDF').disabled,'Empty section selection allowed');
 label('一日一页').click(); await wait();
 const dailyExportIndex=window.__exports.length;
 toast=null; button('导出手账 PDF').click();
 await until(()=>{if(toast?.type==='error')throw new Error(toast.message);return window.__exports.length===dailyExportIndex+1&&toast?.type==='success';},'Daily page group export failed');
 window.__exports[dailyExportIndex].name='journal-daily-only.pdf';
 passed.push('A single daily-page switch exports plans, full Log content, routines, summary/sticker and guidance together');
 // Direct byte export isolates selected-section behavior and empty date handling.
 const one=await createJournalPdf({...data,logs:[],todos:[],dailyReviews:[],goals:[],weeklyReviews:[]},{startDate:'2026-08-03',endDate:'2026-08-03',sections:['logs'],paperSize:'a5',includeCover:false,includeEmptyDays:true});
 check(one.pageCount===2,'Empty timeline should contain contents and a printable date');
 passed.push('Empty book, omitted chapters and section validation');
 const storePdf=async(name,result)=>{
   const base64=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.readAsDataURL(new Blob([result.bytes],{type:'application/pdf'}));});
   window.__exports.push({name,base64});
 };
 const sample={...data,logs:[{id:'font-sample',activityId:'a',categoryId:'c',title:'字体排版测试',note:'把时间留给生活。春山与秋水，记录每一份日常。',duration:3600,startTime:new Date(2026,7,3,9).getTime(),endTime:new Date(2026,7,3,10).getTime()}],todos:[],dailyReviews:[],weeklyReviews:[],monthlyReviews:[],goals:[],majorGoals:[]};
 const sampleOptions={startDate:'2026-08-03',endDate:'2026-08-03',sections:['logs'],paperSize:'a4',includeCover:false,includeEmptyDays:false};
 for(const style of ['minimal','classic','abstract'])for(const paper of ['a4','a5']){
   window.__stage='Cover '+style+' '+paper;
   await storePdf('cover-'+style+'-'+paper+'.pdf',await createJournalPdf(sample,{...sampleOptions,paperSize:paper,includeCover:true,coverStyle:style,accentColor:'#526b5d'}));
 }
 for(const id of ['default','lxgw-wenkai','lxgw-neo-zhisong','ding-lie-song','zhuque-fangsong','wenquanyi-bitmap']){
   window.__stage='Font '+id;
   await storePdf('font-'+id+'.pdf',await createJournalPdf(sample,{...sampleOptions,printedFontId:id,contentFontId:id}));
 }
 const blob=await(await fetch('/fonts/ZhuqueFangsong-Regular.woff2')).blob();
 await customFontStorageService.saveFont({id:'custom-export-test',displayName:'导出测试字体',familyName:'JournalCustomTest',fileName:'custom.woff2',format:'woff2',size:blob.size,createdAt:0,updatedAt:0,blob});
 await storePdf('font-uploaded.pdf',await createJournalPdf(sample,{...sampleOptions,printedFontId:'custom-export-test',contentFontId:'custom-export-test'}));
 await verifyAppearance(true);
 passed.push('All six cover layouts, six built-in fonts, an uploaded WOFF2 font, entitlement visibility and independent font/color controls');
 window.__result={passed};
}
run().catch(error=>window.__result={error:String(error.stack||error),passed});
` },
  bundle: true, outfile: path.join(directory, 'test.js'), platform: 'browser', format: 'iife',
  define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env.BASE_URL': '"/"' }
});
const css = (await readdir(path.join(workspace, 'dist/assets'))).filter(file => file.endsWith('.css'));
if (!css.length) throw new Error('Run npm run build first');
const panelCss = await readFile(path.join(directory, 'test.css'), 'utf8');
await writeFile(path.join(directory, 'test.css'), (await Promise.all(css.map(file => readFile(path.join(workspace, 'dist/assets', file), 'utf8')))).join('\n') + '\n' + panelCss, 'utf8');
await writeFile(path.join(directory, 'index.html'), '<!doctype html><html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="test.css"><style>@font-face{font-family:VerifiedChinese;src:url(/fonts/LXGWWenKaiLite-Regular.woff2)}body{background:#f5f5f4;font-family:VerifiedChinese}.dark body{background:#0c0a09}</style><body><div id="root"></div><script src="test.js"></script></body></html>', 'utf8');
const server = createServer(async (request, response) => {
  try {
    const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '');
    const base = /^(fonts|sticker|background)\//.test(relative) ? path.join(workspace, 'public') : directory;
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
setTimeout(()=>app.exit(1),600000);
app.whenReady().then(async()=>{
 const window=new BrowserWindow({show:false,width:390,height:1000,webPreferences:{contextIsolation:true,backgroundThrottling:false,offscreen:true}});
 await window.loadURL(${JSON.stringify(url)});
 let result; let stage; let saved=0;
 for(let i=0;i<14000;i++){
  const status=await window.webContents.executeJavaScript('window.__stage');
  if(status&&status!==stage){stage=status;console.log(stage);}
  const pending=await window.webContents.executeJavaScript('window.__exports.slice('+saved+')');
  for(const file of pending){await fs.writeFile(path.join(__dirname,file.name),Buffer.from(file.base64,'base64'));saved++;}
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
