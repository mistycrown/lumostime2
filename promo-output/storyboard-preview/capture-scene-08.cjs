/** @file capture-scene-08.cjs @input scene-08-from-start-to-self.html @output scene-08-at-7s.png */
const { app, BrowserWindow } = require('electron');
const path = require('path');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { backgroundThrottling: false } });
  await window.loadFile(path.join(__dirname, 'scene-08-from-start-to-self.html'));
  const info = await window.webContents.executeJavaScript(`const animations=document.getAnimations();animations.forEach((animation)=>{animation.currentTime=7000;animation.pause();});document.querySelector('.control').style.display='none';({count:animations.length,opacity:getComputedStyle(document.querySelector('.brand h1')).opacity})`);
  require('fs').writeFileSync(path.join(__dirname, 'scene-08-at-7s.png'), (await window.webContents.capturePage()).toPNG());
  console.log(`Captured scene 08: ${JSON.stringify(info)}`);
  await window.destroy(); app.quit();
});
