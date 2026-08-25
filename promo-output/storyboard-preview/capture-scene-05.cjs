/**
 * @file capture-scene-05.cjs
 * @input scene-05-say-it-naturally.html
 * @output scene-05-at-9s.png
 * @description Captures a deterministic 1920x1080 approval frame for promo storyboard scene 05.
 */
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');

app.whenReady().then(async () => {
  const window = new BrowserWindow({ width: 1920, height: 1080, show: false, webPreferences: { backgroundThrottling: false } });
  await window.loadFile(path.join(__dirname, 'scene-05-say-it-naturally.html'));
  const diagnostics = await window.webContents.executeJavaScript(`
    const animations = document.getAnimations();
    animations.forEach((animation) => { animation.currentTime = 9200; animation.pause(); });
    document.querySelector('.control').style.display = 'none';
    ({ animationCount: animations.length, appOpacity: getComputedStyle(document.querySelector('.app')).opacity });
  `);
  const image = await window.webContents.capturePage();
  const output = path.join(__dirname, 'scene-05-at-9s.png');
  require('fs').writeFileSync(output, image.toPNG());
  console.log(`Captured scene 05 at 9.2 seconds: ${JSON.stringify(diagnostics)}`);
  await window.destroy();
  app.quit();
});
