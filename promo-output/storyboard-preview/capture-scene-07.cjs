/** @file capture-scene-07.cjs @input scene-07-project-through-time.html @output scene-07-at-9s.png */
const { app, BrowserWindow } = require('electron');
const path = require('path');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { backgroundThrottling: false } });
  await window.loadFile(path.join(__dirname, 'scene-07-project-through-time.html'));
  const info = await window.webContents.executeJavaScript(`const animations=document.getAnimations();animations.forEach((animation)=>{animation.currentTime=9200;animation.pause();});document.querySelector('.control').style.display='none';({count:animations.length,opacity:getComputedStyle(document.querySelector('.app')).opacity})`);
  require('fs').writeFileSync(path.join(__dirname, 'scene-07-at-9s.png'), (await window.webContents.capturePage()).toPNG());
  console.log(`Captured scene 07: ${JSON.stringify(info)}`);
  await window.destroy(); app.quit();
});
