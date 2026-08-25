/**
 * @file capture-scene-04.cjs
 * @input scene-04-see-your-time.html
 * @output scene-04-at-9s.png
 * @description Captures a deterministic 1920x1080 approval frame for promo storyboard scene 04.
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { backgroundThrottling: false } });
  await window.loadFile(path.join(__dirname, 'scene-04-see-your-time.html'));
  await window.webContents.executeJavaScript(`document.getAnimations().forEach((animation) => { animation.currentTime = 9200; animation.pause(); }); document.querySelector('.control').style.display = 'none';`);
  const image = await window.webContents.capturePage();
  const output = path.join(__dirname, 'scene-04-at-9s.png');
  require('fs').writeFileSync(output, image.toPNG());
  console.log(`Captured scene 04 at 9.2 seconds: ${output}`);
  await window.destroy();
  app.quit();
});
